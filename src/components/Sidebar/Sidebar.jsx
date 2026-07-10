import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/useMapStore';
import Search from '../Search/Search';
import SearchableSelect from './SearchableSelect';
import TaggingPanel from './TaggingPanel';
import FloorManager from './FloorManager';
import SettingsManager from './SettingsManager';
import {
  FiCompass, FiNavigation, FiChevronsLeft, FiChevronsRight,
  FiClock, FiTag, FiSearch, FiEdit3, FiGitCommit, FiLoader, FiLayers,
  FiArrowUp, FiCornerUpRight, FiCornerUpLeft, FiMapPin, FiTrendingUp, FiCheck, FiSettings
} from 'react-icons/fi';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('explore');
  const [activeCategory, setActiveCategory] = useState('gate');
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
    currentFloor, setFloor, floors, pois, selectPoi,
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

    const { setFloor: switchFloor, zoomMapTo } = useMapStore.getState();

    // Switch to start floor (skip auto-reset)
    window.__mapSkipNextReset = true;
    switchFloor(navigationStart.floor);

    // Queue zoom via store — AirportMap useEffect will fire it
    setTimeout(() => zoomMapTo(navigationStart.x, navigationStart.y, 3.5), 300);
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
    { id: 'settings',   label: 'Settings',   icon: <FiSettings className="w-3.5 h-3.5" /> },
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

  // ── Shared tab content renderer ───────────────────────────────────────────
  const renderTabContent = () => (
    <AnimatePresence mode="wait">
      {/* Explore */}
      {activeTab === 'explore' && (
        <motion.div key="explore" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-5">
          
          {/* Floor Selector */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-800/30 shadow-inner">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex justify-between items-center">
              <span>Current Floor</span>
              <span className="text-sky-500 bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 rounded-md">{floors.find(f => f.id === currentFloor)?.name || 'Unknown'}</span>
            </h3>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 pt-1 -mx-2 px-2 snap-x">
              {floors.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFloor(f.id)}
                  className={`snap-center flex-shrink-0 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${
                    currentFloor === f.id 
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/30 border border-transparent' 
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-sky-300/50 dark:hover:border-sky-500/30'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Categories</h3>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(cat => {
                const count = pois[currentFloor]?.filter(p => p.category === cat.key).length || 0;
                const isActive = activeCategory === cat.key;
                return (
                  <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                    className={`flex flex-col items-center p-3 rounded-2xl transition-all active:scale-95 gap-1.5 border ${isActive ? 'bg-sky-50 dark:bg-slate-800/80 border-sky-400/50 shadow-sm shadow-sky-500/20' : 'bg-slate-50 hover:bg-sky-50 dark:bg-slate-900/60 dark:hover:bg-sky-950/40 border-slate-200/50 dark:border-slate-800/30'}`}>
                    <span className="text-2xl">{cat.icon}</span>
                    <span className={`text-[10px] font-bold leading-tight text-center ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-600 dark:text-slate-300'}`}>{cat.label}</span>
                    <span className="text-[9px] text-slate-400 font-medium">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {(() => {
            const categoryPlaces = pois[currentFloor]?.filter(p => p.category === activeCategory) || [];
            const activeCatObj = categories.find(c => c.key === activeCategory);
            
            return (
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                  {activeCatObj ? activeCatObj.label : 'Places'} ({categoryPlaces.length})
                </h3>
                {categoryPlaces.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/30">
                    <span className="text-3xl opacity-50 block mb-2">🤷‍♂️</span>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No places found in this category.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {categoryPlaces.map(poi => (
                      <div key={poi.id} className="flex flex-col">
                        <button onClick={() => { 
                          selectPoi(poi); 
                          useMapStore.getState().zoomMapTo(poi.x, poi.y, 3.5);
                          if (isMobile) setIsOpen(false); 
                        }}
                          className={`flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-98 text-left ${selectedPoi?.id === poi.id ? 'bg-sky-500/10 dark:bg-sky-500/10 ring-1 ring-sky-500/30' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}>
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-base flex-shrink-0 overflow-hidden">
                            {poi.imageUrl ? <img src={poi.imageUrl} alt="" className="w-full h-full object-cover" /> : (poi.isCustom ? '📍' : activeCatObj?.icon || '🏢')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{poi.name}</p>
                            <p className="text-xs text-slate-400 truncate">{poi.description || poi.category}</p>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex-shrink-0">{poi.category}</span>
                        </button>
                        {selectedPoi?.id === poi.id && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pl-12 pr-3 pb-2 flex gap-2">
                            <button onClick={() => { setNavigationMode(true); if (navigationEnd?.id === poi.id) setNavigationEnd(null); setNavigationStart(poi); setActiveTab('navigate'); }}
                              className="flex-1 py-2 text-[11px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition active:scale-95">From Here</button>
                            <button onClick={() => { setNavigationMode(true); if (navigationStart?.id === poi.id) setNavigationStart(null); setNavigationEnd(poi); setActiveTab('navigate'); }}
                              className="flex-1 py-2 text-[11px] font-bold bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition active:scale-95">To Here</button>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Navigate */}
      {activeTab === 'navigate' && (
        <motion.div key="navigate" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-4">
          {!navigationMode ? (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-sky-500/30">🧭</div>
              <div className="text-center"><h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">Indoor Navigation</h3><p className="text-xs text-slate-400 max-w-[220px]">Find the fastest path between any two points in the airport.</p></div>
              <button onClick={() => setNavigationMode(true)} className="px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm shadow-lg shadow-sky-500/25 transition active:scale-95">Start Route Finder</button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Start/End selects */}
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/30">
                <div className="flex items-center gap-3 relative z-[60]">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-black">A</span></div>
                  <SearchableSelect
                    placeholder="Starting point..."
                    options={allNavigableNodes.map(p => ({ value: p.id, label: `${p.name} · ${capitalize(p.floor)}` }))}
                    value={navigationStart?.id || ''}
                    onChange={val => setNavigationStart(nodes.find(p => p.id === val))}
                  />
                </div>
                <div className="ml-4 w-0.5 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="flex items-center gap-3 relative z-[50]">
                  <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-black">B</span></div>
                  <SearchableSelect
                    placeholder="Destination..."
                    options={allNavigableNodes.map(p => ({ value: p.id, label: `${p.name} · ${capitalize(p.floor)}` }))}
                    value={navigationEnd?.id || ''}
                    onChange={val => setNavigationEnd(nodes.find(p => p.id === val))}
                  />
                </div>
              </div>

              {/* Options */}
              <div className="flex gap-3 px-1 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-500 dark:text-slate-400">
                  <input type="checkbox" checked={navigationOptions?.wheelchairOnly || false} onChange={e => setNavigationOptions({ wheelchairOnly: e.target.checked })} className="rounded border-slate-300 text-sky-500" />♿ Wheelchair
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-500 dark:text-slate-400">
                  <input type="checkbox" checked={navigationOptions?.avoidClosed !== false} onChange={e => setNavigationOptions({ avoidClosed: e.target.checked })} className="rounded border-slate-300 text-sky-500" />🚧 Avoid Blocked
                </label>
              </div>

              {/* View on Map CTA */}
              {navigationStart && navigationEnd && (
                <button onClick={viewOnMap} className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-sm shadow-xl shadow-sky-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <span>🗺️</span> View Route on Map
                </button>
              )}

              {/* Directions timeline */}
              {navigationPath && (
                <div className="mt-1">
                  {navigationRoutes && navigationRoutes.length > 1 && (
                    <div className="flex gap-1 p-1 mb-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                      {navigationRoutes.map((r, idx) => (
                        <button key={idx} onClick={() => setActiveRouteIndex(idx)}
                          className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${activeRouteIndex === idx ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-sm' : 'text-slate-400'}`}>
                          Via {r.type}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Directions</span>
                    <span className="text-[10px] font-bold text-sky-500 flex items-center gap-1">
                      <FiClock className="w-3 h-3"/>
                      {navigationDistance > 0 ? `${navigationDistance}m · ~${Math.max(1, Math.round(navigationDistance/80))} min` : '~3 min'}
                    </span>
                  </div>
                  <div className="relative pl-6">
                    <div className="absolute left-[11px] top-4 bottom-6 w-0.5 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="flex flex-col gap-5">
                      {compileDirections().map((step, i) => {
                        const isStart = step.type === 'start', isEnd = step.type === 'end', isElevator = step.type === 'elevator', isTurn = ['left','right','uturn'].includes(step.type);
                        let iconCls = "bg-slate-100 dark:bg-slate-800 text-slate-500";
                        if (isStart) iconCls = "bg-emerald-500 text-white shadow-md shadow-emerald-500/30";
                        if (isEnd) iconCls = "bg-sky-500 text-white shadow-md shadow-sky-500/30";
                        if (isElevator) iconCls = "bg-violet-500 text-white shadow-md shadow-violet-500/30";
                        if (isTurn) iconCls = "bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-900";
                        return (
                          <div key={i} className="relative flex items-start gap-3 text-xs">
                            <div className={`absolute -left-[27px] z-10 w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-950 ${iconCls}`}>
                              {step.icon ? React.cloneElement(step.icon, { className: "w-3.5 h-3.5" }) : <FiArrowUp className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex flex-col gap-1 pt-1 w-full">
                              <span className={`font-semibold leading-snug ${isStart || isEnd ? 'text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>{step.text}</span>
                              {step.desc && <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{step.desc}</span>}
                              {step.action?.type === 'switch_floor' && step.action.floor !== currentFloor && (
                                <button onClick={() => {
                                  const { setFloor: sf, navigationPath: np, zoomMapTo: zmt } = useMapStore.getState();
                                  window.__mapSkipNextReset = true; sf(step.action.floor);
                                  const entry = np?.find(pt => pt.floor === step.action.floor);
                                  if (entry) setTimeout(() => zmt(entry.x, entry.y, 3.5), 200);
                                }} className="mt-1.5 bg-sky-500/10 hover:bg-sky-500 text-sky-600 hover:text-white dark:text-sky-400 border border-sky-300/50 dark:border-sky-800/50 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider w-fit transition-all active:scale-95">
                                  Go to {capitalize(step.action.floor)} ➔
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {!navigationPath && navigationStart && navigationEnd && (
                <div className="p-4 rounded-2xl border border-dashed border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 text-center">
                  <p className="text-xs text-red-500 font-medium">No route found between these points.</p>
                </div>
              )}
              <button onClick={() => setNavigationMode(false)} className="py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900/30 transition">Clear</button>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'floors' && isAdminMode && <motion.div key="floors" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><FloorManager /></motion.div>}
      {activeTab === 'tagging' && isAdminMode && <motion.div key="tagging" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><TaggingPanel /></motion.div>}
      {activeTab === 'settings' && isAdminMode && <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><SettingsManager /></motion.div>}
    </AnimatePresence>
  );

  // ── MOBILE: Bottom Sheet + Bottom Nav ─────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Bottom Sheet Overlay */}
        <AnimatePresence>
          {isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={() => setIsOpen(false)} />
          )}
        </AnimatePresence>

        {/* Bottom Sheet Panel */}
        <motion.div
          initial={false}
          animate={{ y: isOpen ? 0 : '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 250 }}
          className="fixed bottom-16 left-0 right-0 z-50 pointer-events-auto"
          style={{ maxHeight: '72vh' }}
        >
          <div className="mx-2 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-700/30 overflow-hidden flex flex-col" style={{ maxHeight: '72vh' }}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-pointer" onClick={() => setIsOpen(false)}>
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>
            {/* Header */}
            <div className="px-5 pt-2 pb-3 flex flex-col gap-3 flex-shrink-0 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-sm shadow-md overflow-hidden p-1 bg-white flex-shrink-0">
                    {useMapStore.getState().appSettings?.logo_url ? (
                      <img src={useMapStore.getState().appSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      '✈️'
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-wide truncate">{useMapStore.getState().appSettings?.name || 'Admin Navigation'}</p>
                    <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">Indoor Map</p>
                  </div>
                </div>
              </div>
              
              {/* Mini tab pills (Moved to own row to prevent squishing) */}
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar snap-x">
                {tabs.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`snap-center whitespace-nowrap px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${activeTab === t.id ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 p-4 custom-scrollbar overscroll-contain">
              {renderTabContent()}
            </div>
          </div>
        </motion.div>

        {/* Bottom Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200/60 dark:border-slate-800/60 px-2 pb-safe">
            <div className="flex items-center justify-around py-1">
              <button onClick={() => { setActiveTab('explore'); setIsOpen(true); }}
                className={`flex flex-col items-center gap-0.5 px-5 py-2 rounded-2xl transition-all active:scale-90 ${activeTab === 'explore' && isOpen ? 'text-sky-500' : 'text-slate-400 dark:text-slate-500'}`}>
                <span className={`text-xl transition-transform ${activeTab === 'explore' && isOpen ? 'scale-110' : ''}`}>🔍</span>
                <span className="text-[10px] font-bold">Explore</span>
              </button>
              <button onClick={() => { setActiveTab('navigate'); setIsOpen(true); setNavigationMode(true); }}
                className={`flex flex-col items-center gap-0.5 px-5 py-2 rounded-2xl transition-all active:scale-90 ${activeTab === 'navigate' && isOpen ? 'text-sky-500' : 'text-slate-400 dark:text-slate-500'}`}>
                <span className={`text-xl transition-transform ${activeTab === 'navigate' && isOpen ? 'scale-110' : ''}`}>🧭</span>
                <span className="text-[10px] font-bold">Navigate</span>
              </button>
              <button onClick={() => setIsOpen(false)}
                className="flex flex-col items-center gap-0.5 px-5 py-2 rounded-2xl text-slate-400 dark:text-slate-500 active:scale-90 transition-all">
                <span className="text-xl">🗺️</span>
                <span className="text-[10px] font-bold">Map</span>
              </button>
              {isAdminMode && (
                <button onClick={() => { setActiveTab('tagging'); setIsOpen(true); }}
                  className={`flex flex-col items-center gap-0.5 px-5 py-2 rounded-2xl transition-all active:scale-90 ${activeTab === 'tagging' && isOpen ? 'text-sky-500' : 'text-slate-400 dark:text-slate-500'}`}>
                  <span className="text-xl">⚙️</span>
                  <span className="text-[10px] font-bold">Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── DESKTOP: Sidebar ───────────────────────────────────────────────────────
  return (
    <div className="relative h-full flex z-40">
      <motion.div
        animate={{ width: isOpen ? '380px' : '0px' }}
        transition={{ type: 'spring', damping: 25, stiffness: 150 }}
        className="h-full overflow-hidden bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50 shadow-2xl flex flex-col"
      >
        {/* Branding */}
        <div className="p-5 pb-4 flex items-center gap-3 border-b border-slate-200/20 dark:border-slate-800/30 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden p-1.5">
            {useMapStore.getState().appSettings?.logo_url ? (
              <img src={useMapStore.getState().appSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              '✈️'
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-wide truncate">{useMapStore.getState().appSettings?.name || 'Admin Navigation'}</h1>
            <p className="text-[10px] text-sky-500 font-bold tracking-widest uppercase">Interactive Map</p>
          </div>
        </div>
        <div className="px-5 py-4 flex-shrink-0"><Search /></div>
        <div className="flex border-b border-slate-200/20 dark:border-slate-800/30 px-4 flex-shrink-0">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 pb-3 pt-1 text-xs font-bold border-b-2 transition flex-1 justify-center ${activeTab === tab.id ? 'border-sky-500 text-sky-500' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">{renderTabContent()}</div>
      </motion.div>
      <div className="h-full flex items-center p-2 pointer-events-none">
        <button onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-10 flex items-center justify-center rounded-r-xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border-y border-r border-slate-200/50 dark:border-slate-800/50 text-slate-500 shadow-xl pointer-events-auto hover:bg-white dark:hover:bg-slate-800 transition active:scale-95">
          {isOpen ? <FiChevronsLeft className="w-5 h-5" /> : <FiChevronsRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}