import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../store/useMapStore';
import { FiSearch, FiX, FiMapPin } from 'react-icons/fi';

export default function Search({ compact = false }) {
  const { searchQuery, setSearchQuery, selectPoi, pois, floors, currentFloor, setFloor, zoomMapTo } = useMapStore();
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);

  // Index POIs ONLY from the floors of the current building
  const allPois = React.useMemo(() => {
    if (!floors) return [];
    const currentFloorIds = new Set(floors.map(f => f.id));
    return Object.values(pois)
      .flat()
      .filter(p => currentFloorIds.has(p.floor));
  }, [pois, floors]);

  // Re-build Fuse index whenever POIs change
  const fuseRef = useRef(null);
  useEffect(() => {
    fuseRef.current = new Fuse(allPois, {
      keys: ['name', 'category', 'description', 'facilities'],
      threshold: 0.4, // more lenient for better matching
      distance: 100,
    });
  }, [allPois]);

  // Handle outside click to close suggestions
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length > 0 && fuseRef.current) {
      const results = fuseRef.current.search(val).slice(0, 6);
      setSuggestions(results.map(r => r.item));
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleSelect = (poi) => {
    if (poi.floor && poi.floor !== currentFloor && setFloor) {
      window.__mapSkipNextReset = true;
      setFloor(poi.floor);
      // Slight delay to allow floor transition before highlighting the POI
      setTimeout(() => {
        zoomMapTo(poi.x, poi.y, 3.5);
        // Dispatch custom event so Sidebar can close on mobile
        window.dispatchEvent(new CustomEvent('map:poi-selected'));
      }, 150);
    } else {
      zoomMapTo(poi.x, poi.y, 3.5);
      window.dispatchEvent(new CustomEvent('map:poi-selected'));
    }
    setSearchQuery('');
    setIsOpen(false);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'gate': return '✈️';
      case 'restaurant':
      case 'food': return '🍔';
      case 'shopping': return '🛍️';
      case 'atm': return '💵';
      case 'washroom': return '🚻';
      case 'lounge': return '🍷';
      case 'security': return '🛡️';
      case 'immigration': return '🛂';
      case 'medical': return '🏥';
      case 'help desk': return 'ℹ️';
      default: return '📍';
    }
  };

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input Container */}
      <div className="relative flex items-center w-full">
        <FiSearch className={`absolute left-3 text-slate-400 dark:text-slate-500 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => searchQuery.trim().length > 0 && setIsOpen(true)}
          placeholder="Search..."
          className={`w-full ${compact ? 'pl-9 pr-8 py-2 rounded-xl text-sm' : 'pl-12 pr-10 py-3.5 rounded-2xl text-[16px]'} bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition duration-300 shadow-inner`}
        />
        {searchQuery.length > 0 && (
          <button
            onClick={handleClear}
            className="absolute right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Suggestions List Dropdown */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 right-0 mt-2 p-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto"
          >
            {suggestions.map((poi) => (
              <button
                key={poi.id}
                onClick={() => handleSelect(poi)}
                className="w-full text-left flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getCategoryIcon(poi.category)}</span>
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-100 text-sm">
                      {poi.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                      {poi.description}
                    </p>
                  </div>
                </div>
                <FiMapPin className="text-sky-500 w-3.5 h-3.5 flex-shrink-0" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
