import { useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import type { Quest } from '../store';
import { useMoodLogUnified, type MoodEntry, type MoodValue } from '../hooks/useMoodLogUnified';

type Props = {
  quests: Quest[];
  /** Default 30. */
  days?: number;
};

function isoFromDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function localMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function moodEmoji(v: MoodValue | null | undefined) {
  if (!v) return '';
  return v === 1 ? '😫' : v === 2 ? '😕' : v === 3 ? '😐' : v === 4 ? '🙂' : '😄';
}

// GitHub-ish thresholds requested:
// 0 = grey, 1-5 = yellow, 6-10 = green, 11+ = dark green
function levelForCount(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  if (count <= 5) return 1;
  if (count <= 10) return 2;
  return 3;
}

export function HabitHeatmap({ quests, days = 30 }: Props) {
  const { isDark, isHinglish } = useTheme();
  const { user } = useAuth();
  const { entries } = useMoodLogUnified();
  const [selectedISO, setSelectedISO] = useState<string | null>(null);

  type CompletionEvent = {
    ts: number;
    day: string;
    questId: string;
    title: string;
    category: string;
    difficulty: string;
    xp: number;
    coins: number;
  };

  const completionEvents = useMemo(() => {
    const userId = user?.id ?? null;
    const keys = userId
      ? [`karmquest_completion_log_v1:${userId}`]
      : ['karmquest_completion_log_v1:guest', 'karmquest_completion_log_v1:anon'];

    const out: CompletionEvent[] = [];
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) continue;
        for (const x of parsed as any[]) {
          if (!x) continue;
          const ev: CompletionEvent = {
            ts: typeof x.ts === 'number' ? x.ts : Date.now(),
            day: typeof x.day === 'string' ? x.day : '',
            questId: typeof x.questId === 'string' ? x.questId : '',
            title: typeof x.title === 'string' ? x.title : '',
            category: typeof x.category === 'string' ? x.category : 'Karma',
            difficulty: typeof x.difficulty === 'string' ? x.difficulty : 'easy',
            xp: typeof x.xp === 'number' ? x.xp : 0,
            coins: typeof x.coins === 'number' ? x.coins : 0,
          };
          if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.day) || !ev.questId) continue;
          out.push(ev);
        }
      } catch {
        // ignore
      }
    }
    out.sort((a, b) => a.ts - b.ts);
    return out;
  }, [user?.id]);

  const moodByDay = useMemo(() => {
    const map = new Map<string, MoodEntry>();
    for (const e of entries) map.set(e.date, e);
    return map;
  }, [entries]);

  const completionsByDay = useMemo(() => {
    // Prefer true completion history when available; fall back to quest.completedAt.
    const map = new Map<string, number>();

    if (completionEvents.length > 0) {
      for (const ev of completionEvents) {
        map.set(ev.day, (map.get(ev.day) ?? 0) + 1);
      }
      return map;
    }

    for (const q of quests) {
      const iso = (q.completedAt || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
      map.set(iso, (map.get(iso) ?? 0) + 1);
    }
    return map;
  }, [quests, completionEvents]);

  const { startISO, endISO, weeks, cells, monthLabels } = useMemo(() => {
    const today = localMidnight(new Date());
    const endISO = isoFromDate(today);
    const effectiveDays = Math.min(30, Math.max(1, days));
    const start = addDays(today, -(effectiveDays - 1));
    const startISO = isoFromDate(start);

    // Align grid to Monday so columns are full weeks (GitHub-ish).
    // JS getDay(): Sun=0..Sat=6. Convert to Mon=0..Sun=6.
    const dowMon0 = (start.getDay() + 6) % 7;
    const startAligned = addDays(start, -dowMon0);

    // Build date cells from aligned start to today inclusive.
    const all: Array<{ iso: string; inRange: boolean; col: number; row: number; date: Date }> = [];
    const totalDays = Math.floor((today.getTime() - startAligned.getTime()) / 86_400_000) + 1;
    for (let i = 0; i < totalDays; i++) {
      const dt = addDays(startAligned, i);
      const iso = isoFromDate(dt);
      const inRange = iso >= startISO && iso <= endISO;
      const col = Math.floor(i / 7);
      const row = i % 7; // Mon=0..Sun=6 because startAligned is Monday
      all.push({ iso, inRange, col, row, date: dt });
    }

    const weeks = Math.max(1, Math.ceil(totalDays / 7));

    // Month labels above columns (show when the week contains the 1st of the month).
    const monthLabels: Array<{ col: number; label: string }> = [];
    for (let c = 0; c < weeks; c++) {
      const weekStart = addDays(startAligned, c * 7);
      // Find the first in-range day in this week
      let firstInRange: Date | null = null;
      for (let r = 0; r < 7; r++) {
        const d = addDays(weekStart, r);
        const iso = isoFromDate(d);
        if (iso >= startISO && iso <= endISO) {
          firstInRange = d;
          break;
        }
      }
      if (!firstInRange) continue;
      if (firstInRange.getDate() === 1 || c === 0) {
        const label = firstInRange.toLocaleDateString(undefined, { month: 'short' });
        monthLabels.push({ col: c, label });
      }
    }

    return { startISO, endISO, weeks, cells: all, monthLabels };
  }, [days]);

  const selected = useMemo(() => {
    if (!selectedISO) return null;
    const count = completionsByDay.get(selectedISO) ?? 0;
    const mood = moodByDay.get(selectedISO) ?? null;
    const listFromEvents = completionEvents.filter((e) => e.day === selectedISO);
    const listFromQuests = quests.filter((q) => q.completedAt === selectedISO).map((q) => ({
      ts: q.completedAtTs ?? 0,
      day: selectedISO,
      questId: q.id,
      title: q.title,
      category: q.category,
      difficulty: q.difficulty,
      xp: q.earnedXp ?? q.xpReward,
      coins: 0,
    }));
    const list = listFromEvents.length > 0 ? listFromEvents : listFromQuests;
    return { iso: selectedISO, count, mood, list };
  }, [selectedISO, completionsByDay, moodByDay, quests, completionEvents]);

  const card = isHinglish
    ? 'bg-white/70 backdrop-blur-xl border border-rose-200/20 shadow-sm'
    : isDark
      ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] shadow-sm'
      : 'bg-white/80 backdrop-blur-xl border border-slate-200/40 shadow-sm';
  const tp = isHinglish ? 'text-slate-800' : isDark ? 'text-slate-200' : 'text-slate-800';
  const ts = isHinglish ? 'text-slate-500' : isDark ? 'text-slate-400' : 'text-slate-500';

  const levelClass = (lvl: 0 | 1 | 2 | 3, inRange: boolean) => {
    if (!inRange) return isDark ? 'bg-white/[0.015]' : 'bg-slate-100/30';
    if (lvl === 0) return isDark ? 'bg-white/[0.06]' : 'bg-slate-200/70';

    // Requested GitHub-like palette: yellow -> green -> dark green.
    // Keep it readable in dark mode via opacity.
    if (lvl === 1) return isDark ? 'bg-yellow-400/25' : 'bg-yellow-300/80';
    if (lvl === 2) return isDark ? 'bg-green-400/35' : 'bg-green-400/80';
    return isDark ? 'bg-green-500/60' : 'bg-green-700/85';
  };

  const effectiveDays = Math.min(30, Math.max(1, days));
  const title = isHinglish ? 'Habit Heatmap (30 din)' : 'Habit Heatmap (Last 30 days)';

  return (
    <div
      className={`${card} rounded-2xl p-4 sm:p-5 [--hq-cell:10px] sm:[--hq-cell:12px] md:[--hq-cell:13px] [--hq-gap:5px]`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className={`text-sm font-semibold ${tp} flex items-center gap-2`}>
            <span className="text-base">🗓️</span>
            <span className="truncate">{title}</span>
          </h3>
          <div className={`mt-1 text-[10px] ${ts} flex items-center gap-2`}>
            <span className="whitespace-nowrap">{startISO} → {endISO}</span>
            <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>•</span>
            <span className="whitespace-nowrap">{effectiveDays} days</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-between sm:justify-end">
          <div className={`text-[10px] font-semibold ${ts} flex items-center gap-2`}> 
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>0</span>
            <span className={`inline-block w-3 h-3 rounded ${levelClass(0, true)}`} />
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>1–5</span>
            <span className={`inline-block w-3 h-3 rounded ${levelClass(1, true)}`} />
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>6–10</span>
            <span className={`inline-block w-3 h-3 rounded ${levelClass(2, true)}`} />
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>11+</span>
            <span className={`inline-block w-3 h-3 rounded ${levelClass(3, true)}`} />
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="inline-block min-w-max">
          {/* Month labels */}
          <div className="flex items-center">
            <div className="w-10" />
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${weeks}, var(--hq-cell))`,
                columnGap: 'var(--hq-gap)',
              }}
            >
              {Array.from({ length: weeks }).map((_, col) => {
                const label = monthLabels.find((m) => m.col === col)?.label ?? '';
                return (
                  <div key={col} className={`text-[10px] ${ts} select-none`} style={{ width: 'var(--hq-cell)' as any }}>
                    {label}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-start mt-1">
            {/* Day labels (Mon/Wed/Fri) aligned to cells */}
            <div
              className={`w-10 pr-2 text-[10px] ${ts} select-none grid grid-rows-7`}
              style={{
                rowGap: 'var(--hq-gap)',
              }}
            >
              {['Mon', '', 'Wed', '', 'Fri', '', ''].map((lbl, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-end"
                  style={{ height: 'var(--hq-cell)' as any }}
                >
                  {lbl}
                </div>
              ))}
            </div>

            <div className="grid grid-rows-7 grid-flow-col" style={{ gap: 'var(--hq-gap)' }}>
              {cells.map((c) => {
                const count = c.inRange ? (completionsByDay.get(c.iso) ?? 0) : 0;
                const lvl = levelForCount(count);
                const mood = moodByDay.get(c.iso) ?? null;
                const isSelected = selectedISO === c.iso;
                const isToday = c.iso === endISO;

                const tooltipParts: string[] = [];
                tooltipParts.push(
                  c.date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
                );
                tooltipParts.push(`${count} quest${count === 1 ? '' : 's'} completed`);
                if (mood) tooltipParts.push(`Mood ${moodEmoji(mood.mood)} · Productivity ${mood.productivity}`);
                const tooltip = tooltipParts.join(' — ');

                return (
                  <button
                    key={c.iso}
                    type="button"
                    title={tooltip}
                    onClick={() => {
                      if (!c.inRange) return;
                      setSelectedISO((cur) => (cur === c.iso ? null : c.iso));
                    }}
                    className={`w-[var(--hq-cell)] h-[var(--hq-cell)] rounded transition-all ${levelClass(lvl, c.inRange)} ${
                      c.inRange ? 'hover:scale-[1.06]' : 'cursor-default'
                    } ${isSelected ? 'ring-2 ring-emerald-400/60' : ''} ${
                      isToday ? (isDark ? 'outline outline-1 outline-white/25' : 'outline outline-1 outline-slate-300/70') : ''
                    }`}
                    aria-label={tooltip}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Selected day detail */}
      {selected ? (
        <div
          className={`mt-4 rounded-2xl p-3 sm:p-4 ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50/60'} border ${
            isDark ? 'border-white/[0.06]' : 'border-slate-200/50'
          }`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div>
              <div className={`text-[12px] font-semibold ${tp}`}>
                {new Date(selected.iso + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className={`text-[11px] mt-1 ${ts}`}>
                {selected.count} quest{selected.count === 1 ? '' : 's'} completed
                {selected.mood ? ` · Mood ${moodEmoji(selected.mood.mood)} · Productivity ${selected.mood.productivity}` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedISO(null)}
              className={`self-start sm:self-auto text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all border ${
                isHinglish
                  ? 'text-rose-500 border-rose-200/40 hover:bg-rose-50'
                  : isDark
                    ? 'text-indigo-300 border-white/[0.08] hover:bg-white/[0.04]'
                    : 'text-indigo-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {isHinglish ? 'Band' : 'Close'}
            </button>
          </div>

          <div className="mt-3">
            {selected.list.length === 0 ? (
              <div className={`text-[11px] ${ts}`}>{isHinglish ? 'Koi completion nahi.' : 'No completions logged.'}</div>
            ) : (
              <div className="space-y-1.5">
                {selected.list.slice(0, 10).map((q: any, idx: number) => {
                  return (
                    <div
                      key={(q.questId || q.id || idx) + ':' + idx}
                      className={`text-[12px] ${tp} flex items-start gap-2`}
                    >
                      <span className="text-[12px] mt-0.5">✅</span>
                      <div className="min-w-0">
                        <div className="truncate">{q.title}</div>
                        <div className={`text-[10px] mt-0.5 ${ts} flex flex-wrap items-center gap-1.5`}>
                          <span className={`px-2 py-0.5 rounded-lg border ${isDark ? 'border-white/[0.06]' : 'border-slate-200/60'}`}>
                            {q.category || 'Karma'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg border ${isDark ? 'border-white/[0.06]' : 'border-slate-200/60'}`}>
                            {q.difficulty || 'easy'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {selected.list.length > 10 ? (
                  <div className={`text-[10px] ${ts}`}>+{selected.list.length - 10} more…</div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
