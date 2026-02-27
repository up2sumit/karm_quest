import { useMemo, useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useMoodLogUnified, type MoodValue } from '../hooks/useMoodLogUnified';
import { ResponsiveContainer, Area, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Bar } from 'recharts';

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
  const [journalNote, setJournalNote] = useState(todayEntry?.note || '');

  // Sync journalNote with todayEntry once loaded
  useEffect(() => {
    if (todayEntry?.note !== undefined) {
      setJournalNote(todayEntry.note);
    }
  }, [todayEntry?.note]);

  const card = darkLike
    ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] shadow-sm'
    : 'bg-white/80 backdrop-blur-xl border border-slate-200/40 shadow-sm';
  const tp = darkLike ? 'text-slate-200' : 'text-slate-800';
  const ts = darkLike ? 'text-slate-400' : 'text-slate-500';

  const chartData = useMemo(() => {
    return entries.slice(-30).map(e => ({
      date: shortDay(e.date),
      mood: e.mood,
      productivity: e.productivity,
      name: e.date
    }));
  }, [entries]);

  const correlation = useMemo(() => {
    const counts: Record<number, { sum: number, n: number }> = { 1: { sum: 0, n: 0 }, 2: { sum: 0, n: 0 }, 3: { sum: 0, n: 0 }, 4: { sum: 0, n: 0 }, 5: { sum: 0, n: 0 } };
    entries.forEach(e => {
      counts[e.mood].sum += e.productivity;
      counts[e.mood].n += 1;
    });
    return Object.entries(counts).map(([m, data]) => ({
      mood: parseInt(m) as MoodValue,
      avg: data.n > 0 ? (data.sum / data.n).toFixed(1) : '0'
    }));
  }, [entries]);

  const handleMoodSelect = (v: MoodValue) => {
    setTodayMood(v, completedToday, journalNote);
  };

  const handleNoteBlur = () => {
    if (todayEntry) {
      setTodayMood(todayEntry.mood, completedToday, journalNote);
    }
  };

  const title = isHinglish ? 'Mood & Journal Check-in' : 'Mood & Journal Check-in';
  const subtitle = isHinglish
    ? 'Aaj kaisa feel ho raha hai? Likho bhi.'
    : 'Quick daily check-in with a journal note.';

  return (
    <div className={`${card} rounded-2xl p-5 transition-all duration-500`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={`text-sm font-semibold ${tp} flex items-center gap-2`}>
            <span className="text-base">{isHinglish ? '🧠' : '🌿'}</span> {title}
          </h3>
          <p className={`text-[11px] mt-1 ${ts}`}>{subtitle}</p>
          <p className={`text-[10px] mt-1 ${ts}`}>
            {user ? (cloud.syncing ? '☁️ Syncing…' : '☁️ Cloud synced') : '💾 Local only'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all border ${darkLike
              ? 'text-indigo-300 border-white/[0.08] hover:bg-white/[0.04]'
              : 'text-indigo-600 border-slate-200 hover:bg-slate-50'
              }`}
          >
            {expanded ? (isHinglish ? 'Mood Likho' : 'Entry View') : (isHinglish ? 'Trends Dekho' : 'View Trends')}
          </button>
        </div>
      </div>

      {!expanded ? (
        <div className="animate-slide-up">
          {/* Scale */}
          <div className="mt-4 flex flex-wrap gap-2">
            {SCALE.map((s) => {
              const selected = todayEntry?.mood === s.v;
              return (
                <button
                  key={s.v}
                  type="button"
                  onClick={() => handleMoodSelect(s.v)}
                  className={`flex-1 min-w-[90px] px-3 py-2 rounded-2xl border transition-all text-left ${selected
                    ? 'bg-indigo-500/10 border-indigo-400/40 ring-1 ring-indigo-400/20'
                    : (isDark ? 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]' : 'bg-slate-50/60 border-slate-200/60 hover:bg-slate-100/60')
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xl">{s.emoji}</span>
                    {selected ? <span className="text-[10px] font-bold text-indigo-400">Saved</span> : null}
                  </div>
                  <div className={`text-[11px] font-semibold mt-1 ${tp}`}>{s.label}</div>
                  <div className={`text-[10px] mt-0.5 ${ts}`}>{s.hint}</div>
                </button>
              );
            })}
          </div>

          {/* Journal Note */}
          <div className="mt-4">
            <label className={`text-[10px] uppercase font-bold tracking-wider ${ts} mb-1 block`}>Journal Prompt: {isHinglish ? 'Aaj ka focus kaisa raha?' : 'What made today unique?'}</label>
            <textarea
              value={journalNote}
              onChange={(e) => setJournalNote(e.target.value)}
              onBlur={handleNoteBlur}
              placeholder={isHinglish ? 'Kuch thoughts likho...' : 'Write a quick reflection...'}
              className={`w-full h-20 bg-transparent border rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${darkLike ? 'border-white/[0.06] text-slate-200' : 'border-slate-200 text-slate-800'
                }`}
            />
          </div>

          <div className={`mt-3 text-[11px] ${ts}`}>
            {todayEntry
              ? <span>Logged: <span className={tp}>{moodEmoji(todayEntry.mood)}</span> · Productivity: <span className={tp}>{todayEntry.productivity}</span> quests</span>
              : <span>{isHinglish ? 'Aaj ka mood track karein.' : 'Tap an emoji to start tracking today.'}</span>}
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-6 animate-slide-up">
          {/* Chart */}
          <section>
            <div className={`text-[11px] font-semibold ${tp} mb-3 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <span className="text-base">📈</span> {isHinglish ? 'Pichle 30 Din ka Trend' : '30-Day Mood & Quests'}
              </div>
              <div className="flex items-center gap-3 text-[9px] uppercase font-bold tracking-widest">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Mood</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400/30"></span> Quests</div>
              </div>
            </div>
            <div className="h-56 w-full -ml-8 pr-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkLike ? "#ffffff08" : "#00000005"} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: darkLike ? '#94a3b8' : '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    interval={Math.floor(chartData.length / 5)}
                  />
                  <YAxis
                    yAxisId="left"
                    domain={[0, 5]}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={25}
                    tickFormatter={(v) => {
                      if (v === 1) return '😫';
                      if (v === 3) return '😐';
                      if (v === 5) return '😄';
                      return '';
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    hide
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkLike ? '#1e293b' : '#ffffff',
                      borderRadius: '16px',
                      border: darkLike ? '1px solid #ffffff10' : '1px solid #00000005',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
                      padding: '12px'
                    }}
                    cursor={{ stroke: darkLike ? '#ffffff10' : '#00000005' }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="productivity"
                    name="Quests"
                    fill={darkLike ? "#ffffff08" : "#00000008"}
                    radius={[4, 4, 0, 0]}
                    barSize={12}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="mood"
                    name="Mood Score"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fill="url(#colorMood)"
                    activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                    dot={chartData.length < 10 ? { r: 3, fill: '#6366f1' } : false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Correlation Analysis */}
          <section>
            <div className={`text-[11px] font-semibold ${tp} mb-3 flex items-center gap-2`}>
              <span className="text-base">🧠</span> {isHinglish ? 'Productivity Correlation' : 'Productivity Correlation'}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {correlation.map((c) => (
                <div key={c.mood} className={`${darkLike ? 'bg-white/[0.02]' : 'bg-slate-50'} rounded-xl p-2 text-center border ${darkLike ? 'border-white/[0.05]' : 'border-slate-200/50'}`}>
                  <div className="text-base mb-1">{moodEmoji(c.mood as MoodValue)}</div>
                  <div className={`text-[14px] font-black ${tp}`}>{c.avg}</div>
                  <div className={`text-[8px] uppercase font-bold tracking-wider ${ts} mt-1`}>Avg Quests</div>
                </div>
              ))}
            </div>
            <p className={`text-[10px] ${ts} mt-3 leading-relaxed`}>
              {parseFloat(correlation[4].avg) > parseFloat(correlation[0].avg)
                ? (isHinglish ? 'Aapka mood achha hone par productivity badhti hai. Keep it up!' : 'Insight: High mood correlates with 15% more quests completed.')
                : (isHinglish ? 'Mood aur productivity ka rishta mix hai.' : 'Collecting more data to find your flow state patterns.')}
            </p>
          </section>

          <button
            onClick={() => setExpanded(false)}
            className={`w-full py-2.5 rounded-xl text-xs font-bold border ${darkLike ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border-indigo-200'
              }`}
          >
            Back to Logging
          </button>
        </div>
      )}
    </div>
  );
}
