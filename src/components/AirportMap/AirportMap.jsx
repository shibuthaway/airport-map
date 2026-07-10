import React, { useEffect, useRef, useCallback, useState } from 'react';
import { FiX, FiNavigation } from 'react-icons/fi';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useMapStore } from '../../store/useMapStore';
import { getEffectiveEdges } from '../../utils/pathfinder';
import { useIndoorPositioning } from '../../hooks/useIndoorPositioning';
import UserLocationMarker from './UserLocationMarker';

const getLabelLines = (name) => {
  const words = name.split(' ');
  const lines = [];
  let currentLine = '';
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + ' ' + word).length <= 10) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
};

const getCategoryIcon = (category) => {
  const map = {
    gate: '✈️',
    restaurant: '🍔',
    food: '🍔',
    cafe: '☕',
    shopping: '🛍️',
    atm: '💵',
    washroom: '🚻',
    lounge: '🛋️',
    security: '🛡️',
    immigration: '🛂',
    medical: '🏥',
    emergency: '🚨',
    checkin: '🧳',
    baggage: '🧳',
    office: '💼',
    lift: '🛗',
    escalator: '🪜',
    waypoint: '📍'
  };
  return map[category] || '📍';
};

export default function AirportMap() {
  const [zoomScale, setZoomScale] = useState(1);
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const [edgeStartNodeId, setEdgeStartNodeId] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredBlockedEdge, setHoveredBlockedEdge] = useState(null);
  const [blinkPoiId, setBlinkPoiId] = useState(null); // for search/nav flash effect

  const {
    floors, currentFloor, pois, selectedPoi, selectPoi,
    hoveredPoi, setHoveredPoi,
    searchQuery, activeFilters,
    navigationMode, navigationStart, navigationEnd, navigationPath, navigationDistance,
    setNavigationMode, setNavigationStart, setNavigationEnd,
    taggingMode, taggingCoords, setTaggingCoords,
    loadMapData, theme,
    mapRotation, setMapRotation,
    pendingZoom, clearPendingZoom,
    
    // Graph states & actions
    nodes, edges, dragNode, toggleEdge, isDrawingEdges, setIsDrawingEdges,
    selectedEdge, setSelectedEdge, setZoomActions,
    userPosition
  } = useMapStore();

  const { isActive, error: ipsError, startTracking, stopTracking } = useIndoorPositioning();

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  const transformRef = useRef(null);
  const svgOverlayRef = useRef(null);

  // ── SVG Coordinate Calculation ────────────────────────────────────────────
  const handleMapClick = useCallback((e) => {
    if (!taggingMode) return;
    const svg = svgOverlayRef.current;
    if (!svg) return;

    // Get click position relative to SVG element
    const rect = svg.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    // Map to SVG viewBox (0 0 1000 600)
    const scaleX = 1000 / rect.width;
    const scaleY = 600 / rect.height;
    const svgX = Math.round(rawX * scaleX);
    const svgY = Math.round(rawY * scaleY);

    setTaggingCoords({ x: svgX, y: svgY });
  }, [taggingMode, setTaggingCoords]);

  // ── Node Dragging SVG Handlers ────────────────────────────────────────────
  const handleNodeMouseDown = (e, node) => {
    if (!taggingMode) return;
    e.stopPropagation();
    setDraggedNodeId(node.id);
  };

  const handleSvgMouseMove = (e) => {
    const svg = svgOverlayRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const scaleX = 1000 / rect.width;
    const scaleY = 600 / rect.height;
    const svgX = Math.round(rawX * scaleX);
    const svgY = Math.round(rawY * scaleY);

    const clampedX = Math.max(0, Math.min(1000, svgX));
    const clampedY = Math.max(0, Math.min(600, svgY));

    if (draggedNodeId) {
      dragNode(draggedNodeId, clampedX, clampedY);
    }

    if (edgeStartNodeId) {
      setMousePos({ x: clampedX, y: clampedY });
    }
  };

  const handleSvgMouseUp = () => {
    if (draggedNodeId) {
      setDraggedNodeId(null);
    }
  };

  const handleNodeEdgeClick = (nodeId) => {
    if (!edgeStartNodeId) {
      setEdgeStartNodeId(nodeId);
      const startingNode = nodes.find(n => n.id === nodeId);
      if (startingNode) {
        setMousePos({ x: startingNode.x, y: startingNode.y });
      }
    } else {
      if (edgeStartNodeId !== nodeId) {
        toggleEdge(edgeStartNodeId, nodeId);
      }
      setEdgeStartNodeId(null);
    }
  };

  // Reset edge drawing state when modes change
  useEffect(() => {
    if (!isDrawingEdges) {
      setEdgeStartNodeId(null);
    }
  }, [isDrawingEdges]);

  // ── Floor Map Renderer ────────────────────────────────────────────────────
  const renderMap = () => {
    if (!floors || floors.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      );
    }
    const currentFloorData = floors.find(f => f.id === currentFloor) || floors[0];
    const imageUrl = currentFloorData?.image || "";
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" className="airport-map-svg select-none">
        <image href={imageUrl} width="1600" height="1000" preserveAspectRatio="xMidYMid slice" />
      </svg>
    );
  };

  // ── Active POI IDs ────────────────────────────────────────────────────────
  const getActivePoiIds = () => {
    let list = pois[currentFloor] || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }
    if (activeFilters.length > 0) {
      list = list.filter(p => activeFilters.includes(p.category));
    }
    return list.map(p => p.id);
  };

  const activePoiIds = getActivePoiIds();

  // ── Helper: smooth zoom to SVG coordinate (Google Maps style) ─────────────
  const zoomToSvgPoint = useCallback((svgX, svgY, targetScale = 4) => {
    if (!transformRef.current) return;
    const wrapper = transformRef.current.instance?.wrapperComponent;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const W = rect.width || window.innerWidth;
    const H = rect.height || window.innerHeight;
    // Center the target SVG point on screen at the given scale
    const posX = W / 2 - svgX * targetScale;
    const posY = H / 2 - svgY * targetScale;
    transformRef.current.setTransform(posX, posY, targetScale, 500, 'easeOut');
  }, []);

  // ── pendingZoom watcher — fires immediately when store sets a zoom target ──
  useEffect(() => {
    if (!pendingZoom || !transformRef.current) return;
    const { x, y, scale } = pendingZoom;
    zoomToSvgPoint(x, y, scale);
    // Blink the nearest node
    const nearest = nodes.find(n => n.floor === currentFloor && Math.hypot(n.x - x, n.y - y) < 40);
    if (nearest) {
      setBlinkPoiId(nearest.id);
      setTimeout(() => setBlinkPoiId(null), 2000);
    }
    clearPendingZoom();
  }, [pendingZoom, zoomToSvgPoint, clearPendingZoom, currentFloor, nodes]);

  // ── Auto-zoom + blink to selected POI (search/explore) ───────────────────
  useEffect(() => {
    if (!selectedPoi) return;
    // Give floor transition time if needed
    const doZoom = () => {
      zoomToSvgPoint(selectedPoi.x, selectedPoi.y, 3.5);
      setBlinkPoiId(selectedPoi.id);
      setTimeout(() => setBlinkPoiId(null), 2000);
    };
    setTimeout(doZoom, 200);
  }, [selectedPoi, zoomToSvgPoint]);

  // ── Reset on floor change (skip if navigating to not override zoom) ────────
  useEffect(() => {
    // If navigation is active, don't reset - we'll zoom to the entry point instead
    if (window.__mapSkipNextReset) {
      window.__mapSkipNextReset = false;
      return;
    }
    if (transformRef.current) transformRef.current.resetTransform(400, 'easeOut');
  }, [currentFloor]);

  // ── Category → marker color ───────────────────────────────────────────────
  const getCategoryColor = (cat) => {
    const map = {
      gate: '#0ea5e9', restaurant: '#10b981', food: '#10b981',
      cafe: '#10b981', shopping: '#f59e0b', atm: '#06b6d4',
      washroom: '#64748b', lounge: '#8b5cf6', security: '#ec4899',
      immigration: '#ec4899', medical: '#ef4444', emergency: '#f43f5e',
      checkin: '#6366f1', baggage: '#0d9488', office: '#94a3b8', lift: '#38bdf8',
      escalator: '#38bdf8', waypoint: '#94a3b8'
    };
    return map[cat] || '#6366f1';
  };

  // ── Visual Edges Layer ────────────────────────────────────────────────────
  const renderEdges = () => {
    const inEditMode = taggingMode || isDrawingEdges;

    // In normal mode — only render if there are blocked edges on this floor
    const hasBlockedOnFloor = edges.some(e => {
      const fn = nodes.find(n => n.id === e.from);
      const tn = nodes.find(n => n.id === e.to);
      return e.blocked && fn?.floor === currentFloor && tn?.floor === currentFloor;
    });

    if (!inEditMode && !hasBlockedOnFloor) return null;

    const allEdges = getEffectiveEdges(nodes, edges);

    return (
      <g className="edges-layer">
        {allEdges.map(e => {
          const fromNode = nodes.find(n => n.id === e.from);
          const toNode   = nodes.find(n => n.id === e.to);
          if (!fromNode || !toNode || fromNode.floor !== currentFloor || toNode.floor !== currentFloor) return null;

          const isSelected = selectedEdge?.id === e.id;
          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2;

          // Auto-edges: only in edit mode
          if (e.isAuto) {
            if (!inEditMode) return null;
            return (
              <line
                key={e.id}
                x1={fromNode.x} y1={fromNode.y}
                x2={toNode.x}   y2={toNode.y}
                stroke="#818cf8" strokeWidth="1.5"
                strokeOpacity="0.6" strokeDasharray="4,4"
                className="pointer-events-none"
              />
            );
          }

          // ── Blocked edge — ALWAYS visible ────────────────────────────
          if (e.blocked) {
            const tooltipLines = [
              e.blockReason || '⚠ Path Blocked',
              e.blockDuration ? `🕐 Open after: ${e.blockDuration}` : null,
              '🖱 Click to manage',
            ].filter(Boolean);

            return (
              <g key={e.id}>
                {/* Soft red glow halo */}
                <line
                  x1={fromNode.x} y1={fromNode.y}
                  x2={toNode.x}   y2={toNode.y}
                  stroke="#ef4444" strokeWidth="14" strokeOpacity="0.10"
                  className="pointer-events-none"
                />
                {/* Dashed red line */}
                <line
                  x1={fromNode.x} y1={fromNode.y}
                  x2={toNode.x}   y2={toNode.y}
                  stroke={isSelected ? '#dc2626' : '#ef4444'}
                  strokeWidth={isSelected ? '5' : '3'}
                  strokeOpacity="0.9"
                  strokeDasharray="10,6"
                  className={inEditMode ? "cursor-pointer pointer-events-auto" : "pointer-events-none"}
                  onClick={(evt) => {
                    evt.stopPropagation();
                    if (inEditMode) setSelectedEdge(isSelected ? null : e);
                  }}
                />

                {/* ⚠ BLOCKED Badge with rich hover tooltip */}
                <g
                  transform={`translate(${midX}, ${midY})`}
                  className={inEditMode ? "pointer-events-auto cursor-pointer" : "pointer-events-auto cursor-default"}
                  onClick={(evt) => {
                    evt.stopPropagation();
                    if (inEditMode) setSelectedEdge(isSelected ? null : e);
                  }}
                >
                  {/* Outer glow ring on badge */}
                  <circle r="22" fill="#ef4444" fillOpacity="0.15" />

                  {/* Badge pill */}
                  <rect
                    x="-37" y="-14" width="74" height="28" rx="14"
                    fill={isSelected ? '#dc2626' : '#ef4444'}
                    stroke="#ffffff" strokeWidth="2"
                    filter="url(#badge-shadow)"
                  />

                  {/* ⚠ icon */}
                  <text x="-21" y="4"
                    fontFamily="system-ui" fontSize="11" fill="#fff"
                    textAnchor="middle"
                  >⚠</text>

                  {/* BLOCKED text */}
                  <text x="8" y="4"
                    fontFamily="system-ui, sans-serif"
                    fontSize="9" fontWeight="900"
                    fill="#ffffff" letterSpacing="0.5"
                    textAnchor="middle"
                  >BLOCKED</text>

                  {/* Removed SVG native tooltip to prevent dual tooltip bug */}

                  {/* Invisible hover target — triggers React HTML tooltip */}
                  <rect
                    x="-38" y="-16" width="76" height="32" rx="16"
                    fill="transparent"
                    className="pointer-events-auto"
                    onMouseEnter={(evt) => {
                      setHoveredBlockedEdge({ edge: e, screenX: evt.clientX, screenY: evt.clientY });
                    }}
                    onMouseMove={(evt) => {
                      setHoveredBlockedEdge(prev => prev ? { ...prev, screenX: evt.clientX, screenY: evt.clientY } : null);
                    }}
                    onMouseLeave={() => setHoveredBlockedEdge(null)}
                  />
                </g>
              </g>
            );
          }

          // ── Normal (unblocked) edge — only in edit mode ───────────────
          if (!inEditMode) return null;

          return (
            <line
              key={e.id}
              x1={fromNode.x} y1={fromNode.y}
              x2={toNode.x}   y2={toNode.y}
              stroke={isSelected ? '#6366f1' : '#64748b'}
              strokeWidth={isSelected ? '4' : '2'}
              strokeOpacity={isSelected ? '0.9' : '0.4'}
              className="cursor-pointer pointer-events-auto hover:stroke-indigo-400 hover:stroke-[3px] transition-all"
              onClick={(evt) => { evt.stopPropagation(); setSelectedEdge(isSelected ? null : e); }}
            />
          );
        })}
      </g>
    );
  };

  // ── Midpoint Delete Button for Selected Edge ──────────────────────────────
  const renderEdgeDeleteButton = () => {
    if (!selectedEdge) return null;
    const fromNode = nodes.find(n => n.id === selectedEdge.from);
    const toNode = nodes.find(n => n.id === selectedEdge.to);
    if (!fromNode || !toNode || fromNode.floor !== currentFloor || toNode.floor !== currentFloor) return null;

    const midX = (fromNode.x + toNode.x) / 2;
    const midY = (fromNode.y + toNode.y) / 2;

    return (
      <g
        transform={`translate(${midX}, ${midY})`}
        className="cursor-pointer pointer-events-auto"
        onClick={(e) => {
          e.stopPropagation();
          useMapStore.getState().deleteEdge(selectedEdge.id);
          setSelectedEdge(null);
        }}
      >
        <circle r="10" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" className="shadow-lg hover:scale-110 transition-transform" />
        <path d="M-4.5,-4.5 L4.5,4.5 M4.5,-4.5 L-4.5,4.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        <title>Delete Edge</title>
      </g>
    );
  };

  // ── Rubber-Band Tentative Connection Line ─────────────────────────────────
  const renderRubberBand = () => {
    if (!isDrawingEdges || !edgeStartNodeId) return null;
    const startNode = nodes.find(n => n.id === edgeStartNodeId);
    if (!startNode || startNode.floor !== currentFloor) return null;

    return (
      <line
        x1={startNode.x}
        y1={startNode.y}
        x2={mousePos.x}
        y2={mousePos.y}
        stroke="#f59e0b"
        strokeWidth="2"
        strokeDasharray="4,4"
        pointerEvents="none"
      />
    );
  };

  // ── Navigation path renderer ──────────────────────────────────────────────
  const renderNavigationPath = () => {
    if (!navigationPath || navigationPath.length < 2) return null;
    const segments = [];
    let seg = [];
    navigationPath.forEach(node => {
      if (node.floor === currentFloor) { seg.push(node); }
      else { if (seg.length) { segments.push(seg); seg = []; } }
    });
    if (seg.length) segments.push(seg);

    // Calculate turns for on-map rendering
    const turns = [];
    if (navigationPath.length >= 3) {
      for (let i = 1; i < navigationPath.length - 1; i++) {
        const prev = navigationPath[i - 1];
        const curr = navigationPath[i];
        const next = navigationPath[i + 1];
        
        if (curr.floor === currentFloor && prev.floor === currentFloor && next.floor === currentFloor) {
          const dx1 = curr.x - prev.x;
          const dy1 = curr.y - prev.y;
          const dx2 = next.x - curr.x;
          const dy2 = next.y - curr.y;
          
          const angle1 = Math.atan2(dy1, dx1);
          const angle2 = Math.atan2(dy2, dx2);
          let diff = (angle2 - angle1) * (180 / Math.PI);
          while (diff <= -180) diff += 360;
          while (diff > 180) diff -= 360;
          
          let turnData = null;
          if (diff > 40 && diff <= 150) {
            turnData = { ...curr, text: 'Right', color: '#f59e0b', exitAngle: angle2 * (180 / Math.PI) };
          } else if (diff < -40 && diff >= -150) {
            turnData = { ...curr, text: 'Left', color: '#10b981', exitAngle: angle2 * (180 / Math.PI) };
          } else if (diff > 150 || diff < -150) {
            turnData = { ...curr, text: 'U-Turn', color: '#ef4444', exitAngle: angle2 * (180 / Math.PI) };
          }

          if (turnData) {
            if (turns.length > 0) {
              const lastTurn = turns[turns.length - 1];
              const dist = Math.sqrt((curr.x - lastTurn.x)**2 + (curr.y - lastTurn.y)**2);
              if (dist < 80) continue; // Skip turn badges that are too close to previous ones
            }
            turns.push(turnData);
          }
        }
      }
    }

    return (
      <g className="navigation-overlay" pointerEvents="none">
        {segments.map((s, idx) => {
          if (s.length < 2) return null;
          let renderSeg = s;
          if (s.length === 2) {
            const midX = (s[0].x + s[1].x) / 2;
            const midY = (s[0].y + s[1].y) / 2;
            renderSeg = [s[0], { x: midX, y: midY }, s[1]];
          }

          const d = renderSeg.reduce((acc, n, i) => acc + (i === 0 ? `M ${n.x} ${n.y}` : ` L ${n.x} ${n.y}`), '');
          const pathId = `nav-path-${idx}`;

          return (
            <g key={idx}>
              <path id={pathId} d={d} fill="none" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 blur-[2px]" />
              <path d={d} fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8,6" className="animate-[dash_1s_linear_infinite]" />
              
              {/* Moving Arrow 1 */}
              <g>
                <path d="M-8,-5 L8,0 L-8,5 L-4,0 Z" fill="#ffffff" stroke="#0284c7" strokeWidth="1" className="drop-shadow-sm" />
                <animateMotion dur="6s" repeatCount="indefinite" rotate="auto">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </g>
              
              {/* Moving Arrow 2 (Delayed) */}
              <g>
                <path d="M-8,-5 L8,0 L-8,5 L-4,0 Z" fill="#ffffff" stroke="#0284c7" strokeWidth="1" className="drop-shadow-sm" />
                <animateMotion dur="6s" begin="3s" repeatCount="indefinite" rotate="auto">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </g>
            </g>
          );
        })}

        {/* Turn Badges directly on Map (Dynamic Arrow & Halo Text) */}
        {turns.map((turn, idx) => (
          <g key={`turn-${idx}`} transform={`translate(${turn.x}, ${turn.y - 18})`} className="drop-shadow-lg">
            {/* Dynamic Arrow Shape pointing precisely in the exit direction */}
            <g transform={`translate(-18, -3.5) rotate(${turn.exitAngle})`}>
              <path d="M-5,-5 L4,0 L-5,5 L-2,0 Z" fill="none" stroke="#020617" strokeWidth="4" strokeLinejoin="round" />
              <path d="M-5,-5 L4,0 L-5,5 L-2,0 Z" fill={turn.color} />
            </g>
            
            {/* Dark Halo for contrast */}
            <text x="4" y="0" fontFamily="Outfit, sans-serif" fontSize="12" fontWeight="900" fill="none" stroke="#020617" strokeWidth="5" strokeLinejoin="round" textAnchor="middle" letterSpacing="0.5">
              {turn.text}
            </text>
            {/* Foreground Text */}
            <text x="4" y="0" fontFamily="Outfit, sans-serif" fontSize="12" fontWeight="900" fill={turn.color} textAnchor="middle" letterSpacing="0.5">
              {turn.text}
            </text>
          </g>
        ))}

        {/* Interactive Floor Transition Prompts (Exit Nodes) */}
        <g pointerEvents="auto">
          {navigationPath.map((node, i) => {
            const isExit = node.floor === currentFloor && i < navigationPath.length - 1 && navigationPath[i + 1].floor !== currentFloor;
            const isEntry = node.floor === currentFloor && i > 0 && navigationPath[i - 1].floor !== currentFloor;

            if (isExit) {
              const nextFloor = navigationPath[i + 1].floor;
              const rawName = nextFloor.replace(/_\d+$/, '').replace(/_/g, ' ');
              const shortName = rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              
              return (
                <g 
                  key={`exit-${node.id}`} 
                  transform={`translate(${node.x}, ${node.y - 18})`}
                  className="cursor-pointer drop-shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    useMapStore.getState().setFloor(nextFloor);
                  }}
                >
                  <text x="0" y="0" fontFamily="Outfit, sans-serif" fontSize="12" fontWeight="900" fill="none" stroke="#020617" strokeWidth="5" strokeLinejoin="round" textAnchor="middle" letterSpacing="0.5">
                    Go to {shortName} ➔
                  </text>
                  <text x="0" y="0" fontFamily="Outfit, sans-serif" fontSize="12" fontWeight="900" fill="#38bdf8" textAnchor="middle" letterSpacing="0.5">
                    Go to {shortName} ➔
                  </text>
                </g>
              );
            }

            if (isEntry) {
              const prevFloor = navigationPath[i - 1].floor;
              const rawName = prevFloor.replace(/_\d+$/, '').replace(/_/g, ' ');
              const shortName = rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              
              return (
                <g 
                  key={`entry-${node.id}`} 
                  transform={`translate(${node.x}, ${node.y - 18})`} 
                  className="cursor-pointer drop-shadow-lg transition-transform hover:scale-105"
                  onClick={(e) => {
                    e.stopPropagation();
                    useMapStore.getState().setFloor(prevFloor);
                  }}
                >
                  <text x="0" y="0" fontFamily="Outfit, sans-serif" fontSize="12" fontWeight="900" fill="none" stroke="#020617" strokeWidth="5" strokeLinejoin="round" textAnchor="middle" letterSpacing="0.5">
                    ⬅ Go back to {shortName}
                  </text>
                  <text x="0" y="0" fontFamily="Outfit, sans-serif" fontSize="12" fontWeight="900" fill="#a855f7" textAnchor="middle" letterSpacing="0.5">
                    ⬅ Go back to {shortName}
                  </text>
                </g>
              );
            }
            
            return null;
          })}
        </g>
      </g>
    );
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-50 dark:bg-[#030712] transition-colors duration-500">
      {/* Tagging mode active visual feedback */}
      {taggingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 px-4 py-2 rounded-full bg-amber-500/90 backdrop-blur text-white text-xs font-bold shadow-xl pointer-events-none text-center animate-pulse">
          <span>📍 Click on map to place a node</span>
          <span className="text-[10px] opacity-80 font-normal">Drag any node to move it</span>
        </div>
      )}

      {/* Edge drawing cursor banner */}
      {isDrawingEdges && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 px-4 py-2 rounded-full bg-indigo-500/90 backdrop-blur text-white text-xs font-bold shadow-xl pointer-events-none text-center animate-pulse">
          <span>🔗 Edge Drawing Mode Active</span>
          <span className="text-[10px] opacity-80 font-normal">Click a node, then click another node to connect/disconnect them</span>
        </div>
      )}

      {/* Navigation active banner */}
      {navigationMode && (
        <div className="absolute top-[120px] md:top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 w-[90%] md:w-auto max-w-sm pointer-events-none">
          <div className="flex items-center gap-3 md:gap-4 pl-3 pr-1.5 md:pl-4 md:pr-2 py-1.5 md:py-2 rounded-full bg-sky-500/90 backdrop-blur text-white shadow-xl animate-in fade-in slide-in-from-top-4 justify-between w-full pointer-events-auto">
            <span className="text-[11px] md:text-xs font-bold flex items-center gap-1.5 md:gap-2 truncate">
              <FiNavigation className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" /> 
              <span className="truncate">{navigationEnd ? `Navigating to ${navigationEnd.name}` : 'Select a destination'}</span>
            </span>
            <button 
              onClick={() => {
                setNavigationMode(false);
                setNavigationStart(null);
                setNavigationEnd(null);
              }} 
              className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition active:scale-90 pointer-events-auto flex-shrink-0"
              title="End Navigation"
            >
              <FiX className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </div>
          
          {/* Start Tracking Button */}
          {navigationStart && !isActive && (
            <button 
              onClick={startTracking}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 animate-bounce cursor-pointer pointer-events-auto"
            >
              <span>📍</span> Start Live Tracking
            </button>
          )}

          {isActive && (
            <div className="bg-emerald-500/90 backdrop-blur text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 pointer-events-auto">
              <span className="animate-pulse">🟢</span> Tracking Active
              <button onClick={stopTracking} className="ml-2 underline opacity-80 hover:opacity-100 cursor-pointer">Stop</button>
            </div>
          )}

          {(() => {
            if (!userPosition || !navigationEnd || !isActive) return null;
            
            const dist = Math.hypot(userPosition.x - navigationEnd.x, userPosition.y - navigationEnd.y);
            const isDestinationReached = userPosition.floor === navigationEnd.floor && dist < 50;

            if (isDestinationReached) {
              return (
                <div className="bg-emerald-600/95 text-white text-xs font-extrabold px-4 py-2 rounded-full shadow-lg animate-bounce border-2 border-emerald-300">
                  🎉 You have reached your destination!
                </div>
              );
            }

            if (userPosition.isOffRoute) {
              return (
                <div className="bg-rose-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                  ⚠ Off Route! Recalculating...
                </div>
              );
            }

            if (userPosition.isWrongDirection) {
              return (
                <div className="bg-orange-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse flex items-center gap-1.5 border-2 border-orange-400/50">
                  <span className="text-[10px]">↩️</span> Wrong Direction
                </div>
              );
            }

            return (
              <div className="bg-sky-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                <span className="text-[10px]">✅</span> On Correct Path
              </div>
            );
          })()}

          {ipsError && (
            <div className="bg-rose-500/90 text-white text-[10px] px-3 py-1 rounded-full shadow-lg">
              {ipsError}
            </div>
          )}
        </div>
      )}

      {(() => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const w = typeof window !== 'undefined' ? window.innerWidth : 1000;
        const h = typeof window !== 'undefined' ? window.innerHeight : 600;
        
        const targetScale = isMobile ? 0.35 : 0.8;
        
        // On mobile, the search bar is around 110px from the top.
        // The bottom sheet covers 72vh from the bottom.
        // Setting initY to 130 ensures it's placed nicely in the visible gap.
        const initX = (w - 1000 * targetScale) / 2;
        const initY = isMobile ? 130 : (h - 600 * targetScale) / 2;
        
        return (
          <TransformWrapper
            ref={transformRef}
            initialScale={targetScale}
            initialPositionX={isMobile ? initX : undefined}
            initialPositionY={isMobile ? initY : undefined}
            minScale={0.15} 
            maxScale={6}
            centerOnInit={!isMobile}
            centerZoomedOut={!isMobile}
            limitToBounds={false}
            doubleClick={{ disabled: false }}
        panning={{ 
          velocityDisabled: true,
          disabled: taggingMode || isDrawingEdges || draggedNodeId !== null,
          excluded: []
        }}
        pinch={{ disabled: false }}
        wheel={{ disabled: false, touchPadDisabled: false }}
        onInit={(ref) => {
          setZoomActions({
            zoomIn: () => ref.zoomIn(),
            zoomOut: () => ref.zoomOut(),
            resetTransform: () => ref.resetTransform()
          });
          // Expose globally so Sidebar viewOnMap can trigger zoom
          window.__mapTransformRef = ref;
          window.__mapZoomToPoint = (svgX, svgY, scale = 3.5) => {
            const wrapper = ref.instance?.wrapperComponent;
            if (!wrapper) return;
            const rect = wrapper.getBoundingClientRect();
            const W = rect.width || window.innerWidth;
            const H = rect.height || window.innerHeight;
            const posX = W / 2 - svgX * scale;
            const posY = H / 2 - svgY * scale;
            ref.setTransform(posX, posY, scale, 600, 'easeOut');
          };
          setZoomScale(ref.state.scale);
        }}
        onTransform={(ref) => {
          setZoomScale(ref.state.scale);
        }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <div className="w-full h-full touch-none">
            <TransformComponent
              wrapperClassName="!w-full !h-full"
              contentClassName=""
              wrapperStyle={{ touchAction: 'none', minWidth: '320px' }}
            >
              <div
                className="w-[1000px] h-[600px] relative select-none"
                style={{ transform: `rotate(${mapRotation}deg)`, transformOrigin: 'center center', transition: 'transform 0.3s ease' }}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={handleSvgMouseUp}
              >
                {/* 1. Base Map */}
                {renderMap()}

                {/* Empty State Fallback */}
                {(!floors || floors.length === 0) && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                    <div className="bg-slate-900/80 backdrop-blur-md text-slate-300 px-8 py-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col items-center text-center max-w-sm">
                      <span className="text-5xl mb-4">🗺️</span>
                      <h2 className="text-2xl font-black text-white mb-2">Blank Canvas</h2>
                      <p className="text-sm">There are no floors in this project yet. Open the <strong className="text-sky-400">Floor Manager</strong> in the sidebar to upload your first map image!</p>
                    </div>
                  </div>
                )}

                {/* 2. Overlay SVG */}
                <svg
                  ref={svgOverlayRef}
                  className={`absolute inset-0 w-full h-full z-10 ${
                    (taggingMode || isDrawingEdges) ? 'cursor-crosshair' : ''
                  } ${
                    (taggingMode || isDrawingEdges || navigationPath?.length > 0 || edges.some(e => {
                          const fn = nodes.find(n => n.id === e.from);
                          const tn = nodes.find(n => n.id === e.to);
                          return e.blocked && fn?.floor === currentFloor && tn?.floor === currentFloor;
                    })) ? 'pointer-events-auto' : 'pointer-events-none'
                  }`}
                  viewBox="0 0 1000 600"
                  onClick={handleMapClick}
                >
                  <defs>
                    <marker id="nav-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 2 1 L 9 5 L 2 9 L 4 5 z" fill="#ffffff" stroke="#0284c7" strokeWidth="1" strokeLinejoin="round" />
                    </marker>
                  </defs>
                  
                  {renderEdges()}
                  {renderRubberBand()}
                  {renderEdgeDeleteButton()}

                  {/* Render Live User Position if on this floor */}
                  {userPosition && userPosition.floor === currentFloor && (
                    <UserLocationMarker 
                      position={userPosition} 
                      heading={userPosition.heading} 
                      isWalking={userPosition.isWalking} 
                      isOffRoute={userPosition.isOffRoute}
                    />
                  )}
                  {renderNavigationPath()}

                  {/* Temporary placement coords feedback */}
                  {taggingMode && taggingCoords && (
                    <g transform={`translate(${taggingCoords.x}, ${taggingCoords.y})`}>
                      <circle r="18" fill="#f59e0b" className="opacity-20 animate-ping" />
                      <circle r="10" fill="#f59e0b" className="opacity-40 animate-pulse" />
                      <circle r="5" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
                      <text x="0" y="-14" fontFamily="Outfit, sans-serif" fontSize="9" fontWeight="bold" fill="#f59e0b" textAnchor="middle">
                        {taggingCoords.x}, {taggingCoords.y}
                      </text>
                    </g>
                  )}

                  {/* Nodes Overlay */}
                  {(nodes || []).map((poi) => {
                    if (poi.floor !== currentFloor) return null;

                    const isActive = activePoiIds.includes(poi.id);
                    const isSelected = selectedPoi?.id === poi.id;
                    const isStart = navigationStart?.id === poi.id;
                    const isEnd = navigationEnd?.id === poi.id;
                    const isEdgeStart = edgeStartNodeId === poi.id;
                    const color = getCategoryColor(poi.category);

                    // Special Waypoint node representation
                    if (poi.category === 'waypoint') {
                      if (!taggingMode && !isDrawingEdges) return null;
                      return (
                        <g
                          key={poi.id}
                          transform={`translate(${poi.x}, ${poi.y})`}
                          className="cursor-pointer pointer-events-auto group"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isDrawingEdges) {
                              handleNodeEdgeClick(poi.id);
                            } else {
                              selectPoi(poi);
                            }
                          }}
                          onMouseDown={(e) => handleNodeMouseDown(e, poi)}
                        >
                          {isEdgeStart && (
                            <circle r="14" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3" className="animate-spin" style={{ animationDuration: '6s' }} />
                          )}
                          <circle
                            r={isSelected || isEdgeStart ? '8' : '5'}
                            fill={isEdgeStart ? '#f59e0b' : (isSelected ? '#0ea5e9' : '#64748b')}
                            stroke="#fff"
                            strokeWidth="1.5"
                            className="transition-all hover:scale-125"
                          />
                          {(taggingMode || isDrawingEdges) && (
                            <text y="-10" fontSize="7" fontWeight="bold" fill={theme === 'dark' ? '#94a3b8' : '#475569'} textAnchor="middle" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {poi.name}
                            </text>
                          )}
                        </g>
                      );
                    }

                    // Regular POI rendering
                    if (!isActive && !isSelected && !isStart && !isEnd && !taggingMode && !isDrawingEdges) return null;

                    const nameLines = getLabelLines(poi.name);
                    const maxLineLength = Math.max(...nameLines.map(line => line.length));
                    const boxWidth = Math.max(52, maxLineLength * 6.5 + 16);
                    const boxHeight = 14 + 14 + (nameLines.length * 11);

                    return (
                      <g
                        key={poi.id}
                        transform={`translate(${poi.x}, ${poi.y})`}
                        className="cursor-pointer pointer-events-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDrawingEdges) {
                            handleNodeEdgeClick(poi.id);
                          } else {
                            selectPoi(poi);
                          }
                        }}
                        onMouseDown={(e) => handleNodeMouseDown(e, poi)}
                      >
                        {isEdgeStart && (
                          <circle r="22" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3,3" className="animate-spin" style={{ animationDuration: '6s' }} />
                        )}
                        {/* Blink ring when zoomed to via search */}
                        {blinkPoiId === poi.id && (
                          <>
                            <circle r="28" fill="none" stroke="#fbbf24" strokeWidth="3" className="animate-ping" style={{ animationDuration: '0.6s' }} />
                            <circle r="20" fill="none" stroke="#f59e0b" strokeWidth="2" className="animate-ping" style={{ animationDuration: '0.8s', animationDelay: '0.1s' }} />
                          </>
                        )}
                        {(isSelected || isStart || isEnd) && (
                          <>
                            <circle r="16" fill={color} className="opacity-25 animate-ping" />
                            <circle r="10" fill={color} className="opacity-40 animate-pulse" />
                          </>
                        )}
                        {!(isSelected || isStart || isEnd) && isActive && zoomScale < 1.05 && <circle r="12" fill={color} className="opacity-15 animate-ping" />}
                        
                        {isStart && (
                          <g transform="translate(0,-10)">
                            <title>{`Start Location: ${poi.name}`}</title>
                            <path d="M-8,-16 C-8,-24 8,-24 8,-16 C8,-8 0,0 0,0 C0,0 -8,-8 -8,-16 Z" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
                            <text x="0" y="-12" fontSize="8" fontWeight="bold" fill="#fff" textAnchor="middle">S</text>
                          </g>
                        )}
                        {isEnd && (
                          <g transform="translate(0,-10)">
                            <title>{`Destination: ${poi.name}`}</title>
                            <path d="M-8,-20 C-8,-30 8,-30 8,-20 C8,-10 0,0 0,0 C0,0 -8,-10 -8,-20 Z" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
                            <text x="0" y="-15" fontSize="8" fontWeight="bold" fill="#fff" textAnchor="middle">E</text>
                          </g>
                        )}
                        {!isStart && !isEnd && (zoomScale < 1.05 && !taggingMode && !isDrawingEdges) && (
                          <>
                            {poi.isCustom && (
                              <circle r={isSelected ? '8' : '6'} fill={color} className="opacity-20" />
                            )}
                            <circle
                              r={isSelected ? '6' : '4.5'}
                              fill={color}
                              stroke="#fff"
                              strokeWidth={isSelected ? '2' : '1.5'}
                              className="transition-all duration-300"
                            />
                            {poi.isCustom && (
                              <circle r="2" cx="4" cy="-4" fill="#f59e0b" stroke="#fff" strokeWidth="0.5" />
                            )}
                          </>
                        )}
                        
                        {/* Label Badge (Transparent Halo Text) */}
                        {(zoomScale >= 1.05 || isSelected || taggingMode || isDrawingEdges) && (
                          <g transform="translate(0, 0)" pointerEvents="auto" className="transition-all duration-300 drop-shadow-md">
                            
                            {/* Halo Background Outline */}
                            <text fontFamily="Outfit, sans-serif" textAnchor="middle" fill="none" stroke={theme === 'dark' ? '#0f172a' : '#ffffff'} strokeWidth="4.5" strokeLinejoin="round" className="opacity-90">
                              <tspan x="0" y={-boxHeight / 2 + 15} fontSize="13">
                                {/* Spacing */}
                              </tspan>
                              {nameLines.map((line, lineIdx) => (
                                <tspan key={`bg-${lineIdx}`} x="0" y={-boxHeight / 2 + 28 + lineIdx * 11} fontSize="8.5" fontWeight="800">
                                  {line}
                                </tspan>
                              ))}
                            </text>

                            {/* Foreground Content */}
                            <text fontFamily="Outfit, sans-serif" textAnchor="middle">
                              <tspan x="0" y={-boxHeight / 2 + 15} fontSize="13">
                                {getCategoryIcon(poi.category)}
                              </tspan>
                              {nameLines.map((line, lineIdx) => (
                                <tspan
                                  key={`fg-${lineIdx}`}
                                  x="0"
                                  y={-boxHeight / 2 + 28 + lineIdx * 11}
                                  fontSize="8.5"
                                  fontWeight="800"
                                  fill={isSelected ? '#0ea5e9' : (theme === 'dark' ? '#f8fafc' : '#0f172a')}
                                >
                                  {line}
                                </tspan>
                              ))}
                            </text>
                          </g>
                        )}
                        
                        {/* Red locator search query pin */}
                        {searchQuery.trim() !== '' && isActive && (
                          <g className="animate-search-pin" transform={`translate(0, ${zoomScale >= 1.05 ? -22 : -10})`} pointerEvents="none">
                            <path
                              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                              fill="#ef4444"
                              stroke="#ffffff"
                              strokeWidth="1.5"
                              transform="translate(-12, -22)"
                            />
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </TransformComponent>
          </div>
        )}
      </TransformWrapper>
        );
      })()}

      {/* ── Blocked Edge Hover Tooltip (HTML overlay, tracks mouse) ── */}
      {hoveredBlockedEdge && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: hoveredBlockedEdge.screenX + 16,
            top:  hoveredBlockedEdge.screenY - 10,
          }}
        >
          <div style={{
            background: 'rgba(10,10,14,0.93)',
            border: '1.5px solid rgba(239,68,68,0.55)',
            borderRadius: '12px',
            padding: '10px 14px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(239,68,68,0.25), 0 2px 8px rgba(0,0,0,0.5)',
            minWidth: '160px',
            maxWidth: '220px',
            fontFamily: 'system-ui, sans-serif',
          }}>
            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>🚧</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#fca5a5', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                Path Blocked
              </span>
            </div>

            {/* Reason */}
            {hoveredBlockedEdge.edge.blockReason && (
              <div style={{ fontSize: 11, color: '#f1f5f9', fontWeight: 600, marginBottom: 4 }}>
                {hoveredBlockedEdge.edge.blockReason}
              </div>
            )}

            {/* Duration */}
            {hoveredBlockedEdge.edge.blockDuration && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#94a3b8', marginBottom: 4 }}>
                <span>🕐</span>
                <span>Opens after: <strong style={{ color: '#cbd5e1' }}>{hoveredBlockedEdge.edge.blockDuration}</strong></span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
