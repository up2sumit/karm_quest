import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { Dashboard } from './components/Dashboard';
import { QuestBoard } from './components/QuestBoard';
import { NotesVault } from './components/NotesVault';
import { Achievements } from './components/Achievements';
import { Challenges } from './components/Challenges';
import { LevelUpOverlay, type LevelUpData } from './components/LevelUpOverlay';
import { t } from './i18n';
import type { Page, Quest, Note, UserStats, Achievement } from './store';
import { defaultQuests, defaultNotes, defaultAchievements, todayISO, yesterdayISO } from './store';
import type { AppNotification } from './notifications';
import { defaultNotifications, makeNotification } from './notifications';
import { useMinWidth } from './hooks/useMinWidth';
import { useAppPersistence } from './hooks/useAppPersistence';

// ── Particles ────────────────────────────────────────────────────────────────
// Geometry is computed once (stable). Palette changes with theme.
function Particles() {
  const { isDark, isHinglish } = useTheme();

  const geometry = useMemo(() =>
    [...Array(8)].map((_, i) => ({
      id:         i,
      leftPct:    Math.random() * 100,
      wPx:        Math.random() * 4 + 2,
      hPx:        Math.random() * 4 + 2,
      colorIdx:   Math.floor(Math.random() * 4),
      durS:       Math.random() * 20 + 15,
      delS:       Math.random() * 10,
    }))
  , []);

  const palette = useMemo(() =>
    isHinglish
      ? ['#F43F5E', '#A855F7', '#6366F1', '#8B5CF6']
      : isDark
        ? ['#6366F1', '#818CF8', '#A78BFA', '#4F46E5']
        : ['#6366F1', '#8B5CF6', '#A78BFA', '#C4B5FD']
  , [isDark, isHinglish]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {geometry.map(p => (
        <div key={p.id} className="particle" style={{
          left:              `${p.leftPct}%`,
          width:             `${p.wPx}px`,
          height:            `${p.hPx}px`,
          background:        palette[p.colorIdx],
          animationDuration: `${p.durS}s`,
          animationDelay:    `${p.delS}s`,
          opacity:           isDark ? 0.15 : 0.1,
        }} />
      ))}
    </div>
  );
}

function SubtlePattern() {
  const { isDark, isHinglish } = useTheme();
  const stroke = isHinglish ? '#A855F7' : '#6366F1';
  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 animate-mandala"
      style={{ opacity: isDark ? 0.015 : 0.02 }}>
      <svg width="800" height="800" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="none" stroke={stroke} strokeWidth="0.1" />
        <circle cx="50" cy="50" r="35" fill="none" stroke={stroke} strokeWidth="0.1" />
        <circle cx="50" cy="50" r="22" fill="none" stroke={stroke} strokeWidth="0.1" />
        {[...Array(12)].map((_, i) => (
          <line key={i} x1="50" y1="2" x2="50" y2="98" stroke={stroke} strokeWidth="0.05"
            transform={`rotate(${i * 30} 50 50)`} />
        ))}
      </svg>
    </div>
  );
}

function XPPopup({ xp, onDone }: { xp: number; onDone: () => void }) {
  const { isDark, isHinglish, lang } = useTheme();
  useEffect(() => { const timer = setTimeout(onDone, 2000); return () => clearTimeout(timer); }, [onDone]);
  return (
    <div className="fixed top-20 right-4 md:right-8 z-50 animate-slide-up">
      <div className={`px-5 py-2.5 rounded-xl flex items-center gap-2.5 shadow-xl ${
        isHinglish ? 'bg-gradient-to-r from-rose-500 to-violet-500 text-white'
        : isDark    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'
                    : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white'}`}>
        <span className="text-xl animate-coin-bounce inline-block">{isHinglish ? '🎉' : '🪔'}</span>
        <div>
          <p className="font-bold text-sm">+{xp} {t('xpGained', lang)}</p>
          <p className="text-[10px] text-white/50">{t('karmaQuestComplete', lang)}</p>
        </div>
        <span className="text-lg">{isHinglish ? '🤩' : '🙏'}</span>
      </div>
    </div>
  );
}

function AppContent() {
  const { isDark, isHinglish } = useTheme();

  // JS-driven breakpoints (prevents layout bugs even if devtools/resizes act weird)
  const isMdUp = useMinWidth(768);
  const isLgUp = useMinWidth(1024);

  const [currentPage,      setCurrentPage]      = useState<Page>('dashboard');
  const [mobileOpen,       setMobileOpen]       = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quests,           setQuests]           = useState<Quest[]>(defaultQuests);
  const [notes,            setNotes]            = useState<Note[]>(defaultNotes);
  const [achievements,     setAchievements]     = useState<Achievement[]>(defaultAchievements);
  const [xpPopup,          setXpPopup]          = useState<number | null>(null);
  const [notifications,    setNotifications]    = useState<AppNotification[]>(defaultNotifications);

  const [levelUpData,      setLevelUpData]      = useState<LevelUpData | null>(null);

  const defaultStats: UserStats = {
    level: 5,
    xp: 320,
    xpToNext: 500,
    totalXpEarned: 320,
    coins: 1250,
    streak: 0,
    lastActiveDate: '',
    lastDailyChallengeNotified: '',
    questsCompleted: 47,
    totalQuests: 63,
    avatarEmoji: '🧘',
    username: 'Yoddha',
  };

  const [stats, setStats] = useState<UserStats>(defaultStats);

  // ── Persistence (Feature 1) ─────────────────────────────────────────────
  // Stores quests, notes, stats, achievements and notifications.
  // Restore happens once on app load, then we save on every change.
  const { hydrated } = useAppPersistence<{
    quests: Quest[];
    notes: Note[];
    stats: UserStats;
    achievements: Achievement[];
    notifications: AppNotification[];
  }>({
    key: 'karmquest_state',
    version: '1.1.0',
    snapshot: { quests, notes, stats, achievements, notifications },
    restore: (s) => {
      // Defensive restores to survive old snapshots.
      if (Array.isArray(s.quests)) setQuests(s.quests);
      if (Array.isArray(s.notes)) setNotes(s.notes);
      if (Array.isArray(s.achievements)) setAchievements(s.achievements);
      if (Array.isArray(s.notifications)) setNotifications(s.notifications);

      if (s.stats && typeof s.stats === 'object') {
        const stAny = s.stats as Partial<UserStats> & Record<string, unknown>;
        const migrated: UserStats = {
          ...defaultStats,
          ...stAny,
          // Back-compat: old saves didn't have lifetime XP.
          totalXpEarned: typeof stAny.totalXpEarned === 'number'
            ? stAny.totalXpEarned
            : (typeof stAny.xp === 'number' ? stAny.xp : defaultStats.totalXpEarned),
          lastDailyChallengeNotified: typeof stAny.lastDailyChallengeNotified === 'string'
            ? stAny.lastDailyChallengeNotified
            : '',
        };
        setStats(migrated);
      }
    },
  });

  // Responsive layout metrics
  // - Mobile: 0
  // - md/tablet: slim rail (80px)
  // - lg+ desktop: full sidebar (256px) when expanded, rail when collapsed
  const sidebarOffsetPx = isMdUp ? ((sidebarCollapsed || !isLgUp) ? 80 : 256) : 0;
  const desktopSidebarExpanded = isMdUp && isLgUp && !sidebarCollapsed;

  // Close the mobile drawer automatically when entering md+ layouts
  useEffect(() => {
    if (isMdUp) setMobileOpen(false);
  }, [isMdUp]);

  // ── Boot checks (after hydration) ───────────────────────────────────────
  // 1) Streak validity check
  // 2) Daily challenge notification (Feature 4 event type)
  const bootCheckedRef = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (bootCheckedRef.current) return;
    bootCheckedRef.current = true;

    // 1) Streak validity
    if (stats.lastActiveDate) {
      const today     = todayISO();
      const yesterday = yesterdayISO();
      if (stats.lastActiveDate !== today && stats.lastActiveDate !== yesterday) {
        if (stats.streak > 0) {
          addNotification(makeNotification(
            'streak',
            'Tapasya Streak Broken 💔',
            `Your ${stats.streak}-day streak ended. Complete a quest today to start fresh!`,
          ));
        }
        setStats(prev => ({ ...prev, streak: 0 }));
      }
    }

    // 2) Daily challenges available (once per day)
    const today = todayISO();
    if (stats.lastDailyChallengeNotified !== today) {
      addNotification(makeNotification(
        'daily_challenge',
        'Daily Challenges Available! ⚡',
        'New daily missions are ready. Earn bonus Mudras by completing them today!',
      ));
      setStats(prev => ({ ...prev, lastDailyChallengeNotified: today }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const addNotification = useCallback((n: AppNotification) => {
    setNotifications(prev => [n, ...prev].slice(0, 50));
  }, []);
  const markRead    = useCallback((id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)), []);
  const markAllRead = useCallback(() => setNotifications(prev => prev.map(n => ({ ...n, read: true }))), []);
  const clearAll    = useCallback(() => setNotifications([]), []);

  const handleNavigate = useCallback((page: Page) => { setCurrentPage(page); setMobileOpen(false); }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    // Only lock scroll when the *mobile drawer* is open.
    // On md+ we don't use the drawer.
    if (isMdUp) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen, isMdUp]);

  const handleCompleteQuest = useCallback((id: string) => {
    const quest = quests.find(q => q.id === id);
    if (!quest || quest.status === 'completed') return;

    // 1) Mark quest completed
    setQuests(prev => prev.map(q => q.id === id ? { ...q, status: 'completed' as const } : q));

    // 2) Compute next stats (pure calc based on current stats)
    const today     = todayISO();
    const yesterday = yesterdayISO();

    let newStreak         = stats.streak;
    let newLastActiveDate = stats.lastActiveDate;

    if (stats.lastActiveDate !== today) {
      if (stats.lastActiveDate === yesterday) newStreak = stats.streak + 1;
      else newStreak = 1;
      newLastActiveDate = today;
    }

    let newXp       = stats.xp + quest.xpReward;
    const newTotalXp = (stats.totalXpEarned ?? stats.xp) + quest.xpReward;
    let newLevel    = stats.level;
    let newXpToNext = stats.xpToNext;
    let didLevelUp  = false;
    while (newXp >= newXpToNext) {
      newXp -= newXpToNext;
      newLevel++;
      newXpToNext = Math.round(newXpToNext * 1.2);
      didLevelUp = true;
    }

    const nextStats: UserStats = {
      ...stats,
      xp: newXp,
      xpToNext: newXpToNext,
      level: newLevel,
      totalXpEarned: newTotalXp,
      coins: stats.coins + quest.xpReward * 2,
      questsCompleted: stats.questsCompleted + 1,
      streak: newStreak,
      lastActiveDate: newLastActiveDate,
    };
    setStats(nextStats);

    // 3) Notifications (Feature 4)
    addNotification(makeNotification('quest_complete', 'Quest Complete! ✅', `"${quest.title}" vanquished. +${quest.xpReward} Punya earned.`));

    const milestones = [3, 7, 14, 30, 100];
    if (newStreak !== stats.streak && milestones.includes(newStreak)) {
      addNotification(makeNotification(
        'streak',
        `${newStreak}-Day Tapasya Streak! 🔥`,
        `${newStreak} days of unbroken practice. You are a true Yoddha!`,
      ));
    }

    if (didLevelUp) {
      addNotification(makeNotification('level_up', `Level ${newLevel} Achieved! 🚀`, `Chakra ascended to Level ${newLevel}. New power unlocked!`));
    }

    // 4) Achievements unlocked on this action
    const unlockedNow: Achievement[] = [];
    const nextAchievements = achievements.map(a => {
      if (a.unlocked || newTotalXp < a.xpRequired) return a;
      const unlocked = { ...a, unlocked: true };
      unlockedNow.push(unlocked);
      addNotification(makeNotification('achievement', `${a.icon} ${a.title} Unlocked!`, a.description));
      return unlocked;
    });
    setAchievements(nextAchievements);

    // 5) Feature 3: Full-screen level-up celebration
    if (didLevelUp) {
      setLevelUpData({
        newLevel,
        xpEarned: quest.xpReward,
        coinsEarned: quest.xpReward * 2,
        unlockedAchievements: unlockedNow,
      });
    }

    // XP toast
    setXpPopup(quest.xpReward);
  }, [quests, stats, achievements, addNotification]);

  const handleAddQuest   = useCallback((quest: Omit<Quest, 'id' | 'status'>) => setQuests(prev => [{ ...quest, id: Date.now().toString(), status: 'active' }, ...prev]), []);
  const handleAddNote    = useCallback((note: Omit<Note, 'id' | 'createdAt'>) => setNotes(prev => [{ ...note, id: Date.now().toString(), createdAt: 'Just now' }, ...prev]), []);
  const handleDeleteNote = useCallback((id: string) => setNotes(prev => prev.filter(n => n.id !== id)), []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':    return <Dashboard stats={stats} quests={quests} notes={notes} achievements={achievements} onNavigate={handleNavigate} />;
      case 'quests':       return <QuestBoard quests={quests} onComplete={handleCompleteQuest} onAdd={handleAddQuest} />;
      case 'notes':        return <NotesVault notes={notes} onAdd={handleAddNote} onDelete={handleDeleteNote} />;
      case 'achievements': return <Achievements achievements={achievements} stats={stats} />;
      case 'challenges':   return <Challenges stats={stats} />;
      default:             return <Dashboard stats={stats} quests={quests} notes={notes} achievements={achievements} onNavigate={handleNavigate} />;
    }
  };

  const bgGradient = isHinglish
    ? 'bg-gradient-to-br from-[#FDF2F8] via-[#FAF5FF] to-[#F0F4FF]'
    : isDark
      ? 'bg-gradient-to-br from-[#0D0D1A] via-[#111122] to-[#0D0D1A]'
      : 'bg-gradient-to-br from-[#F7F8FC] via-[#F0F2F8] to-[#F5F3FF]';

  return (
    <div className={`min-h-screen relative transition-colors duration-700 overflow-x-hidden ${bgGradient}`}>
      <SubtlePattern />
      <Particles />

      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(p => !p)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        isDesktop={isMdUp}
        desktopWidthPx={sidebarOffsetPx}
        desktopExpanded={desktopSidebarExpanded}
        desktopCanExpand={isMdUp && isLgUp}
      />

      <TopNav
        stats={stats}
        sidebarOffsetPx={sidebarOffsetPx}
        onMobileMenuOpen={() => setMobileOpen(true)}
        notifications={notifications}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onClearAll={clearAll}
      />

      <main
        className="relative z-10 transition-all duration-300 pt-16 md:pt-20 pb-24 md:pb-8 px-4 md:px-6"
        style={{ marginLeft: sidebarOffsetPx }}
      >
        {renderPage()}
      </main>

      {xpPopup !== null && <XPPopup xp={xpPopup} onDone={() => setXpPopup(null)} />}

      {levelUpData && (
        <LevelUpOverlay
          data={levelUpData}
          onClose={() => setLevelUpData(null)}
        />
      )}
    </div>
  );
}

export function App() {
  return <ThemeProvider><AppContent /></ThemeProvider>;
}
