import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

/**
 * isControlledOpen: parent controls open state so only one is open at a time
 * onOpen: called when user taps trigger to open
 * onClose: called when user dismisses
 */
export default function SearchableSelect({
  options, value, onChange, placeholder,
  isControlledOpen = false, onOpen, onClose,
}) {
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const inputRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Focus search input on desktop when opened
  useEffect(() => {
    if (isControlledOpen && !isMobile && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
    // Clear search when closed
    if (!isControlledOpen) setSearch('');
  }, [isControlledOpen, isMobile]);

  const selectedOption = options.find(o => o.value === value);
  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleTrigger = () => {
    if (isControlledOpen) { onClose?.(); } else { onOpen?.(); }
  };

  const handleSelect = (val) => {
    onChange(val);
    onClose?.();
  };

  return (
    <div className="relative flex-1 min-w-0">
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleTrigger}
        className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none min-w-0 transition-all shadow-sm"
      >
        <span className="truncate text-slate-800 dark:text-slate-100 font-medium">
          {selectedOption
            ? selectedOption.label
            : <span className="text-slate-400 font-normal">{placeholder}</span>
          }
        </span>
        <FiChevronDown className={`flex-shrink-0 text-slate-400 ml-2 transition-transform duration-200 ${isControlledOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isControlledOpen && (
          isMobile ? createPortal(
            /* ── MOBILE: Full-height bottom sheet ── */
            <div className="fixed inset-0 z-[99999] flex flex-col pointer-events-auto">
              {/* Backdrop — clicking it closes */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={() => onClose?.()}
              />
              {/* Bottom sheet */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 320, mass: 0.8 }}
                className="relative mt-auto mx-3 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/50 dark:border-slate-800/50"
                style={{ maxHeight: '72vh', marginBottom: '72px' }}
              >
                {/* Search row */}
                <div className="p-3 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-2 flex-shrink-0">
                  <div className="flex-1 flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2.5 gap-2">
                    <FiSearch className="text-slate-400 flex-shrink-0" />
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Type to search..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{ fontSize: '16px' }}
                      className="w-full bg-transparent text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400"
                    />
                    {search && (
                      <button onClick={() => setSearch('')} className="p-1 text-slate-400">
                        <FiX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => onClose?.()}
                    className="px-3 py-2 text-sky-500 font-bold text-sm flex-shrink-0"
                  >Cancel</button>
                </div>
                {/* List */}
                <div className="overflow-y-auto flex-1 overscroll-contain p-2">
                  {filteredOptions.length === 0
                    ? <div className="p-8 text-center text-sm text-slate-500">No results</div>
                    : filteredOptions.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelect(opt.value)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-[14px] flex items-center gap-2 transition-colors mb-0.5 ${
                            value === opt.value
                              ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {value === opt.value && <span className="text-sky-500 text-xs font-black">✓</span>}
                          <span className="truncate">{opt.label}</span>
                        </button>
                      ))
                  }
                </div>
              </motion.div>
            </div>,
            document.body
          ) : (
            /* ── DESKTOP: Dropdown ── */
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              className="absolute z-[100] top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col origin-top"
              style={{ maxHeight: '260px' }}
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
                {search && <button onClick={() => setSearch('')} className="p-1 text-slate-400 hover:text-slate-600"><FiX /></button>}
              </div>
              <div className="overflow-y-auto flex-1 overscroll-contain">
                {filteredOptions.length === 0
                  ? <div className="p-4 text-center text-sm text-slate-500">No results</div>
                  : filteredOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                          value === opt.value
                            ? 'bg-sky-50 dark:bg-slate-700/50 text-sky-600 dark:text-sky-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        {value === opt.value && <span className="text-sky-500 text-xs font-black">✓</span>}
                        <span className="truncate">{opt.label}</span>
                      </button>
                    ))
                }
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
