import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export type InAppNotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  payload: any;
  read: boolean;
  created_at: string;
  updated_at: string;
};

function dedupeById<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of list) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

export function useSupabaseInAppNotifications(opts: {
  enabled: boolean;
  userId: string | null;
  limit?: number;
  onNew?: (row: InAppNotificationRow) => void;
}) {
  const { enabled, userId } = opts;
  const limit = opts.limit ?? 50;

  const [items, setItems] = useState<InAppNotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onNewRef = useRef(opts.onNew);
  useEffect(() => {
    onNewRef.current = opts.onNew;
  }, [opts.onNew]);

  const refresh = useCallback(async () => {
    if (!enabled || !userId) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('in_app_notifications')
        .select('id,user_id,type,title,message,payload,read,created_at,updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (e) throw e;
      setItems((data as InAppNotificationRow[]) ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [enabled, userId, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !userId) return;

    const ch = supabase
      .channel(`karmquest-notifs-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as InAppNotificationRow;
          setItems((prev) => dedupeById([row, ...prev]).slice(0, limit));
          onNewRef.current?.(row);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [enabled, userId, limit]);

  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items]);

  const markRead = useCallback(
    async (id: string) => {
      if (!enabled || !userId) return;
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      // Best-effort cloud update
      await supabase
        .from('in_app_notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('id', id);
    },
    [enabled, userId]
  );

  const markAllRead = useCallback(async () => {
    if (!enabled || !userId) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase
      .from('in_app_notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
  }, [enabled, userId]);

  const clearAll = useCallback(async () => {
    if (!enabled || !userId) return;
    setItems([]);
    await supabase.from('in_app_notifications').delete().eq('user_id', userId);
  }, [enabled, userId]);

  return { items, unreadCount, loading, error, refresh, markRead, markAllRead, clearAll };
}
