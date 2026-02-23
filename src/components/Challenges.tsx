import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';
import type { Quest, UserStats } from '../store';
import { todayISO } from '../store';
import { weekEndFromWeekStart, weekStartISO } from '../utils/recurrence';
import { BossFightOverlay } from './BossFightOverlay';

interface ChallengeState {
  dailyKey: string;
  weeklyKey: string;
  dailyNotes: number;
  dailyFocus: number;
  weeklyNotes: number;
  weeklyXp: number;
  claimed: Record<string, boolean>;
}

interface ChallengesProps {
  stats: UserStats;
  quests: Quest[];
  challengeState: ChallengeState;
  onClaim: (challengeId: string, reward: number) => void;
}

interface Challenge {
  id: string;
  titleKey: 'challengeBrahmaMuhurta' | 'challengeVidyaSeeker' | 'challengeTapasyaGuard' | 'challengeKarmaStorm' | 'challengeRavanaSlayer' | 'challengeScrollMaster' | 'challengeDivyaGrind' | 'challengeAsuraRush';
  descKey: 'challengeBrahmaDesc' | 'challengeVidyaDesc' | 'challengeTapasyaDesc' | 'challengeKarmaStormDesc' | 'challengeRavanaDesc' | 'challengeScrollDesc' | 'challengeDivyaDesc' | 'challengeAsuraDesc';
  reward: number;
  progress: number;
  total: number;
  emoji: string;
  type: 'daily' | 'weekly' | 'special';
}

export function Challenges({ stats, quests, challengeState, onClaim }: ChallengesProps) {
  const { isDark, isHinglish, lang } = useTheme();
  const tp = isHinglish ? 'text-slate-800' : isDark ? 'text-slate-200' : 'text-slate-800';
  const ts = isHinglish ? 'text-slate-500' : isDark ? 'text-slate-400' : 'text-slate-500';
  const card = isHinglish
    ? 'bg-white/70 backdrop-blur-xl border border-rose-200/20 shadow-sm'
    : isDark
      ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] shadow-sm'
      : 'bg-white/80 backdrop-blur-xl border border-slate-200/40 shadow-sm';

// Metrics derived from real app data
const today = todayISO();
const weekStart = weekStartISO();
const weekEnd = weekEndFromWeekStart(weekStart) || weekStart;

const completedToday = useMemo(
  () => quests.filter((q) => q.status === 'completed' && (q.completedAt || '') === today).length,
  [quests, today]
);

const completedThisWeek = useMemo(
  () =>
    quests.filter((q) => {
      if (q.status !== 'completed') return false;
      const d = (q.completedAt || '').trim();
      if (!d) return false;
      return d >= weekStart && d <= weekEnd;
    }).length,
  [quests, weekStart, weekEnd]
);

const toughCompletedLifetime = useMemo(
  () => quests.filter((q) => q.status === 'completed' && (q.difficulty === 'hard' || q.difficulty === 'legendary')).length,
  [quests]
);

// Challenge counters (notes/focus/xp) are persisted in App state so they survive refresh.
const dailyNotes = (challengeState?.dailyKey === today) ? (challengeState.dailyNotes || 0) : 0;
const dailyFocus = (challengeState?.dailyKey === today) ? (challengeState.dailyFocus || 0) : 0;
const weeklyNotes = (challengeState?.weeklyKey === weekStart) ? (challengeState.weeklyNotes || 0) : 0;
const weeklyXp = (challengeState?.weeklyKey === weekStart) ? (challengeState.weeklyXp || 0) : 0;
const claimed = challengeState?.claimed || {};

const challenges: Challenge[] = useMemo(() => ([
  // Daily
  { id: '1', titleKey: 'challengeBrahmaMuhurta', descKey: 'challengeBrahmaDesc', reward: 30, progress: Math.min(completedToday, 3), total: 3, emoji: '🌅', type: 'daily' },
  { id: '2', titleKey: 'challengeVidyaSeeker', descKey: 'challengeVidyaDesc', reward: 20, progress: Math.min(dailyNotes, 2), total: 2, emoji: '📖', type: 'daily' },
  { id: '3', titleKey: 'challengeTapasyaGuard', descKey: 'challengeTapasyaDesc', reward: 15, progress: Math.min(dailyFocus, 1), total: 1, emoji: '🪔', type: 'daily' },
  { id: '4', titleKey: 'challengeKarmaStorm', descKey: 'challengeKarmaStormDesc', reward: 50, progress: Math.min(completedToday, 5), total: 5, emoji: '⚡', type: 'daily' },

  // Weekly
  { id: '5', titleKey: 'challengeRavanaSlayer', descKey: 'challengeRavanaDesc', reward: 200, progress: Math.min(completedThisWeek, 15), total: 15, emoji: '🔱', type: 'weekly' },
  { id: '6', titleKey: 'challengeScrollMaster', descKey: 'challengeScrollDesc', reward: 150, progress: Math.min(weeklyNotes, 10), total: 10, emoji: '📜', type: 'weekly' },
  { id: '7', titleKey: 'challengeDivyaGrind', descKey: 'challengeDivyaDesc', reward: 300, progress: Math.min(weeklyXp, 500), total: 500, emoji: '💎', type: 'weekly' },

  // Special
  { id: '8', titleKey: 'challengeAsuraRush', descKey: 'challengeAsuraDesc', reward: 250, progress: Math.min(toughCompletedLifetime, 3), total: 3, emoji: '👑', type: 'special' },
]), [completedToday, dailyNotes, dailyFocus, completedThisWeek, weeklyNotes, weeklyXp, toughCompletedLifetime]);


  // ── Boss Fight trigger (Weekly Ravana) ────────────────────────────────
  const ravana = useMemo(() => challenges.find(c => c.titleKey === 'challengeRavanaSlayer'), [challenges]);
  const ravanaIsComplete = Boolean(ravana && ravana.progress >= ravana.total);
  const [bossFightOpen, setBossFightOpen] = useState(false);

  useEffect(() => {
    if (!ravanaIsComplete) return;

    // Trigger once per ISO week (so it feels like a weekly boss celebration).
    const weekKey = getISOWeekKey(new Date());
    const triggerKey = `${weekKey}:ravana:15`;
    const storageKey = 'karmquest:bossfight:lastTrigger';
    const last = localStorage.getItem(storageKey);
    if (last === triggerKey) return;

    localStorage.setItem(storageKey, triggerKey);
    setBossFightOpen(true);
  }, [ravanaIsComplete]);

  const [untilMidnight, setUntilMidnight] = useState(timeUntilLocalMidnight());

  // ── Claim toast (mini reward feedback) ───────────────────────────────
  const [toast, setToast] = useState<null | { title: string; subtitle?: string }>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const showClaimToast = (reward: number) => {
    const title = isHinglish ? `Shabaash! +${reward} Mudra 🪙` : `Reward claimed! +${reward} 🪙`;
    const subtitle = isHinglish ? 'Karm points wallet updated.' : 'Coins added to your wallet.';
    setToast({ title, subtitle });
    setToastVisible(false);
    // next tick so transitions always run
    requestAnimationFrame(() => setToastVisible(true));
  };

  useEffect(() => {
    if (!toastVisible) return;
    const id = window.setTimeout(() => setToastVisible(false), 1800);
    return () => window.clearTimeout(id);
  }, [toastVisible]);

  useEffect(() => {
    if (!toast) return;
    if (toastVisible) return;
    // give exit animation a moment, then unmount
    const id = window.setTimeout(() => setToast(null), 260);
    return () => window.clearTimeout(id);
  }, [toast, toastVisible]);

  const handleClaim = (challengeId: string, reward: number) => {
    onClaim(challengeId, reward);
    showClaimToast(reward);
  };

  useEffect(() => {
    const tick = () => setUntilMidnight(timeUntilLocalMidnight());
    tick();
    const id = window.setInterval(tick, 1_000);
    return () => window.clearInterval(id);
  }, []);

  const daily = challenges.filter(c => c.type === 'daily');
  const weekly = challenges.filter(c => c.type === 'weekly');
  const special = challenges.filter(c => c.type === 'special');

  return (
    <div className="space-y-5 animate-slide-up">
      <BossFightOverlay
        open={bossFightOpen}
        onClose={() => setBossFightOpen(false)}
        rewardCoins={ravana?.reward ?? 200}
      />

      {/* Claim Toast */}
      {toast && (
        <div
          aria-live="polite"
          className={`fixed left-1/2 -translate-x-1/2 bottom-5 z-[60] w-[calc(100%-2rem)] max-w-md transition-all duration-200 ${
            toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <div
            className={`rounded-2xl px-4 py-3 shadow-lg border backdrop-blur-xl ${
              isHinglish
                ? 'bg-white/80 border-rose-200/30 text-slate-800'
                : isDark
                  ? 'bg-black/40 border-white/[0.08] text-slate-100'
                  : 'bg-white/90 border-slate-200/50 text-slate-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                  isHinglish
                    ? 'bg-gradient-to-br from-rose-50 to-violet-50'
                    : isDark
                      ? 'bg-white/[0.06]'
                      : 'bg-slate-50'
                }`}
              >
                ✨
              </div>
              <div className="min-w-0">
                <p className={`text-[13px] font-semibold ${tp}`}>{toast.title}</p>
                {toast.subtitle && <p className={`text-[11px] mt-0.5 ${ts}`}>{toast.subtitle}</p>}
              </div>
              <button
                onClick={() => setToastVisible(false)}
                className={`ml-auto text-xs px-2 py-1 rounded-lg ${
                  isHinglish
                    ? 'text-slate-700 hover:bg-rose-50'
                    : isDark
                      ? 'text-slate-300 hover:bg-white/[0.06]'
                      : 'text-slate-600 hover:bg-slate-100'
                }`}
                aria-label="Dismiss"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
<div className="flex items-start justify-between gap-4">
  <div>
    <h2 className={`text-xl font-bold ${tp} flex items-center gap-2.5`}>
      <span className="text-2xl">{isHinglish ? '🔥' : '🔱'}</span> {t('challengesTitle', lang)}
    </h2>
    <p className={`text-[13px] mt-0.5 ${ts}`}>{t('challengesSub', lang)}</p>
  </div>

  <div className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold flex items-center gap-2 ${
    isHinglish
      ? 'bg-white/70 border border-rose-200/30 text-slate-800'
      : isDark
        ? 'bg-white/[0.03] border border-white/[0.06] text-slate-200'
        : 'bg-white/80 border border-slate-200/40 text-slate-800'
  }`}>
    <span className="text-sm">🪙</span>
    <span>{stats.coins}</span>
  </div>
</div>

      <div className={`${card} rounded-2xl p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">⏰</span>
          <div>
            <p className={`text-[13px] font-semibold ${tp}`}>{t('dailyReset', lang)}</p>
            <p className={`text-[11px] ${ts}`}>{t('dailyResetSub', lang)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-base font-bold ${tp}`}>{untilMidnight.h}h {untilMidnight.m}m</p>
          <p className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{t('untilReset', lang)}</p>
        </div>
      </div>

      <Section title={t('dailyKarma', lang)} challenges={daily} claimed={claimed} onClaim={handleClaim} isDark={isDark} isHinglish={isHinglish} lang={lang} card={card} tp={tp} ts={ts} />
      <Section title={t('weeklyCampaigns', lang)} challenges={weekly} claimed={claimed} onClaim={handleClaim} isDark={isDark} isHinglish={isHinglish} lang={lang} card={card} tp={tp} ts={ts} />
      <Section title={t('specialMissions', lang)} challenges={special} claimed={claimed} onClaim={handleClaim} isDark={isDark} isHinglish={isHinglish} lang={lang} card={card} tp={tp} ts={ts} />
    </div>
  );
}

function timeUntilLocalMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = midnight.getTime() - now.getTime();
  const totalMinutes = Math.max(0, Math.ceil(diffMs / 60000)); // ceil avoids "0m" too early
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return { h, m };
}

// ISO week key like "2026-W08"
function getISOWeekKey(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function Section({ title, challenges, claimed, onClaim, isDark, isHinglish, lang, card, tp, ts }: {
  title: string; challenges: Challenge[]; claimed: Record<string, boolean>; onClaim: (challengeId: string, reward: number) => void; isDark: boolean; isHinglish: boolean; lang: 'en' | 'hi'; card: string; tp: string; ts: string;
}) {
  return (
    <div>
      <h3 className={`text-sm font-semibold ${tp} mb-3`}>{title}</h3>
      <div className="space-y-2.5">
        {challenges.map((c) => {
          const percent = Math.min(100, Math.round((c.progress / c.total) * 100));
          const isComplete = c.progress >= c.total;
          const isClaimed = !!claimed[c.id];
          return (
            <div key={c.id}
              className={`${card} rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                isComplete ? isDark ? 'ring-1 ring-emerald-500/20' : 'ring-1 ring-emerald-200' : ''
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                  isComplete
                    ? isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'
                    : isDark ? 'bg-white/[0.03]' : 'bg-slate-50'
                }`}>
                  {isComplete ? '✅' : c.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium text-[13px] ${
                      isComplete ? isDark ? 'text-emerald-400 line-through' : 'text-emerald-600 line-through' : tp
                    }`}>{t(c.titleKey, lang)}</h4>
                    {isComplete && <span className={`text-[11px] font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`}>{t('jaiHo', lang)}</span>}
                  </div>
                  <p className={`text-[11px] mt-0.5 ${ts}`}>{t(c.descKey, lang)}</p>
                  <div className="mt-2 flex items-center gap-2.5">
                    <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
                      <div className={`h-full rounded-full transition-all duration-700 ${
                        isComplete
                          ? 'bg-emerald-400'
                          : isHinglish ? 'bg-gradient-to-r from-rose-400 to-violet-400' : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                      }`} style={{ width: `${percent}%` }} />
                    </div>
                    <span className={`text-[10px] font-semibold shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{c.progress}/{c.total}</span>
                  </div>
                </div>
<div className="flex flex-col items-end gap-2 shrink-0">
  <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg ${
    isDark ? 'bg-white/[0.03]' : 'bg-slate-50'
  }`}>
    <span className="text-sm">🪙</span>
    <span className={`text-[13px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>+{c.reward}</span>
  </div>

  {isComplete && !isClaimed ? (
    <button
      onClick={() => onClaim(c.id, c.reward)}
      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all active:scale-[0.98] ${
        isHinglish
          ? 'bg-gradient-to-r from-rose-500 to-violet-500 text-white'
          : isDark
            ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20'
            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
      }`}
    >
      {isHinglish ? 'Claim' : 'Claim'}
    </button>
  ) : isClaimed ? (
    <span className={`text-[11px] font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
      {isHinglish ? 'Claimed' : 'Claimed'}
    </span>
  ) : null}
</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
