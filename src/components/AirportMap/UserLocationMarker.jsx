import React from 'react';

export default function UserLocationMarker({ position, heading, isWalking, isOffRoute }) {
  if (!position) return null;

  return (
    <g transform={`translate(${position.x}, ${position.y})`} className="pointer-events-none drop-shadow-xl" style={{ zIndex: 100 }}>
      {/* Directional Cone (Heading) */}
      <g transform={`rotate(${heading})`}>
        {/* Radar sweeping effect or simple cone */}
        <path 
          d="M 0 0 L -30 -80 A 80 80 0 0 1 30 -80 Z" 
          fill="url(#headingGradient)" 
          opacity="0.3" 
        />
      </g>

      {/* Pulse effect if walking */}
      {isWalking && (
        <circle r="25" fill="#3b82f6" className="animate-ping opacity-40" />
      )}
      
      {/* Off-route warning halo */}
      {isOffRoute && (
        <circle r="30" fill="none" stroke="#ef4444" strokeWidth="3" className="animate-pulse" strokeDasharray="4,4" />
      )}

      {/* Outer Halo */}
      <circle r="12" fill={isOffRoute ? '#ef4444' : '#3b82f6'} opacity="0.3" />
      
      {/* White Border */}
      <circle r="8" fill="#ffffff" />
      
      {/* Inner Dot */}
      <circle r="5.5" fill={isOffRoute ? '#dc2626' : '#2563eb'} />

      {/* Gradient Definition */}
      <defs>
        <linearGradient id="headingGradient" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
        </linearGradient>
      </defs>
    </g>
  );
}
