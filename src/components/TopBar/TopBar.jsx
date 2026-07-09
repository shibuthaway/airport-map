import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/useMapStore';
import {
  FiSearch, FiNavigation, FiTag, FiLayers, FiSun, FiMoon,
  FiPlus, FiMinus, FiMaximize2, FiX, FiClock, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import TaggingPanel from '../Sidebar/TaggingPanel';
import FloorManager from '../Sidebar/FloorManager';

const glass = {
  background: 'rgba(8,14,28,0.82)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

// ─── Floor Tabs strip ────────────────────────────────────────────────────────
function FloorTabs() {
  const { floors, currentFloor, setFloor } = useMapStore();
  const colors = {
    arrival:'from-emerald-500 to-teal-600',
    departure:'from-sky-500 to-indigo-600',
    mezzanine:'from-amber-500 to-orange-600',
    lounge:'from-purple-500 to-fuchsia-600',
  };
  return (
    <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto no-scrollbar"
         style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)' }}>
      {(floors||[]).map(f => {
        const active = currentFloor === f.id;
        const grad = colors[f.id] || 'from-blue-500 to-cyan-600';
        return (
          <button key={f.id} onClick={() => setFloor(f.id)}
            className={`relative px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0 transition-all ${active ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {active && (
              <motion.div layoutId="floorBg"
                className={`absolute inset-0 rounded-xl bg-gradient-to-r ${grad}`}
                style={{ zIndex: -1 }}
                transition={{ type:'spring', damping:22, stiffness:200 }} />
            )}
            <span className="font-mono text-[9px]">{f.level}</span>
            {f.name}
          </button>
        );
      })}
    </div>
  );
}

// ─── Navigate Panel ───────────────────────────────────────────────────────────
function NavigatePanel({ onClose }) {
  const {
    nodes, currentFloor,
    navigationMode, setNavigationMode,
    navigationStart, setNavigationStart,
    navigationEnd, setNavigationEnd,
    navigationPath, navigationDistance,
    navigationOptions, setNavigationOptions,
  } = useMapStore();

  const floorNodes = nodes.filter(n => n.floor === currentFloor && n.category !== 'waypoint');

  const directions = () => {
    if (!navigationPath?.length || !navigationStart || !navigationEnd) return [];
    const { nodes: allNodes } = useMapStore.getState();
    const steps = [`Start at ${navigationStart.name}`];
    const pathNodes = navigationPath.map(pt => allNodes.find(n => n.x===pt.x && n.y===pt.y && n.floor===pt.floor)).filter(Boolean);
    for (let i=1; i<pathNodes.length-1; i++) {
      const c = pathNodes[i];
      if (c.category==='lift'||c.category==='escalator') steps.push(`Take ${c.name} to next floor`);
      else if (c.category==='security'||c.category==='immigration') steps.push(`Pass through ${c.name}`);
      else if (c.category!=='waypoint') steps.push(`Walk past ${c.name}`);
    }
    steps.push(`Arrive at ${navigationEnd.name}`);
    return steps;
  };

  return (
    <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}}
      className="w-80 rounded-2xl shadow-2xl overflow-hidden" style={glass}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="text-xs font-bold text-white uppercase tracking-widest">🧭 Navigate</span>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition"><FiX className="w-4 h-4"/></button>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {!navigationMode ? (
          <button onClick={() => setNavigationMode(true)}
            className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm transition">
            Start Route Finder
          </button>
        ) : (
          <>
            <select value={navigationStart?.id||''} onChange={e => setNavigationStart(nodes.find(n=>n.id===e.target.value))}
              className="w-full p-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-sky-500">
              <option value="">📍 From...</option>
              {floorNodes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={navigationEnd?.id||''} onChange={e => setNavigationEnd(nodes.find(n=>n.id===e.target.value))}
              className="w-full p-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-sky-500">
              <option value="">🏁 To...</option>
              {floorNodes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <div className="flex gap-3 text-xs text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={navigationOptions?.wheelchairOnly||false}
                  onChange={e=>setNavigationOptions({wheelchairOnly:e.target.checked})}
                  className="accent-sky-500"/>
                ♿ Wheelchair
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={navigationOptions?.avoidClosed!==false}
                  onChange={e=>setNavigationOptions({avoidClosed:e.target.checked})}
                  className="accent-sky-500"/>
                🚧 Avoid Blocked
              </label>
            </div>

            {navigationPath ? (
              <div className="border-t border-white/5 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <FiClock className="w-3.5 h-3.5 text-sky-400"/>
                  <span className="text-xs font-bold text-sky-400">
                    {navigationDistance}m · ~{Math.max(1,Math.round(navigationDistance/80))} min
                  </span>
                </div>
                <ul className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                  {directions().map((s,i)=>(
                    <li key={i} className="flex gap-2 text-xs text-slate-300">
                      <span className="w-4 h-4 rounded-full bg-white/10 text-white font-bold flex items-center justify-center flex-shrink-0 text-[9px]">{i+1}</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (navigationStart && navigationEnd && (
              <p className="text-xs text-red-400 text-center py-1">No route found. Check connections.</p>
            ))}

            <button onClick={()=>setNavigationMode(false)}
              className="text-xs text-slate-500 hover:text-slate-300 transition text-center">
              Clear
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Search Panel ─────────────────────────────────────────────────────────────
function SearchPanel({ onClose }) {
  const { pois, currentFloor, selectPoi, setNavigationStart, setNavigationEnd, setNavigationMode } = useMapStore();
  const [q, setQ] = useState('');
  const all = (pois[currentFloor]||[]);
  const filtered = q.trim() ? all.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())) : all.slice(0,8);

  return (
    <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}}
      className="w-96 rounded-2xl shadow-2xl overflow-hidden" style={glass}>
      <div className="flex items-center gap-3 px-4 py-3">
        <FiSearch className="w-4 h-4 text-slate-400 flex-shrink-0"/>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)}
          placeholder="Search shops, gates, lounges..."
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"/>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition"><FiX className="w-4 h-4"/></button>
      </div>
      <div className="border-t border-white/5 max-h-72 overflow-y-auto">
        {filtered.map(p=>(
          <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition cursor-pointer group"
            onClick={()=>{ selectPoi(p); onClose(); }}>
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs overflow-hidden flex-shrink-0">
              {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover"/> : '📍'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{p.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{p.category}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button onClick={e=>{e.stopPropagation();setNavigationStart(p);setNavigationMode(true);onClose();}}
                className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">FROM</button>
              <button onClick={e=>{e.stopPropagation();setNavigationEnd(p);setNavigationMode(true);onClose();}}
                className="text-[9px] bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded font-bold">TO</button>
            </div>
          </div>
        ))}
        {filtered.length===0 && <p className="text-xs text-slate-500 text-center py-6">No results found</p>}
      </div>
    </motion.div>
  );
}

// ─── Tagging Panel wrapper ────────────────────────────────────────────────────
function TagPanel({ onClose }) {
  return (
    <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}}
      className="w-80 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col" style={glass}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
        <span className="text-xs font-bold text-white uppercase tracking-widest">📍 Tag Location</span>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition"><FiX className="w-4 h-4"/></button>
      </div>
      <div className="overflow-y-auto flex-1 p-2">
        <TaggingPanel />
      </div>
    </motion.div>
  );
}

// ─── Floors Panel wrapper ─────────────────────────────────────────────────────
function FloorsPanel({ onClose }) {
  return (
    <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}}
      className="w-80 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col" style={glass}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
        <span className="text-xs font-bold text-white uppercase tracking-widest">🗂 Floor Manager</span>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition"><FiX className="w-4 h-4"/></button>
      </div>
      <div className="overflow-y-auto flex-1 p-2">
        <FloorManager />
      </div>
    </motion.div>
  );
}

// ─── Main TopBar ─────────────────────────────────────────────────────────────
export default function TopBar() {
  const { theme, toggleTheme, zoomActions } = useMapStore();
  const [activePanel, setActivePanel] = useState(null);

  const toggle = (panel) => setActivePanel(p => p === panel ? null : panel);

  const iconBtn = (id, icon, label, active) => (
    <button key={id} onClick={() => toggle(id)} title={label}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
        active
          ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
          : 'text-slate-400 hover:text-white hover:bg-white/8'
      }`}
      style={active ? {} : { background: 'rgba(255,255,255,0.05)' }}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col">
      {/* ── Header bar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5"
        style={{ ...glass, borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>

        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-sm shadow-lg">✈️</div>
          <div className="hidden md:block">
            <p className="text-xs font-extrabold text-white tracking-wide leading-none">CHENNAI AIRPORT</p>
            <p className="text-[9px] text-sky-400 font-bold tracking-widest uppercase leading-none mt-0.5">Indoor Map</p>
          </div>
        </div>

        {/* Floor tabs */}
        <div className="flex-1 flex justify-center">
          <FloorTabs />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {iconBtn('search', <FiSearch className="w-3.5 h-3.5"/>, 'Search', activePanel==='search')}
          {iconBtn('navigate', <FiNavigation className="w-3.5 h-3.5"/>, 'Navigate', activePanel==='navigate')}
          {iconBtn('tag', <FiTag className="w-3.5 h-3.5"/>, 'Tag', activePanel==='tag')}
          {iconBtn('floors', <FiLayers className="w-3.5 h-3.5"/>, 'Floors', activePanel==='floors')}

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mx-1"/>

          {/* Zoom */}
          <div className="flex items-center rounded-xl overflow-hidden" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={() => zoomActions?.zoomIn()} title="Zoom In"
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:bg-white/5 transition">
              <FiPlus className="w-3.5 h-3.5"/>
            </button>
            <button onClick={() => zoomActions?.resetTransform()} title="Reset"
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-sky-400 hover:bg-white/5 transition border-x border-white/5">
              <FiMaximize2 className="w-3 h-3"/>
            </button>
            <button onClick={() => zoomActions?.zoomOut()} title="Zoom Out"
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-white/5 transition">
              <FiMinus className="w-3.5 h-3.5"/>
            </button>
          </div>

          {/* Theme */}
          <button onClick={toggleTheme}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition"
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)' }}>
            {theme==='dark' ? <FiSun className="w-3.5 h-3.5 text-amber-400"/> : <FiMoon className="w-3.5 h-3.5"/>}
          </button>
        </div>
      </div>

      {/* ── Floating panels below header ── */}
      <AnimatePresence>
        {activePanel && (
          <div className="absolute top-[56px] left-0 right-0 flex justify-center pt-3 px-4 pointer-events-none">
            <div className="pointer-events-auto">
              {activePanel==='search'   && <SearchPanel   onClose={()=>setActivePanel(null)}/>}
              {activePanel==='navigate' && <NavigatePanel onClose={()=>setActivePanel(null)}/>}
              {activePanel==='tag'      && <TagPanel      onClose={()=>setActivePanel(null)}/>}
              {activePanel==='floors'   && <FloorsPanel   onClose={()=>setActivePanel(null)}/>}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
