import { useState, useEffect } from 'react';

/**
 * Shows a subtle banner when user is offline.
 * PWA Service Worker ensures the app still works fully offline.
 */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const goOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
      setShowRestored(false);
    };
    const goOnline = () => {
      setIsOffline(false);
      if (wasOffline) {
        setShowRestored(true);
        setTimeout(() => setShowRestored(false), 3000);
      }
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [wasOffline]);

  if (!isOffline && !showRestored) return null;

  return (
    <div
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-xl pointer-events-none transition-all duration-500 ${
        isOffline
          ? 'bg-amber-500/95 text-white'
          : 'bg-emerald-500/95 text-white'
      }`}
      style={{ backdropFilter: 'blur(12px)' }}
    >
      {isOffline ? (
        <>
          <span className="w-2 h-2 rounded-full bg-white animate-pulse flex-shrink-0" />
          <span>Offline — Navigation works without internet ✓</span>
        </>
      ) : (
        <>
          <span>✅ Back online!</span>
        </>
      )}
    </div>
  );
}
