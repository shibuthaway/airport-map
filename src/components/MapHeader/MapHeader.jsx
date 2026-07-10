import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/useMapStore';
import { FiSun, FiMoon, FiPlus, FiMinus, FiMaximize2, FiChevronLeft, FiChevronRight, FiShare2 } from 'react-icons/fi';

export default function MapHeader() {
  const { floors, currentFloor, setFloor, theme, toggleTheme, zoomActions, isAdminMode, mapRotation, setMapRotation } = useMapStore();
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftFade(scrollLeft > 4);
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 4);
  };

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const scrollAmount = 160;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    // Wait briefly for elements to render
    const timer = setTimeout(handleScroll, 100);
    window.addEventListener('resize', handleScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleScroll);
    };
  }, [floors]);

  const floorThemes = {
    arrival: {
      gradient: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
      badgeActive: 'bg-white/20 text-white',
      badgeInactive: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
    },
    departure: {
      gradient: 'from-sky-500 to-indigo-600 shadow-sky-500/25',
      badgeActive: 'bg-white/20 text-white',
      badgeInactive: 'bg-sky-500/10 text-sky-500 dark:text-sky-400'
    },
    mezzanine: {
      gradient: 'from-amber-500 to-orange-600 shadow-amber-500/25',
      badgeActive: 'bg-white/20 text-white',
      badgeInactive: 'bg-amber-500/10 text-amber-500 dark:text-amber-400'
    },
    lounge: {
      gradient: 'from-purple-500 to-fuchsia-600 shadow-purple-500/25',
      badgeActive: 'bg-white/20 text-white',
      badgeInactive: 'bg-purple-500/10 text-purple-500 dark:text-purple-400'
    }
  };

  const defaultTheme = {
    gradient: 'from-blue-500 to-cyan-600 shadow-blue-500/25',
    badgeActive: 'bg-white/20 text-white',
    badgeInactive: 'bg-blue-500/10 text-blue-500 dark:text-blue-450'
  };

  return (
    <div className="h-14 md:h-16 border-b border-slate-200/50 dark:border-slate-800/40 bg-white/80 dark:bg-slate-950/60 backdrop-blur-xl flex items-center justify-between px-2 sm:px-4 md:px-6 z-20 select-none">
      
      {/* 2. Floor selector Horizontal tabs (Left) */}
      <div className="relative flex items-center max-w-[50%] md:max-w-[60%] overflow-hidden group">
        
        {/* Left Fade Overlay & Slider Button */}
        {showLeftFade && (
          <div className="absolute left-0 top-0 bottom-0 w-12 pointer-events-none bg-gradient-to-r from-slate-100 dark:from-slate-900 to-transparent z-10 rounded-l-2xl" />
        )}
        
        <AnimatePresence>
          {showLeftFade && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: -4 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -4 }}
              transition={{ duration: 0.2 }}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20"
            >
              <button
                onClick={() => scroll('left')}
                className="w-6 h-6 rounded-full flex items-center justify-center bg-white/95 dark:bg-slate-900/95 shadow-md border border-slate-200/60 dark:border-slate-800/70 text-slate-650 hover:text-sky-500 dark:text-slate-300 dark:hover:text-sky-400 hover:scale-110 active:scale-90 transition-all cursor-pointer"
                title="Scroll Left"
              >
                <FiChevronLeft className="w-4.5 h-4.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex p-1 bg-slate-100/80 dark:bg-slate-900/50 border border-slate-200/30 dark:border-slate-850/40 rounded-2xl gap-1 overflow-x-auto no-scrollbar flex-nowrap select-none w-full scroll-smooth"
        >
          {(floors || []).map((floor) => {
            const isActive = currentFloor === floor.id;
            const themeInfo = floorThemes[floor.id] || defaultTheme;
            return (
              <button
                key={floor.id}
                onClick={() => setFloor(floor.id)}
                className={`relative px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-300 flex items-center gap-2 cursor-pointer outline-none flex-shrink-0 ${
                  isActive
                    ? 'text-white drop-shadow-md'
                    : 'text-slate-550 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-900/30'
                }`}
              >
                {/* Sliding Background Capsule */}
                {isActive && (
                  <motion.div
                    layoutId="activeFloorTab"
                    className={`absolute inset-0 bg-gradient-to-tr ${themeInfo.gradient} rounded-xl shadow-lg z-[-1]`}
                    transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                  />
                )}
                <span className={`text-[10px] font-extrabold font-mono px-1.5 py-0.5 rounded transition-all duration-305 flex-shrink-0 ${
                  isActive ? themeInfo.badgeActive : themeInfo.badgeInactive
                }`}>
                  {floor.level}
                </span>
                <span className="tracking-wider uppercase text-[10.5px] whitespace-nowrap">{floor.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Fade Overlay & Slider Button */}
        {showRightFade && (
          <div className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none bg-gradient-to-l from-slate-100 dark:from-slate-900 to-transparent z-10 rounded-r-2xl" />
        )}

        <AnimatePresence>
          {showRightFade && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 4 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 4 }}
              transition={{ duration: 0.2 }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20"
            >
              <button
                onClick={() => scroll('right')}
                className="w-6 h-6 rounded-full flex items-center justify-center bg-white/95 dark:bg-slate-900/95 shadow-md border border-slate-200/60 dark:border-slate-800/70 text-slate-650 hover:text-sky-500 dark:text-slate-300 dark:hover:text-sky-400 hover:scale-110 active:scale-90 transition-all cursor-pointer"
                title="Scroll Right"
              >
                <FiChevronRight className="w-4.5 h-4.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Utility options & Theme Switcher (Right) */}
      <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
        {/* Zoom Control Deck - Scaled down for mobile */}
        <div className="flex items-center p-0.5 md:p-1 bg-slate-100/80 dark:bg-slate-900/50 border border-slate-200/30 dark:border-slate-850/40 rounded-xl md:rounded-2xl gap-0.5 md:gap-1">
          <button
            onClick={() => zoomActions?.zoomIn()}
            className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 transition-all duration-300 active:scale-90 outline-none cursor-pointer"
            title="Zoom In"
          >
            <FiPlus className="w-4 h-4 md:w-4.5 md:h-4.5" />
          </button>
          <button
            onClick={() => zoomActions?.zoomOut()}
            className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-all duration-300 active:scale-90 outline-none cursor-pointer"
            title="Zoom Out"
          >
            <FiMinus className="w-4 h-4 md:w-4.5 md:h-4.5" />
          </button>
          <button
            onClick={() => zoomActions?.resetTransform()}
            className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center text-slate-500 hover:text-sky-600 dark:hover:text-sky-450 hover:bg-sky-500/10 dark:hover:bg-sky-500/20 transition-all duration-300 active:scale-90 outline-none cursor-pointer"
            title="Reset Map View"
          >
            <FiMaximize2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        </div>

        {/* Rotation Controls */}
        <div className="flex items-center p-0.5 md:p-1 bg-slate-100/80 dark:bg-slate-900/50 border border-slate-200/30 dark:border-slate-850/40 rounded-xl md:rounded-2xl gap-0.5 md:gap-1">
          <button
            onClick={() => setMapRotation(mapRotation - 45)}
            className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 transition-all duration-200 active:scale-90 outline-none cursor-pointer text-base font-bold"
            title="Rotate Map Left"
          >↺</button>
          <span className="text-[9px] md:text-[10px] font-bold text-slate-400 dark:text-slate-500 select-none px-0.5 min-w-[28px] md:min-w-[32px] text-center tabular-nums">
            {Math.round(mapRotation)}°
          </span>
          <button
            onClick={() => setMapRotation(mapRotation + 45)}
            className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 transition-all duration-200 active:scale-90 outline-none cursor-pointer text-base font-bold"
            title="Rotate Map Right"
          >↻</button>
          {mapRotation !== 0 && (
            <button
              onClick={() => setMapRotation(0)}
              className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center text-[8px] md:text-[9px] font-extrabold text-sky-500 hover:text-sky-600 hover:bg-sky-500/10 transition-all active:scale-90 cursor-pointer outline-none uppercase tracking-wider"
              title="Reset Rotation"
            >N</button>
          )}
        </div>

        {/* Share Public Mode (Admin Only) */}
        {isAdminMode && (
          <button
            onClick={() => window.open(window.location.origin + window.location.pathname + '?mode=public', '_blank')}
            className="flex items-center gap-1.5 px-2 md:px-3 h-8 md:h-10 rounded-lg md:rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-semibold text-xs transition-all active:scale-95 cursor-pointer outline-none"
            title="Open Public Viewer Mode"
          >
            <FiShare2 className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
            <span>Public</span>
          </button>
        )}

        {/* Theme Toggler */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200/50 dark:border-slate-800/40 bg-white/50 dark:bg-slate-950/30 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all active:scale-95 cursor-pointer outline-none"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <FiSun className="w-4.5 h-4.5 text-amber-400" />
          ) : (
            <FiMoon className="w-4.5 h-4.5 text-slate-650" />
          )}
        </button>
      </div>

    </div>
  );
}
