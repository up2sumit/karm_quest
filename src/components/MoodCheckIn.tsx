import { useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useMoodLogUnified, type MoodValue } from '../hooks/useMoodLogUnified';

type Props = {
  /** A simple productivity signal to record alongside the mood check-in. */
  completedToday: number;
};

const SCALE: Array<{ v: MoodValue; emoji: string; label: string; hint: string }> = [
  { v: 1, emoji: '😫', label: 'Low', hint: 'Drained' },
  { v: 2, emoji: '😕', label: 'Meh', hint: 'Sluggish' },
  { v: 3, emoji: '😐', label: 'Okay', hint: 'Steady' },
  { v: 4, emoji: '🙂', label: 'Good', hint: 'Focused' },
  { v: 5, emoji: '😄', label: 'Great', hint: 'On fire' },
];

function shortDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  // "Mon 12" compact label
  const wd = dt.toLocaleDateString(undefined, { weekday: 'short' });
  return `${wd} ${d}`;
}

function moodEmoji(m: MoodValue) {
  return SCALE.find((x) => x.v === m)?.emoji ?? '😐';
}

export function MoodCheckIn({ completedToday }: Props) {
  const { isDark, isHinglish } = useTheme();
  const darkLike = isDark || isHinglish;
  const { user } = useAuth();
  const { entries, todayEntry, setTodayMood, cloud } = useMoodLogUnified();
  const [expanded, setExpanded] = useState(false);

  const card = darkLike
    ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] shadow-sm'
    : 'bg-white/80 backdrop-blur-xl border border-slate-200/40 shadow-sm';
  const tp = darkLike ? 'text-slate-200' : 'text-slate-800';
  const ts = darkLike ? 'text-slate-400' : 'text-slate-500';

  const recent = useMemo(() => entries.slice(-7), [entries]);
  const maxProd = useMemo(() => Math.max(1, ...recent.map((r) => r.productivity)), [recent]);

  const title = isHinglish ? 'Mood / Energy Check-in' : 'Mood / Energy Check-in';
  const subtitle = isHinglish
    ? 'Aaj kaisa feel ho raha? (5-point).'
    : 'Quick daily check-in (5-point).';

  return (
    <div className={`${card} rounded-2xl p-5`}> 
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={`text-sm font-semibold ${tp} flex items-center gap-2`}>
            <span className="text-base">{isHinglish ? '🧠' : '🌿'}</span> {title}
          </h3>
          <p className={`text-[11px] mt-1 ${ts}`}>{subtitle}</p>
          <p className={`text-[10px] mt-1 ${ts}`}>
            {user ? (cloud.syncing ? (isHinglish ? '☁️ Sync ho raha…' : '☁️ Syncing…') : (cloud.error ? (isHinglish ? '☁️ Sync error' : '☁️ Sync error') : (isHinglish ? '☁️ Cloud synced' : '☁️ Cloud synced'))) : (isHinglish ? '💾 Local only' : '💾 Local only')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all border ${
            darkLike
                ? 'text-indigo-300 border-white/[0.08] hover:bg-white/[0.04]'
                : 'text-indigo-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {expanded ? (isHinglish ? 'Chhupao' : 'Hide') : (isHinglish ? 'Trends' : 'Trends')}
        </button>
      </div>

      {/* Scale */}
      <div className="mt-3 flex flex-wrap gap-2">
        {SCALE.map((s) => {
          const selected = todayEntry?.mood === s.v;
          return (
            <button
              key={s.v}
              type="button"
              onClick={() => setTodayMood(s.v, completedToday)}
              className={`flex-1 min-w-[90px] px-3 py-2 rounded-2xl border transition-all text-left ${
                selected
                  ? (isHinglish
                      ? 'bg-indigo-500/10 border-indigo-400/40'
                      : isDark
                        ? 'bg-indigo-500/10 border-indigo-400/30'
                        : 'bg-indigo-50 border-indigo-200')
                  : (isDark
                      ? 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                      : 'bg-slate-50/60 border-slate-200/60 hover:bg-slate-100/60')
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xl">{s.emoji}</span>
                {selected ? <span className={`text-[10px] font-bold ${isHinglish ? 'text-indigo-500' : isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>Saved</span> : null}
              </div>
              <div className={`text-[11px] font-semibold mt-1 ${tp}`}>{s.label}</div>
              <div className={`text-[10px] mt-0.5 ${ts}`}>{s.hint}</div>
            </button>
          );
        })}
      </div>

      {/* Tiny recap */}
      <div className={`mt-3 text-[11px] ${ts}`}>
        {todayEntry
          ? (
            <span>
              {isHinglish ? 'Aaj ka mood:' : 'Today:'} <span className={tp}>{moodEmoji(todayEntry.mood)}</span> · {isHinglish ? 'Quests done:' : 'Quests done:'} <span className={tp}>{todayEntry.productivity}</span>
            </span>
          )
          : (
            <span>{isHinglish ? 'Bas ek tap karo — track ho jayega.' : 'Tap once to log. It takes 1 second.'}</span>
          )}
      </div>

      {/* Trends */}
      {expanded ? (
        <div className="mt-4">
          <div className={`text-[11px] font-semibold ${tp} mb-2 flex items-center gap-2`}>
            <span className="text-base">📈</span> {isHinglish ? 'Last 7 days' : 'Last 7 days'}
          </div>

          {recent.length === 0 ? (
            <div className={`text-[11px] ${ts}`}>{isHinglish ? 'Abhi koi data nahi.' : 'No data yet.'}</div>
          ) : (
            <div className="space-y-2">
              {recent.map((r) => (
                <div key={r.date} className="flex items-center gap-3">
                  <div className={`w-14 text-[10px] ${ts}`}>{shortDay(r.date)}</div>
                  <div className="w-6 text-lg">{moodEmoji(r.mood)}</div>
                  <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
                    <div
                      className={`${isHinglish ? 'bg-gradient-to-r from-indigo-400 to-violet-400' : 'bg-gradient-to-r from-indigo-500 to-violet-500'} h-full rounded-full`}
                      style={{ width: `${Math.round((r.productivity / maxProd) * 100)}%` }}
                    />
                  </div>
                  <div className={`w-10 text-right text-[10px] ${ts}`}>{r.productivity}</div>
                </div>
              ))}
              <div className={`text-[10px] ${ts} pt-1`}>
                {isHinglish
                  ? 'Bar = productivity (quests done). Emoji = mood.'
                  : 'Bar = productivity (quests done). Emoji = mood.'}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
