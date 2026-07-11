import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/useMapStore';
import { FiSun, FiMoon, FiPlus, FiMinus, FiMaximize2, FiShare2, FiMaximize, FiMinimize, FiChevronDown } from 'react-icons/fi';
import Search from '../Search/Search';

export default function MapHeader() {
  const {
    buildings, currentBuilding, setBuilding,
    theme, toggleTheme,
    zoomActions,
    isAdminMode,
    mapRotation, setMapRotation,
    isFullScreen, toggleFullScreen
  } = useMapStore();

  const [terminalOpen, setTerminalOpen] = useState(false);
  const currentBuildingName = buildings?.find(b => b.id === currentBuilding)?.name || 'Select Terminal';

  return (
    <>
      {/* ── Full Screen Exit FAB ─────────────────────────────────── */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-4 right-4 z-[70] pointer-events-auto"
          >
            <button
              onClick={toggleFullScreen}
              className="w-11 h-11 rounded-2xl flex items-center justify-center bg-indigo-500 shadow-2xl shadow-indigo-500/40 text-white active:scale-90 transition-all"
            >
              <FiMinimize className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Header ─────────────────────────────────────────── */}
      {!isFullScreen && (
        <div className="h-14 border-b border-slate-200/50 dark:border-slate-800/40 bg-white/90 dark:bg-slate-950/80 backdrop-blur-xl flex items-center justify-between px-3 md:px-6 z-20 select-none flex-shrink-0">

          {/* LEFT: Terminal Selector */}
          <div className="flex items-center min-w-0">
            {buildings && buildings.length > 1 ? (
              /* Custom styled dropdown for multi-terminal */
              <div className="relative">
                <button
                  onClick={() => setTerminalOpen(!terminalOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border border-sky-400/30 dark:border-sky-600/30 text-sky-700 dark:text-sky-300 font-bold text-sm active:scale-95 transition-all"
                >
                  <span className="text-base">🏢</span>
                  <span className="max-w-[120px] truncate text-[13px]">{currentBuildingName}</span>
                  <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${terminalOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {terminalOpen && (
                    <>
                      <div className="fixed inset-0 z-[55]" onClick={() => setTerminalOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        className="absolute top-full left-0 mt-2 z-[60] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/60 dark:border-slate-700/40 overflow-hidden min-w-[180px]"
                      >
                        {buildings.map(b => (
                          <button
                            key={b.id}
                            onClick={() => { setBuilding(b.id); setTerminalOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all active:scale-95 ${
                              currentBuilding === b.id
                                ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className="text-base">🏢</span>
                            <span className="truncate">{b.name}</span>
                            {currentBuilding === b.id && <span className="ml-auto text-sky-500">✓</span>}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : buildings && buildings.length === 1 ? (
              /* Single terminal — just show name badge */
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/60">
                <span className="text-base">🏢</span>
                <span className="font-bold text-[13px] text-slate-700 dark:text-slate-200 max-w-[130px] truncate">{currentBuildingName}</span>
              </div>
            ) : null}
          </div>

          {/* RIGHT: Action Buttons */}
          <div className="flex items-center gap-1.5">

            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/40 dark:border-slate-700/40 p-0.5 gap-0.5">
              <button
                onClick={() => zoomActions?.zoomIn()}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-emerald-500/10 active:scale-90 transition-all"
              >
                <FiPlus className="w-4 h-4" />
              </button>
              <button
                onClick={() => zoomActions?.resetTransform()}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-sky-600 hover:bg-sky-500/10 active:scale-90 transition-all"
              >
                <FiMaximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => zoomActions?.zoomOut()}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 active:scale-90 transition-all"
              >
                <FiMinus className="w-4 h-4" />
              </button>
            </div>

            {/* Full Screen Toggle */}
            <button
              onClick={toggleFullScreen}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 active:scale-90 transition-all"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isFullScreen
                ? <FiMinimize className="w-4 h-4" />
                : <FiMaximize className="w-4 h-4" />
              }
            </button>

            {/* Dark/Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/40 dark:border-slate-700/40 active:scale-90 transition-all"
              title="Toggle Theme"
            >
              {theme === 'dark'
                ? <FiSun className="w-4 h-4 text-amber-400" />
                : <FiMoon className="w-4 h-4 text-slate-600" />
              }
            </button>

            {/* Admin: Share/Public Link */}
            {isAdminMode && (
              <button
                onClick={() => window.open(window.location.origin + window.location.pathname + '?mode=public', '_blank')}
                className="hidden md:flex items-center gap-1.5 px-3 h-9 rounded-xl bg-sky-500/10 border border-sky-400/30 text-sky-600 dark:text-sky-400 font-semibold text-xs active:scale-95 transition-all"
              >
                <FiShare2 className="w-3.5 h-3.5" />
                <span>Public</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile Floating Search (below header) ───────────────── */}
      {!isFullScreen && (
        <div className="md:hidden fixed top-[56px] left-3 right-3 z-[60] pointer-events-auto">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/8 border border-slate-200/60 dark:border-slate-700/40 px-3 py-1.5">
            <Search />
          </div>
        </div>
      )}
    </>
  );
}
