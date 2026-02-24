import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export type ActivityRow = {
  id: string;
  user_id: string;
  event_type: string;
  // Optional legacy fields (Phase 5)
  entity_type?: string | null;
  entity_id?: string | null;
  payload: unknown;
  created_at: string;
};

function isMissingColumnError(msg: string) {
  const m = msg.toLowerCase();
  return m.includes('column') && m.includes('does not exist');
}

/**
 * Backward-compatible Activity Log hook.
 *
 * Supports both APIs:
 * - Phase 5 UI expects: { rows, loading, error, refresh, clearAll }
 * - Phase 6 code used: { events, loading, error, refresh }
 */
export function useSupabaseActivityLog(opts: {
  enabled: boolean;
  userId?: string | null;
  limit?: number;
}) {
  const { enabled } = opts;
  const limit = opts.limit ?? 80;

  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const getUid = useCallback(async (): Promise<string | null> => {
    if (opts.userId) return opts.userId;
    const { data, error: e } = await supabase.auth.getUser();
    if (e) {
      setError(e.message);
      return null;
    }
    return data.user?.id ?? null;
  }, [opts.userId]);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }

    const uid = await getUid();
    if (!uid) {
      setRows([]);
      if (!error) setError('Not signed in');
      return;
    }

    setLoading(true);
    setError(null);

    // Try with legacy fields first; fall back if DB doesn't have them.
    const withLegacy = await supabase
      .from('activity_log')
      .select('id,user_id,event_type,entity_type,entity_id,payload,created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!withLegacy.error) {
      setRows(((withLegacy.data as ActivityRow[] | null) ?? []));
      setLoading(false);
      return;
    }

    // If the table doesn't have entity_type/entity_id, retry without them.
    if (isMissingColumnError(withLegacy.error.message)) {
      const minimal = await supabase
        .from('activity_log')
        .select('id,user_id,event_type,payload,created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (minimal.error) {
        setError(minimal.error.message);
        setRows([]);
      } else {
        setRows(((minimal.data as ActivityRow[] | null) ?? []));
      }
      setLoading(false);
      return;
    }

    setError(withLegacy.error.message);
    setRows([]);
    setLoading(false);
  }, [enabled, getUid, limit, error]);

  const clearAll = useCallback(async () => {
    if (!enabled) return { ok: false as const, error: 'Not enabled' };
    setError(null);

    const uid = await getUid();
    if (!uid) return { ok: false as const, error: 'Not signed in' };

    const { error: delErr } = await supabase.from('activity_log').delete().eq('user_id', uid);
    if (delErr) {
      setError(delErr.message);
      return { ok: false as const, error: delErr.message };
    }

    setRows([]);
    return { ok: true as const };
  }, [enabled, getUid]);

  useEffect(() => {
    if (!enabled) {
      subRef.current?.unsubscribe();
      subRef.current = null;
      return;
    }

    let mounted = true;

    (async () => {
      const uid = await getUid();
      if (!mounted) return;
      if (!uid) {
        setRows([]);
        return;
      }

      await refresh();

      subRef.current?.unsubscribe();
      subRef.current = supabase
        .channel(`activity:${uid}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'activity_log', filter: `user_id=eq.${uid}` },
          () => {
            void refresh();
          }
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      subRef.current?.unsubscribe();
      subRef.current = null;
    };
  }, [enabled, getUid, refresh]);

  // Backward compatible aliases
  const events = rows;

  return { rows, events, loading, error, refresh, clearAll };
}
