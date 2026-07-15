import { useState, useEffect, useCallback } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const checkStatus = useCallback(async () => {
    // If the browser natively thinks we are offline, trust it.
    if (!navigator.onLine) {
      setIsOnline(false);
      return;
    }
    
    try {
      // Fetch a small resource with a cache buster to verify actual internet access
      const url = new URL(window.location.origin);
      url.searchParams.set('rand', Date.now().toString());
      
      const response = await fetch(url.toString(), { 
        method: 'HEAD', 
        cache: 'no-store',
        // Set a short timeout if possible, but fetch doesn't support timeout directly without AbortController
      });
      setIsOnline(response.ok);
    } catch (error) {
      // If fetch fails (e.g. network error, no route to host, DNS failure)
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', () => setIsOnline(false));

    // Periodically check every 10 seconds to catch silent disconnections
    const interval = setInterval(checkStatus, 10000);
    
    // Check once on mount
    checkStatus();

    return () => {
      window.removeEventListener('online', checkStatus);
      window.removeEventListener('offline', () => setIsOnline(false));
      clearInterval(interval);
    };
  }, [checkStatus]);

  return isOnline;
}
