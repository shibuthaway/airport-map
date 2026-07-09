import React from 'react';
import { useMapStore } from '../../store/useMapStore';

export default function MiniMap() {
  const { currentFloor, selectedPoi } = useMapStore();

  // Simple micro paths representing terminal outlines for the floors
  const getMicroPath = () => {
    switch (currentFloor) {
      case 'departure':
      case 'arrival':
        // Full width terminal
        return "M 10,85 L 10,65 L 15,65 L 15,25 L 20,25 L 20,10 L 80,10 L 80,25 L 85,25 L 85,65 L 90,65 L 90,85 Z";
      case 'mezzanine':
        // Smaller/balcony
        return "M 20,80 L 20,30 L 22,30 L 22,12 L 78,12 L 78,30 L 80,30 L 80,80 Z";
      case 'lounge':
        // Narrower Lounge level
        return "M 22,75 L 22,30 L 24,30 L 24,15 L 76,15 L 76,30 L 78,30 L 78,75 Z";
      default:
        return "M 10,85 L 10,65 L 15,65 L 15,25 L 20,25 L 20,10 L 80,10 L 80,25 L 85,25 L 85,65 L 90,65 L 90,85 Z";
    }
  };

  return (
    <div className="hidden sm:block p-2 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/40 shadow-xl w-24 h-20 select-none">
      <div className="relative w-full h-full bg-slate-100/50 dark:bg-slate-950/40 rounded-lg overflow-hidden flex items-center justify-center">
        {/* Floor Outline */}
        <svg viewBox="0 0 100 100" className="w-full h-full p-1">
          <path
            d={getMicroPath()}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-slate-300 dark:text-slate-700 transition-all duration-300"
          />

          {/* Void Area Inner Indicator */}
          {(currentFloor === 'mezzanine' || currentFloor === 'lounge') && (
            <rect x="28" y="22" width="44" height="46" fill="none" stroke="currentColor" strokeDasharray="2,2" strokeWidth="0.8" className="text-slate-200 dark:text-slate-800" />
          )}

          {/* Selected POI Indicator */}
          {selectedPoi && (
            <circle
              cx={selectedPoi.x / 10}
              cy={selectedPoi.y / 6}
              r="3.5"
              fill="#0ea5e9"
              className="animate-ping"
            />
          )}
          {selectedPoi && (
            <circle
              cx={selectedPoi.x / 10}
              cy={selectedPoi.y / 6}
              r="2"
              fill="#0ea5e9"
              stroke="#ffffff"
              strokeWidth="0.5"
            />
          )}
        </svg>

        {/* Level Indicator Tag */}
        <span className="absolute bottom-1 right-1 text-[8px] font-bold bg-slate-200/60 dark:bg-slate-850 text-slate-500 dark:text-slate-400 px-1 rounded uppercase tracking-wider">
          {currentFloor.substring(0, 4)}
        </span>
      </div>
    </div>
  );
}
