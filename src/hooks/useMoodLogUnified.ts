import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export type MoodValue = 1 | 2 | 3 | 4 | 5;

export type MoodEntry = {
  /** Local calendar day in YYYY-MM-DD */
  date: string;
  mood: MoodValue;
  /** A lightweight "productivity" signal captured at check-in time (e.g., quests completed today). */
  productivity: number;
  /** Optional daily journal note. */
  note?: string;
  updatedAt: number; // epoch ms
};

type CloudInfo = {
  enabled: boolean;
  hydrated: boolean;
  syncing: boolean;
  error: string | null;
  lastSyncedAt: number | null;
};

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function safeParse(raw: string | null): MoodEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(Boolean)
      .map((x: any) => ({
        date: typeof x.date === 'string' ? x.date : '',
        mood: (typeof x.mood === 'number' ? x.mood : 3) as MoodValue,
        productivity: typeof x.productivity === 'number' ? x.productivity : 0,
        note: typeof x.note === 'string' ? x.note : undefined,
        updatedAt: typeof x.updatedAt === 'number' ? x.updatedAt : Date.now(),
      }))
      .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.date) && [1, 2, 3, 4, 5].includes(x.mood));
  } catch {
    return [];
  }
}

function byDateAsc(a: MoodEntry, b: MoodEntry) {
  return a.date.localeCompare(b.date);
}

function mergeByDate(localList: MoodEntry[], remoteList: MoodEntry[]): MoodEntry[] {
  const map = new Map<string, MoodEntry>();
  for (const e of localList) map.set(e.date, e);
  for (const r of remoteList) {
    const cur = map.get(r.date);
    if (!cur || r.updatedAt >= cur.updatedAt) map.set(r.date, r);
  }
  return Array.from(map.values()).sort(byDateAsc).slice(-365);
}

/**
 * Unified mood log:
 * - Always keeps a local cache (localStorage), per-user when logged in.
 * - If signed in, it also syncs to Supabase table `mood_log` (RLS protected).
 */
export function useMoodLogUnified() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [cloud, setCloud] = useState<CloudInfo>({
    enabled: !!userId,
    hydrated: false,
    syncing: false,
    error: null,
    lastSyncedAt: null,
  });

  const today = useMemo(() => todayISO(), []);
  const storageKey = useMemo(() => (userId ? `karmquest_mood_log_v1:${userId}` : 'karmquest_mood_log_v1:guest'), [userId]);

  // Keep refs for latest values (avoid stale closures during async sync)
  const entriesRef = useRef<MoodEntry[]>([]);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  // Load local cache on user change
  useEffect(() => {
    const list = safeParse(localStorage.getItem(storageKey)).sort(byDateAsc);
    setEntries(list);
  }, [storageKey]);

  // Persist local cache
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries));
    } catch {
      // ignore (storage full / blocked)
    }
  }, [entries, storageKey]);

  // Fetch remote + merge (only when signed in)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const enabled = !!userId;
      setCloud((c) => ({ ...c, enabled, error: null }));

      if (!enabled) {
        setCloud((c) => ({ ...c, hydrated: true, syncing: false, error: null, lastSyncedAt: null }));
        return;
      }

      setCloud((c) => ({ ...c, syncing: true, error: null }));

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 365);
      const cutoffISO = cutoff.toISOString().slice(0, 10);

      const res = await supabase
        .from('mood_log')
        .select('day,mood,productivity,note,updated_at')
        .eq('user_id', userId)
        .gte('day', cutoffISO)
        .order('day', { ascending: true });

      if (cancelled) return;

      if (res.error) {
        setCloud((c) => ({ ...c, syncing: false, hydrated: true, error: res.error?.message ?? 'Failed to load mood log' }));
        return;
      }

      const remote = (res.data ?? []).map((r: any) => ({
        date: String(r.day),
        mood: Number(r.mood) as MoodValue,
        productivity: Number(r.productivity ?? 0),
        note: r.note ? String(r.note) : undefined,
        updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : Date.now(),
      })) as MoodEntry[];

      setEntries((local) => mergeByDate(local, remote));
      setCloud((c) => ({ ...c, syncing: false, hydrated: true, error: null, lastSyncedAt: Date.now() }));
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const todayEntry = useMemo(() => entries.find((e) => e.date === today) || null, [entries, today]);

  const setTodayMood = useCallback(
    async (mood: MoodValue, productivity: number, note?: string) => {
      const item: MoodEntry = { date: today, mood, productivity, note, updatedAt: Date.now() };

      // optimistic local update
      setEntries((prev) => {
        const next = [...prev];
        const idx = next.findIndex((e) => e.date === today);
        if (idx >= 0) next[idx] = item;
        else next.push(item);
        next.sort(byDateAsc);
        if (next.length > 365) return next.slice(next.length - 365);
        return next;
      });

      if (!userId) return;

      setCloud((c) => ({ ...c, syncing: true, error: null }));

      const up = await supabase.from('mood_log').upsert(
        {
          user_id: userId,
          day: today,
          mood,
          productivity,
          note: note || null,
        },
        { onConflict: 'user_id,day' }
      );

      if (up.error) {
        setCloud((c) => ({ ...c, syncing: false, error: up.error?.message ?? 'Failed to sync mood' }));
        return;
      }

      setCloud((c) => ({ ...c, syncing: false, error: null, lastSyncedAt: Date.now() }));
    },
    [today, userId]
  );

  const clearAll = useCallback(async () => {
    setEntries([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }

    if (!userId) return;

    setCloud((c) => ({ ...c, syncing: true, error: null }));
    const del = await supabase.from('mood_log').delete().eq('user_id', userId);
    if (del.error) {
      setCloud((c) => ({ ...c, syncing: false, error: del.error?.message ?? 'Failed to clear mood log' }));
      return;
    }
    setCloud((c) => ({ ...c, syncing: false, error: null, lastSyncedAt: Date.now() }));
  }, [storageKey, userId]);

  return { entries, todayEntry, setTodayMood, clearAll, today, cloud, userId };
}
