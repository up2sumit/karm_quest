import { TrendingUp, Target, Zap, Trophy, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { t, getQuotes } from '../i18n';
import type { Page, UserStats, Quest, Note, Achievement, WeeklyReport } from '../store';
import { todayISO } from '../store';
import { weekEndFromWeekStart, weekStartISO } from '../utils/recurrence';
import { computeWeeklyQuestTarget } from '../utils/challengeTargets';
import { useState, useEffect, useMemo } from 'react';
import { MoodCheckIn } from './MoodCheckIn';
import { CategoryAnalytics } from './CategoryAnalytics';
import { HabitHeatmap } from './HabitHeatmap';
import { WeeklyReportCard } from './WeeklyReportCard';

interface DashboardProps {
  stats: UserStats;
  quests: Quest[];
  notes: Note[];
  achievements: Achievement[];
  onNavigate: (page: Page) => void;
  onNavigateTodaysKarma?: () => void;
  weeklyReport?: WeeklyReport | null;
  onDismissWeeklyReport?: (weekStart: string) => void;
  weeklyReportAutoOpen?: boolean;
  onWeeklyReportAutoOpenConsumed?: () => void;
}

function prettyCreatedAt(createdAt: string): string {
  const ms = Date.parse(createdAt);
  if (Number.isNaN(ms)) return createdAt;
  const diff = Date.now() - ms;
  if (diff < 45_000) return "Just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  return days + "d ago";
}

export function Dashboard({
  stats,
  quests,
  notes,
  achievements,
  onNavigate,
  onNavigateTodaysKarma,
  weeklyReport,
  onDismissWeeklyReport,
  weeklyReportAutoOpen,
  onWeeklyReportAutoOpenConsumed,
}: DashboardProps) {
  const { isDark, isHinglish, isModern, lang } = useTheme();
  const [quote, setQuote] = useState('');
  const today = todayISO();
  const weekStart = weekStartISO();
  const weekEnd = weekEndFromWeekStart(weekStart) || weekStart;

  const completedThisWeek = useMemo(() => {
    return quests.filter((q) => {
      if (q.status !== 'completed') return false;
      const d = (q.completedAt || '').trim();
      if (!d) return false;
      return d >= weekStart && d <= weekEnd;
    }).length;
  }, [quests, weekStart, weekEnd]);

  const weeklyQuestTarget = useMemo(() => computeWeeklyQuestTarget(quests, weekStart), [quests, weekStart]);
  const completedToday = quests.filter(q => q.status === 'completed' && q.completedAt === today).length;
  const totalToday = quests.length;
  const progressPercent = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const activeQuests = quests.filter(q => q.status === 'active');

  // Token-driven styling so Theme 1 uses saffron/orange, Theme 3 uses blue/violet,
  // Theme 4 stays deep indigo/black, and Theme 2 stays editorial.
  const card = 'kq-card kq-card-hover backdrop-blur-xl';
  const tp = 'text-[var(--kq-text-primary)]';
  const ts = 'text-[var(--kq-text-secondary)]';
  const tm = 'text-[var(--kq-text-muted)]';

  // Icon accents (token-driven; keeps Theme 1 warm and Theme 4 indigo)
  const iconA = 'text-[var(--kq-primary)]';
  const iconB = 'text-[var(--kq-accent)]';
  const iconC = 'text-[var(--kq-primary-light)]';
  const iconD = 'text-[var(--kq-accent-light)]';

  useEffect(() => {
    const quotes = getQuotes(lang);
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, [lang]);

  // Bug 1 FIX: stable decorative circles — computed once on mount, never on re-render.
  // useMemo([]) guarantees the random values are generated exactly once, so
  // re-renders from parent state changes (quest completions, XP popups, etc.)
  // don't cause the circles to jump to new positions.
  const bannerCircles = useMemo(() =>
    [...Array(4)].map((_, i) => ({
      id:      i,
      size:    Math.random() * 120 + 40,
      left:    Math.random() * 100,
      top:     Math.random() * 100,
      opacity: Math.random() * 0.5,
    }))
  , []); // empty deps: fixed for the component's lifetime

  const bannerGradient = isModern
    ? 'bg-[#1E2322] border border-black/10'
    : 'kq-gradient-135 border border-white/10';

  const ringTrack = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)';

  return (
    <div className="space-y-6 sm:space-y-7 animate-slide-up">
      {/* Welcome Banner */}
      <div className={`relative overflow-hidden rounded-3xl p-7 sm:p-8 text-white shadow-[var(--kq-shadow-card)] ${bannerGradient}`}>
        {!isModern && (
          <div className="absolute inset-0 opacity-[0.07]">
            {bannerCircles.map(c => (
              <div key={c.id} className="absolute rounded-full bg-white" style={{
                width: `${c.size}px`, height: `${c.size}px`,
                left: `${c.left}%`, top: `${c.top}%`,
                opacity: c.opacity,
              }} />
            ))}
          </div>
        )}
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium mb-1 text-white/60">
              {isHinglish ? '🤙' : isModern ? '👋' : '🙏'} {t('welcomeGreeting', lang)}, {stats.username}!
            </p>
            <h2 className="text-3xl sm:text-[32px] font-black mb-1.5 kq-h2">{t('welcomeTitle', lang)}</h2>
            <p className="text-[13px] max-w-md text-white/50">{quote}</p>
            <button
              onClick={() => onNavigate('quests')}
              className={`mt-4 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center gap-2 group ${
                isModern
                  ? 'bg-[var(--kq-primary)] hover:bg-[var(--kq-primary-light)] border border-white/10'
                  : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 hover:border-white/20'
              }`}
            >
              {t('startQuest', lang)} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="text-7xl animate-float hidden md:block opacity-80">{isHinglish ? '🚀' : isModern ? '🗒️' : '🧘'}</div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { icon: <Target className={iconA} size={20} />, label: t('todaysKarma', lang), value: `${completedToday}/${totalToday}`, sub: t('questsDone', lang), emoji: '🎯', onClick: () => (onNavigateTodaysKarma ? onNavigateTodaysKarma() : onNavigate('quests')) },
          { icon: <TrendingUp className={iconB} size={20} />, label: t('totalPunya', lang), value: `${stats.totalXpEarned ?? stats.xp}`, sub: `${t('chakraLabel', lang)} ${stats.level}`, emoji: '✨', onClick: () => onNavigate('achievements') },
          { icon: <Zap className={iconC} size={20} />, label: t('goldMudras', lang), value: `${stats.coins}`, sub: t('keepGrinding', lang), emoji: '🪙', onClick: () => onNavigate('shop') },
          { icon: <Trophy className={iconD} size={20} />, label: t('siddhiLabel', lang), value: `${unlockedCount}/${achievements.length}`, sub: t('unlocked', lang), emoji: '🏆', onClick: () => onNavigate('achievements') },
        ].map((item, i) => (
          <div key={i} onClick={item.onClick} className={`${card} rounded-2xl p-4 sm:p-5 transition-all duration-300 group cursor-pointer hover:-translate-y-0.5`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-[11px] font-medium ${ts}`}>{item.label}</p>
                <p className={`text-[22px] font-black mt-0.5 ${tp}`}>{item.value}</p>
                <p className={`text-[11px] mt-0.5 ${tm}`}>{item.sub}</p>
              </div>
              <span className="text-xl opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all">{item.emoji}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quest Progress */}
        <div className={`lg:col-span-1 ${card} rounded-2xl p-5`}>
          <h3 className={`text-sm font-semibold ${tp} mb-3 flex items-center gap-2`}>
            <span className="text-base">{isHinglish ? '📊' : '🏹'}</span> {t('karmaProgress', lang)}
          </h3>
          <div className="relative flex items-center justify-center py-3">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke={ringTrack} strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke={'url(#gradTheme)'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${progressPercent * 3.27} 327`}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="gradTheme" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--kq-xp-start)" />
                  <stop offset="100%" stopColor="var(--kq-xp-end)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute text-center">
              <p className={`text-2xl font-bold ${tp}`}>{progressPercent}%</p>
              <p className={`text-[11px] ${ts}`}>{t('complete', lang)}</p>
            </div>
          </div>
          <div className="mt-1 space-y-1.5">
            {activeQuests.slice(0, 3).map(q => (
              <div
                key={q.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--kq-border)] bg-[var(--kq-bg2)]`}
              >
                <span className="text-xs">{isHinglish ? '💪' : '🏹'}</span>
                <span className={`text-[12px] font-medium truncate flex-1 ${ts}`}>{q.title}</span>
                <span className={`text-[10px] font-black text-[var(--kq-primary)]`}>+{q.xpReward}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Notes */}
        <div className={`lg:col-span-1 ${card} rounded-2xl p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-semibold ${tp} flex items-center gap-2`}>
              <span className="text-base">{isHinglish ? '📝' : '📜'}</span> {t('recentScrolls', lang)}
            </h3>
            <button
              onClick={() => onNavigate('notes')}
              className="text-[11px] font-semibold flex items-center gap-1 text-[var(--kq-primary)] hover:opacity-90"
            >
              {t('viewAll', lang)} <ArrowRight size={11} />
            </button>
          </div>
          <div className="space-y-2">
            {notes.slice(0, 4).map(note => (
              <div
                key={note.id}
                className="flex items-start gap-2.5 p-2.5 rounded-xl transition-all cursor-pointer group hover:bg-[var(--kq-bg2)]"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0" style={{ backgroundColor: `${note.color}10` }}>
                  {note.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-semibold truncate ${tp}`}>{note.title}</p>
                  <p className={`text-[11px] truncate ${ts}`}>{note.content}</p>
                  <p className={`text-[10px] mt-0.5 ${tm}`}>{prettyCreatedAt(note.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Streak + Boss */}
        <div className="lg:col-span-1 space-y-4">
          <MoodCheckIn completedToday={completedToday} />
          <div className={`${card} rounded-2xl p-5`}>
            <h3 className={`text-sm font-semibold ${tp} mb-2.5 flex items-center gap-2`}>
              <span className="text-base">{isHinglish ? '🔥' : '🪔'}</span> {t('tapasyaStreak', lang)}
            </h3>
            <div className="flex items-center gap-3">
              <div className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[var(--kq-xp-start)] to-[var(--kq-xp-end)]">
                {stats.streak}
              </div>
              <div>
                <p className={`text-[13px] font-medium ${tp}`}>{t('daysOfSadhana', lang)}</p>
                <p className={`text-[11px] ${ts}`}>{t('jaiHoYoddha', lang)}</p>
                <p className={`text-[10px] mt-0.5 ${tm}`}>Record: {stats.streakRecord} days</p>
              </div>
            </div>
            <div className="flex gap-1 mt-3">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    i < (stats.streak % 7 || (stats.streak > 0 ? 7 : 0))
                      ? 'bg-gradient-to-r from-[var(--kq-xp-start)] to-[var(--kq-xp-end)]'
                      : 'bg-[var(--kq-bg2)]'
                  }`}
                />
              ))}
            </div>
            <p className={`text-[10px] mt-1.5 text-center ${tm}`}>{stats.streak === 0 ? 7 : (stats.streak % 7 === 0 ? 0 : 7 - (stats.streak % 7))} {t('daysUntilBonus', lang)}</p>
          </div>

          {/* Weekly Boss */}
          <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-[var(--kq-shadow-card)] kq-gradient-135 border border-white/10">
            <div className="absolute top-2 right-3 text-5xl opacity-10">{isHinglish ? '👹' : '🔱'}</div>
            <div className="relative z-10">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{t('weeklyAsura', lang)}</p>
              <h4 className="text-base font-bold mt-1">{t('ravanaTitle', lang)}</h4>
              <p className="text-[11px] mt-1 text-white/50">{t('ravanaDesc', lang)}</p>
              <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all bg-gradient-to-r from-[var(--kq-xp-start)] to-[var(--kq-xp-end)]"
                  style={{ width: `${Math.min(100,  (completedThisWeek / weeklyQuestTarget) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] mt-1 text-white/40">{completedThisWeek}/{weeklyQuestTarget} {t('questsLabel', lang)} · {t('rewardLabel', lang)}: 500 {(lang === 'pro' || isHinglish) ? 'XP' : 'Punya'} + 🏆</p>
            </div>
          </div>
        </div>
      </div>

      <CategoryAnalytics quests={quests} />

      <HabitHeatmap quests={quests} />

      {weeklyReport ? (
        <WeeklyReportCard
          report={weeklyReport}
          autoOpen={weeklyReportAutoOpen}
          onAutoOpenConsumed={onWeeklyReportAutoOpenConsumed}
          onDismissFromDashboard={onDismissWeeklyReport}
        />
      ) : null}
    </div>
  );
}
