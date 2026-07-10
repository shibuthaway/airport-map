import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/useMapStore';
import { FiSun, FiMoon, FiPlus, FiMinus, FiMaximize2, FiShare2, FiMaximize, FiMinimize } from 'react-icons/fi';
import Search from '../Search/Search';

export default function MapHeader() {
  const { buildings, currentBuilding, setBuilding, theme, toggleTheme, zoomActions, isAdminMode, mapRotation, setMapRotation, isFullScreen, toggleFullScreen } = useMapStore();

  const defaultTheme = {
    gradient: 'from-blue-500 to-cyan-600 shadow-blue-500/25',
    badgeActive: 'bg-white/20 text-white',
    badgeInactive: 'bg-blue-500/10 text-blue-500 dark:text-blue-450'
  };

  return (
    <>
      {/* Immersive Exit Full Screen Button */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-4 right-4 z-[70] pointer-events-auto"
          >
            <button
              onClick={toggleFullScreen}
              className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 shadow-2xl shadow-indigo-500/30 text-white hover:scale-105 active:scale-95 transition-all cursor-pointer border border-indigo-400/50"
              title="Exit Full Screen"
            >
              <FiMinimize className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Normal Header */}
      {!isFullScreen && (
        <div className="h-14 md:h-16 border-b border-slate-200/50 dark:border-slate-800/40 bg-white/80 dark:bg-slate-950/60 backdrop-blur-xl flex items-center justify-between px-2 sm:px-4 md:px-6 z-20 select-none">
          
          {/* Terminal / Building Selector */}
          <div className="flex items-center">
            {buildings && buildings.length > 0 && (
              <select
                value={currentBuilding || ''}
                onChange={(e) => setBuilding(e.target.value)}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm md:text-base px-3 py-1.5 md:py-2 rounded-xl outline-none focus:border-sky-500 cursor-pointer shadow-sm transition-all"
              >
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
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

        {/* Full Screen Toggle (Mobile Only) */}
        <div className="md:hidden">
          <button
            onClick={toggleFullScreen}
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/40 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all active:scale-95 cursor-pointer outline-none"
            title={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
          >
            {isFullScreen ? (
              <FiMinimize className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <FiMaximize className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
            )}
          </button>
        </div>

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

        {/* Mobile Floating Search Bar */}
        <div className="md:hidden fixed top-[60px] left-3 right-3 z-[60] pointer-events-auto">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/10 border border-slate-200/60 dark:border-slate-700/40 px-3 py-1.5">
            <Search />
          </div>
        </div>

        </div>
      )}
    </>
  );
}
