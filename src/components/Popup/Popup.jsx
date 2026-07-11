import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/useMapStore';
import { FiX, FiNavigation, FiMapPin, FiCheck, FiArrowRight, FiClock } from 'react-icons/fi';

export default function Popup() {
  const {
    selectedPoi, selectPoi, setNavigationMode,
    setNavigationStart, setNavigationEnd,
    navigationStart, navigationEnd,
    navigationDistance
  } = useMapStore();

  const [flash, setFlash] = useState(null);

  if (!selectedPoi) return null;

  const isFrom = navigationStart?.id === selectedPoi.id;
  const isTo   = navigationEnd?.id   === selectedPoi.id;
  const bothSet = !!(navigationStart && navigationEnd);

  const handleFrom = () => {
    setNavigationMode(true);
    if (navigationEnd?.id === selectedPoi.id) setNavigationEnd(null);
    setNavigationStart(selectedPoi);
    setFlash('from');
    setTimeout(() => {
      setFlash(null);
      selectPoi(null);
    }, 600);
  };

  const handleTo = () => {
    setNavigationMode(true);
    if (navigationStart?.id === selectedPoi.id) setNavigationStart(null);
    setNavigationEnd(selectedPoi);
    setFlash('to');
    setTimeout(() => {
      setFlash(null);
      selectPoi(null);
    }, 600);
  };

  const statusDot = (s = '') => {
    const v = s.toLowerCase();
    if (v.includes('open') || v.includes('active')) return 'bg-emerald-500';
    if (v.includes('delay') || v.includes('soon'))  return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const fallbackImage = (cat) => {
    const map = {
      gate:      'https://images.unsplash.com/photo-1542296332-2e4473fac563?auto=format&fit=crop&w=400&q=80',
      restaurant:'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
      food:      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
      shopping:  'https://images.unsplash.com/photo-1580828343064-fde4fc206bc6?auto=format&fit=crop&w=400&q=80',
      lounge:    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80',
    };
    return map[cat] || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=400&q=80';
  };

  return (
    <AnimatePresence>
      {/* ── MOBILE: Compact pill at bottom ── */}
      <motion.div
        key={`m-${selectedPoi.id}`}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="md:hidden fixed z-50 left-3 right-3"
        style={{ bottom: '72px' }}
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-black/15 border border-slate-200/60 dark:border-slate-700/40 px-3 py-2.5 flex items-center gap-2.5">
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-base flex-shrink-0 shadow-md">
            {{ gate:'✈️', restaurant:'🍽️', food:'🍽️', shopping:'🛍️', lounge:'🍷', washroom:'🚻', security:'🛡️', checkin:'🧳', baggage:'🛄' }[selectedPoi.category?.toLowerCase()] || '📍'}
          </div>
          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[13px] text-slate-800 dark:text-slate-100 truncate leading-tight">{selectedPoi.name}</p>
            <p className="text-[10px] text-slate-400 capitalize">{selectedPoi.category}</p>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleFrom}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-90 ${isFrom ? 'bg-emerald-500 text-white' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-200/60 dark:border-emerald-800/40'}`}
            >From</button>
            <button
              onClick={handleTo}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-90 ${isTo ? 'bg-sky-500 text-white' : 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 border border-sky-200/60 dark:border-sky-800/40'}`}
            >Go</button>
            <button
              onClick={() => selectPoi(null)}
              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 active:scale-90 transition-all ml-0.5"
            ><FiX className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </motion.div>

      {/* ── DESKTOP: Full card ── */}
      <motion.div
        key={`d-${selectedPoi.id}`}
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="hidden md:block absolute right-6 bottom-6 w-[380px] z-50 rounded-3xl overflow-hidden
                   bg-white dark:bg-[#0d1526]
                   border border-slate-200/60 dark:border-slate-800/60
                   shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
      >
        {/* ── Hero image ── */}
        <div className="relative h-36 w-full overflow-hidden">
          <img
            src={selectedPoi.imageUrl || fallbackImage(selectedPoi.category)}
            alt={selectedPoi.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

          {/* Close button */}
          <button
            onClick={() => selectPoi(null)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70
                       text-white flex items-center justify-center border border-white/15
                       transition-colors duration-150 active:scale-90"
          >
            <FiX className="w-3.5 h-3.5" />
          </button>

          {/* Nav-role badge */}
          {(isFrom || isTo) && (
            <div className={`absolute top-3 left-3 flex items-center gap-1 text-[10px] font-bold
                             px-2.5 py-1 rounded-full border border-white/15
                             ${isFrom ? 'bg-emerald-600/85 text-white' : 'bg-sky-600/85 text-white'}`}>
              <FiCheck className="w-3 h-3" />
              {isFrom ? 'Start Point' : 'Destination'}
            </div>
          )}

          {/* Name + status over image */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-end justify-between">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/55 block mb-0.5">
                {selectedPoi.category}
              </span>
              <h3 className="text-base font-extrabold text-white leading-tight">
                {selectedPoi.name}
              </h3>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-white
                             bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
              <span className={`w-1.5 h-1.5 rounded-full ${statusDot(selectedPoi.status)}`} />
              {selectedPoi.status || 'Active'}
            </span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-4 pt-3 pb-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 240px)' }}>

          {/* Description */}
          {selectedPoi.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {selectedPoi.description}
            </p>
          )}

          {/* Route status strip */}
          {bothSet && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl
                            bg-slate-50 dark:bg-slate-900/60
                            border border-slate-200/50 dark:border-slate-800/40">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <FiMapPin className="w-2.5 h-2.5 text-white" />
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                  {navigationStart.name}
                </span>
              </div>

              <div className="flex flex-col items-center flex-shrink-0">
                <FiArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                {navigationDistance > 0 && (
                  <span className="text-[9px] font-bold text-sky-500 flex items-center gap-0.5">
                    <FiClock className="w-2.5 h-2.5" />
                    ~{Math.max(1, Math.round(navigationDistance / 80))}min
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate text-right">
                  {navigationEnd.name}
                </span>
                <span className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
                  <FiNavigation className="w-2.5 h-2.5 text-white" />
                </span>
              </div>
            </div>
          )}

          {/* ── Navigation buttons — pure CSS, no nested animation ── */}
          <div className="grid grid-cols-2 gap-2">

            {/* FROM */}
            <button
              onClick={handleFrom}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl
                          text-xs font-extrabold uppercase tracking-wider
                          transition-all duration-200 active:scale-[0.97]
                          ${isFrom
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                            : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-500 hover:text-white hover:border-transparent hover:shadow-md hover:shadow-emerald-500/25'
                          }`}
            >
              {isFrom
                ? <><FiCheck className="w-3.5 h-3.5" /> From Here</>
                : <><FiMapPin className="w-3.5 h-3.5" /> From Here</>
              }
            </button>

            {/* TO */}
            <button
              onClick={handleTo}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl
                          text-xs font-extrabold uppercase tracking-wider
                          transition-all duration-200 active:scale-[0.97]
                          ${isTo
                            ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                            : 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50 hover:bg-sky-500 hover:text-white hover:border-transparent hover:shadow-md hover:shadow-sky-500/25'
                          }`}
            >
              {isTo
                ? <><FiCheck className="w-3.5 h-3.5" /> Go Here</>
                : <><FiNavigation className="w-3.5 h-3.5" /> Go Here</>
              }
            </button>
          </div>

          {/* Subtle hint — no animation, just conditional render */}
          {flash && (
            <p className="text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              {flash === 'from'
                ? '📍 Start set — now tap your destination on the map'
                : '🏁 Destination set — now tap your start point on the map'}
            </p>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
