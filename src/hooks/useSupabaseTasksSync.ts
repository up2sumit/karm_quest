import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { enqueueTasksFullSync } from '../lib/offlineQueue';
import type { Quest } from '../store';

type TaskRowUpsert = {
  user_id: string;
  quest_id: string;
  title: string;
  done: boolean;
  xp_reward?: number;
  completed_at?: string | null;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function isLikelyNetworkError(msg: string) {
  const m = msg.toLowerCase();
  return m.includes('failed to fetch') || m.includes('network') || m.includes('offline') || m.includes('timeout');
}

/**
 * Syncs the app's Quests into Supabase `tasks` table.
 * Phase 9 upgrade:
 * - If offline, queue a "full sync" payload.
 * - OfflineSyncBootstrap flushes it when back online.
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
  const [queued, setQueued] = useState(false);

  const timerRef = useRef<number | null>(null);
  const lastHashRef = useRef<string>('');

  const payload = useMemo<TaskRowUpsert[]>(() => {
    if (!userId) return [];
    return quests.map((q) => ({
      user_id: userId,
      quest_id: String(q.id),
      title: q.title,
      done: q.status === 'completed',
      xp_reward: (q as any).xpReward ?? 0,
      completed_at: q.status === 'completed' ? ((q as any).completedAt || null) : null,
    }));
  }, [quests, userId]);

  useEffect(() => {
    if (!enabled || !userId) {
      setSyncing(false);
      setError(null);
      setLastSyncedAt(null);
      setQueued(false);
      lastHashRef.current = '';
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return;
    }

    const hash = JSON.stringify(payload);
    if (hash === lastHashRef.current) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(async () => {
      setSyncing(true);
      setError(null);
      setQueued(false);

      // Offline: queue and exit
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        enqueueTasksFullSync({ user_id: userId, tasks: payload });
        lastHashRef.current = hash;
        setQueued(true);
        setSyncing(false);
        return;
      }

      try {
        // Upsert all current quests
        for (const batch of chunk(payload, 200)) {
          const { error: upErr } = await supabase.from('tasks').upsert(batch, { onConflict: 'user_id,quest_id' });
          if (upErr) throw upErr;
        }

        // Delete rows that no longer exist locally
        const { data: existing, error: selErr } = await supabase
          .from('tasks')
          .select('quest_id')
          .eq('user_id', userId)
          .limit(5000);
        if (selErr) throw selErr;

        const existingIds = new Set(((existing as { quest_id: string }[] | null) ?? []).map((r) => String(r.quest_id)));
        const currentIds = new Set(payload.map((p) => p.quest_id));
        const toDelete = [...existingIds].filter((id) => !currentIds.has(id));

        for (const delBatch of chunk(toDelete, 200)) {
          const { error: delErr } = await supabase.from('tasks').delete().eq('user_id', userId).in('quest_id', delBatch);
          if (delErr) throw delErr;
        }

        lastHashRef.current = hash;
        setLastSyncedAt(Date.now());
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);

        // If it's network-y, queue the latest payload.
        if (isLikelyNetworkError(msg)) {
          enqueueTasksFullSync({ user_id: userId, tasks: payload });
          lastHashRef.current = hash;
          setQueued(true);
          setError('Offline: changes queued');
        } else if (msg.toLowerCase().includes('quest_id') && msg.toLowerCase().includes('does not exist')) {
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

  return { syncing, error, lastSyncedAt, queued };
}
