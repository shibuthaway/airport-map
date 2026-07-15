import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/useMapStore';
import { FiLayers } from 'react-icons/fi';

export default function FloorSelector() {
  const { floors, currentFloor, setFloor, buildings, currentBuilding, setBuilding } = useMapStore();
  const [showBuildings, setShowBuildings] = useState(false);
  const containerRef = useRef(null);

  // Local state for instant UI feedback to prevent mobile freeze
  const [activeBuildingUI, setActiveBuildingUI] = useState(currentBuilding);

  useEffect(() => {
    setActiveBuildingUI(currentBuilding);
  }, [currentBuilding]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowBuildings(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const floorThemes = {
    arrival: {
      gradient: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
      text: 'text-emerald-500'
    },
    departure: {
      gradient: 'from-sky-500 to-indigo-600 shadow-sky-500/25',
      text: 'text-sky-500'
    },
    mezzanine: {
      gradient: 'from-amber-500 to-orange-600 shadow-amber-500/25',
      text: 'text-amber-500'
    },
    lounge: {
      gradient: 'from-purple-500 to-fuchsia-600 shadow-purple-500/25',
      text: 'text-purple-500'
    }
  };

  const defaultTheme = {
    gradient: 'from-blue-500 to-cyan-600 shadow-blue-500/25',
    text: 'text-blue-500'
  };

  if (!floors || floors.length === 0) return null;

  return (
    <div ref={containerRef} className="absolute right-3 top-1/2 -translate-y-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-auto">
      {/* Top Icon to signify "Floors" and Switch Buildings */}
      <div className="relative group">
        <button 
          onClick={() => setShowBuildings(!showBuildings)}
          className={`w-8 h-8 rounded-full backdrop-blur-md border flex items-center justify-center mb-1 shadow-lg transition-all ${
            showBuildings 
              ? 'bg-sky-500 text-white border-sky-400' 
              : 'bg-white/70 dark:bg-slate-900/60 border-slate-200/50 dark:border-slate-700/40 text-slate-400 hover:text-sky-500 hover:border-sky-300'
          }`}
          title="Switch Building"
        >
          <FiLayers className="w-4 h-4" />
        </button>

        {/* Building Dropdown Tooltip */}
        <AnimatePresence>
          {showBuildings && buildings?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute right-full mr-3 top-0 min-w-[140px] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl shadow-xl overflow-hidden pointer-events-auto"
            >
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Building</span>
              </div>
              <div className="flex flex-col py-1">
                {buildings.map(b => (
                  <button
                    key={b.id}
                    onClick={() => { 
                      if (activeBuildingUI === b.id) return;
                      setActiveBuildingUI(b.id);
                      setShowBuildings(false); 
                      setTimeout(() => {
                        setBuilding(b.id);
                      }, 50);
                    }}
                    className={`px-3 py-2 text-xs font-bold text-left transition-colors ${activeBuildingUI === b.id ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 p-1.5 rounded-3xl shadow-2xl flex flex-col gap-1.5">
        {[...floors].reverse().map((floor) => {
          // Reversing array to show higher floors at the top (visually natural)
          const isActive = currentFloor === floor.id;
          const themeInfo = floorThemes[floor.id] || defaultTheme;

          return (
            <button
              key={floor.id}
              onClick={() => setFloor(floor.id)}
              className="group relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-2xl outline-none transition-all duration-300"
              title={floor.name}
            >
              {/* Active Background Pill */}
              {isActive && (
                <motion.div
                  layoutId="activeVerticalFloor"
                  className={`absolute inset-0 bg-gradient-to-br ${themeInfo.gradient} rounded-2xl shadow-lg`}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              )}

              {/* Floor Level Text */}
              <span 
                className={`relative z-10 font-black font-mono tracking-tighter transition-all duration-300 ${
                  isActive 
                    ? 'text-white text-sm md:text-base drop-shadow-md' 
                    : 'text-slate-500 dark:text-slate-400 text-xs md:text-sm group-hover:text-slate-800 dark:group-hover:text-slate-200'
                }`}
              >
                {floor.level}
              </span>

              {/* Hover Tooltip (Name) */}
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover:translate-x-0 shadow-xl whitespace-nowrap hidden md:block">
                {floor.name}
                {/* Tooltip Arrow */}
                <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-4 border-transparent border-l-slate-800 dark:border-l-slate-100" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
