import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchableSelect({ options, value, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent scroll when opened on mobile for better UX (optional)
  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative flex-1 min-w-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 min-w-0 transition-all shadow-sm"
      >
        <span className="truncate text-slate-800 dark:text-slate-100 font-medium">
          {selectedOption ? selectedOption.label : <span className="text-slate-400 font-normal">{placeholder}</span>}
        </span>
        <FiChevronDown className={`flex-shrink-0 text-slate-400 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-[100] top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col origin-top"
            style={{ maxHeight: '280px' }}
          >
            <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80">
              <FiSearch className="text-slate-400 ml-1 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Type to search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-transparent text-base text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <FiX />
                </button>
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
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-sky-50 dark:hover:bg-slate-700/50 transition-colors flex items-center ${value === opt.value ? 'bg-sky-50 dark:bg-slate-700/50 text-sky-600 dark:text-sky-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      <span className="truncate">{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
