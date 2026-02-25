import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';
import type { Quest, FocusLogEvent } from '../store';
import { addDaysISO, todayISO } from '../store';

function hashHue(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h % 360;
}

function colorForCategory(cat: string, mode: 'light' | 'dark' | 'hinglish'): string {
  const hue = hashHue(cat);
  const sat = 72;
  // Hinglish uses Charcoal Dark colors.
  const light = (mode === 'dark' || mode === 'hinglish') ? 62 : 50;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

function dayLabelFromISO(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date);
}

function isISOInLastNDays(iso: string, n: number): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const today = todayISO();
  const minISO = addDaysISO(today, -(n - 1));
  return iso >= minISO && iso <= today;
}

export function CategoryAnalytics({
  quests,
  focusHistory,
}: {
  quests: Quest[];
  focusHistory?: FocusLogEvent[];
}) {
  const { isDark, isHinglish, lang, theme } = useTheme();

  const mode: 'light' | 'dark' | 'hinglish' = isHinglish ? 'hinglish' : isDark ? 'dark' : 'light';

  const darkLike = isDark || isHinglish;

  const card = darkLike
    ? 'bg-[var(--kq-surface)]/[0.03] backdrop-blur-xl border border-white/[0.05] shadow-sm'
    : 'bg-[var(--kq-surface)]/80 backdrop-blur-xl border border-[var(--kq-border)]/40 shadow-sm';

  const tp = darkLike ? 'text-slate-200' : 'text-[var(--kq-text-primary)]';
  const ts = darkLike ? 'text-[var(--kq-text-muted)]' : 'text-[var(--kq-text-muted)]';

  const chartTheme = useMemo(() => {
    const axis = darkLike ? 'rgba(226,232,240,0.65)' : '#64748B';
    const grid = darkLike ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
    const tooltipBg = darkLike ? 'rgba(2,6,23,0.92)' : 'rgba(255,255,255,0.98)';
    const tooltipBorder = darkLike ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
    const tooltipText = darkLike ? 'rgba(226,232,240,0.9)' : 'rgba(15,23,42,0.9)';
    return { axis, grid, tooltipBg, tooltipBorder, tooltipText };
  }, [darkLike]);

  const { barData, pieData, categories, totalXp7d } = useMemo(() => {
    const days: string[] = [];
    const today = todayISO();
    for (let i = 6; i >= 0; i--) days.push(addDaysISO(today, -i));

    const byDayCat: Record<string, Record<string, number>> = {};
    for (const d of days) byDayCat[d] = {};

    const add = (dayISO: string, catRaw: string, xp: number) => {
      if (!byDayCat[dayISO]) return;
      const cat = (catRaw || 'Other').trim() || 'Other';
      byDayCat[dayISO][cat] = (byDayCat[dayISO][cat] || 0) + (Number.isFinite(xp) ? xp : 0);
    };

    // Quest completion XP (earnedXp captures boosts)
    for (const q of quests) {
      if (q.status !== 'completed') continue;
      const dayISO = (q.completedAt || '').trim();
      if (!isISOInLastNDays(dayISO, 7)) continue;
      const xp = typeof q.earnedXp === 'number' && q.earnedXp > 0 ? q.earnedXp : q.xpReward;
      add(dayISO, q.category, xp);
    }

    // Focus bonus XP (optional, if you keep focusHistory)
    if (Array.isArray(focusHistory)) {
      for (const ev of focusHistory) {
        const dayISO = new Date(ev.earnedAt).toISOString().slice(0, 10);
        if (!isISOInLastNDays(dayISO, 7)) continue;
        add(dayISO, ev.category, ev.xp);
      }
    }

    const totalByCat: Record<string, number> = {};
    for (const d of days) {
      for (const [cat, xp] of Object.entries(byDayCat[d])) {
        totalByCat[cat] = (totalByCat[cat] || 0) + xp;
      }
    }

    const totalXp = Object.values(totalByCat).reduce((a, b) => a + b, 0);

    // Top cats only (readability), fold rest into "Other"
    const sortedCats = Object.entries(totalByCat)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);

    const TOP = 5;
    const topCats = sortedCats.slice(0, TOP);
    const restCats = sortedCats.slice(TOP);

    if (restCats.length) {
      let other = 0;
      for (const c of restCats) other += totalByCat[c] || 0;
      if (other > 0) {
        topCats.push('Other');
        totalByCat['Other'] = (totalByCat['Other'] || 0) + other;
      }

      for (const d of days) {
        for (const c of restCats) {
          const v = byDayCat[d][c] || 0;
          if (v) byDayCat[d]['Other'] = (byDayCat[d]['Other'] || 0) + v;
          delete byDayCat[d][c];
        }
      }
    }

    const bar = days.map((d) => {
      const row: Record<string, any> = { label: dayLabelFromISO(d), iso: d };
      for (const c of topCats) row[c] = byDayCat[d][c] || 0;
      return row;
    });

    const pie = topCats
      .map((c) => ({ name: c, value: totalByCat[c] || 0 }))
      .filter((x) => x.value > 0);

    return {
      barData: bar,
      pieData: pie,
      categories: topCats.filter((c) => (totalByCat[c] || 0) > 0 || c === 'Other'),
      totalXp7d: totalXp,
    };
  }, [quests, focusHistory, theme]);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c] = colorForCategory(c, mode);
    if (!map['Other']) map['Other'] = isDark ? 'rgba(148,163,184,0.55)' : 'rgba(100,116,139,0.55)';
    return map;
  }, [categories, mode, isDark]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const total = payload.reduce((s: number, p: any) => s + (p?.value || 0), 0);
    return (
      <div
        style={{
          background: chartTheme.tooltipBg,
          border: `1px solid ${chartTheme.tooltipBorder}`,
          color: chartTheme.tooltipText,
          borderRadius: 12,
          padding: 10,
          minWidth: 170,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
          {label} • {total} XP
        </div>
        <div style={{ display: 'grid', gap: 4 }}>
          {payload
            .filter((p: any) => (p?.value || 0) > 0)
            .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
            .map((p: any) => (
              <div
                key={p.dataKey}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  fontSize: 11,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: p.fill }} />
                  <span>{p.dataKey}</span>
                </div>
                <span style={{ fontWeight: 700 }}>{p.value}</span>
              </div>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`${card} rounded-2xl p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={`text-sm font-semibold ${tp} flex items-center gap-2`}>
            <span className="text-base">📈</span> {t('categoryAnalyticsTitle', lang)}
          </h3>
          <p className={`text-[11px] mt-1 ${ts}`}>{t('categoryAnalyticsSub', lang)}</p>
        </div>
        <div
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl ${
            isDark ? 'bg-[var(--kq-surface)]/[0.04] text-slate-300' : 'bg-[var(--kq-surface2)]/70 text-[var(--kq-text-secondary)]'
          }`}
        >
          {t('last7Days', lang)}
        </div>
      </div>

      {totalXp7d <= 0 ? (
        <div className={`mt-4 rounded-2xl p-4 text-[12px] ${isDark ? 'bg-[var(--kq-surface)]/[0.02] text-[var(--kq-text-muted)]' : 'bg-[var(--kq-bg2)] text-[var(--kq-text-secondary)]'}`}>
          {t('categoryAnalyticsEmpty', lang)}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`lg:col-span-2 rounded-2xl ${isDark ? 'bg-[var(--kq-surface)]/[0.02]' : 'bg-[var(--kq-bg2)]/60'} p-3`}>
            <div className={`text-[11px] font-semibold mb-2 ${ts}`}>XP / day</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 10, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chartTheme.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartTheme.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                  {categories.map((c) => (
                    <Bar key={c} dataKey={c} stackId="a" fill={colorMap[c]} radius={2} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`rounded-2xl ${isDark ? 'bg-[var(--kq-surface)]/[0.02]' : 'bg-[var(--kq-bg2)]/60'} p-3`}>
            <div className={`text-[11px] font-semibold mb-2 ${ts}`}>Share</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      background: chartTheme.tooltipBg,
                      border: `1px solid ${chartTheme.tooltipBorder}`,
                      borderRadius: 12,
                      color: chartTheme.tooltipText,
                      fontSize: 12,
                    }}
                    formatter={(value: any, name: any) => [`${value} XP`, name]}
                  />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={2}
                    stroke="transparent"
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={`${entry.name}-${idx}`} fill={colorMap[entry.name] || colorMap['Other']} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={`-mt-3 text-center text-[11px] ${ts}`}>
              Total: <span className={`font-bold ${tp}`}>{totalXp7d}</span> XP
            </div>
          </div>
        </div>
      )}
    </div>
  );
}