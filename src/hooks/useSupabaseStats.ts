import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Quest, UserStats } from '../store';

type UserStatsRow = {
  user_id: string;
  xp: number;
  xp_to_next: number;
  level: number;
  total_xp_earned: number;
  coins: number;
  quests_completed: number;
  streak: number;
  streak_record: number;
  last_active_date: string | null; // date
};

type CompleteResult = {
  xp_earned: number;
  coins_earned: number;
  level: number;
  xp: number;
  xp_to_next: number;
  total_xp_earned: number;
  coins: number;
  quests_completed: number;
  streak: number;
  streak_record: number;
  last_active_date: string | null;
};

function mapRowToStatsPatch(row: UserStatsRow): Partial<UserStats> {
  return {
    xp: row.xp ?? 0,
    xpToNext: row.xp_to_next ?? 100,
    level: row.level ?? 1,
    totalXpEarned: row.total_xp_earned ?? 0,
    coins: row.coins ?? 0,
    questsCompleted: row.quests_completed ?? 0,
    streak: row.streak ?? 0,
    streakRecord: row.streak_record ?? 0,
    lastActiveDate: row.last_active_date ?? '',
  };
}

/**
 * Phase 6: Server-side XP/Streak integrity.
 * - user_stats holds the truth
 * - complete_quest_secure() updates tasks + user_stats atomically
 */
export function useSupabaseStats(opts: {
  enabled: boolean;
  userId: string | null;
  /** Called when remote stats are loaded */
  onHydrate?: (patch: Partial<UserStats>) => void;
  /** If no stats row exists yet, seed it once from local stats (preserves progress). */
  seedFrom?: () => Partial<UserStats>;
}) {
  const { enabled, userId, onHydrate, seedFrom } = opts;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const didInitRef = useRef<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!enabled || !userId) return null;

    const { data, error: e } = await supabase
      .from('user_stats')
      .select('user_id,xp,xp_to_next,level,total_xp_earned,coins,quests_completed,streak,streak_record,last_active_date')
      .eq('user_id', userId)
      .maybeSingle();

    if (e) throw e;

    return (data as UserStatsRow | null) ?? null;
  }, [enabled, userId]);

  // Init/hydrate
  useEffect(() => {
    if (!enabled || !userId) {
      setError(null);
      setLoading(false);
      didInitRef.current = null;
      return;
    }
    if (didInitRef.current === userId) return;
    didInitRef.current = userId;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let row = await fetchStats();

        if (!row) {
          // Create row (with optional seed)
          const seed = seedFrom?.() ?? {};
          const payload = {
            user_id: userId,
            xp: typeof seed.xp === 'number' ? seed.xp : 0,
            xp_to_next: typeof seed.xpToNext === 'number' ? seed.xpToNext : 100,
            level: typeof seed.level === 'number' ? seed.level : 1,
            total_xp_earned: typeof seed.totalXpEarned === 'number' ? seed.totalXpEarned : 0,
            coins: typeof seed.coins === 'number' ? seed.coins : 0,
            quests_completed: typeof seed.questsCompleted === 'number' ? seed.questsCompleted : 0,
            streak: typeof seed.streak === 'number' ? seed.streak : 0,
            streak_record: typeof seed.streakRecord === 'number' ? seed.streakRecord : 0,
            last_active_date: seed.lastActiveDate ? seed.lastActiveDate : null,
          };

          const { error: insErr } = await supabase.from('user_stats').insert(payload);
          if (insErr) throw insErr;

          row = await fetchStats();
        }

        if (!cancelled && row) {
          onHydrate?.(mapRowToStatsPatch(row));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, userId, fetchStats, onHydrate, seedFrom]);

  // Secure completion (ensure tasks row exists, then call RPC)
  const completeQuestSecure = useCallback(
    async (quest: Quest): Promise<CompleteResult | null> => {
      if (!enabled || !userId) return null;

      setError(null);

      // Ensure a tasks row exists (RPC expects it)
      const upsertPayload = {
        user_id: userId,
        quest_id: String(quest.id),
        title: quest.title ?? '',
        done: quest.status === 'completed',
        xp_reward: quest.xpReward ?? 0,
        completed_at: quest.status === 'completed' ? (quest.completedAt || null) : null,
      };

      const { error: upErr } = await supabase.from('tasks').upsert(upsertPayload, { onConflict: 'user_id,quest_id' });
      if (upErr) {
        // Don't hard-fail; show a helpful message.
        throw new Error(`Failed to upsert task row. Ensure Phase 6 SQL is applied. Details: ${upErr.message}`);
      }

      const { data, error: rpcErr } = await supabase.rpc('complete_quest_secure', { quest_id: String(quest.id) });

      if (rpcErr) throw rpcErr;

      // Supabase returns rows for "returns table"
      const row = Array.isArray(data) ? (data[0] as CompleteResult | undefined) : (data as any as CompleteResult | undefined);
      if (!row) return null;

      return row;
    },
    [enabled, userId]
  );

  return { loading, error, refresh: fetchStats, completeQuestSecure };
}
