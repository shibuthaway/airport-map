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
  // Controls which SearchableSelect is open — prevents From/To overlap
  const [activeSelect, setActiveSelect] = useState(null); // 'from' | 'to' | null

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
    { key: 'gate',      label: 'Gates',     icon: '✈️',
      gradLight: 'linear-gradient(135deg,#38bdf8,#3b82f6)',
      gradDark:  'linear-gradient(135deg,#0369a1,#1d4ed8)',
      glow: '0 6px 20px rgba(56,189,248,0.45)',
      badgeLight: '#e0f2fe', badgeDark: '#0c4a6e', badgeTextLight: '#0369a1', badgeTextDark: '#7dd3fc' },
    { key: 'checkin',   label: 'Check-in',  icon: '🧳',
      gradLight: 'linear-gradient(135deg,#a78bfa,#8b5cf6)',
      gradDark:  'linear-gradient(135deg,#6d28d9,#4c1d95)',
      glow: '0 6px 20px rgba(167,139,250,0.45)',
      badgeLight: '#ede9fe', badgeDark: '#2e1065', badgeTextLight: '#6d28d9', badgeTextDark: '#c4b5fd' },
    { key: 'baggage',   label: 'Baggage',   icon: '🛄',
      gradLight: 'linear-gradient(135deg,#fbbf24,#f97316)',
      gradDark:  'linear-gradient(135deg,#b45309,#c2410c)',
      glow: '0 6px 20px rgba(251,191,36,0.45)',
      badgeLight: '#fef3c7', badgeDark: '#451a03', badgeTextLight: '#b45309', badgeTextDark: '#fcd34d' },
    { key: 'security',  label: 'Security',  icon: '🛡️',
      gradLight: 'linear-gradient(135deg,#f87171,#ef4444)',
      gradDark:  'linear-gradient(135deg,#b91c1c,#7f1d1d)',
      glow: '0 6px 20px rgba(248,113,113,0.45)',
      badgeLight: '#fee2e2', badgeDark: '#450a0a', badgeTextLight: '#b91c1c', badgeTextDark: '#fca5a5' },
    { key: 'lounge',    label: 'Lounges',   icon: '🍷',
      gradLight: 'linear-gradient(135deg,#e879f9,#ec4899)',
      gradDark:  'linear-gradient(135deg,#a21caf,#9d174d)',
      glow: '0 6px 20px rgba(232,121,249,0.45)',
      badgeLight: '#fdf4ff', badgeDark: '#3b0764', badgeTextLight: '#a21caf', badgeTextDark: '#f0abfc' },
    { key: 'washroom',  label: 'Restrooms', icon: '🚻',
      gradLight: 'linear-gradient(135deg,#2dd4bf,#10b981)',
      gradDark:  'linear-gradient(135deg,#0f766e,#065f46)',
      glow: '0 6px 20px rgba(45,212,191,0.45)',
      badgeLight: '#ccfbf1', badgeDark: '#022c22', badgeTextLight: '#0f766e', badgeTextDark: '#5eead4' },
  ];

  const allTabs = [
    { id: 'explore',    label: 'Explore',    icon: <FiSearch className="w-3.5 h-3.5" /> },
    { id: 'navigate',   label: 'Directions', icon: <FiCompass className="w-3.5 h-3.5" /> },
    { id: 'tagging',    label: 'Tag',        icon: <FiEdit3 className="w-3.5 h-3.5" /> },
    { id: 'floors',     label: 'Floors',     icon: <FiLayers className="w-3.5 h-3.5" /> },
    { id: 'settings',   label: 'Settings',   icon: <FiSettings className="w-3.5 h-3.5" /> },
  ];
  
  const tabs = isAdminMode 
    ? allTabs 
    : allTabs.filter(t => t.id === 'explore' || t.id === 'navigate');

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
        <motion.div key="explore" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-4">
          
          {/* Search box inside sheet */}
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-1 border border-slate-200/50 dark:border-slate-800/30">
            <Search />
          </div>

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
            <div className="grid grid-cols-3 gap-2.5">
              {categories.map(cat => {
                const count = pois[currentFloor]?.filter(p => p.category === cat.key).length || 0;
                const isActive = activeCategory === cat.key;
                const isDark = document.documentElement.classList.contains('dark');
                const grad = isDark ? cat.gradDark : cat.gradLight;
                return (
                  <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                    style={{
                      backgroundImage: grad,
                      boxShadow: isActive
                        ? `0 0 0 3px rgba(255,255,255,0.85), ${cat.glow}`
                        : 'none',
                      transform: isActive ? 'scale(1.06)' : 'scale(1)',
                      opacity: isActive ? 1 : isDark ? 0.65 : 0.75,
                      transition: 'all 0.2s cubic-bezier(.34,1.56,.64,1)',
                    }}
                    className="relative flex flex-col items-center p-3 rounded-2xl active:scale-95 gap-1.5 overflow-hidden border-0"
                  >
                    {/* Brightness overlay on hover for inactive */}
                    {!isActive && (
                      <div className="absolute inset-0 bg-white opacity-0 hover:opacity-10 transition-opacity duration-150 rounded-2xl" />
                    )}
                    {/* Active sparkle ring */}
                    {isActive && (
                      <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.5)' }} />
                    )}
                    <span className={`text-2xl drop-shadow transition-transform duration-200 ${isActive ? 'scale-115' : 'scale-100'}`} style={{ transform: isActive ? 'scale(1.18)' : 'scale(1)' }}>{cat.icon}</span>
                    <span className="text-[10px] font-extrabold leading-tight text-center text-white drop-shadow-sm">{cat.label}</span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.20)',
                        color: '#fff',
                      }}
                    >{count}</span>
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
          {(!navigationMode && isMobile) ? (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-sky-500/30">🧭</div>
              <div className="text-center"><h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">Indoor Navigation</h3><p className="text-xs text-slate-400 max-w-[220px]">Find the fastest path between any two points in the airport.</p></div>
              <button onClick={() => setNavigationMode(true)} className="px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm shadow-lg shadow-sky-500/25 transition active:scale-95">Start Route Finder</button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Start/End selects */}
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-black">A</span></div>
                  <SearchableSelect
                    placeholder="Starting point..."
                    options={allNavigableNodes.map(p => ({ value: p.id, label: `${p.name} · ${capitalize(p.floor)}` }))}
                    value={navigationStart?.id || ''}
                    onChange={val => { setNavigationStart(nodes.find(p => p.id === val)); setActiveSelect(null); }}
                    isControlledOpen={activeSelect === 'from'}
                    onOpen={() => setActiveSelect('from')}
                    onClose={() => setActiveSelect(null)}
                  />
                </div>
                <div className="ml-4 w-0.5 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-black">B</span></div>
                  <SearchableSelect
                    placeholder="Destination..."
                    options={allNavigableNodes.map(p => ({ value: p.id, label: `${p.name} · ${capitalize(p.floor)}` }))}
                    value={navigationEnd?.id || ''}
                    onChange={val => { setNavigationEnd(nodes.find(p => p.id === val)); setActiveSelect(null); }}
                    isControlledOpen={activeSelect === 'to'}
                    onOpen={() => setActiveSelect('to')}
                    onClose={() => setActiveSelect(null)}
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
    const navItems = [
      { id: 'explore',  label: 'Explore',   emoji: '🔍', color: 'sky',    action: () => { setActiveTab('explore');  setIsOpen(prev => activeTab === 'explore'  ? !prev : true); } },
      { id: 'navigate', label: 'Navigate',  emoji: '🧭', color: 'indigo', action: () => { setActiveTab('navigate'); setIsOpen(prev => activeTab === 'navigate' ? !prev : true); setNavigationMode(true); } },
      { id: 'map',      label: 'Map',       emoji: '🗺️', color: 'emerald',action: () => setIsOpen(false) },
      ...(isAdminMode ? [{ id: 'floors',  label: 'Floors', emoji: '🏢', color: 'violet', action: () => { setActiveTab('floors');  setIsOpen(prev => activeTab === 'floors'  ? !prev : true); } }] : []),
      ...(isAdminMode ? [{ id: 'tagging', label: 'Admin',  emoji: '⚙️', color: 'rose',   action: () => { setActiveTab('tagging'); setIsOpen(prev => activeTab === 'tagging' ? !prev : true); } }] : []),
    ];

    const colorMap = {
      sky:    { active: 'text-sky-500',    bg: 'bg-sky-500/12' },
      indigo: { active: 'text-indigo-500', bg: 'bg-indigo-500/12' },
      emerald:{ active: 'text-emerald-500',bg: 'bg-emerald-500/12' },
      violet: { active: 'text-violet-500', bg: 'bg-violet-500/12' },
      rose:   { active: 'text-rose-500',   bg: 'bg-rose-500/12' },
    };

    return (
      <>
        {/* Overlay */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setIsOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Bottom Sheet Panel - NO drag on whole sheet to avoid map touch conflicts */}
        <motion.div
          initial={false}
          animate={{ y: isOpen ? 0 : '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320, mass: 0.8 }}
          className="fixed left-0 right-0 z-50 pointer-events-auto"
          style={{ bottom: '60px', maxHeight: '76vh' }}
        >
          <div
            className="mx-3 bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl shadow-black/25 border border-slate-200/50 dark:border-slate-700/30 overflow-hidden flex flex-col"
            style={{ maxHeight: '76vh' }}
          >
            {/* Handle Bar — ONLY this area triggers swipe-to-close */}
            <div
              className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => {
                // Swipe tracking only on the handle
                const startY = e.clientY;
                const onMove = (ev) => {
                  if (ev.clientY - startY > 60) {
                    setIsOpen(false);
                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                  }
                };
                const onUp = () => {
                  document.removeEventListener('pointermove', onMove);
                  document.removeEventListener('pointerup', onUp);
                };
                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
              }}
            >
              <div className="w-9 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* Sheet Header */}
            <div className="px-4 pb-3 flex items-center gap-3 flex-shrink-0 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0">
                {useMapStore.getState().appSettings?.logo_url ? (
                  <img src={useMapStore.getState().appSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-lg">✈️</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black text-slate-800 dark:text-slate-100 truncate">{useMapStore.getState().appSettings?.name || 'Airport Navigation'}</p>
                <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">Indoor Map</p>
              </div>
              {/* Close button */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 active:scale-90 transition-all flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Tab Pills */}
            <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto custom-scrollbar flex-shrink-0">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 flex-shrink-0 ${
                    activeTab === t.id
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md shadow-sky-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 px-4 pb-4 custom-scrollbar overscroll-contain">
              {renderTabContent()}
            </div>
          </div>
        </motion.div>

        {/* ── Bottom Navigation Bar ─────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
          <div
            className="bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800/80 px-2"
            style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center justify-around pt-1 pb-0.5">
              {navItems.map(item => {
                const isActive = item.id !== 'map' && activeTab === item.id && isOpen;
                const c = colorMap[item.color];
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all active:scale-90 relative min-w-[52px]"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className={`absolute inset-0 rounded-2xl ${c.bg}`}
                        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                      />
                    )}
                    <span className={`text-[20px] leading-none transition-all ${isActive ? 'scale-115' : ''}`}>{item.emoji}</span>
                    <span className={`text-[10px] font-bold transition-colors relative ${
                      isActive ? c.active : 'text-slate-400 dark:text-slate-500'
                    }`}>{item.label}</span>
                  </button>
                );
              })}
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