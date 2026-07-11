import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/useMapStore';
import {
  FiSun, FiMoon, FiPlus, FiMinus, FiMaximize2,
  FiShare2, FiMaximize, FiMinimize, FiChevronDown,
  FiRotateCcw, FiRotateCw
} from 'react-icons/fi';

export default function MapHeader() {
  const {
    buildings, currentBuilding, setBuilding,
    theme, toggleTheme,
    zoomActions,
    isAdminMode,
    mapRotation, setMapRotation,
    isFullScreen, toggleFullScreen,
    dataLoaded,
  } = useMapStore();

  const [terminalOpen, setTerminalOpen] = useState(false);
  const [rotOpen, setRotOpen] = useState(false);
  const currentBuildingName = buildings?.find(b => b.id === currentBuilding)?.name || 'Select Terminal';

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

          {/* LEFT: Terminal Selector */}
          <div className="flex items-center min-w-0 flex-1">
            {buildings && buildings.length > 0 && (
              <div className="relative max-w-full">
                <button
                  onClick={() => setTerminalOpen(v => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-gradient-to-r from-sky-500/15 to-indigo-500/15 border border-sky-400/30 dark:border-sky-600/30 text-sky-700 dark:text-sky-300 font-bold active:scale-95 transition-all max-w-[160px]"
                >
                  <span className="text-base flex-shrink-0">🏢</span>
                  <span className="truncate text-[12px] font-bold">{currentBuildingName}</span>
                  {buildings.length > 1 && (
                    <FiChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${terminalOpen ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {buildings.length > 1 && (
                  <AnimatePresence>
                    {terminalOpen && (
                      <>
                        <div className="fixed inset-0 z-[55]" onClick={() => setTerminalOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 mt-2 z-[60] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-black/15 border border-slate-200/60 dark:border-slate-700/40 overflow-hidden min-w-[180px]"
                        >
                          {buildings.map(b => (
                            <button
                              key={b.id}
                              onClick={() => { setBuilding(b.id); setTerminalOpen(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-[13px] font-semibold transition-all active:scale-95 ${
                                currentBuilding === b.id
                                  ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span>🏢</span>
                              <span className="truncate flex-1 text-left">{b.name}</span>
                              {currentBuilding === b.id && <span className="text-sky-500 text-xs font-bold">✓</span>}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                )}
              </div>
            )}
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

      {/* ── Mobile Floating Map Controls (zoom + rotation) ──── */}
      {!isFullScreen && dataLoaded && (
        <div className="md:hidden fixed right-3 z-30 flex flex-col gap-2 pointer-events-auto" style={{ top: '72px' }}>
          {/* Zoom group */}
          <div className="flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/60 dark:border-slate-700/40 overflow-hidden">
            <button onClick={() => zoomActions?.zoomIn()} className="w-9 h-9 flex items-center justify-center text-emerald-600 dark:text-emerald-400 active:bg-emerald-50 dark:active:bg-emerald-950/30 transition-all active:scale-90">
              <FiPlus className="w-4 h-4" />
            </button>
            <div className="h-px bg-slate-200/60 dark:bg-slate-700/40 mx-1.5" />
            <button onClick={() => zoomActions?.resetTransform()} className="w-9 h-9 flex items-center justify-center text-slate-500 dark:text-slate-400 active:bg-slate-50 dark:active:bg-slate-800 transition-all active:scale-90">
              <FiMaximize2 className="w-3.5 h-3.5" />
            </button>
            <div className="h-px bg-slate-200/60 dark:bg-slate-700/40 mx-1.5" />
            <button onClick={() => zoomActions?.zoomOut()} className="w-9 h-9 flex items-center justify-center text-rose-500 dark:text-rose-400 active:bg-rose-50 dark:active:bg-rose-950/30 transition-all active:scale-90">
              <FiMinus className="w-4 h-4" />
            </button>
          </div>

          {/* Rotation group */}
          <div className="flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/60 dark:border-slate-700/40 overflow-hidden">
            <button onClick={() => setMapRotation(mapRotation - 45)} className="w-9 h-9 flex items-center justify-center text-violet-500 active:bg-violet-50 dark:active:bg-violet-950/30 transition-all active:scale-90">
              <FiRotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="h-px bg-slate-200/60 dark:bg-slate-700/40 mx-1.5" />
            <button onClick={() => setMapRotation(0)} className="w-9 h-9 flex items-center justify-center text-[9px] font-bold text-violet-600 dark:text-violet-300 active:bg-violet-50 transition-all">
              {Math.round(mapRotation)}°
            </button>
            <div className="h-px bg-slate-200/60 dark:bg-slate-700/40 mx-1.5" />
            <button onClick={() => setMapRotation(mapRotation + 45)} className="w-9 h-9 flex items-center justify-center text-violet-500 active:bg-violet-50 dark:active:bg-violet-950/30 transition-all active:scale-90">
              <FiRotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      {/* ── Mobile Floating Search (below header, above map) ── */}
      {!isFullScreen && (
        <div className="md:hidden fixed left-3 z-30 pointer-events-auto" style={{ top: '60px', right: '56px' }}>
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/8 border border-slate-200/60 dark:border-slate-700/40 px-3 py-1.5">
            <Search />
          </div>
        </div>
      )}
    </>
  );
}
