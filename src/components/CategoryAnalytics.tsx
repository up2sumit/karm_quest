import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';
import type { Quest, FocusLogEvent } from '../store';
import { addDaysISO, todayISO } from '../store';

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function hashHue(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h % 360;
}

// Curated category palette — vibrant, distinguishable, theme-aware
const CATEGORY_PALETTE: Record<string, { light: string; dark: string }> = {
  Karma: { light: '#6366F1', dark: '#818CF8' },
  Vidya: { light: '#10B981', dark: '#34D399' },
  Yoga: { light: '#F59E0B', dark: '#FBBF24' },
  Sadhana: { light: '#EC4899', dark: '#F472B6' },
  Creative: { light: '#8B5CF6', dark: '#A78BFA' },
  Griha: { light: '#06B6D4', dark: '#22D3EE' },
  Other: { light: '#94A3B8', dark: '#64748B' },
};

function colorForCategory(cat: string, darkLike: boolean): string {
  const entry = CATEGORY_PALETTE[cat];
  if (entry) return darkLike ? entry.dark : entry.light;
  const hue = hashHue(cat);
  return darkLike ? `hsl(${hue}, 72%, 65%)` : `hsl(${hue}, 72%, 50%)`;
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

type Period = 7 | 30 | 90;

/* ── Component ─────────────────────────────────────────────────────────────── */

export function CategoryAnalytics({
  quests,
  focusHistory,
}: {
  quests: Quest[];
  focusHistory?: FocusLogEvent[];
}) {
  const { isDark, isHinglish, lang, theme } = useTheme();
  const darkLike = isDark || isHinglish;
  const [period, setPeriod] = useState<Period>(7);

  const card = darkLike
    ? 'bg-[var(--kq-surface)] border border-white/[0.06] shadow-lg'
    : 'bg-[var(--kq-surface)] border border-[var(--kq-border)] shadow-lg';

  const tp = darkLike ? 'text-slate-200' : 'text-[var(--kq-text-primary)]';
  const ts = darkLike ? 'text-slate-500' : 'text-[var(--kq-text-muted)]';

  const chartTheme = useMemo(() => {
    const axis = darkLike ? 'rgba(226,232,240,0.4)' : 'rgba(100,116,139,0.5)';
    const grid = darkLike ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.05)';
    const tooltipBg = darkLike ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.98)';
    const tooltipBorder = darkLike ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
    const tooltipText = darkLike ? 'rgba(226,232,240,0.9)' : 'rgba(15,23,42,0.9)';
    return { axis, grid, tooltipBg, tooltipBorder, tooltipText };
  }, [darkLike]);

  const { chartData, categories, totalXp, topCategory, catTotals, catQuests } = useMemo(() => {
    const days: string[] = [];
    const today = todayISO();
    for (let i = period - 1; i >= 0; i--) days.push(addDaysISO(today, -i));

    const byDayCat: Record<string, Record<string, number>> = {};
    for (const d of days) byDayCat[d] = {};

    const questCountByCat: Record<string, number> = {};

    const add = (dayISO: string, catRaw: string, xp: number) => {
      if (!byDayCat[dayISO]) return;
      const cat = (catRaw || 'Other').trim() || 'Other';
      byDayCat[dayISO][cat] = (byDayCat[dayISO][cat] || 0) + (Number.isFinite(xp) ? xp : 0);
    };

    for (const q of quests) {
      if (q.status !== 'completed') continue;
      const dayISO = (q.completedAt || '').slice(0, 10).trim();
      if (!isISOInLastNDays(dayISO, period)) continue;
      const xp = typeof q.earnedXp === 'number' && q.earnedXp > 0 ? q.earnedXp : q.xpReward;
      const cat = (q.category || 'Other').trim() || 'Other';
      add(dayISO, cat, xp);
      questCountByCat[cat] = (questCountByCat[cat] || 0) + 1;
    }

    if (Array.isArray(focusHistory)) {
      for (const ev of focusHistory) {
        const dayISO = new Date(ev.earnedAt).toISOString().slice(0, 10);
        if (!isISOInLastNDays(dayISO, period)) continue;
        add(dayISO, ev.category, ev.xp);
      }
    }

    const totByCat: Record<string, number> = {};
    for (const d of days) {
      for (const [cat, xp] of Object.entries(byDayCat[d])) {
        totByCat[cat] = (totByCat[cat] || 0) + xp;
      }
    }

    const total = Object.values(totByCat).reduce((a, b) => a + b, 0);

    const sortedCats = Object.entries(totByCat)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);

    const TOP = 5;
    const topCats = sortedCats.slice(0, TOP);
    const restCats = sortedCats.slice(TOP);

    if (restCats.length) {
      let other = 0;
      for (const c of restCats) other += totByCat[c] || 0;
      if (other > 0) {
        topCats.push('Other');
        totByCat['Other'] = (totByCat['Other'] || 0) + other;
      }
      for (const d of days) {
        for (const c of restCats) {
          const v = byDayCat[d][c] || 0;
          if (v) byDayCat[d]['Other'] = (byDayCat[d]['Other'] || 0) + v;
          delete byDayCat[d][c];
        }
      }
    }

    // For 30d/90d, aggregate into fewer points for readability
    let aggregated: { label: string; iso: string;[key: string]: any }[];

    if (period <= 7) {
      aggregated = days.map((d) => {
        const row: any = { label: dayLabelFromISO(d), iso: d };
        for (const c of topCats) row[c] = byDayCat[d][c] || 0;
        return row;
      });
    } else {
      // Group into weeks
      const weekSize = period <= 30 ? 7 : 14;
      const groups: { label: string; cats: Record<string, number> }[] = [];
      for (let i = 0; i < days.length; i += weekSize) {
        const slice = days.slice(i, i + weekSize);
        const cats: Record<string, number> = {};
        for (const d of slice) {
          for (const c of topCats) {
            cats[c] = (cats[c] || 0) + (byDayCat[d][c] || 0);
          }
        }
        const first = slice[0];
        const fParts = first.split('-');
        const label = `${fParts[1]}/${fParts[2]}`;
        groups.push({ label, cats });
      }
      aggregated = groups.map((g) => {
        const row: any = { label: g.label };
        for (const c of topCats) row[c] = g.cats[c] || 0;
        return row;
      });
    }

    const top = topCats[0] || '';

    return {
      chartData: aggregated,
      categories: topCats.filter((c) => (totByCat[c] || 0) > 0),
      totalXp: total,
      topCategory: top,
      catTotals: totByCat,
      catQuests: questCountByCat,
    };
  }, [quests, focusHistory, theme, period]);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c] = colorForCategory(c, darkLike);
    if (!map['Other']) map['Other'] = darkLike ? '#64748B' : '#94A3B8';
    return map;
  }, [categories, darkLike]);

  // Top category stats
  const topXp = catTotals[topCategory] || 0;
  const topPct = totalXp > 0 ? Math.round((topXp / totalXp) * 100) : 0;
  const topCount = catQuests[topCategory] || 0;
  const topColor = colorMap[topCategory] || (darkLike ? '#818CF8' : '#6366F1');

  // Sort categories by XP for the side panel (excluding top)
  const otherCats = categories.filter((c) => c !== topCategory);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const total = payload.reduce((s: number, p: any) => s + (p?.value || 0), 0);
    return (
      <div
        style={{
          background: chartTheme.tooltipBg,
          border: `1px solid ${chartTheme.tooltipBorder}`,
          color: chartTheme.tooltipText,
          borderRadius: 14,
          padding: '12px 14px',
          minWidth: 180,
          backdropFilter: 'blur(12px)',
          boxShadow: darkLike
            ? '0 8px 32px rgba(0,0,0,0.4)'
            : '0 8px 32px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.7 }}>{label}</div>
        <div style={{ display: 'grid', gap: 5 }}>
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
                  gap: 12,
                  fontSize: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: p.stroke || p.fill,
                      boxShadow: `0 0 6px ${p.stroke || p.fill}40`,
                    }}
                  />
                  <span style={{ fontWeight: 500 }}>{p.dataKey}</span>
                </div>
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {p.value} xp
                </span>
              </div>
            ))}
        </div>
        <div
          style={{
            marginTop: 8,
            paddingTop: 6,
            borderTop: `1px solid ${chartTheme.tooltipBorder}`,
            fontSize: 11,
            fontWeight: 700,
            textAlign: 'right',
            opacity: 0.8,
          }}
        >
          Total: {total} xp
        </div>
      </div>
    );
  };

  const periodOptions: { label: string; value: Period }[] = [
    { label: '7d', value: 7 },
    { label: '30d', value: 30 },
    { label: '90d', value: 90 },
  ];

  return (
    <div className={`${card} rounded-2xl overflow-hidden`}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className={`text-sm font-bold ${tp} flex items-center gap-2`}>
            <span className="text-base">📊</span> {t('categoryAnalyticsTitle', lang)}
          </h3>
          <p className={`text-[11px] mt-0.5 ${ts}`}>{t('categoryAnalyticsSub', lang)}</p>
        </div>

        {/* Period selector */}
        <div
          className={`flex items-center gap-0.5 p-0.5 rounded-lg border ${darkLike
              ? 'bg-white/[0.03] border-white/[0.06]'
              : 'bg-slate-50 border-slate-200/50'
            }`}
        >
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${period === opt.value
                  ? darkLike
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'bg-white text-slate-800 shadow-sm'
                  : darkLike
                    ? 'text-slate-500 hover:text-slate-300'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {totalXp <= 0 ? (
        <div className={`mx-5 mb-5 rounded-2xl p-6 text-center text-[12px] ${darkLike ? 'bg-white/[0.02] text-slate-500' : 'bg-slate-50 text-slate-500'}`}>
          <div className="text-4xl opacity-20 mb-2">📈</div>
          <p className={`font-semibold ${tp}`}>{t('categoryAnalyticsEmpty', lang)}</p>
          <p className={`text-[11px] mt-1 ${ts}`}>Complete quests to see your XP breakdown here.</p>
        </div>
      ) : (
        <>
          {/* ── Legend ──────────────────────────────────────────────────── */}
          <div className="px-5 pb-2 flex items-center gap-3 flex-wrap">
            {categories.map((cat) => (
              <div key={cat} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: colorMap[cat], boxShadow: `0 0 6px ${colorMap[cat]}50` }}
                />
                <span className={`text-[11px] font-medium ${ts}`}>{cat}</span>
              </div>
            ))}
          </div>

          {/* ── Main content: Chart + Side panel ────────────────────────── */}
          <div className="flex flex-col lg:flex-row">
            {/* Chart area */}
            <div className="flex-1 min-w-0">
              <div className="h-56 sm:h-64 lg:h-72 px-2 sm:px-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                    <defs>
                      {categories.map((cat) => (
                        <linearGradient key={cat} id={`grad-${cat}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={colorMap[cat]} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={colorMap[cat]} stopOpacity={0.02} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: chartTheme.axis, fontSize: 10, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: chartTheme.axis, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {categories.map((cat) => (
                      <Area
                        key={cat}
                        type="monotone"
                        dataKey={cat}
                        stroke={colorMap[cat]}
                        strokeWidth={2.5}
                        fill={`url(#grad-${cat})`}
                        dot={false}
                        activeDot={{
                          r: 4,
                          fill: colorMap[cat],
                          stroke: darkLike ? '#0F172A' : '#fff',
                          strokeWidth: 2,
                        }}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Side panel ──────────────────────────────────────────── */}
            <div
              className={`lg:w-64 xl:w-72 shrink-0 border-t lg:border-t-0 lg:border-l px-5 py-4 ${darkLike ? 'border-white/[0.05]' : 'border-slate-200/40'
                }`}
            >
              {/* Top category hero */}
              <div className={`text-[10px] font-semibold uppercase tracking-[2px] mb-3 ${ts}`}>
                Top Category
                <span className={`ml-1 lowercase tracking-normal ${ts}`}>
                  · {period === 7 ? 'this week' : period === 30 ? 'this month' : 'this quarter'}
                </span>
              </div>

              <div className="mb-4">
                <h4 className={`text-xl font-black ${tp}`}>
                  {topCategory || '—'}
                </h4>
                <p className={`text-[11px] mt-1 ${ts}`}>
                  {topXp} xp · {topCount} quest{topCount !== 1 ? 's' : ''} completed
                </p>

                {/* Progress bar */}
                <div className="mt-2.5 relative">
                  <div
                    className={`h-1.5 rounded-full overflow-hidden ${darkLike ? 'bg-white/[0.06]' : 'bg-slate-100'
                      }`}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${topPct}%`,
                        background: `linear-gradient(90deg, ${topColor}, ${topColor}cc)`,
                        boxShadow: `0 0 12px ${topColor}40`,
                      }}
                    />
                  </div>
                  <p className={`text-[10px] mt-1 font-semibold ${ts}`}>
                    {topPct}% of total XP
                  </p>
                </div>
              </div>

              {/* Other categories */}
              {otherCats.length > 0 && (
                <div className="space-y-2.5">
                  {otherCats.map((cat) => {
                    const xp = catTotals[cat] || 0;
                    const color = colorMap[cat];
                    return (
                      <div
                        key={cat}
                        className={`flex items-center justify-between gap-3 py-2 px-3 rounded-xl transition-all ${darkLike
                            ? 'bg-white/[0.02] hover:bg-white/[0.04]'
                            : 'bg-slate-50/60 hover:bg-slate-50'
                          }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: color, boxShadow: `0 0 8px ${color}30` }}
                          />
                          <span className={`text-[12px] font-medium truncate ${tp}`}>{cat}</span>
                        </div>
                        <span
                          className="text-[11px] font-bold shrink-0"
                          style={{ color }}
                        >
                          {xp} xp
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total */}
              <div
                className={`mt-4 pt-3 border-t flex items-center justify-between ${darkLike ? 'border-white/[0.05]' : 'border-slate-200/40'
                  }`}
              >
                <span className={`text-[11px] font-medium ${ts}`}>Total XP</span>
                <span className={`text-sm font-black ${tp}`}>{totalXp}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}