import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../hooks/useOfflineSync';

/**
 * Phase 9: mount once so queued operations flush automatically.
 * Renders nothing.
 */
export function OfflineSyncBootstrap() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const sync = useOfflineSync(userId);

  // Kick an initial flush when signed in and online (useful after refresh)
  useEffect(() => {
    if (userId && sync.online && sync.pending > 0) {
      void sync.flushNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}
