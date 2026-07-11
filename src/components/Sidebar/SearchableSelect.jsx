import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchableSelect({ 
  options, value, onChange, placeholder,
  isControlledOpen, onOpen, onClose  // parent controls open state to prevent overlap
}) {
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const isOpen = isControlledOpen ?? false;
  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Focus input when opened on desktop
  useEffect(() => {
    if (isOpen && !isMobile && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMobile]);

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpen = () => {
    if (isOpen) {
      onClose?.();
    } else {
      onOpen?.();
      setSearch('');
    }
  };

  const handleSelect = (val) => {
    onChange(val);
    onClose?.();
    setSearch('');
  };

  return (
    <div className="relative flex-1 min-w-0" ref={containerRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 min-w-0 transition-all shadow-sm"
      >
        <span className="truncate text-slate-800 dark:text-slate-100 font-medium">
          {selectedOption ? selectedOption.label : <span className="text-slate-400 font-normal">{placeholder}</span>}
        </span>
        <FiChevronDown className={`flex-shrink-0 text-slate-400 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          isMobile ? (
            // ── MOBILE: Bottom sheet modal ──
            <div className="fixed inset-0 z-[99999] flex flex-col pointer-events-auto">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={() => onClose?.()}
              />
              {/* Sheet */}
              <motion.div
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 60 }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="relative mt-auto mx-3 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/50 dark:border-slate-800/50"
                style={{ maxHeight: '72vh', marginBottom: '72px' }}
              >
                {/* Search bar */}
                <div className="p-3 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
                  <div className="flex-1 relative flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2.5">
                    <FiSearch className="text-slate-400 mr-2 flex-shrink-0" />
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Type to search..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full bg-transparent text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400"
                      style={{ fontSize: '16px' }}
                    />
                    {search && (
                      <button onClick={() => setSearch('')} className="p-1 text-slate-400">
                        <FiX />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => onClose?.()}
                    className="px-3 py-2 text-sky-500 font-bold text-sm"
                  >Cancel</button>
                </div>

                {/* Options list */}
                <div className="overflow-y-auto flex-1 overscroll-contain custom-scrollbar p-2">
                  {filteredOptions.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">No matching locations</div>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {filteredOptions.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelect(opt.value)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-[14px] transition-colors flex items-center gap-2 ${
                            value === opt.value
                              ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {value === opt.value && <span className="text-sky-500 text-xs">✓</span>}
                          <span className="truncate">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          ) : (
            // ── DESKTOP: Dropdown ──
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute z-[100] top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col origin-top"
              style={{ maxHeight: '280px' }}
            >
              <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80">
                <FiSearch className="text-slate-400 ml-1 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type to search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="p-1 text-slate-400 hover:text-slate-600"><FiX /></button>
                )}
              </div>
              <div className="overflow-y-auto flex-1 overscroll-contain custom-scrollbar">
                {filteredOptions.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">No matching locations</div>
                ) : (
                  <div className="py-1">
                    {filteredOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-sky-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-2 ${
                          value === opt.value ? 'bg-sky-50 dark:bg-slate-700/50 text-sky-600 dark:text-sky-400 font-bold' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {value === opt.value && <span className="text-sky-500 text-xs">✓</span>}
                        <span className="truncate">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
