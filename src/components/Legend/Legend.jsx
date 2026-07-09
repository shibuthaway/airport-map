import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiList, FiChevronUp, FiChevronDown } from 'react-icons/fi';

export default function Legend() {
  const [isOpen, setIsOpen] = useState(false);

  const legendItems = [
    { label: 'Boarding Gate', color: 'bg-sky-500' },
    { label: 'Dining & Cafes', color: 'bg-emerald-500' },
    { label: 'Lounge / VIP', color: 'bg-violet-500' },
    { label: 'Shopping / Retail', color: 'bg-amber-500' },
    { label: 'Security & Passport', color: 'bg-pink-500' },
    { label: 'Washrooms', color: 'bg-slate-500' },
    { label: 'ATMs & Cash', color: 'bg-cyan-500' },
  ];

  return (
    <div className="flex flex-col items-end z-20">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="mb-2 p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/40 shadow-xl flex flex-col gap-2 w-44"
          >
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-200/20 dark:border-slate-800/30 pb-1.5 mb-1">
              Map Legend
            </h4>
            <div className="flex flex-col gap-1.5">
              {legendItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${item.color} shadow-sm flex-shrink-0`} />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/40 text-slate-700 dark:text-slate-200 shadow-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 outline-none font-semibold text-xs"
      >
        <FiList className="w-4 h-4" />
        <span>Legend</span>
        {isOpen ? <FiChevronDown className="w-3.5 h-3.5" /> : <FiChevronUp className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
