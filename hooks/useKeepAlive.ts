import { useEffect, useRef } from 'react';

/**
 * Hook to keep the database connection alive by periodically calling the keep-alive endpoint
 * when the page is active and user is interacting with it
 */
export function useKeepAlive(intervalMinutes: number = 4) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const keepAlive = async () => {
    try {
      // Only keep alive if user has been active recently (within last 10 minutes)
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      const maxIdleTime = 10 * 60 * 1000; // 10 minutes

      if (timeSinceActivity > maxIdleTime) {
        console.log('User inactive, skipping keep-alive');
        return;
      }

      const response = await fetch('/api/keep-alive', {
        method: 'GET',
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Keep-alive successful:', data.timestamp);
      } else {
        console.warn('Keep-alive failed:', response.status);
      }
    } catch (error) {
      console.error('Keep-alive error:', error);
    }
  };

  const updateActivity = () => {
    lastActivityRef.current = Date.now();
  };

  useEffect(() => {
    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Start keep-alive interval
    intervalRef.current = setInterval(keepAlive, intervalMinutes * 60 * 1000);

    // Initial keep-alive call
    keepAlive();

    return () => {
      // Clean up event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });

      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMinutes]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateActivity();
        // Immediate keep-alive when page becomes visible
        keepAlive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}