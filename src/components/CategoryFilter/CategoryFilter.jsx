import React from 'react';
import { useMapStore } from '../../store/useMapStore';

export default function CategoryFilter() {
  const { activeFilters, toggleFilter, clearFilters } = useMapStore();

  const filterItems = [
    { key: 'gate',       label: 'Gates',      icon: '✈️' },
    { key: 'checkin',    label: 'Check-in',   icon: '🧳' },
    { key: 'baggage',    label: 'Baggage',    icon: '🛄' },
    { key: 'security',   label: 'Security',   icon: '🛡️' },
    { key: 'lift',       label: 'Lifts',      icon: '🛗' },
    { key: 'escalator',  label: 'Escalators', icon: '🪜' },
    { key: 'washroom',   label: 'Restrooms',  icon: '🚻' },
    { key: 'lounge',     label: 'Lounges',    icon: '🍷' },
    { key: 'office',     label: 'Offices',    icon: '🏢' },
    { key: 'helpdesk',   label: 'Help Desk',  icon: '🙋' },
  ];

  return (
    <div className="w-full flex items-center gap-2 overflow-x-auto py-1 px-1 no-scrollbar select-none">
      {/* Clear Filters Button */}
      {activeFilters.length > 0 && (
        <button
          onClick={clearFilters}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition active:scale-95 outline-none"
        >
          Clear ({(activeFilters.length)})
        </button>
      )}

      {/* Filter Caps */}
      {filterItems.map((item) => {
        const isSelected = activeFilters.includes(item.key);
        return (
          <button
            key={item.key}
            onClick={() => toggleFilter(item.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition duration-200 flex-shrink-0 active:scale-95 outline-none ${
              isSelected
                ? 'bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/15'
                : 'bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border-slate-200/50 dark:border-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
