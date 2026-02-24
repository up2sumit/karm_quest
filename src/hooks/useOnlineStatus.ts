import { useEffect, useState } from 'react';

/**
 * Phase 9: tiny hook to track browser online/offline state.
 * Note: navigator.onLine isn't perfect, but good enough for a todo app.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return online;
}
