import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/useMapStore';
import Search from '../Search/Search';
import TaggingPanel from './TaggingPanel';
import FloorManager from './FloorManager';
import {
  FiCompass, FiNavigation, FiChevronsLeft, FiChevronsRight,
  FiClock, FiTag, FiSearch, FiEdit3, FiGitCommit, FiLoader, FiLayers,
  FiArrowUp, FiCornerUpRight, FiCornerUpLeft, FiMapPin, FiTrendingUp, FiCheck
} from 'react-icons/fi';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('explore');
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-close sidebar on mobile when a POI is selected via search
  useEffect(() => {
    const handler = () => { if (window.innerWidth < 768) setIsOpen(false); };
    window.addEventListener('map:poi-selected', handler);
    return () => window.removeEventListener('map:poi-selected', handler);
  }, []);

  const {
    currentFloor, pois, selectPoi,
    navigationMode, setNavigationMode,
    navigationStart, setNavigationStart,
    navigationEnd, setNavigationEnd,
    navigationPath, getFlatPois, selectedPoi,
    taggingMode, routeBuilderMode,
    draftRouteDistance, setDraftRouteDistance,
    isSavingRoute, saveCustomRoute, deleteCustomRoute,
    navigationDistance,
    navigationOptions, setNavigationOptions,
    navigationRoutes, activeRouteIndex, setActiveRouteIndex,
    nodes, isAdminMode
  } = useMapStore();

  // Helper: close sidebar, switch to start floor, then zoom to starting point
  const viewOnMap = () => {
    if (!navigationStart) return;
    setIsOpen(false);

    const { setFloor: switchFloor } = useMapStore.getState();

    // Step 1: Switch to the starting floor
    switchFloor(navigationStart.floor);

    // Step 2: After floor animation + sidebar close, zoom to start point
    setTimeout(() => {
      if (window.__mapZoomToPoint) {
        window.__mapZoomToPoint(navigationStart.x, navigationStart.y, 3.5);
      }
    }, 500); // Give floor transition time to complete
  };

  const flatPois = getFlatPois();

  // Show nodes from all floors in navigate dropdowns
  const allNavigableNodes = nodes.filter(
    n => n.category !== 'waypoint'
  );

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  useEffect(() => {
    if (taggingMode && activeTab !== 'tagging') {
      setActiveTab('tagging');
      if (!isOpen) setIsOpen(true);
    }
    if (navigationMode && activeTab !== 'navigate') {
      setActiveTab('navigate');
      if (!isOpen) setIsOpen(true);
    }
  }, [taggingMode, navigationMode, activeTab, isOpen]);

  const categories = [
    { key: 'gate',      label: 'Gates',      icon: '✈️' },
    { key: 'checkin',   label: 'Check-in',   icon: '🧳' },
    { key: 'baggage',   label: 'Baggage',    icon: '🛄' },
    { key: 'security',  label: 'Security',   icon: '🛡️' },
    { key: 'lounge',    label: 'Lounges',    icon: '🍷' },
    { key: 'washroom',  label: 'Restrooms',  icon: '🚻' },
  ];

  const allTabs = [
    { id: 'explore',    label: 'Explore',    icon: <FiSearch className="w-3.5 h-3.5" /> },
    { id: 'navigate',   label: 'Directions', icon: <FiCompass className="w-3.5 h-3.5" /> },
    { id: 'tagging',    label: 'Tag',        icon: <FiEdit3 className="w-3.5 h-3.5" /> },
    { id: 'floors',     label: 'Floors',     icon: <FiLayers className="w-3.5 h-3.5" /> },
  ];
  
  const tabs = isAdminMode ? allTabs : allTabs.filter(t => t.id === 'explore' || t.id === 'navigate');

  const compileDirections = () => {
    if (!navigationPath?.length || !navigationStart || !navigationEnd) return [];
    const { nodes } = useMapStore.getState();
    const steps = [];
    
    const pathNodes = [];
    navigationPath.forEach(pt => {
      const matched = nodes.find(n => n.x === pt.x && n.y === pt.y && n.floor === pt.floor);
      if (matched) pathNodes.push(matched);
    });
    
    if (pathNodes.length < 2) {
      return [{ type: 'end', text: 'Walk directly to your destination.', icon: <FiCheck /> }];
    }

    steps.push({ type: 'start', text: `Start at ${navigationStart.name}`, desc: `${capitalize(navigationStart.floor)} Level`, icon: <FiMapPin /> });
    
    let currentFloorName = navigationStart.floor;
    
    for (let i = 1; i < pathNodes.length - 1; i++) {
      const prev = pathNodes[i - 1];
      const curr = pathNodes[i];
      const next = pathNodes[i + 1];

      // Floor Switch
      if (curr.floor !== currentFloorName) {
        currentFloorName = curr.floor;
        continue; // Handled by lift/escalator node action
      }

      // Vertical Transit
      if (curr.category === 'lift' || curr.category === 'escalator' || curr.category === 'elevator') {
        steps.push({ 
          type: 'elevator',
          text: `Take the ${curr.name || curr.category}`,
          desc: `To floor ${capitalize(next.floor)}`,
          icon: <FiTrendingUp />,
          action: { type: 'switch_floor', floor: next.floor }
        });
        currentFloorName = next.floor;
        continue;
      }
      
      // Security/Immigration
      if (curr.category === 'security' || curr.category === 'immigration') {
        steps.push({ type: 'security', text: `Pass through ${curr.name || curr.category}`, icon: <FiCheck /> });
        continue;
      }

      // Calculate Turn Angle
      if (curr.category !== 'waypoint') {
        // Vector math
        const dx1 = curr.x - prev.x;
        const dy1 = curr.y - prev.y;
        const dx2 = next.x - curr.x;
        const dy2 = next.y - curr.y;
        
        const angle1 = Math.atan2(dy1, dx1);
        const angle2 = Math.atan2(dy2, dx2);
        
        let diff = (angle2 - angle1) * (180 / Math.PI);
        while (diff <= -180) diff += 360;
        while (diff > 180) diff -= 360;
        
        let turnType = 'straight';
        let turnText = 'Continue straight past';
        let Icon = FiArrowUp;
        
        if (diff > 30 && diff <= 150) {
          turnType = 'right';
          turnText = 'Turn Right at';
          Icon = FiCornerUpRight;
        } else if (diff < -30 && diff >= -150) {
          turnType = 'left';
          turnText = 'Turn Left at';
          Icon = FiCornerUpLeft;
        } else if (diff > 150 || diff < -150) {
          turnType = 'uturn';
          turnText = 'Turn Around at';
          Icon = FiArrowUp; // fallback
        }
        
        steps.push({ 
          type: turnType,
          text: `${turnText} ${curr.name}`,
          icon: <Icon />
        });
      }
    }
    
    steps.push({ type: 'end', text: `Arrive at ${navigationEnd.name}`, icon: <FiCheck /> });
    return steps;
  };

  return (
    <div className="relative h-full flex z-40">
      {/* ── Main Drawer ── */}
      <motion.div
        animate={{ width: isOpen ? (isMobile ? 'calc(100vw - 48px)' : '380px') : '0px' }}
        transition={{ type: 'spring', damping: 25, stiffness: 150 }}
        className="h-full overflow-hidden bg-white/70 dark:bg-slate-950/60 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-900/50 shadow-2xl flex flex-col"
      >
        {/* Branding */}
        <div className="p-6 pb-4 flex items-center gap-3 border-b border-slate-200/20 dark:border-slate-800/30 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg text-white text-lg font-bold">✈️</div>
          <div>
            <h1 className="text-md font-bold text-slate-800 dark:text-slate-100 tracking-wide">CHENNAI AIRPORT T1</h1>
            <p className="text-xs text-sky-500 dark:text-sky-400 font-semibold tracking-wider uppercase">Domestic Interactive Map</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4 flex-shrink-0">
          <Search />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200/20 dark:border-slate-800/30 px-4 flex-shrink-0 gap-0.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 pb-3 pt-1 text-xs font-semibold border-b-2 transition duration-200 flex-1 justify-center ${
                activeTab === tab.id
                  ? 'border-sky-500 text-sky-500 dark:text-sky-400'
                  : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar relative">
          <AnimatePresence mode="wait">

            {/* ── Explore ── */}
            {activeTab === 'explore' && (
              <motion.div key="explore" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col gap-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Categories on current level</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {categories.map(cat => {
                      const count = pois[currentFloor]?.filter(p => p.category === cat.key).length || 0;
                      return (
                        <button key={cat.key} onClick={() => { 
                          const p = pois[currentFloor]?.find(x => x.category === cat.key); 
                          if (p) {
                            selectPoi(p);
                            if (isMobile) setIsOpen(false);
                          }
                        }}
                          className="flex flex-col items-start p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/30 transition text-left group">
                          <span className="text-xl mb-2 group-hover:scale-110 transition-transform duration-200">{cat.icon}</span>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{cat.label}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{count} places</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Places on this level</h3>
                  <div className="flex flex-col gap-2">
                    {pois[currentFloor]?.slice(0, 6).map(poi => (
                      <div key={poi.id} className="flex flex-col">
                        <button onClick={() => {
                            selectPoi(poi);
                            if (isMobile) setIsOpen(false);
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/60 border border-transparent hover:border-slate-200/30 transition text-left ${selectedPoi?.id === poi.id ? 'bg-sky-500/10 dark:bg-sky-500/5 border-sky-500/20' : ''}`}>
                          <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center text-sm overflow-hidden flex-shrink-0">
                            {poi.imageUrl ? (
                              <img src={poi.imageUrl} alt={poi.name} className="w-full h-full object-cover" />
                            ) : (
                              poi.isCustom ? '📍' : '🏢'
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{poi.name}</h4>
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{poi.description}</p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{poi.category}</span>
                        </button>
                        {selectedPoi?.id === poi.id && (
                          <div className="pl-14 pr-3 pb-3 flex gap-2 animate-in slide-in-from-top-1 -mt-1">
                            <button
                              onClick={() => { setNavigationMode(true); if (navigationEnd?.id === poi.id) setNavigationEnd(null); setNavigationStart(poi); setActiveTab('navigate'); }}
                              className="text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg flex-1 shadow-sm transition uppercase tracking-wider text-center cursor-pointer outline-none"
                            >From Here</button>
                            <button
                              onClick={() => { setNavigationMode(true); if (navigationStart?.id === poi.id) setNavigationStart(null); setNavigationEnd(poi); setActiveTab('navigate'); }}
                              className="text-[10px] font-bold bg-sky-500 hover:bg-sky-600 text-white px-2.5 py-1.5 rounded-lg flex-1 shadow-sm transition uppercase tracking-wider text-center cursor-pointer outline-none"
                            >To Here</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Directions ── */}
            {activeTab === 'navigate' && (
              <motion.div key="navigate" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col gap-6">
                {!navigationMode ? (
                  <div className="text-center py-6 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-sky-100 dark:bg-sky-950/30 flex items-center justify-center text-sky-500 text-2xl mb-4 animate-bounce">🧭</div>
                    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-2">Indoor Navigation</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 max-w-[240px]">Get precise path directions between gates, shops, lounges, and facilities.</p>
                    <button onClick={() => setNavigationMode(true)} className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm shadow-lg shadow-sky-500/20 transition active:scale-95">
                      Start Route Finder
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Start Point</label>
                      <select value={navigationStart?.id || ''} onChange={e => {
                        setNavigationStart(nodes.find(p => p.id === e.target.value));
                        // Do NOT auto-close - user must click View on Map
                      }}
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500">
                        <option value="">Select starting location...</option>
                        {allNavigableNodes.map(p => <option key={p.id} value={p.id}>{p.name} ({capitalize(p.floor)})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Destination</label>
                      <select value={navigationEnd?.id || ''} onChange={e => {
                        setNavigationEnd(nodes.find(p => p.id === e.target.value));
                        // Do NOT auto-close - user must click View on Map
                      }}
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500">
                        <option value="">Select destination...</option>
                        {allNavigableNodes.map(p => <option key={p.id} value={p.id}>{p.name} ({capitalize(p.floor)})</option>)}
                      </select>
                    </div>

                    {/* Routing Criteria */}
                    <div className="flex gap-4 p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/30 dark:border-slate-800/30 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-600 dark:text-slate-400">
                        <input type="checkbox" checked={navigationOptions?.wheelchairOnly || false}
                          onChange={(e) => setNavigationOptions({ wheelchairOnly: e.target.checked })}
                          className="rounded border-slate-300 dark:border-slate-700 text-sky-500 focus:ring-sky-400" />
                        Wheelchair Route
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-600 dark:text-slate-400">
                        <input type="checkbox" checked={navigationOptions?.avoidClosed !== false}
                          onChange={(e) => setNavigationOptions({ avoidClosed: e.target.checked })}
                          className="rounded border-slate-300 dark:border-slate-700 text-sky-500 focus:ring-sky-400" />
                        Avoid Blocked Paths
                      </label>
                    </div>

                    {navigationPath ? (
                      <div className="mt-2">
                        {/* Alternative Route Selector */}
                        {navigationRoutes && navigationRoutes.length > 1 && (
                          <div className="flex gap-2 p-1 mb-4 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl">
                            {navigationRoutes.map((route, idx) => (
                              <button
                                key={idx}
                                onClick={() => setActiveRouteIndex(idx)}
                                className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${
                                  activeRouteIndex === idx
                                    ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                              >
                                Via {route.type}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between mb-3 border-b border-slate-200/20 dark:border-slate-800/30 pb-2">
                          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Route Directions</h4>
                          <span className="text-[10px] text-sky-500 dark:text-sky-400 font-bold flex items-center gap-1">
                            <FiClock className="w-3 h-3" />
                            {navigationDistance > 0 ? (
                              `${navigationDistance} m • ~${Math.max(1, Math.round(navigationDistance / 80))} min walk`
                            ) : (
                              `~${navigationStart.floor === navigationEnd.floor ? '3' : '6'} min walk`
                            )}
                          </span>
                        </div>
                        <div className="relative pl-6 pb-4">
                          {/* Timeline vertical line */}
                          <div className="absolute left-[11px] top-4 bottom-6 w-[2px] bg-slate-200 dark:bg-slate-800 rounded-full" />
                          
                          <div className="flex flex-col gap-6">
                            {compileDirections().map((step, i, arr) => {
                              const isStart = step.type === 'start';
                              const isEnd = step.type === 'end';
                              const isElevator = step.type === 'elevator';
                              const isTurn = step.type === 'left' || step.type === 'right' || step.type === 'uturn';
                              
                              let iconBg = "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400";
                              let iconBorder = "border-4 border-white/70 dark:border-slate-950/60";
                              if (isStart) iconBg = "bg-emerald-500 text-white shadow-md shadow-emerald-500/20";
                              if (isEnd) iconBg = "bg-sky-500 text-white shadow-md shadow-sky-500/20";
                              if (isElevator) iconBg = "bg-purple-500 text-white shadow-md shadow-purple-500/20";
                              if (isTurn) iconBg = "bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-900 shadow-sm";
                              
                              return (
                                <div key={i} className="relative flex items-start gap-3.5 text-xs leading-normal group">
                                  {/* Icon Bubble */}
                                  <div className={`absolute -left-[27.5px] z-10 w-7 h-7 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${iconBg} ${iconBorder}`}>
                                    {step.icon ? React.cloneElement(step.icon, { className: "w-3.5 h-3.5" }) : <FiArrowUp className="w-3.5 h-3.5" />}
                                  </div>
                                  
                                  {/* Content */}
                                  <div className="flex flex-col gap-0.5 w-full pt-1.5">
                                    <span className={`font-semibold ${isStart || isEnd ? 'text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>
                                      {step.text}
                                    </span>
                                    {step.desc && (
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold mt-0.5 block">
                                        {step.desc}
                                      </span>
                                    )}
                                    
                                    {/* Floor Switch Action */}
                                    {step.action && step.action.type === 'switch_floor' && step.action.floor !== currentFloor && (
                                      <button
                                        onClick={() => {
                                          const targetFloor = step.action.floor;
                                          // Switch floor
                                          useMapStore.getState().setFloor(targetFloor);

                                          // Find the first node on the new floor in the navigation path
                                          const { navigationPath, nodes } = useMapStore.getState();
                                          const firstNodeOnFloor = navigationPath?.find(pt => pt.floor === targetFloor);

                                          // Zoom to that entry point after floor transition
                                          if (firstNodeOnFloor && window.__mapZoomToPoint) {
                                            setTimeout(() => {
                                              window.__mapZoomToPoint(firstNodeOnFloor.x, firstNodeOnFloor.y, 3.5);
                                            }, 350);
                                          }
                                        }}
                                        className="mt-2 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50 hover:bg-sky-500 hover:text-white hover:border-transparent px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider w-fit transition-all active:scale-95 shadow-sm"
                                      >
                                        View {capitalize(step.action.floor)} Level ➔
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (navigationStart && navigationEnd && (
                      <div className="mt-2 p-3 rounded-lg border border-dashed border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 text-center">
                        <p className="text-xs text-red-600 dark:text-red-500 font-medium">
                          No route found. Verify that the start and destination locations are connected by nodes on the map.
                        </p>
                      </div>
                    ))}

                    <button onClick={() => setNavigationMode(false)} className="mt-4 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0f172a] font-semibold text-xs transition">
                      Clear Selection
                    </button>

                    {/* View on Map - shown when both start & destination are selected */}
                    {navigationStart && navigationEnd && (
                      <button
                        onClick={viewOnMap}
                        className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2.5 active:scale-95 transition-all"
                      >
                        <span>🗺️</span> View Route on Map
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Floor Manager ── */}
            {activeTab === 'floors' && isAdminMode && (
              <motion.div key="floors" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <FloorManager />
              </motion.div>
            )}

            {/* ── Editor/Tagging ── */}
            {activeTab === 'tagging' && isAdminMode && (
              <motion.div key="tagging" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <TaggingPanel />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>

      {/* Toggle Button */}
      <div className="h-full flex items-center justify-center p-2 pointer-events-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-10 flex items-center justify-center rounded-r-xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border-y border-r border-slate-200/50 dark:border-slate-800/50 text-slate-500 dark:text-slate-300 shadow-xl pointer-events-auto hover:bg-white dark:hover:bg-slate-800 transition active:scale-95"
          aria-label={isOpen ? 'Close Sidebar' : 'Open Sidebar'}
        >
          {isOpen ? <FiChevronsLeft className="w-5 h-5" /> : <FiChevronsRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
