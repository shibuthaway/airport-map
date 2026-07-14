import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/useMapStore';
import {
  FiSun, FiMoon, FiPlus, FiMinus, FiMaximize2,
  FiShare2, FiMaximize, FiMinimize, FiChevronDown,
  FiRotateCcw, FiRotateCw, FiX
} from 'react-icons/fi';
import Search from '../Search/Search';

export default function MapHeader() {
  const {
    buildings, currentBuilding, setBuilding,
    theme, toggleTheme,
    zoomActions,
    isAdminMode,
    mapRotation, setMapRotation,
    isFullScreen, toggleFullScreen,
    dataLoaded,
    navigationPath, clearNavigation,
  } = useMapStore();

  const [terminalOpen, setTerminalOpen] = useState(false);
  const [rotOpen, setRotOpen] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!dataLoaded) return null;

  return (
    <>
      {/* ── Full Screen Exit FAB ─────────────── */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            onClick={toggleFullScreen}
            className="absolute top-4 right-4 z-[70] w-11 h-11 rounded-2xl flex items-center justify-center bg-indigo-500 shadow-2xl shadow-indigo-500/40 text-white active:scale-90 transition-all pointer-events-auto"
          >
            <FiMinimize className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Main Header ─────────────────────── */}
      {!isFullScreen && (
        <div className="h-14 border-b border-slate-200/50 dark:border-slate-800/40 bg-white/95 dark:bg-slate-950/90 backdrop-blur-xl flex items-center justify-between px-3 md:px-6 z-20 select-none flex-shrink-0 gap-2">

          {/* LEFT: Live Status Indicator */}
          <div className="flex items-center min-w-0 flex-1">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md shadow-sm">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 tracking-wider uppercase">Live</span>
              <div className="w-px h-3 bg-slate-300 dark:bg-slate-700 mx-0.5"></div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* MIDDLE: Mobile Compact Search */}
          <div className="md:hidden flex-1 min-w-0 px-2 flex justify-center">
            <Search compact />
          </div>

          {/* RIGHT: Mobile — only essential 3 buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0 md:hidden">
            {/* Full Screen */}
            <button
              onClick={toggleFullScreen}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 active:scale-90 transition-all"
            >
              <FiMaximize className="w-4 h-4" />
            </button>

            {/* Theme */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-slate-800/60 border border-amber-200/50 dark:border-slate-700/40 active:scale-90 transition-all"
            >
              {theme === 'dark' ? <FiSun className="w-4 h-4 text-amber-400" /> : <FiMoon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>

          {/* RIGHT: Desktop — all controls */}
          <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
            {/* Rotation */}
            <div className="flex items-center bg-violet-50 dark:bg-violet-950/30 border border-violet-200/50 dark:border-violet-800/40 rounded-xl p-0.5 gap-0.5">
              <button onClick={() => setMapRotation(mapRotation - 45)} className="w-8 h-8 rounded-lg flex items-center justify-center text-violet-500 hover:bg-violet-100 active:scale-90 transition-all">
                <FiRotateCcw className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setMapRotation(0)} className="h-8 px-1.5 rounded-lg text-[10px] font-bold text-violet-600 dark:text-violet-300 hover:bg-violet-100 active:scale-90 transition-all min-w-[30px]">
                {Math.round(mapRotation)}°
              </button>
              <button onClick={() => setMapRotation(mapRotation + 45)} className="w-8 h-8 rounded-lg flex items-center justify-center text-violet-500 hover:bg-violet-100 active:scale-90 transition-all">
                <FiRotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 rounded-xl p-0.5 gap-0.5">
              <button onClick={() => zoomActions?.zoomIn()} className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-100 active:scale-90 transition-all"><FiPlus className="w-4 h-4" /></button>
              <button onClick={() => zoomActions?.resetTransform()} className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-100 active:scale-90 transition-all"><FiMaximize2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => zoomActions?.zoomOut()} className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-100 active:scale-90 transition-all"><FiMinus className="w-4 h-4" /></button>
            </div>

            <button onClick={toggleFullScreen} className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 active:scale-90 transition-all">
              {isFullScreen ? <FiMinimize className="w-4 h-4" /> : <FiMaximize className="w-4 h-4" />}
            </button>
            <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-slate-800/60 border border-amber-200/50 dark:border-slate-700/40 active:scale-90 transition-all">
              {theme === 'dark' ? <FiSun className="w-4 h-4 text-amber-400" /> : <FiMoon className="w-4 h-4 text-slate-600" />}
            </button>
            {isAdminMode && (
              <button onClick={() => window.open(window.location.origin + window.location.pathname + '?mode=public', '_blank')} className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs active:scale-95 transition-all shadow-md shadow-sky-500/30">
                <FiShare2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Active Navigation Overlay ─────────── */}
      <AnimatePresence>
        {navigationPath && !isFullScreen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] pointer-events-auto"
          >
            <button
              onClick={() => clearNavigation()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-500/30 transition-all active:scale-95 border border-rose-400/50"
            >
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Stop Navigation
              <FiX className="w-3.5 h-3.5 ml-1" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Map Controls (zoom + rotation) ──── */}
      {dataLoaded && (
        <div className={`fixed flex flex-row gap-3 pointer-events-auto transition-all ${
          isFullScreen ? 'z-[60] bottom-8 left-1/2 -translate-x-1/2' : 'z-30 bottom-[90px] left-1/2 -translate-x-1/2 md:hidden'
        }`}>
          {/* Zoom group */}
          <div className="flex flex-row items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-full shadow-xl border border-slate-200/60 dark:border-slate-700/40 px-1 overflow-hidden">
            <button onClick={() => zoomActions?.zoomOut()} className="w-10 h-10 flex items-center justify-center text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full transition-all active:scale-90">
              <FiMinus className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-slate-200/60 dark:bg-slate-700/40 mx-0.5" />
            <button onClick={() => zoomActions?.resetTransform()} className="w-10 h-10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all active:scale-90">
              <FiMaximize2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-5 bg-slate-200/60 dark:bg-slate-700/40 mx-0.5" />
            <button onClick={() => zoomActions?.zoomIn()} className="w-10 h-10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-full transition-all active:scale-90">
              <FiPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Rotation group */}
          <div className="flex flex-row items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-full shadow-xl border border-slate-200/60 dark:border-slate-700/40 px-1 overflow-hidden">
            <button onClick={() => setMapRotation(mapRotation - 45)} className="w-10 h-10 flex items-center justify-center text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-full transition-all active:scale-90">
              <FiRotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-5 bg-slate-200/60 dark:bg-slate-700/40 mx-0.5" />
            <button onClick={() => setMapRotation(0)} className="w-10 h-10 flex items-center justify-center text-[10px] font-bold text-violet-600 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-full transition-all">
              {Math.round(mapRotation)}°
            </button>
            <div className="w-px h-5 bg-slate-200/60 dark:bg-slate-700/40 mx-0.5" />
            <button onClick={() => setMapRotation(mapRotation + 45)} className="w-10 h-10 flex items-center justify-center text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-full transition-all active:scale-90">
              <FiRotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
