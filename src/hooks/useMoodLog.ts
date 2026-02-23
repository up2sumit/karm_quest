import { useCallback, useEffect, useMemo, useState } from 'react';

export type MoodValue = 1 | 2 | 3 | 4 | 5;

export type MoodEntry = {
  /** Local calendar day in YYYY-MM-DD */
  date: string;
  mood: MoodValue;
  /** A lightweight "productivity" signal captured at check-in time (e.g., quests completed today). */
  productivity: number;
  updatedAt: number;
};

const STORAGE_KEY = 'karmquest_mood_log_v1';

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

export function useMoodLog() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const today = useMemo(() => todayISO(), []);

  useEffect(() => {
    const list = safeParse(localStorage.getItem(STORAGE_KEY)).sort(byDateAsc);
    setEntries(list);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // ignore (storage full / blocked)
    }
  }, [entries]);

  const todayEntry = useMemo(() => entries.find((e) => e.date === today) || null, [entries, today]);

  const setTodayMood = useCallback((mood: MoodValue, productivity: number) => {
    setEntries((prev) => {
      const next = [...prev];
      const idx = next.findIndex((e) => e.date === today);
      const item: MoodEntry = { date: today, mood, productivity, updatedAt: Date.now() };
      if (idx >= 0) next[idx] = item;
      else next.push(item);
      next.sort(byDateAsc);

      // keep it lightweight (last 365 days max)
      if (next.length > 365) return next.slice(next.length - 365);
      return next;
    });
  }, [today]);

  const clearAll = useCallback(() => {
    setEntries([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { entries, todayEntry, setTodayMood, clearAll, today };
}
