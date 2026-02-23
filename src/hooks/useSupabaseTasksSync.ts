import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Quest } from '../store';

type TaskRowUpsert = {
  user_id: string;
  quest_id: string;
  title: string;
  done: boolean;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Syncs the app's Quests into Supabase `tasks` table.
 *
 * Why needed?
 * - Your app's real "tasks" are `quests`.
 * - Earlier we stored the whole app snapshot in `user_state` (JSONB).
 * - This hook additionally writes a simplified view (title + done) into `tasks`.
 *
 * Required DB change (run in Supabase SQL editor once):
 * - Add `quest_id text`
 * - Unique constraint on (user_id, quest_id)
 */
export function useSupabaseTasksSync(opts: {
  enabled: boolean;
  userId: string | null;
  quests: Quest[];
  debounceMs?: number;
}) {
  const { enabled, userId, quests } = opts;
  const debounceMs = opts.debounceMs ?? 900;

  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const timerRef = useRef<number | null>(null);
  const lastHashRef = useRef<string>('');

  const payload = useMemo<TaskRowUpsert[]>(() => {
    if (!userId) return [];
    return quests.map((q) => ({
      user_id: userId,
      quest_id: String(q.id),
      title: q.title,
      done: q.status === 'completed',
    }));
  }, [quests, userId]);

  useEffect(() => {
    if (!enabled || !userId) {
      setSyncing(false);
      setError(null);
      setLastSyncedAt(null);
      lastHashRef.current = '';
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return;
    }

    // Debounce changes
    const hash = JSON.stringify(payload);
    if (hash === lastHashRef.current) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(async () => {
      setSyncing(true);
      setError(null);

      try {
        // Upsert all current quests
        const batches = chunk(payload, 200);
        for (const batch of batches) {
          const { error: upErr } = await supabase
            .from('tasks')
            .upsert(batch, { onConflict: 'user_id,quest_id' });

          if (upErr) throw upErr;
        }

        // Delete rows that no longer exist locally (keep table in-sync)
        const { data: existing, error: selErr } = await supabase
          .from('tasks')
          .select('quest_id')
          .eq('user_id', userId)
          .limit(2000);

        if (selErr) throw selErr;

        const existingIds = new Set(
          ((existing as { quest_id: string }[] | null) ?? []).map((r) => String(r.quest_id))
        );
        const currentIds = new Set(payload.map((p) => p.quest_id));
        const toDelete = [...existingIds].filter((id) => !currentIds.has(id));

        if (toDelete.length > 0) {
          // Supabase delete with IN list (chunk to stay safe)
          for (const delBatch of chunk(toDelete, 200)) {
            const { error: delErr } = await supabase
              .from('tasks')
              .delete()
              .eq('user_id', userId)
              .in('quest_id', delBatch);
            if (delErr) throw delErr;
          }
        }

        lastHashRef.current = hash;
        setLastSyncedAt(Date.now());
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);

        // Most common beginner issue: DB column not created yet.
        if (msg.toLowerCase().includes('quest_id') && msg.toLowerCase().includes('does not exist')) {
          setError('DB is missing column "quest_id" in tasks table. Run the SQL patch (Phase 2) in Supabase SQL Editor.');
        } else {
          setError(msg);
        }
      } finally {
        setSyncing(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [enabled, userId, payload, debounceMs]);

  return { syncing, error, lastSyncedAt };
}
