import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export type TaskRealtimeRow = {
  quest_id: string | null;
  done: boolean | null;
  completed_at: string | null; // date
};

/**
 * Phase 6: Realtime sync for tasks table.
 * - On any tasks change, fetch current tasks for user and pass to onApply.
 * - Keep it simple & robust for beginners.
 */
export function useSupabaseTasksRealtime(opts: {
  enabled: boolean;
  userId: string | null;
  onApply: (rows: TaskRealtimeRow[]) => void;
}) {
  const { enabled, userId, onApply } = opts;

  const [error, setError] = useState<string | null>(null);
  const subRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchTasks = useRef(async () => {
    if (!userId) return;

    const { data, error: e } = await supabase
      .from('tasks')
      .select('quest_id,done,completed_at')
      .eq('user_id', userId)
      .limit(4000);

    if (e) {
      setError(e.message);
      return;
    }

    onApply(((data as TaskRealtimeRow[] | null) ?? []).map((r) => ({
      quest_id: r.quest_id ?? null,
      done: r.done ?? null,
      completed_at: (r as any).completed_at ?? null,
    })));
  });

  useEffect(() => {
    if (!enabled || !userId) {
      subRef.current?.unsubscribe();
      subRef.current = null;
      setError(null);
      return;
    }

    // initial pull
    fetchTasks.current();

    // realtime
    subRef.current?.unsubscribe();
    subRef.current = supabase
      .channel(`tasks:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, () => {
        fetchTasks.current();
      })
      .subscribe();

    return () => {
      subRef.current?.unsubscribe();
      subRef.current = null;
    };
  }, [enabled, userId, onApply]);

  return { error, refresh: () => fetchTasks.current() };
}
