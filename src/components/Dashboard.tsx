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

  const card = isModern
    ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)] shadow-[0_1px_1px_rgba(0,0,0,0.04)]'
    : isHinglish
      ? 'bg-white/70 backdrop-blur-xl border border-indigo-200/20 shadow-sm'
      : isDark
        ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] shadow-sm'
        : 'bg-white/80 backdrop-blur-xl border border-slate-200/40 shadow-sm';
  const tp = isModern ? 'text-[var(--kq-text-primary)]' : isHinglish ? 'text-slate-800' : isDark ? 'text-slate-200' : 'text-slate-800';
  const ts = isModern ? 'text-[var(--kq-text-secondary)]' : isHinglish ? 'text-slate-500' : isDark ? 'text-slate-400' : 'text-slate-500';
  const tm = isModern ? 'text-[var(--kq-text-muted)]' : isHinglish ? 'text-slate-400' : isDark ? 'text-slate-600' : 'text-slate-400';

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
    : isHinglish
      ? 'bg-gradient-to-r from-indigo-500/90 via-violet-500/90 to-indigo-500/90'
      : isDark
        ? 'bg-gradient-to-r from-indigo-600/90 via-violet-600/90 to-purple-700/90'
        : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600';

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Welcome Banner */}
      <div className={`relative overflow-hidden rounded-2xl p-7 text-white shadow-lg ${bannerGradient}`}>
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
            <h2 className="text-2xl font-bold mb-1.5">{t('welcomeTitle', lang)}</h2>
            <p className="text-[13px] max-w-md text-white/50">{quote}</p>
            <button
              onClick={() => onNavigate('quests')}
              className={`mt-4 px-5 py-2 rounded-xl text-[13px] font-semibold transition-all flex items-center gap-2 group ${
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: <Target className={isHinglish ? 'text-indigo-400' : isDark ? 'text-indigo-400' : 'text-indigo-500'} size={20} />, label: t('todaysKarma', lang), value: `${completedToday}/${totalToday}`, sub: t('questsDone', lang), emoji: '🎯', onClick: () => (onNavigateTodaysKarma ? onNavigateTodaysKarma() : onNavigate('quests')) },
          { icon: <TrendingUp className={isHinglish ? 'text-violet-400' : isDark ? 'text-violet-400' : 'text-violet-500'} size={20} />, label: t('totalPunya', lang), value: `${stats.totalXpEarned ?? stats.xp}`, sub: `${t('chakraLabel', lang)} ${stats.level}`, emoji: '✨', onClick: () => onNavigate('achievements') },
          { icon: <Zap className={isHinglish ? 'text-amber-400' : isDark ? 'text-amber-400' : 'text-amber-500'} size={20} />, label: t('goldMudras', lang), value: `${stats.coins}`, sub: t('keepGrinding', lang), emoji: '🪙', onClick: () => onNavigate('shop') },
          { icon: <Trophy className={isHinglish ? 'text-orange-400' : isDark ? 'text-orange-400' : 'text-orange-500'} size={20} />, label: t('siddhiLabel', lang), value: `${unlockedCount}/${achievements.length}`, sub: t('unlocked', lang), emoji: '🏆', onClick: () => onNavigate('achievements') },
        ].map((item, i) => (
          <div key={i} onClick={item.onClick} className={`${card} rounded-2xl p-4 hover:shadow-md transition-all duration-300 group cursor-pointer hover:-translate-y-0.5`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-[11px] font-medium ${ts}`}>{item.label}</p>
                <p className={`text-xl font-bold mt-0.5 ${tp}`}>{item.value}</p>
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
              <circle cx="60" cy="60" r="52" fill="none" stroke={isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9'} strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke={isHinglish ? 'url(#gradHinglish)' : 'url(#gradPro)'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${progressPercent * 3.27} 327`}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="gradPro" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
                <linearGradient id="gradHinglish" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F43F5E" />
                  <stop offset="100%" stopColor="#A855F7" />
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
              <div key={q.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                isDark ? 'bg-white/[0.02]' : 'bg-slate-50/60'
              }`}>
                <span className="text-xs">{isHinglish ? '💪' : '🏹'}</span>
                <span className={`text-[12px] font-medium truncate flex-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{q.title}</span>
                <span className={`text-[10px] font-semibold ${isHinglish ? 'text-indigo-400' : isDark ? 'text-indigo-400' : 'text-indigo-500'}`}>+{q.xpReward}</span>
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
            <button onClick={() => onNavigate('notes')} className={`text-[11px] font-medium flex items-center gap-1 ${
              isHinglish ? 'text-indigo-400 hover:text-indigo-500' : isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-500 hover:text-indigo-600'
            }`}>
              {t('viewAll', lang)} <ArrowRight size={11} />
            </button>
          </div>
          <div className="space-y-2">
            {notes.slice(0, 4).map(note => (
              <div key={note.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-all cursor-pointer group ${
                isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
              }`}>
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
              <div className={`text-4xl font-black bg-clip-text text-transparent ${
                isHinglish ? 'bg-gradient-to-r from-indigo-400 to-violet-400' : 'bg-gradient-to-r from-indigo-400 to-violet-400'
              }`}>
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
                      ? isHinglish ? 'bg-gradient-to-r from-indigo-400 to-violet-400' : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                      : isDark ? 'bg-white/[0.04]' : 'bg-slate-100'
                  }`}
                />
              ))}
            </div>
            <p className={`text-[10px] mt-1.5 text-center ${tm}`}>{stats.streak === 0 ? 7 : (stats.streak % 7 === 0 ? 0 : 7 - (stats.streak % 7))} {t('daysUntilBonus', lang)}</p>
          </div>

          {/* Weekly Boss */}
          <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-md ${
            isHinglish
              ? 'bg-gradient-to-br from-indigo-500/90 via-violet-600/90 to-indigo-600/90'
              : isDark
                ? 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800'
                : 'bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700'
          }`}>
            <div className="absolute top-2 right-3 text-5xl opacity-10">{isHinglish ? '👹' : '🔱'}</div>
            <div className="relative z-10">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{t('weeklyAsura', lang)}</p>
              <h4 className="text-base font-bold mt-1">{t('ravanaTitle', lang)}</h4>
              <p className="text-[11px] mt-1 text-white/50">{t('ravanaDesc', lang)}</p>
              <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${
                  isHinglish ? 'bg-gradient-to-r from-indigo-300 to-violet-300' : 'bg-gradient-to-r from-indigo-400 to-violet-400'
                }`} style={{ width: `${Math.min(100,  (completedThisWeek / weeklyQuestTarget) * 100)}%` }} />
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
