import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { t, type Lang } from '../i18n';
import type { Quest, UserStats } from '../store';
import { todayISO } from '../store';
import { weekEndFromWeekStart, weekStartISO } from '../utils/recurrence';
import { computeWeeklyQuestTarget } from '../utils/challengeTargets';
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
  titleKey:
  | 'challengeBrahmaMuhurta'
  | 'challengeVidyaSeeker'
  | 'challengeTapasyaGuard'
  | 'challengeKarmaStorm'
  | 'challengeRavanaSlayer'
  | 'challengeScrollMaster'
  | 'challengeDivyaGrind'
  | 'challengeAsuraRush';
  descKey:
  | 'challengeBrahmaDesc'
  | 'challengeVidyaDesc'
  | 'challengeTapasyaDesc'
  | 'challengeKarmaStormDesc'
  | 'challengeRavanaDesc'
  | 'challengeScrollDesc'
  | 'challengeDivyaDesc'
  | 'challengeAsuraDesc';
  reward: number;
  progress: number;
  total: number;
  emoji: string;
  type: 'daily' | 'weekly' | 'special';
}

export function Challenges({ stats, quests, challengeState, onClaim }: ChallengesProps) {
  const { isDark, isHinglish, isModern, lang } = useTheme();

  const darkLike = isDark || isHinglish;

  const tp = isModern
    ? 'text-[var(--kq-text-primary)]'
    : darkLike
      ? 'text-slate-200'
      : 'text-slate-800';

  const ts = isModern
    ? 'text-[var(--kq-text-secondary)]'
    : darkLike
      ? 'text-slate-400'
      : 'text-slate-500';

  const card = isModern
    ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)] shadow-[0_1px_0_rgba(0,0,0,0.02),0_10px_30px_rgba(0,0,0,0.06)]'
    : darkLike
      ? 'bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] shadow-sm'
      : 'bg-white/80 backdrop-blur-xl border border-slate-200/40 shadow-sm';

  // Metrics derived from real app data
  const today = todayISO();
  const weekStart = weekStartISO();
  const weekEnd = weekEndFromWeekStart(weekStart) || weekStart;

  const weeklyQuestTarget = useMemo(() => computeWeeklyQuestTarget(quests, weekStart), [quests, weekStart]);

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
  const dailyNotes = challengeState?.dailyKey === today ? (challengeState.dailyNotes || 0) : 0;
  const dailyFocus = challengeState?.dailyKey === today ? (challengeState.dailyFocus || 0) : 0;
  const weeklyNotes = challengeState?.weeklyKey === weekStart ? (challengeState.weeklyNotes || 0) : 0;
  const weeklyXp = challengeState?.weeklyKey === weekStart ? (challengeState.weeklyXp || 0) : 0;
  const claimed = challengeState?.claimed || {};

  const challenges: Challenge[] = useMemo(() => {
    const e = (fallback: string, modern: string) => (isModern ? modern : fallback);
    return [
      // Daily
      { id: '1', titleKey: 'challengeBrahmaMuhurta', descKey: 'challengeBrahmaDesc', reward: 30, progress: Math.min(completedToday, 3), total: 3, emoji: e('🌅', '🌤️'), type: 'daily' },
      { id: '2', titleKey: 'challengeVidyaSeeker', descKey: 'challengeVidyaDesc', reward: 20, progress: Math.min(dailyNotes, 2), total: 2, emoji: e('📖', '🗒️'), type: 'daily' },
      { id: '3', titleKey: 'challengeTapasyaGuard', descKey: 'challengeTapasyaDesc', reward: 15, progress: Math.min(dailyFocus, 1), total: 1, emoji: e('🪔', '⏱️'), type: 'daily' },
      { id: '4', titleKey: 'challengeKarmaStorm', descKey: 'challengeKarmaStormDesc', reward: 50, progress: Math.min(completedToday, 5), total: 5, emoji: e('⚡', '✅'), type: 'daily' },

      // Weekly
      { id: '5', titleKey: 'challengeRavanaSlayer', descKey: 'challengeRavanaDesc', reward: 200, progress: Math.min(completedThisWeek, weeklyQuestTarget), total: weeklyQuestTarget, emoji: e('🔱', '📅'), type: 'weekly' },
      { id: '6', titleKey: 'challengeScrollMaster', descKey: 'challengeScrollDesc', reward: 150, progress: Math.min(weeklyNotes, 10), total: 10, emoji: e('📜', '🗂️'), type: 'weekly' },
      { id: '7', titleKey: 'challengeDivyaGrind', descKey: 'challengeDivyaDesc', reward: 300, progress: Math.min(weeklyXp, 500), total: 500, emoji: e('💎', '📈'), type: 'weekly' },

      // Special
      { id: '8', titleKey: 'challengeAsuraRush', descKey: 'challengeAsuraDesc', reward: 250, progress: Math.min(toughCompletedLifetime, 3), total: 3, emoji: e('👑', '🧩'), type: 'special' },
    ];
  }, [completedToday, dailyNotes, dailyFocus, completedThisWeek, weeklyNotes, weeklyXp, toughCompletedLifetime, weeklyQuestTarget, isModern]);

  // ── Boss Fight trigger (Weekly milestone celebration) ─────────────────
  const ravana = useMemo(() => challenges.find((c) => c.titleKey === 'challengeRavanaSlayer'), [challenges]);
  const ravanaIsComplete = Boolean(ravana && ravana.progress >= ravana.total);
  const [bossFightOpen, setBossFightOpen] = useState(false);

  useEffect(() => {
    if (!ravanaIsComplete) return;

    // Trigger once per ISO week
    const weekKey = getISOWeekKey(new Date());
    const triggerKey = `${weekKey}:ravana:${ravana?.total ?? weeklyQuestTarget}`;
    const storageKey = 'karmquest:bossfight:lastTrigger';
    const last = localStorage.getItem(storageKey);
    if (last === triggerKey) return;

    // Auto-award the weekly reward when the celebration triggers
    if (ravana && !claimed[ravana.id]) {
      onClaim(ravana.id, ravana.reward);
      showClaimToast(ravana.reward);
    }

    localStorage.setItem(storageKey, triggerKey);
    setBossFightOpen(true);
  }, [ravanaIsComplete, ravana, claimed, onClaim]);

  const [untilMidnight, setUntilMidnight] = useState(timeUntilLocalMidnight());
  const hh = String(untilMidnight.h).padStart(2, '0');
  const mm = String(untilMidnight.m).padStart(2, '0');
  const ss = String((untilMidnight as any).s ?? 0).padStart(2, '0');

  // ── Claim toast ─────────────────────────────────────────────────────
  const [toast, setToast] = useState<null | { title: string; subtitle?: string }>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const showClaimToast = (reward: number) => {
    const coinWord = lang === 'pro' ? 'coins' : 'Mudra';
    const title = isModern
      ? `Reward claimed · +${reward} coins`
      : isHinglish
        ? `Shabaash! +${reward} Mudra 🪙`
        : `Reward claimed! +${reward} 🪙`;

    const subtitle = isModern
      ? 'Added to your wallet.'
      : isHinglish
        ? 'Karm points wallet updated.'
        : `Added to your ${coinWord} wallet.`;

    setToast({ title, subtitle });
    setToastVisible(false);
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

  const daily = challenges.filter((c) => c.type === 'daily');
  const weekly = challenges.filter((c) => c.type === 'weekly');
  const special = challenges.filter((c) => c.type === 'special');

  return (
    <div className="space-y-5 animate-slide-up">
      <BossFightOverlay open={bossFightOpen} onClose={() => setBossFightOpen(false)} rewardCoins={ravana?.reward ?? 200} />

      {/* Claim Toast */}
      {toast && (
        <div
          aria-live="polite"
          className={`fixed left-1/2 -translate-x-1/2 bottom-5 z-[60] w-[calc(100%-2rem)] max-w-md transition-all duration-200 ${toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
        >
          <div
            className={`rounded-2xl px-4 py-3 shadow-lg border ${isModern
                ? 'bg-[var(--kq-surface)] border-[var(--kq-border)]'
                : darkLike
                  ? 'bg-black/40 border-white/[0.08] text-slate-100 backdrop-blur-xl'
                  : 'bg-white/90 border-slate-200/50 text-slate-900 backdrop-blur-xl'
              }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${isModern
                    ? 'bg-[var(--kq-primary-soft)] text-[var(--kq-primary)]'
                    : darkLike
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
                className={`ml-auto text-xs px-2 py-1 rounded-lg ${isModern
                    ? 'text-[var(--kq-text-secondary)] hover:bg-[var(--kq-bg2)]'
                    : darkLike
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
            <span className="text-2xl">{isModern ? '🎯' : isHinglish ? '🔥' : '🔱'}</span> {t('challengesTitle', lang)}
          </h2>
          <p className={`text-[13px] mt-0.5 ${ts}`}>{t('challengesSub', lang)}</p>
        </div>

        <div
          className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold flex items-center gap-2 ${isModern
              ? 'bg-[var(--kq-bg2)] border border-[var(--kq-border)] text-[var(--kq-text-primary)]'
              : darkLike
                ? 'bg-white/[0.04] border border-white/[0.06] text-slate-200'
                : 'bg-white/80 border border-slate-200/40 text-slate-800'
            }`}
        >
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
          <p className={`text-base font-bold ${tp}`}>{hh}:{mm}:{ss}</p>
          <p className={`text-[10px] ${isModern ? 'text-[var(--kq-text-muted)]' : isDark ? 'text-slate-600' : 'text-slate-400'}`}>{t('untilReset', lang)}</p>
        </div>
      </div>

      <Section
        title={t('dailyKarma', lang)}
        challenges={daily}
        claimed={claimed}
        onClaim={handleClaim}
        isDark={isDark}
        isHinglish={isHinglish}
        isModern={isModern}
        lang={lang}
        card={card}
        tp={tp}
        ts={ts}
      />
      <Section
        title={t('weeklyCampaigns', lang)}
        challenges={weekly}
        claimed={claimed}
        onClaim={handleClaim}
        isDark={isDark}
        isHinglish={isHinglish}
        isModern={isModern}
        lang={lang}
        card={card}
        tp={tp}
        ts={ts}
      />
      <Section
        title={t('specialMissions', lang)}
        challenges={special}
        claimed={claimed}
        onClaim={handleClaim}
        isDark={isDark}
        isHinglish={isHinglish}
        isModern={isModern}
        lang={lang}
        card={card}
        tp={tp}
        ts={ts}
      />
    </div>
  );
}

function timeUntilLocalMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = midnight.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.ceil(diffMs / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { h, m, s };
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

function Section({
  title,
  challenges,
  claimed,
  onClaim,
  isDark,
  isHinglish,
  isModern,
  lang,
  card,
  tp,
  ts,
}: {
  title: string;
  challenges: Challenge[];
  claimed: Record<string, boolean>;
  onClaim: (challengeId: string, reward: number) => void;
  isDark: boolean;
  isHinglish: boolean;
  isModern: boolean;
  lang: Lang;
  card: string;
  tp: string;
  ts: string;
}) {
  return (
    <div>
      <h3 className={`text-sm font-semibold ${tp} mb-3`}>{title}</h3>
      <div className="space-y-2.5">
        {challenges.map((c) => {
          const percent = Math.min(100, Math.round((c.progress / c.total) * 100));
          const isComplete = c.progress >= c.total;
          const isClaimed = !!claimed[c.id];

          const track = isModern ? 'bg-[var(--kq-bg2)]' : isDark ? 'bg-white/[0.04]' : 'bg-slate-100';
          const fill = isModern
            ? 'bg-[var(--kq-primary)]'
            : isComplete
              ? 'bg-emerald-400'
              : isHinglish
                ? 'bg-gradient-to-r from-indigo-400 to-violet-400'
                : 'bg-gradient-to-r from-indigo-500 to-violet-500';

          const claimBtn = isModern
            ? 'bg-[var(--kq-primary)] text-white hover:bg-[var(--kq-primary-light)]'
            : isHinglish
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white'
              : isDark
                ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100';

          return (
            <div
              key={c.id}
              className={`${card} rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${isComplete ? (isModern ? 'ring-1 ring-[var(--kq-border2)]' : isDark ? 'ring-1 ring-emerald-500/20' : 'ring-1 ring-emerald-200') : ''
                }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${isComplete
                      ? isModern
                        ? 'bg-[var(--kq-primary-soft)] text-[var(--kq-primary)]'
                        : isDark
                          ? 'bg-emerald-500/10'
                          : 'bg-emerald-50'
                      : isModern
                        ? 'bg-[var(--kq-bg2)] text-[var(--kq-text-primary)]'
                        : isDark
                          ? 'bg-white/[0.03]'
                          : 'bg-slate-50'
                    }`}
                >
                  {isComplete ? '✓' : c.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`font-medium text-[13px] ${isComplete
                          ? isModern
                            ? 'text-[var(--kq-text-muted)] line-through'
                            : isDark
                              ? 'text-emerald-400 line-through'
                              : 'text-emerald-600 line-through'
                          : tp
                        }`}
                    >
                      {t(c.titleKey, lang)}
                    </h4>
                    {isComplete && (
                      <span className={`text-[11px] font-semibold ${isModern ? 'text-[var(--kq-text-secondary)]' : isDark ? 'text-emerald-400' : 'text-emerald-500'}`}>
                        {t('jaiHo', lang)}
                      </span>
                    )}
                  </div>

                  <p className={`text-[11px] mt-0.5 ${ts}`}>{t(c.descKey, lang)}</p>

                  <div className="mt-2 flex items-center gap-2.5">
                    <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${track}`}>
                      <div className={`h-full rounded-full transition-all duration-700 ${fill}`} style={{ width: `${percent}%` }} />
                    </div>
                    <span className={`text-[10px] font-semibold shrink-0 ${isModern ? 'text-[var(--kq-text-muted)]' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {c.progress}/{c.total}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg ${isModern
                        ? 'bg-[var(--kq-bg2)] border border-[var(--kq-border)]'
                        : isDark
                          ? 'bg-white/[0.03]'
                          : 'bg-slate-50'
                      }`}
                  >
                    <span className="text-sm">🪙</span>
                    <span className={`text-[13px] font-semibold ${isModern ? 'text-[var(--kq-text-primary)]' : isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      +{c.reward}
                    </span>
                  </div>

                  {isComplete && !isClaimed ? (
                    <button
                      onClick={() => onClaim(c.id, c.reward)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all active:scale-[0.98] ${claimBtn}`}
                    >
                      Claim
                    </button>
                  ) : isClaimed ? (
                    <span className={`text-[11px] font-semibold ${isModern ? 'text-[var(--kq-text-secondary)]' : isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      Claimed
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
