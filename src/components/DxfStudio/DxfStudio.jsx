import React, { useState, useRef } from 'react';
import DxfParser from 'dxf-parser';

export default function DxfStudio() {
  const [dxfData, setDxfData] = useState(null);
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Viewport state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parser = new DxfParser();
        const parsed = parser.parseSync(evt.target.result);
        setDxfData(parsed);
        calculateViewport(parsed);
      } catch (err) {
        console.error("DXF Parse Error:", err);
        setError("Failed to parse DXF file. Make sure it is a valid ASCII DXF.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const calculateViewport = (parsed) => {
    // Find min and max bounds to center the DXF
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    if (!parsed.entities) return;

    parsed.entities.forEach(ent => {
      const checkVertex = (v) => {
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
      };

      if (ent.type === 'LINE') {
        checkVertex(ent.vertices[0]);
        checkVertex(ent.vertices[1]);
      } else if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') {
        ent.vertices.forEach(checkVertex);
      }
    });

    if (minX === Infinity) return; // No lines found

    // Canvas size (hardcoded for preview)
    const cw = 1200;
    const ch = 800;

    const dx = maxX - minX;
    const dy = maxY - minY;

    // Scale to fit 80% of canvas
    const sX = (cw * 0.8) / dx;
    const sY = (ch * 0.8) / dy;
    const s = Math.min(sX, sY);

    setScale(s);
    setOffset({
      x: cw / 2 - ((minX + maxX) / 2) * s,
      y: ch / 2 + ((minY + maxY) / 2) * s // Y is inverted in SVG vs CAD
    });
  };

  // Convert CAD coordinates to SVG Viewport coordinates
  const pX = (x) => x * scale + offset.x;
  const pY = (y) => -y * scale + offset.y; 

  const generateGraph = () => {
    if (!dxfData || !dxfData.entities) return;
    
    let nodes = [];
    let edges = [];
    let doors = [];
    let lifts = [];
    
    const SNAP_TOLERANCE = 5; // Distance to merge nodes (CAD units)
    
    const addNode = (x, y, floor, category = 'waypoint', name = '') => {
      // Find if node exists within tolerance
      let existing = nodes.find(n => Math.hypot(n.cadX - x, n.cadY - y) < SNAP_TOLERANCE);
      if (existing) {
        // Upgrade waypoint to specific category if needed
        if (existing.category === 'waypoint' && category !== 'waypoint') {
           existing.category = category;
           existing.name = name;
        }
        return existing.id;
      }
      
      const id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      nodes.push({
        id,
        cadX: x,
        cadY: y,
        x: Math.round(pX(x)),
        y: Math.round(pY(y)),
        floor: floor || 'arrival',
        category,
        name: name || `Node ${nodes.length + 1}`
      });
      return id;
    };

    // 1. Process PATH layer first
    const pathEntities = dxfData.entities.filter(e => e.layer === 'PATH');
    pathEntities.forEach(ent => {
      if (ent.type === 'LINE') {
        const id1 = addNode(ent.vertices[0].x, ent.vertices[0].y, 'arrival');
        const id2 = addNode(ent.vertices[1].x, ent.vertices[1].y, 'arrival');
        
        edges.push({
          id: `edge_${id1}_${id2}`,
          from: id1,
          to: id2,
          distance: Math.round(Math.hypot(ent.vertices[0].x - ent.vertices[1].x, ent.vertices[0].y - ent.vertices[1].y))
        });
      } else if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') {
        for (let i = 0; i < ent.vertices.length - 1; i++) {
          const id1 = addNode(ent.vertices[i].x, ent.vertices[i].y, 'arrival');
          const id2 = addNode(ent.vertices[i+1].x, ent.vertices[i+1].y, 'arrival');
          edges.push({
            id: `edge_${id1}_${id2}`,
            from: id1,
            to: id2,
            distance: Math.round(Math.hypot(ent.vertices[i].x - ent.vertices[i+1].x, ent.vertices[i].y - ent.vertices[i+1].y))
          });
        }
      }
    });

    // 2. Process DOOR Layer
    dxfData.entities.filter(e => e.layer === 'DOOR').forEach(ent => {
      if (ent.type === 'LINE' || ent.type === 'LWPOLYLINE') {
        const center = {
          x: (ent.vertices[0].x + ent.vertices[1].x) / 2,
          y: (ent.vertices[0].y + ent.vertices[1].y) / 2
        };
        doors.push(center);
      }
    });

    // 3. Process LIFT / ESCALATOR / STAIR
    dxfData.entities.filter(e => ['LIFT', 'ESCALATOR', 'STAIR'].includes(e.layer)).forEach(ent => {
      if (ent.type === 'LINE' || ent.type === 'LWPOLYLINE') {
         const center = {
          x: (ent.vertices[0].x + ent.vertices[1].x) / 2,
          y: (ent.vertices[0].y + ent.vertices[1].y) / 2
        };
        addNode(center.x, center.y, 'arrival', ent.layer.toLowerCase(), `${ent.layer} 1`);
      }
    });

    // 4. Snap Doors to nearest Path Nodes
    doors.forEach(door => {
      let nearest = null;
      let minDist = Infinity;
      nodes.forEach(n => {
        const dist = Math.hypot(n.cadX - door.x, n.cadY - door.y);
        if (dist < minDist) {
          minDist = dist;
          nearest = n;
        }
      });

      if (nearest && minDist < 50) { // Snapping threshold
         nearest.category = 'gate';
         nearest.name = 'Gate / Door';
      }
    });

    setGraph({ nodes, edges });
  };

  const downloadJson = () => {
    if (!graph) return;
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nav_graph_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-screen bg-slate-900 text-slate-200 flex flex-col font-sans">
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-indigo-400">DXF Auto-Graph Studio</h1>
          <p className="text-xs text-slate-400">Upload CAD files to auto-generate indoor navigation networks</p>
        </div>
        <div className="flex gap-3">
          <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow cursor-pointer text-sm font-semibold transition-colors">
            Upload DXF File
            <input type="file" accept=".dxf" className="hidden" onChange={handleFileUpload} />
          </label>
          <button 
            onClick={generateGraph} 
            disabled={!dxfData}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded shadow text-sm font-semibold transition-colors"
          >
            Auto-Generate Graph
          </button>
          <button 
            onClick={downloadJson} 
            disabled={!graph}
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded shadow text-sm font-semibold transition-colors"
          >
            Export JSON
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-slate-950 flex justify-center items-center">
        {loading && <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-50 text-indigo-400">Parsing CAD...</div>}
        {error && <div className="text-rose-500 bg-rose-900/30 px-6 py-4 rounded">{error}</div>}
        
        {(!dxfData && !loading) && (
          <div className="text-slate-500 flex flex-col items-center">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <p>Upload a .dxf file to begin</p>
          </div>
        )}

        {dxfData && (
          <svg className="w-full h-full cursor-crosshair" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet">
            {/* Draw Raw DXF Architecture (Background) */}
            <g className="dxf-background opacity-30">
              {dxfData.entities.map((ent, i) => {
                if (['PATH', 'DOOR', 'LIFT', 'ESCALATOR', 'STAIR'].includes(ent.layer)) return null; // Skip nav layers for bg
                
                if (ent.type === 'LINE') {
                  return (
                    <line key={`bg_${i}`} x1={pX(ent.vertices[0].x)} y1={pY(ent.vertices[0].y)} x2={pX(ent.vertices[1].x)} y2={pY(ent.vertices[1].y)} stroke="#94a3b8" strokeWidth="1" />
                  );
                }
                if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') {
                  const pts = ent.vertices.map(v => `${pX(v.x)},${pY(v.y)}`).join(' ');
                  return <polyline key={`bg_${i}`} points={pts} fill="none" stroke="#94a3b8" strokeWidth="1" />;
                }
                if (ent.type === 'CIRCLE') {
                   return <circle key={`bg_${i}`} cx={pX(ent.center.x)} cy={pY(ent.center.y)} r={ent.radius * scale} fill="none" stroke="#94a3b8" strokeWidth="1" />
                }
                return null;
              })}
            </g>

            {/* Draw Raw Paths (Semi-transparent) */}
            {!graph && (
              <g className="dxf-paths opacity-60">
                 {dxfData.entities.filter(e => e.layer === 'PATH').map((ent, i) => {
                    if (ent.type === 'LINE') {
                      return <line key={`path_${i}`} x1={pX(ent.vertices[0].x)} y1={pY(ent.vertices[0].y)} x2={pX(ent.vertices[1].x)} y2={pY(ent.vertices[1].y)} stroke="#38bdf8" strokeWidth="2" />;
                    }
                    if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') {
                      const pts = ent.vertices.map(v => `${pX(v.x)},${pY(v.y)}`).join(' ');
                      return <polyline key={`path_${i}`} points={pts} fill="none" stroke="#38bdf8" strokeWidth="2" />;
                    }
                    return null;
                 })}
              </g>
            )}

            {/* Draw Generated Graph */}
            {graph && (
              <g className="generated-graph">
                {/* Edges */}
                {graph.edges.map(e => {
                  const n1 = graph.nodes.find(n => n.id === e.from);
                  const n2 = graph.nodes.find(n => n.id === e.to);
                  if(!n1 || !n2) return null;
                  return (
                    <line key={e.id} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} stroke="#10b981" strokeWidth="3" opacity="0.8" />
                  );
                })}
                
                {/* Nodes */}
                {graph.nodes.map(n => (
                  <circle 
                    key={n.id} 
                    cx={n.x} 
                    cy={n.y} 
                    r={n.category === 'waypoint' ? 3 : 6} 
                    fill={n.category === 'waypoint' ? '#fbbf24' : '#ef4444'} 
                    stroke="#fff" 
                    strokeWidth="1.5"
                  >
                    <title>{n.name} ({n.category})</title>
                  </circle>
                ))}
              </g>
            )}
          </svg>
        )}
      </div>
      
      {/* Footer Stats */}
      {graph && (
        <div className="bg-slate-800 text-xs p-2 text-center text-emerald-400 font-mono border-t border-slate-700">
           Successfully generated {graph.nodes.length} Nodes and {graph.edges.length} Edges.
        </div>
      )}
    </div>
  );
}
