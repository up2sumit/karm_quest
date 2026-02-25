import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { enqueueUserState } from '../lib/offlineQueue';

function isLikelyNetworkError(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes('failed to fetch') ||
    m.includes('network') ||
    m.includes('fetch') ||
    m.includes('offline') ||
    m.includes('timeout')
  );
}

/**
 * Stores the entire app snapshot per-user in Supabase (JSONB).
 * Phase 9 upgrade:
 * - If offline or network fails, we queue the latest snapshot in localStorage.
 * - When online again, OfflineSyncBootstrap flushes the queue.
 */
export function useSupabaseUserState<T extends object>(opts: {
  enabled: boolean;
  userId: string | null;
  appKey: string; // e.g. "karmquest"
  version: string; // e.g. "1.3.0"
  snapshot: T;
  restore: (s: T) => void;
  /** Debounce writes to avoid spamming network. Default 900ms */
  debounceMs?: number;
}) {
  const { enabled, userId, appKey, version, snapshot, restore } = opts;
  const debounceMs = opts.debounceMs ?? 900;

  // Keep latest snapshot/version in refs for seeding.
  const latestSnapshotRef = useRef<T>(snapshot);
  const latestVersionRef = useRef<string>(version);
  useEffect(() => {
    latestSnapshotRef.current = snapshot;
    latestVersionRef.current = version;
  }, [snapshot, version]);

  const [remoteHydrated, setRemoteHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const restoreGuard = useRef(false);
  const didFetchKey = useRef<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const lastSavedHash = useRef<string>('');

  const activeKey = useMemo(() => (userId ? `${appKey}:${userId}` : null), [appKey, userId]);

  // Remote hydrate once per user
  useEffect(() => {
    if (!enabled || !userId || !activeKey) {
      setRemoteHydrated(false);
      setSaving(false);
      setError(null);
      setQueued(false);
      setLastSyncedAt(null);
      didFetchKey.current = null;
      return;
    }

    if (didFetchKey.current === activeKey) return;
    didFetchKey.current = activeKey;

    let cancelled = false;
    (async () => {
      setError(null);
      setRemoteHydrated(false);

      const { data, error: e } = await supabase
        .from('user_state')
        .select('version,snapshot,updated_at')
        .eq('user_id', userId)
        .eq('app_key', appKey)
        .maybeSingle();

      if (cancelled) return;

      if (e) {
        // If offline, just continue local-only; queued writes will flush later.
        setError(e.message);
        setRemoteHydrated(true);
        return;
      }

      if (data?.snapshot) {
        restoreGuard.current = true;
        try {
          restore(data.snapshot as T);
        } finally {
          setTimeout(() => {
            restoreGuard.current = false;
          }, 0);
        }
        lastSavedHash.current = JSON.stringify({ v: data.version, s: data.snapshot });
        setLastSyncedAt((data as any)?.updated_at ?? null);
        setRemoteHydrated(true);
        return;
      }

      // First time user: seed remote with current snapshot (or queue if offline)
      const seedSnapshot = latestSnapshotRef.current;
      const seedVersion = latestVersionRef.current;
      const seed = { user_id: userId, app_key: appKey, version: seedVersion, snapshot: seedSnapshot };

      try {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          enqueueUserState(seed);
          setQueued(true);
          lastSavedHash.current = JSON.stringify({ v: seedVersion, s: seedSnapshot });
          setRemoteHydrated(true);
          return;
        }

        const { data: insData, error: insErr } = await supabase
          .from('user_state')
          .upsert(seed, { onConflict: 'user_id,app_key' })
          .select('updated_at')
          .maybeSingle();
        if (insErr) throw insErr;
        setLastSyncedAt((insData as any)?.updated_at ?? new Date().toISOString());
        lastSavedHash.current = JSON.stringify({ v: seedVersion, s: seedSnapshot });
        setRemoteHydrated(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Queue on network issues
        enqueueUserState(seed);
        setQueued(true);
        setError(isLikelyNetworkError(msg) ? 'Offline: changes queued' : msg);
        lastSavedHash.current = JSON.stringify({ v: seedVersion, s: seedSnapshot });
        setRemoteHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, userId, appKey, restore, activeKey]);

  // Debounced writes
  useEffect(() => {
    if (!enabled || !userId) return;
    if (!remoteHydrated) return;
    if (restoreGuard.current) return;

    const hash = JSON.stringify({ v: version, s: snapshot });
    if (hash === lastSavedHash.current) return;

    if (saveTimer.current) window.clearTimeout(saveTimer.current);

    saveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      setError(null);
      setQueued(false);

      const payload = { user_id: userId, app_key: appKey, version, snapshot };

      try {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          enqueueUserState(payload);
          setQueued(true);
          lastSavedHash.current = hash; // prevent repeated enqueue spam
          setSaving(false);
          return;
        }

        const { data: upData, error: e } = await supabase
          .from('user_state')
          .upsert(payload, { onConflict: 'user_id,app_key' })
          .select('updated_at')
          .maybeSingle();
        if (e) throw e;
        setLastSyncedAt((upData as any)?.updated_at ?? new Date().toISOString());

        lastSavedHash.current = hash;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Queue latest snapshot (deduped) so it will sync later.
        enqueueUserState(payload);
        setQueued(true);
        lastSavedHash.current = hash;
        setError(isLikelyNetworkError(msg) ? 'Offline: changes queued' : msg);
      } finally {
        setSaving(false);
      }
    }, debounceMs);

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [enabled, userId, remoteHydrated, snapshot, version, debounceMs, appKey]);

  return { remoteHydrated, saving, error, queued, lastSyncedAt };
}
