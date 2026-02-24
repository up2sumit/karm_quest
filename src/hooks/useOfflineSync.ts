import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { flushQueue, pendingCount } from '../lib/offlineQueue';
import { useOnlineStatus } from './useOnlineStatus';

function isAuthError(msg: string) {
  const m = msg.toLowerCase();
  return m.includes('jwt') || m.includes('not authenticated') || m.includes('auth');
}

/**
 * Phase 9: flush queued writes when the network comes back.
 * Mount once (global), then UI can read pending count.
 */
export function useOfflineSync(userId: string | null) {
  const online = useOnlineStatus();

  const [flushing, setFlushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFlushedAt, setLastFlushedAt] = useState<number | null>(null);

  const pending = useMemo(() => (userId ? pendingCount(userId) : 0), [userId, online, lastFlushedAt, flushing]);

  const flushNow = useCallback(async () => {
    if (!userId) return;
    if (!online) {
      setError('Offline');
      return;
    }
    if (flushing) return;

    setFlushing(true);
    setError(null);

    try {
      const res = await flushQueue(supabase, { userId, maxOps: 100 });
      if (res.flushed > 0) setLastFlushedAt(Date.now());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // If auth expired, don't keep retrying; user needs to sign in again.
      setError(isAuthError(msg) ? 'Please sign in again (auth expired).' : msg);
    } finally {
      setFlushing(false);
    }
  }, [userId, online, flushing]);

  // Auto-flush when coming back online
  const wasOnline = useRef<boolean>(online);
  useEffect(() => {
    if (!userId) return;
    // detect offline->online transition
    if (!wasOnline.current && online) {
      void flushNow();
    }
    wasOnline.current = online;
  }, [online, userId, flushNow]);

  return { online, pending, flushing, error, lastFlushedAt, flushNow };
}
