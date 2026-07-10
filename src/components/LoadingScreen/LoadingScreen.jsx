import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/useMapStore';

const PHASES = [
  'Connecting to database...',
  'Loading floor layouts...',
  'Mapping Gates & Lounges...',
  'Building navigation graph...',
  'Ready!',
];

export default function LoadingScreen() {
  const dataLoaded = useMapStore(s => s.dataLoaded);
  const [progress, setProgress] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [apiDone, setApiDone] = useState(false);

  // Simulate progress up to 85% while waiting for API
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        const ceiling = apiDone ? 100 : 85;
        if (prev >= ceiling) { clearInterval(timer); return prev; }
        const next = Math.min(prev + Math.floor(Math.random() * 10) + 4, ceiling);
        setPhaseIdx(Math.min(Math.floor(next / 22), PHASES.length - 2));
        return next;
      });
    }, 130);
    return () => clearInterval(timer);
  }, [apiDone]);

  // When API data arrives, jump to 100%
  useEffect(() => {
    if (dataLoaded) {
      setApiDone(true);
      setProgress(100);
      setPhaseIdx(PHASES.length - 1);
      const hideTimer = setTimeout(() => setVisible(false), 700);
      return () => clearTimeout(hideTimer);
    }
  }, [dataLoaded]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0c1a35 55%, #071322 100%)' }}
        >
          {/* Runway lines decoration */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute left-1/2 h-px bg-sky-400"
                style={{ width: `${40 + i * 12}%`, top: `${20 + i * 12}%`, transform: 'translateX(-50%)' }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 3, delay: i * 0.4, repeat: Infinity }}
              />
            ))}
          </div>

          {/* Logo ring */}
          <div className="relative mb-10 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
              className="absolute w-36 h-36 rounded-full border border-dashed border-sky-500/20"
            />
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              className="absolute w-28 h-28 rounded-full border border-sky-500/30"
            />
            <motion.div
              animate={{ opacity: [0.15, 0.35, 0.15] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="absolute w-20 h-20 rounded-full bg-sky-500/15 blur-sm"
            />
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="relative z-10 w-16 h-16 rounded-full bg-sky-600/20 border border-sky-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(14,165,233,0.15)]"
            >
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-sky-400" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/>
              </svg>
            </motion.div>
          </div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="h-px w-10 bg-sky-500/40" />
              <span className="text-[10px] font-bold tracking-[0.3em] text-sky-500/80 uppercase">
                Airports Authority of India
              </span>
              <div className="h-px w-10 bg-sky-500/40" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-wider text-white mb-1 leading-tight">
              CHENNAI<span className="text-sky-400"> AIRPORT</span>
            </h1>
            <p className="text-sm font-semibold text-slate-400 tracking-[0.2em] uppercase mb-0.5">
              Terminal 1 · Domestic
            </p>
            <p className="text-xs text-sky-500/70 font-medium tracking-widest uppercase">
              Interactive Floor Map
            </p>
          </motion.div>

          {/* Progress */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0.8 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.3 }}
            className="w-64"
          >
            <div className="w-full h-1 rounded-full bg-slate-800/80 overflow-hidden border border-slate-700/40 mb-2">
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${progress}%` }}
                style={{
                  background: 'linear-gradient(90deg, #0ea5e9 0%, #6366f1 100%)',
                  boxShadow: '0 0 10px rgba(14,165,233,0.5)',
                }}
                transition={{ ease: 'easeOut', duration: 0.4 }}
              />
            </div>
            <div className="flex items-center justify-between">
              <motion.span
                key={phaseIdx}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[11px] text-slate-400 font-medium"
              >
                {PHASES[phaseIdx]}
              </motion.span>
              <span className="text-[11px] font-bold text-sky-400 font-mono tabular-nums">
                {progress}%
              </span>
            </div>
          </motion.div>

          {/* Floor indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex gap-3 mt-8"
          >
            {['L1 Arrival', 'L2 Departure', 'L3 Mezzanine', 'L4 Lounge'].map((label, i) => (
              <motion.div
                key={label}
                animate={{ opacity: progress > (i + 1) * 22 ? 1 : 0.25 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${progress > (i + 1) * 22 ? 'bg-sky-400 shadow-[0_0_6px_rgba(14,165,233,0.7)]' : 'bg-slate-700'}`} />
                <p className="text-[9px] font-semibold text-slate-500 tracking-wide whitespace-nowrap">{label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* IATA decoration */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            transition={{ delay: 0.8 }}
            className="absolute bottom-8 text-[80px] font-black text-white/5 tracking-widest select-none pointer-events-none"
          >
            MAA
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
