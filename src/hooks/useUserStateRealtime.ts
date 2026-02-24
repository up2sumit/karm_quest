import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

type RealtimeStatus =
  | 'SUBSCRIBED'
  | 'TIMED_OUT'
  | 'CHANNEL_ERROR'
  | 'CLOSED'
  | 'CONNECTING'
  | 'DISABLED';

/**
 * Realtime listener for `user_state` changes.
 *
 * Use-case:
 * - Same user logged-in on 2 devices/tabs → when one saves snapshot, the other auto-restores.
 *
 * Notes:
 * - RLS still applies: user only receives their own rows.
 * - We ignore events right after *local* writes (avoid loops).
 */
export function useUserStateRealtime<T extends object>(opts: {
  enabled: boolean;
  userId: string | null;
  appKey: string;
  /** Called when a newer snapshot arrives */
  onRemote: (remote: { version: string; snapshot: T }) => void;
  /** Timestamp (ms) updated after local save finishes */
  localWriteAt: number;
  /** How long to ignore events after local write (ms). Default 1400 */
  ignoreMs?: number;
}) {
  const { enabled, userId, appKey, onRemote, localWriteAt } = opts;
  const ignoreMs = opts.ignoreMs ?? 1400;

  const [status, setStatus] = useState<RealtimeStatus>(enabled ? 'CONNECTING' : 'DISABLED');
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);

  const ignoreUntilRef = useRef<number>(0);
  const lastAppliedAtRef = useRef<number>(0);

  // Update ignore window whenever a local save completes.
  useEffect(() => {
    if (!enabled) return;
    if (!localWriteAt) return;
    ignoreUntilRef.current = localWriteAt + ignoreMs;
  }, [enabled, ignoreMs, localWriteAt]);

  useEffect(() => {
    if (!enabled || !userId) {
      setStatus(enabled ? 'CONNECTING' : 'DISABLED');
      return;
    }

    let mounted = true;

    // Filter by user_id; verify app_key in handler.
    const channel = supabase
      .channel(`kq-user_state:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_state', filter: `user_id=eq.${userId}` },
        (payload) => {
          try {
            const now = Date.now();
            if (now < ignoreUntilRef.current) return;

            const row: any = (payload as any).new ?? null;
            if (!row) return;
            if (row.app_key !== appKey) return;
            if (!row.snapshot) return;

            const updatedAtMs = row.updated_at ? Date.parse(row.updated_at) : 0;
            if (updatedAtMs && updatedAtMs <= lastAppliedAtRef.current) return;

            // Apply.
            lastAppliedAtRef.current = updatedAtMs || now;
            onRemote({ version: String(row.version ?? '1.0.0'), snapshot: row.snapshot as T });
            setLastEventAt(now);
          } catch {
            // ignore realtime payload issues
          }
        },
      )
      .subscribe((s: any) => {
        if (!mounted) return;
        setStatus((s as RealtimeStatus) ?? 'CHANNEL_ERROR');
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [appKey, enabled, onRemote, userId]);

  return {
    connected: status === 'SUBSCRIBED',
    status,
    lastEventAt,
  };
}
