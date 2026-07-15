import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMapStore } from '../../store/useMapStore';
import Search from '../Search/Search';
import SearchableSelect from './SearchableSelect';
import TaggingPanel from './TaggingPanel';
import FloorManager from './FloorManager';
import SettingsManager from './SettingsManager';
import CategoryManager from './CategoryManager';
import { useVoiceGuidance } from '../../hooks/useVoiceGuidance';
import * as LucideIcons from 'lucide-react';
import {
  FiCompass, FiNavigation, FiChevronsLeft, FiChevronsRight,
  FiClock, FiTag, FiSearch, FiEdit3, FiGitCommit, FiLoader, FiLayers,
  FiArrowUp, FiCornerUpRight, FiCornerUpLeft, FiMapPin, FiTrendingUp, FiCheck, FiSettings,
  FiVolume2, FiVolumeX, FiUser, FiLogOut
} from 'react-icons/fi';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

// Helper for dynamic naming
const getBuildingType = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('mall')) return 'Mall';
  if (n.includes('hospital') || n.includes('clinic')) return 'Hospital';
  if (n.includes('campus') || n.includes('university')) return 'Campus';
  if (n.includes('terminal') || n.includes('airport')) return 'Terminal';
  if (n.includes('station')) return 'Station';
  return 'Building';
};

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(window.innerWidth >= 768);
  const [activeTab, setActiveTab] = useState('explore');
  const [activeCategory, setActiveCategory] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const navigate = useNavigate();
  // Controls which SearchableSelect is open — prevents From/To overlap
  const [activeSelect, setActiveSelect] = useState(null); // 'from' | 'to' | null
  const [expandedPoiId, setExpandedPoiId] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const isOnline = useNetworkStatus();
  
  const currentBuilding = useMapStore(state => state.currentBuilding);
  const buildings = useMapStore(state => state.buildings);
  const [activeBuildingUI, setActiveBuildingUI] = useState(currentBuilding);

  useEffect(() => {
    setActiveBuildingUI(currentBuilding);
  }, [currentBuilding]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Voice guidance (FREE — Web Speech API)
  const {
    voiceEnabled, isSpeaking, isSupported,
    toggleVoice, announceRoute, announceStep
  } = useVoiceGuidance();

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

  // Auto-announce route summary when route is first calculated
  useEffect(() => {
    if (navigationPath && navigationStart && navigationEnd && voiceEnabled) {
      announceRoute(navigationStart, navigationEnd, navigationDistance, []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationPath]);

  const DynamicIcon = ({ name, className }) => {
    const IconCmp = LucideIcons[name] || LucideIcons.HelpCircle;
    return <IconCmp className={className} />;
  };

  const storeCategories = useMapStore(state => state.categories);
  const categories = storeCategories && storeCategories.length > 0
    ? storeCategories.map(c => ({
      key: c.id,
      label: c.name,
      iconName: c.icon,
      color: c.color || '#3b82f6'
    }))
    : [{ key: 'default', label: 'Places', iconName: 'MapPin', color: '#3b82f6' }];

  const getGradient = (color, isDark) => {
    // Generate simple gradient based on hex color
    return isDark
      ? `linear-gradient(135deg, ${color}99, ${color}44)`
      : `linear-gradient(135deg, ${color}ff, ${color}cc)`;
  };

  const allTabs = [
    { id: 'explore', label: 'Explore', icon: <FiSearch className="w-3.5 h-3.5" /> },
    { id: 'navigate', label: 'Directions', icon: <FiCompass className="w-3.5 h-3.5" /> },
    { id: 'tagging', label: 'Tag', icon: <FiEdit3 className="w-3.5 h-3.5" /> },
    { id: 'floors', label: 'Floors', icon: <FiLayers className="w-3.5 h-3.5" /> },
    { id: 'categories', label: 'Types', icon: <FiTag className="w-3.5 h-3.5" /> },
    { id: 'settings', label: 'Settings', icon: <FiSettings className="w-3.5 h-3.5" /> },
    { id: 'profile', label: 'Profile', icon: <FiUser className="w-3.5 h-3.5" /> },
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
  const renderTabContent = () => {
    const firstBldgName = useMapStore.getState().buildings?.[0]?.name || '';
    const primaryType = getBuildingType(firstBldgName);
    const primaryTypePlural = primaryType + 's';

    return (
    <AnimatePresence mode="wait">
      {/* Explore */}
      {activeTab === 'explore' && (
        <motion.div key="explore" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-4 relative">
          
          {activeCategory === null ? (
            // ── DASHBOARD VIEW ────────────────────────────────────────────────
            <>
              {/* Terminal / Building Switcher */}
              {buildings?.length > 0 && (
                <div className="flex flex-col gap-2.5 mb-1 mt-1">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-[11px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-400">
                      {buildings?.length > 1 ? `Select ${primaryType}` : 'Current Location'}
                    </h2>
                    <span className="text-[9px] font-black tracking-widest uppercase text-sky-500 bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 px-2.5 py-1 rounded-lg">
                      {buildings.length} {buildings.length === 1 ? primaryType : primaryTypePlural}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pb-2 pt-1">
                    {buildings.map(b => {
                      const isActive = activeBuildingUI === b.id;
                      const bType = getBuildingType(b.name);
                      return (
                        <button
                          key={b.id}
                          onClick={() => {
                            if (activeBuildingUI === b.id) return;
                            setActiveBuildingUI(b.id);
                            if (isMobile) setIsOpen(false);
                            setTimeout(() => {
                              useMapStore.getState().setBuilding(b.id);
                            }, 50);
                          }}
                          className={`relative flex flex-col items-start w-full p-3.5 rounded-[18px] border transition-all duration-300 text-left group ${
                            isActive 
                              ? 'bg-gradient-to-br from-indigo-500 via-sky-500 to-indigo-600 border-transparent shadow-[0_8px_20px_rgba(99,102,241,0.25)] ring-2 ring-indigo-500/20 ring-offset-2 dark:ring-offset-slate-950' 
                              : 'bg-white dark:bg-[#0a0f1e] border-slate-200/80 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/40 shadow-sm hover:shadow-md active:scale-95'
                          }`}
                        >
                          <div className="relative z-10 flex flex-col w-full h-full justify-between">
                            <span className={`text-[12.5px] font-black leading-tight tracking-tight mb-2 line-clamp-2 ${isActive ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                              {b.name}
                            </span>
                            <div className="flex items-center justify-between w-full mt-auto">
                              <span className={`text-[8.5px] font-black tracking-widest uppercase ${isActive ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'}`}>
                                {bType}
                              </span>
                              {isActive && (
                                <span className="flex h-2 w-2 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Floor Status Card */}
              <div className="rounded-3xl p-5 bg-white/90 dark:bg-[#050814]/80 border border-indigo-100 dark:border-indigo-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.12)] relative overflow-hidden backdrop-blur-xl">
                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\\"20\\" height=\\"20\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cpath d=\\"M0 0h20v20H0z\\" fill=\\"none\\"%3E%3C/path%3E%3Ccircle cx=\\"10\\" cy=\\"10\\" r=\\"1\\" fill=\\"%23fff\\"%3E%3C/circle%3E%3C/svg%3E")' }}></div>
                
                <div className="relative z-10">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Current Floor</p>
                  <div className="flex justify-between items-end mb-5">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                      {floors.find(f => f.id === currentFloor)?.name || 'Unknown'}
                      <span className="text-[8px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 tracking-wider">ACTIVE</span>
                    </h3>
                  </div>

                  <div className="flex gap-5 mb-5 pb-5 border-b border-black/5 dark:border-white/5">
                    <div className="flex flex-col">
                      <span className="text-xl font-black text-slate-700 dark:text-white">{pois[currentFloor]?.filter(p => p.category !== 'waypoint').length || 0}</span>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Places</span>
                    </div>
                    <div className="w-px bg-black/5 dark:bg-white/5"></div>
                    <div className="flex flex-col">
                      <span className="text-xl font-black text-slate-700 dark:text-white">
                        {new Set(pois[currentFloor]?.filter(p => p.category !== 'waypoint').map(p => p.category)).size}
                      </span>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Categories</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {floors.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFloor(f.id)}
                        className={`flex-grow md:flex-grow-0 px-4 py-2.5 rounded-[14px] text-[11px] font-bold transition-all active:scale-95 text-center ${currentFloor === f.id
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 border border-transparent'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10'
                          }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pb-2 pt-1">
                <button onClick={() => setActiveCategory('search')} className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-[#0f172a] dark:to-[#0a0f1e] border border-slate-200/70 dark:border-sky-500/10 shadow-sm dark:shadow-[0_0_15px_rgba(14,165,233,0.05)] hover:border-sky-300 dark:hover:border-sky-400/40 transition-all group active:scale-95 text-left">
                  <div className="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center flex-shrink-0 text-sky-500 group-hover:bg-sky-100 dark:group-hover:bg-sky-500/20 transition-all"><FiSearch className="w-4 h-4" /></div>
                  <div>
                    <h4 className="text-[11px] font-black text-slate-800 dark:text-white">Find Places</h4>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">Search map</p>
                  </div>
                </button>
                <button onClick={() => { setActiveTab('navigate'); setIsOpen(true); setNavigationMode(true); }} className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-[#0f172a] dark:to-[#0a0f1e] border border-slate-200/70 dark:border-indigo-500/10 shadow-sm dark:shadow-[0_0_15px_rgba(79,70,229,0.05)] hover:border-indigo-300 dark:hover:border-indigo-400/40 transition-all group active:scale-95 text-left">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0 text-indigo-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-all"><FiCompass className="w-4 h-4" /></div>
                  <div>
                    <h4 className="text-[11px] font-black text-slate-800 dark:text-white">Directions</h4>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">Best routes</p>
                  </div>
                </button>
              </div>

              {/* Categories Grid */}
              <div className="pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Explore Categories</h3>
                  <button onClick={() => setActiveCategory('all')} className="text-[10px] font-bold text-sky-500 hover:text-sky-600 transition-colors">View All ›</button>
                </div>
                
                <div className="grid grid-cols-3 gap-2.5">
                  {/* "All Places" Special Card */}
                  <button onClick={() => setActiveCategory('all')} className="flex flex-col items-center justify-center p-3 rounded-[18px] bg-slate-50 dark:bg-[#0a0f1e]/80 border border-sky-500/20 hover:border-sky-500/40 shadow-sm dark:shadow-[0_0_15px_rgba(14,165,233,0.05)] transition-all group active:scale-95">
                    <div className="text-sky-500 mb-1.5 transition-transform group-hover:scale-110 drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]"><LucideIcons.LayoutGrid className="w-5 h-5" /></div>
                    <span className="text-[9px] font-black text-slate-600 dark:text-slate-200 uppercase tracking-wide">All Places</span>
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-200/50 dark:bg-white/5 px-2 py-0.5 rounded-full mt-1.5">{flatPois.length}</span>
                  </button>

                  {/* Dynamic Category Cards */}
                  {categories.map((cat, i) => {
                    const count = flatPois.filter(p => p.category === cat.key).length;
                    if (count === 0) return null; // Only show non-empty categories

                    // Dynamic styling based on index/color
                    const colors = [
                      { border: 'border-purple-500/20 hover:border-purple-500/40', text: 'text-purple-500', shadow: 'dark:shadow-[0_0_15px_rgba(168,85,247,0.05)]', glow: 'drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' },
                      { border: 'border-emerald-500/20 hover:border-emerald-500/40', text: 'text-emerald-500', shadow: 'dark:shadow-[0_0_15px_rgba(16,185,129,0.05)]', glow: 'drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' },
                      { border: 'border-rose-500/20 hover:border-rose-500/40', text: 'text-rose-500', shadow: 'dark:shadow-[0_0_15px_rgba(244,63,110,0.05)]', glow: 'drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(244,63,110,0.5)]' },
                      { border: 'border-amber-500/20 hover:border-amber-500/40', text: 'text-amber-500', shadow: 'dark:shadow-[0_0_15px_rgba(245,158,11,0.05)]', glow: 'drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' },
                      { border: 'border-cyan-500/20 hover:border-cyan-500/40', text: 'text-cyan-500', shadow: 'dark:shadow-[0_0_15px_rgba(6,182,212,0.05)]', glow: 'drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' },
                    ];
                    const c = colors[i % colors.length];

                    return (
                      <button key={cat.key} onClick={() => setActiveCategory(cat.key)} className={`flex flex-col items-center justify-center p-3 rounded-[18px] bg-slate-50 dark:bg-[#0a0f1e]/80 border ${c.border} shadow-sm ${c.shadow} transition-all group active:scale-95`}>
                        <div className={`${c.text} mb-1.5 transition-transform group-hover:scale-110 ${c.glow}`}>
                           <DynamicIcon name={cat.iconName} className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-black text-slate-600 dark:text-slate-200 text-center line-clamp-1 uppercase tracking-wide">{cat.label}</span>
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-200/50 dark:bg-white/5 px-2 py-0.5 rounded-full mt-1.5">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            // ── LIST VIEW (Category / Search) ──────────────────────────────────
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
              
              {/* Back Button & Title */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
                <button onClick={() => setActiveCategory(null)} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-90">
                  <FiChevronsLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-[13px] font-black text-slate-800 dark:text-white capitalize">
                    {activeCategory === 'all' ? 'All Places' : (activeCategory === 'search' ? 'Search Places' : categories.find(c => c.key === activeCategory)?.label || 'Places')}
                  </h2>
                  <p className="text-[9px] font-bold text-sky-500 uppercase tracking-wider">
                    {activeCategory !== 'search' && `${flatPois.filter(p => activeCategory === 'all' || p.category === activeCategory).length} Locations`}
                    {activeCategory === 'search' && 'Search Directory'}
                  </p>
                </div>
              </div>

              {/* Search Box */}
              <div className="bg-slate-50 dark:bg-[#0a0f1e]/80 rounded-2xl p-1 border border-slate-200/50 dark:border-white/5 shadow-sm">
                <Search />
              </div>

              {/* List of Places */}
              <div className="-mx-2 px-2 pb-10">
                {(() => {
                  const query = useMapStore.getState().searchQuery.toLowerCase();
                  let displayPlaces = flatPois;
                  
                  if (activeCategory !== 'all' && activeCategory !== 'search') {
                    displayPlaces = displayPlaces.filter(p => p.category === activeCategory);
                  }
                  
                  if (query) {
                    displayPlaces = displayPlaces.filter(p => 
                      p.name.toLowerCase().includes(query) || 
                      p.category.toLowerCase().includes(query) ||
                      (p.description && p.description.toLowerCase().includes(query))
                    );
                  }

                  if (displayPlaces.length === 0) {
                    return (
                      <div className="py-12 text-center flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-[#0f172a] flex items-center justify-center mb-4 text-slate-400">
                          <FiSearch className="w-6 h-6" />
                        </div>
                        <h3 className="text-[13px] font-black text-slate-700 dark:text-slate-300 mb-1">No places found</h3>
                        <p className="text-[10px] font-bold text-slate-500 max-w-[200px]">Try adjusting your search or category.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-2">
                      {displayPlaces.map(poi => {
                        const catObj = categories.find(c => c.key === poi.category);
                        return (
                          <div key={poi.id} className="flex flex-col">
                            <button onClick={() => {
                              setExpandedPoiId(expandedPoiId === poi.id ? null : poi.id);
                              // Auto switch floor and zoom
                              if (useMapStore.getState().currentFloor !== poi.floor) {
                                window.__mapSkipNextReset = true;
                                useMapStore.getState().setFloor(poi.floor);
                              }
                              setTimeout(() => useMapStore.getState().zoomMapTo(poi.x, poi.y, 4), 100);
                              if (isMobile) setIsOpen(false);
                            }}
                              className={`flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-98 text-left ${expandedPoiId === poi.id ? 'bg-sky-50 dark:bg-sky-500/10 ring-1 ring-sky-500/30 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent dark:border-transparent'}`}>
                              
                              <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-slate-200 to-slate-300 dark:from-[#1e293b] dark:to-[#0f172a] flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner border border-black/5 dark:border-white/5">
                                {poi.imageUrl ? <img src={poi.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="text-slate-500 dark:text-slate-400"><DynamicIcon name={catObj?.iconName || 'MapPin'} className="w-4 h-4" /></div>}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-black text-slate-800 dark:text-slate-100 truncate">{poi.name}</p>
                                <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">{poi.description || `${useMapStore.getState().floors.find(f => f.id === poi.floor)?.name || 'Unknown Floor'}`}</p>
                              </div>
                              
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/50 dark:bg-[#1e293b] text-slate-600 dark:text-slate-400 border border-slate-300/50 dark:border-slate-700/50">{poi.category}</span>
                              </div>
                            </button>
                            
                            <AnimatePresence>
                              {expandedPoiId === poi.id && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-3 pb-3 overflow-hidden">
                                  <div className="flex gap-2 p-1.5 mt-1 rounded-[14px] bg-slate-50 dark:bg-[#0a0f1e]/80 border border-slate-200/50 dark:border-indigo-500/20">
                                    <button onClick={() => { setNavigationMode(true); if (navigationEnd?.id === poi.id) setNavigationEnd(null); setNavigationStart(poi); setActiveTab('navigate'); }}
                                      className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-[11px] font-black bg-white dark:bg-[#1e293b] hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-400 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/50 rounded-xl shadow-sm transition-all active:scale-95">
                                      <LucideIcons.MapPin className="w-3 h-3" /> From Here
                                    </button>
                                    <button onClick={() => { setNavigationMode(true); if (navigationStart?.id === poi.id) setNavigationStart(null); setNavigationEnd(poi); setActiveTab('navigate'); }}
                                      className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-[11px] font-black bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white border border-transparent rounded-xl shadow-[0_4px_15px_rgba(14,165,233,0.3)] transition-all active:scale-95">
                                      <LucideIcons.Navigation className="w-3 h-3" /> To Here
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}

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
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-sky-500 flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {navigationDistance > 0 ? `${navigationDistance}m · ~${Math.max(1, Math.round(navigationDistance / 80))} min` : '~3 min'}
                      </span>
                      {/* Voice toggle — only on mobile & if browser supports it */}
                      {isSupported && (
                        <button
                          onClick={() => {
                            toggleVoice();
                            // If we just turned it on, announce the route synchronously
                            if (!voiceEnabled && navigationStart && navigationEnd) {
                              announceRoute(navigationStart, navigationEnd, navigationDistance, []);
                            }
                          }}
                          title={voiceEnabled ? 'Voice ON — tap to mute' : 'Enable voice guidance'}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-90 ${voiceEnabled
                              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-sky-950/30'
                            }`}
                        >
                          {voiceEnabled
                            ? <><FiVolume2 className="w-3 h-3" />{isSpeaking ? '…' : 'ON'}</>
                            : <><FiVolumeX className="w-3 h-3" />OFF</>
                          }
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="relative pl-6">
                    <div className="absolute left-[11px] top-4 bottom-6 w-0.5 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="flex flex-col gap-5">
                      {compileDirections().map((step, i) => {
                        const isStart = step.type === 'start', isEnd = step.type === 'end', isElevator = step.type === 'elevator', isTurn = ['left', 'right', 'uturn'].includes(step.type);
                        let iconCls = "bg-slate-100 dark:bg-slate-800 text-slate-500";
                        if (isStart) iconCls = "bg-emerald-500 text-white shadow-md shadow-emerald-500/30";
                        if (isEnd) iconCls = "bg-sky-500 text-white shadow-md shadow-sky-500/30";
                        if (isElevator) iconCls = "bg-violet-500 text-white shadow-md shadow-violet-500/30";
                        if (isTurn) iconCls = "bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-900";
                        return (
                          <div key={i}
                            className="relative flex items-start gap-3 text-xs cursor-pointer group"
                            onClick={() => voiceEnabled && announceStep(step)}
                            title={voiceEnabled ? 'Tap to hear this step' : ''}
                          >
                            <div className={`absolute -left-[27px] z-10 w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-950 ${iconCls}`}>
                              {step.icon ? React.cloneElement(step.icon, { className: "w-3.5 h-3.5" }) : <FiArrowUp className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex flex-col gap-1 pt-1 w-full">
                              <div className="flex items-start justify-between gap-1">
                                <span className={`font-semibold leading-snug ${isStart || isEnd ? 'text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>{step.text}</span>
                                {voiceEnabled && (
                                  <FiVolume2 className="w-3 h-3 text-sky-400 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </div>
                              {step.desc && <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{step.desc}</span>}
                              {step.action?.type === 'switch_floor' && step.action.floor !== currentFloor && (
                                <button onClick={(e) => {
                                  e.stopPropagation();
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

      {activeTab === 'profile' && isAdminMode && (
        <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex flex-col gap-4 animate-in fade-in zoom-in duration-300">
            <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-3xl text-white font-black mb-4 shadow-xl shadow-sky-500/20">
                {useMapStore.getState().user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">@{useMapStore.getState().user?.username || 'Guest'}</h3>
              <span className="text-xs font-bold px-3 py-1 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-full mt-2 uppercase tracking-widest border border-sky-200 dark:border-sky-800">
                {useMapStore.getState().user?.role || 'Viewer'}
              </span>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
              <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Account Details</h4>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-200 dark:border-slate-800">
                <span className="text-sm text-slate-500 font-medium">Project ID</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-black/20 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">{useMapStore.getState().user?.project_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm text-slate-500 font-medium">Status</span>
                <span className="text-sm font-bold text-emerald-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active
                </span>
              </div>
            </div>

            <button onClick={() => { useMapStore.getState().logout(); window.location.reload(); }} className="mt-2 w-full py-3.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-[0.98]">
              <FiLogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === 'floors' && isAdminMode && <motion.div key="floors" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><FloorManager /></motion.div>}
      {activeTab === 'tagging' && isAdminMode && <motion.div key="tagging" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><TaggingPanel /></motion.div>}
      {activeTab === 'categories' && isAdminMode && <motion.div key="categories" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><CategoryManager /></motion.div>}
      {activeTab === 'settings' && isAdminMode && <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><SettingsManager /></motion.div>}
    </AnimatePresence>
  );
  };

  // ── MOBILE: Bottom Sheet + Bottom Nav ─────────────────────────────────────
  if (isMobile) {
    const navItems = [
      { id: 'explore', label: 'Explore', emoji: '🔍', color: 'sky', action: () => { setActiveTab('explore'); setIsOpen(prev => activeTab === 'explore' ? !prev : true); setNavigationMode(false); } },
      { id: 'navigate', label: 'Navigate', emoji: '🧭', color: 'indigo', action: () => { setActiveTab('navigate'); setIsOpen(prev => activeTab === 'navigate' ? !prev : true); setNavigationMode(true); } },
      { id: 'map', label: 'Map', emoji: '🗺️', color: 'emerald', action: () => setIsOpen(false) },
      ...(isAdminMode ? [{ id: 'floors', label: 'Floors', emoji: '🏢', color: 'violet', action: () => { setActiveTab('floors'); setIsOpen(prev => activeTab === 'floors' ? !prev : true); setNavigationMode(false); } }] : []),
      ...(isAdminMode ? [{ id: 'tagging', label: 'Admin', emoji: '⚙️', color: 'rose', action: () => { setActiveTab('tagging'); setIsOpen(prev => activeTab === 'tagging' ? !prev : true); setNavigationMode(false); } }] : []),
      ...(isAdminMode ? [{ id: 'profile', label: 'Profile', emoji: '👤', color: 'slate', action: () => { setActiveTab('profile'); setIsOpen(prev => activeTab === 'profile' ? !prev : true); setNavigationMode(false); } }] : []),
    ];

    const colorMap = {
      sky: { active: 'text-sky-500', bg: 'bg-sky-500/12' },
      indigo: { active: 'text-indigo-500', bg: 'bg-indigo-500/12' },
      emerald: { active: 'text-emerald-500', bg: 'bg-emerald-500/12' },
      violet: { active: 'text-violet-500', bg: 'bg-violet-500/12' },
      rose: { active: 'text-rose-500', bg: 'bg-rose-500/12' },
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

            <div className="px-4 pb-3 flex items-center gap-3 flex-shrink-0 border-b border-slate-100 dark:border-slate-800">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0 ${useMapStore.getState().appSettings?.logo_url ? 'bg-white dark:bg-[#1a1a1a] p-1 border border-black/5 dark:border-white/5' : 'bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-600 text-white'}`}>
                {useMapStore.getState().appSettings?.logo_url ? (
                  <img src={useMapStore.getState().appSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <FiNavigation className="w-4 h-4 transform fill-white/20" />
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

            {/* Date and Time Header */}
            <div className="px-5 pt-3 pb-2 flex items-center justify-between flex-shrink-0 border-b border-slate-100 dark:border-slate-800/50 mb-2">
              <div className="flex flex-col">
                <span className="text-[20px] font-black tracking-tight text-slate-800 dark:text-white leading-none">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-sky-500 dark:text-sky-400 mt-1">
                  {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>
              
              {/* Mobile Network Status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-[12px] ${isOnline ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/50' : 'bg-red-50/80 dark:bg-red-950/30 border-red-200/60 dark:border-red-900/50'} border backdrop-blur-md shadow-sm`}>
                <div className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </div>
                <span className={`text-[10px] font-black tracking-widest uppercase ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isOnline ? 'Live' : 'Offline'}
                </span>
              </div>
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
                    <span className={`text-[10px] font-bold transition-colors relative ${isActive ? c.active : 'text-slate-400 dark:text-slate-500'
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
  const tabColors = {
    explore: 'from-sky-400 to-blue-600 shadow-sky-500/40',
    navigate: 'from-indigo-500 to-violet-600 shadow-indigo-500/40',
    tagging: 'from-emerald-400 to-teal-600 shadow-emerald-500/40',
    floors: 'from-amber-400 to-orange-500 shadow-amber-500/40',
    categories: 'from-pink-500 to-rose-600 shadow-pink-500/40',
    settings: 'from-slate-500 to-slate-700 shadow-slate-500/40',
    profile: 'from-fuchsia-500 to-purple-600 shadow-fuchsia-500/40',
  };
  
  const tabHoverColors = {
    explore: 'hover:bg-sky-50 dark:hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-200 dark:hover:border-sky-800',
    navigate: 'hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800',
    tagging: 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800',
    floors: 'hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-200 dark:hover:border-amber-800',
    categories: 'hover:bg-pink-50 dark:hover:bg-pink-500/10 hover:text-pink-600 dark:hover:text-pink-400 hover:border-pink-200 dark:hover:border-pink-800',
    settings: 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600',
    profile: 'hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/10 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 hover:border-fuchsia-200 dark:hover:border-fuchsia-800',
  };

  return (
    <div className="relative h-full flex z-40 gap-4">
      {/* Side Rail */}
      <div className="w-[88px] rounded-[2.5rem] bg-white/75 dark:bg-[#0a0a0a]/75 backdrop-blur-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-2xl border border-black/5 dark:border-white/10 flex flex-col items-center py-6 gap-3 z-50 flex-shrink-0 transition-colors duration-500">
        <div className={`w-12 h-12 rounded-[18px] mb-2 flex items-center justify-center overflow-hidden flex-shrink-0 ${useMapStore.getState().appSettings?.logo_url ? 'bg-white dark:bg-[#1a1a1a] shadow-sm border border-black/5 dark:border-white/5 p-1.5' : 'bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 text-white'}`}>
          {useMapStore.getState().appSettings?.logo_url ? (
            <img src={useMapStore.getState().appSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <FiNavigation className="w-5 h-5 transform fill-white/20" />
          )}
        </div>
        
        <div className="flex flex-col gap-2 w-full px-2.5 overflow-y-auto no-scrollbar flex-1 pb-4">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const grad = tabColors[tab.id] || tabColors.explore;
            const hover = tabHoverColors[tab.id] || tabHoverColors.explore;
            
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setIsOpen(true); setNavigationMode(tab.id === 'navigate'); }}
                className={`w-full h-[60px] md:h-[64px] flex-shrink-0 rounded-[20px] flex flex-col items-center justify-center gap-1.5 transition-all duration-300 group relative border border-transparent ${isActive
                    ? `bg-gradient-to-br ${grad} text-white shadow-xl`
                    : `text-slate-400 dark:text-slate-500 ${hover} bg-transparent`
                  }`}
                title={tab.label}
              >
                {isActive && (
                  <motion.div layoutId="desktop-active-rail" className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-1.5 h-6 bg-sky-500 dark:bg-sky-400 rounded-r-full shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
                )}
                {React.cloneElement(tab.icon, { className: `w-5 h-5 transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110'}` })}
                <span className={`text-[8.5px] font-black uppercase tracking-widest transition-all ${isActive ? 'text-white/95' : 'opacity-70 group-hover:opacity-100'}`}>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Panel */}
      <motion.div
        animate={{ width: isOpen ? '360px' : '0px', opacity: isOpen ? 1 : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 150 }}
        className="h-full overflow-hidden bg-white/80 dark:bg-[#111111]/80 backdrop-blur-3xl rounded-[2rem] border border-black/5 dark:border-white/10 shadow-xl dark:shadow-2xl flex flex-col flex-shrink-0 transition-colors duration-500"
      >
        <div className="p-6 pb-4 flex items-center justify-between border-b border-black/5 dark:border-white/5 flex-shrink-0">
          <div className="flex flex-col min-w-0 flex-1 pr-4">
            <h2 className="text-[18px] font-black text-slate-800 dark:text-white tracking-tight truncate leading-tight">
              {useMapStore.getState().appSettings?.name || 'Global Navigation'}
            </h2>
            <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest mt-0.5">
              Indoor Map - {tabs.find(t => t.id === activeTab)?.label || 'Menu'}
            </p>
          </div>
          <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex flex-shrink-0 items-center justify-center text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition">
            <FiChevronsLeft className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {/* Desktop Date and Time Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200/50 dark:border-slate-800/50">
            <div className="flex flex-col">
              <span className="text-[24px] font-black tracking-tight text-slate-800 dark:text-white leading-none">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-sky-500 dark:text-sky-400 mt-1">
                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            
            {/* Desktop Network Status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-[12px] ${isOnline ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/50' : 'bg-red-50/80 dark:bg-red-950/30 border-red-200/60 dark:border-red-900/50'} border backdrop-blur-md shadow-sm`}>
              <div className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              </div>
              <span className={`text-[10.5px] font-black tracking-widest uppercase ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {isOnline ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
          {renderTabContent()}
        </div>
      </motion.div>
    </div>
  );
}