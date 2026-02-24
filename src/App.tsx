import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ThemeProvider, useTheme, type ThemeMode } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthGate } from './components/AuthGate';
import { OfflineSyncBootstrap } from './components/OfflineSyncBootstrap';
import { useSupabaseProfile } from './hooks/useSupabaseProfile';
import { useSupabaseUserState } from './hooks/useSupabaseUserState';
import { useSupabaseTasksSync } from './hooks/useSupabaseTasksSync';
import { useSupabaseInAppNotifications } from './hooks/useSupabaseInAppNotifications';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { Dashboard } from './components/Dashboard';
import { QuestBoard } from './components/QuestBoard';
import { NotesVault } from './components/NotesVault';
import { Achievements } from './components/Achievements';
import { Challenges } from './components/Challenges';
import { MudraShop } from './components/MudraShop';
import { ProfilePage } from './components/ProfilePage';
import { LevelUpOverlay, type LevelUpData } from './components/LevelUpOverlay';
import { t } from './i18n';
import type { Page, Quest, Note, UserStats, Achievement, Recurrence, SubTask, FocusSession } from './store';
import { defaultQuests, defaultNotes, defaultAchievements, todayISO, yesterdayISO } from './store';
import type { AppNotification } from './notifications';
import { defaultNotifications, makeNotification } from './notifications';
import { useMinWidth } from './hooks/useMinWidth';
import { useAppPersistence } from './hooks/useAppPersistence';
import {
  defaultShopState,
  shopCatalog,
  type ShopState,
  type AvatarFrameId,
  type SidebarSkinId,
  isBoostActive,
  type XpBoost,
} from './shop';
import { weekEndFromWeekStart, weekStartFromISO, weekStartISO } from './utils/recurrence';
import { sfx } from './sfx/sfx';
import { questTemplates, type QuestTemplateId } from './templates/questTemplates';
import { SupabaseTest } from "./components/SupabaseTest";

// ── Particles ────────────────────────────────────────────────────────────────
// Geometry is computed once (stable). Palette changes with theme.
function Particles() {
  const { isDark, isHinglish } = useTheme();

  const geometry = useMemo(
    () =>
      [...Array(8)].map((_, i) => ({
        id: i,
        leftPct: Math.random() * 100,
        wPx: Math.random() * 4 + 2,
        hPx: Math.random() * 4 + 2,
        colorIdx: Math.floor(Math.random() * 4),
        durS: Math.random() * 20 + 15,
        delS: Math.random() * 10,
      })),
    []
  );

  const palette = useMemo(
    () =>
      isHinglish
        ? ['#F43F5E', '#A855F7', '#6366F1', '#8B5CF6']
        : isDark
          ? ['#6366F1', '#818CF8', '#A78BFA', '#4F46E5']
          : ['#6366F1', '#8B5CF6', '#A78BFA', '#C4B5FD'],
    [isDark, isHinglish]
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {geometry.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.leftPct}%`,
            width: `${p.wPx}px`,
            height: `${p.hPx}px`,
            background: palette[p.colorIdx],
            animationDuration: `${p.durS}s`,
            animationDelay: `${p.delS}s`,
            opacity: isDark ? 0.15 : 0.1,
          }}
        />
      ))}
    </div>
  );
}

function SubtlePattern() {
  const { isDark, isHinglish } = useTheme();
  const stroke = isHinglish ? '#A855F7' : '#6366F1';
  return (
    <div
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 animate-mandala"
      style={{ opacity: isDark ? 0.015 : 0.02 }}
    >
      <svg width="800" height="800" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="none" stroke={stroke} strokeWidth="0.1" />
        <circle cx="50" cy="50" r="35" fill="none" stroke={stroke} strokeWidth="0.1" />
        <circle cx="50" cy="50" r="22" fill="none" stroke={stroke} strokeWidth="0.1" />
        {[...Array(12)].map((_, i) => (
          <line
            key={i}
            x1="50"
            y1="2"
            x2="50"
            y2="98"
            stroke={stroke}
            strokeWidth="0.05"
            transform={`rotate(${i * 30} 50 50)`}
          />
        ))}
      </svg>
    </div>
  );
}

function XPPopup({ xp, kind, onDone }: { xp: number; kind: 'quest' | 'focus'; onDone: () => void }) {
  const { isDark, isHinglish, lang } = useTheme();
  useEffect(() => {
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  const isFocus = kind === 'focus';
  const subtitle = isFocus ? t('focusCompleteMsg', lang) : t('karmaQuestComplete', lang);

  return (
    <div className="fixed top-20 right-4 md:right-8 z-50 animate-slide-up">
      <div
        className={`px-5 py-2.5 rounded-xl flex items-center gap-2.5 shadow-xl ${
          isHinglish
            ? 'bg-gradient-to-r from-rose-500 to-violet-500 text-white'
            : isDark
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'
              : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white'
        }`}
      >
        <span className="text-xl animate-coin-bounce inline-block">{isFocus ? '⏱️' : (isHinglish ? '🎉' : '🪔')}</span>
        <div>
          <p className="font-bold text-sm">{isFocus ? t('focusCompleteTitle', lang) : `+${xp} ${t('xpGained', lang)}`}</p>
          <p className="text-[10px] text-white/60">{subtitle}</p>
        </div>
        <span className="text-lg">{isFocus ? '🌿' : (isHinglish ? '🤩' : '🙏')}</span>
      </div>
    </div>
  );
}

function resetSubtasks(subtasks: SubTask[] | undefined): SubTask[] {
  if (!Array.isArray(subtasks)) return [];
  return subtasks.map(s => ({ ...s, done: false }));
}

function normalizeRecurrence(r: unknown): Recurrence {
  return r === 'daily' || r === 'weekly' ? r : 'none';
}

function normalizeBoost(b: unknown): XpBoost | null {
  if (!b || typeof b !== 'object') return null;
  const any = b as Record<string, unknown>;
  const multiplier = typeof any.multiplier === 'number' ? any.multiplier : 0;
  const expiresAt = typeof any.expiresAt === 'number' ? any.expiresAt : 0;
  if (!multiplier || !expiresAt) return null;
  return { multiplier, expiresAt };
}

function applyRecurringResets(list: Quest[]): Quest[] {
  const today = todayISO();
  const currentWeek = weekStartISO();

  return list.map((q) => {
    const recurring = normalizeRecurrence(q.recurring);
    if (recurring === 'none') return q;
    if (q.status !== 'completed') return q;

    const completedAt = (q.completedAt || '').trim();

    if (recurring === 'daily') {
      // Completed before today -> reactivate
      if (completedAt && completedAt !== today) {
        return {
          ...q,
          status: 'active',
          completedAt: '',
          dueDate: today,
          subtasks: resetSubtasks(q.subtasks),
        };
      }
      return q;
    }

    // weekly
    const doneWeek = weekStartFromISO(completedAt);
    if (!doneWeek) return q;
    if (doneWeek !== currentWeek) {
      return {
        ...q,
        status: 'active',
        completedAt: '',
        dueDate: weekEndFromWeekStart(currentWeek) || q.dueDate,
        subtasks: resetSubtasks(q.subtasks),
      };
    }

    return q;
  });
}

function AppContent() {
  const { isDark, isHinglish, lang, theme, setTheme } = useTheme();
  // Prevent cloud profile from overriding theme after the user changes it.
  const themeHydratedRef = useRef<string | null>(null);
  const themeUserOverrideRef = useRef(false);
  const { user, loading: authLoading, signOut } = useAuth();
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    if (user) setGuestMode(false);
  }, [user]);

  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;

  useEffect(() => {
    themeHydratedRef.current = null;
    themeUserOverrideRef.current = false;
  }, [userId]);

  // JS-driven breakpoints
  const isMdUp = useMinWidth(768);
  const isLgUp = useMinWidth(1024);

  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [focusQuestId, setFocusQuestId] = useState<string | null>(null);
  const [focusNoteId, setFocusNoteId] = useState<string | null>(null);
  const [focusSession, setFocusSession] = useState<FocusSession | null>(null);
  const [focusNow, setFocusNow] = useState(() => Date.now());

  const [quests, setQuests] = useState<Quest[]>(defaultQuests);
  const [notes, setNotes] = useState<Note[]>(defaultNotes);
  const [achievements, setAchievements] = useState<Achievement[]>(defaultAchievements);
  const [xpPopup, setXpPopup] = useState<{ xp: number; kind: 'quest' | 'focus' } | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>(defaultNotifications);
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null);

  const defaultStats: UserStats = {
    level: 5,
    xp: 320,
    xpToNext: 500,
    totalXpEarned: 320,
    coins: 1250,
    streak: 0,
    streakRecord: 12,
    lastActiveDate: '',
    lastDailyChallengeNotified: '',
    questsCompleted: 47,
    totalQuests: 63,
    avatarEmoji: '🧘',
    username: 'Yoddha',
  };

  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [shop, setShop] = useState<ShopState>(defaultShopState);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);

  // ── Challenges state (progress + claimed rewards) ──────────────────────
type ChallengeState = {
  dailyKey: string;    // YYYY-MM-DD
  weeklyKey: string;   // weekStartISO()
  dailyNotes: number;
  dailyFocus: number;
  weeklyNotes: number;
  weeklyXp: number;
  claimed: Record<string, boolean>;
};

const DAILY_CHALLENGE_IDS = useMemo(() => new Set(['1', '2', '3', '4']), []);
const WEEKLY_CHALLENGE_IDS = useMemo(() => new Set(['5', '6', '7']), []);

const defaultChallengeState: ChallengeState = useMemo(() => ({
  dailyKey: todayISO(),
  weeklyKey: weekStartISO(),
  dailyNotes: 0,
  dailyFocus: 0,
  weeklyNotes: 0,
  weeklyXp: 0,
  claimed: {},
}), []);

const [challengeState, setChallengeState] = useState<ChallengeState>(defaultChallengeState);

const stripClaimed = useCallback((claimed: Record<string, boolean>, ids: Set<string>) => {
  const next = { ...(claimed || {}) };
  ids.forEach((id) => { delete next[id]; });
  return next;
}, []);


  // Focus Timer (Pomodoro)
  const FOCUS_DURATION_MS = 25 * 60 * 1000;
  const FOCUS_BONUS_XP = 5;

  // ── Persistence ─────────────────────────────────────────────────────────
  type PersistedSnapshot = {
    quests: Quest[];
    notes: Note[];
    stats: UserStats;
    achievements: Achievement[];
    notifications: AppNotification[];
    shop: ShopState;
    focusSession: FocusSession | null;
    sfxEnabled: boolean;
    challengeState: ChallengeState;
  };

  const persistVersion = '1.3.0';
  const persistKey = userId ? `karmquest_state:${userId}` : guestMode ? 'karmquest_state:guest' : 'karmquest_state:anon';

  const persistSnapshot: PersistedSnapshot = {
    quests,
    notes,
    stats,
    achievements,
    notifications,
    shop,
    focusSession,
    sfxEnabled,
    challengeState,
  };

  const restoreSnapshot = useCallback((s: PersistedSnapshot) => {
    if (Array.isArray(s.quests)) {
      setQuests(
        s.quests.map((q) => {
          const recurring = normalizeRecurrence((q as any).recurring);
          const status = (q as any).status === 'completed' ? 'completed' : 'active';
          const completedAt = typeof (q as any).completedAt === 'string' ? (q as any).completedAt : '';
          const subtasksRaw = (q as any).subtasks;
          const subtasks: SubTask[] = Array.isArray(subtasksRaw)
            ? subtasksRaw
                .filter(Boolean)
                .map((st: any, idx: number) => ({
                  id: typeof st.id === 'string' ? st.id : `${String((q as any).id || 'q')}-${idx}`,
                  text: String(st.text || ''),
                  done: !!st.done,
                }))
            : [];
          const badge = typeof (q as any).badge === 'string' ? (q as any).badge : 'none';
    
          // If a recurring quest is marked completed but has no completedAt, assume it was completed today
          const safeCompletedAt = status === 'completed' && recurring !== 'none' && !completedAt ? todayISO() : completedAt;
    
          return {
            ...q,
            recurring,
            completedAt: safeCompletedAt,
            subtasks,
            badge,
            status,
          } as Quest;
        })
      );
    }
    
    if (Array.isArray(s.notes)) setNotes(s.notes);
    if (Array.isArray(s.achievements)) setAchievements(s.achievements);
    if (Array.isArray(s.notifications)) setNotifications(s.notifications);
    
    if (typeof (s as any).sfxEnabled === 'boolean') setSfxEnabled((s as any).sfxEnabled);
    
    // Challenges state migration
    const csAny = (s as any).challengeState;
    if (csAny && typeof csAny === 'object') {
    const any = csAny as any;
    const dailyKey = typeof any.dailyKey === 'string' ? any.dailyKey : todayISO();
    const weeklyKey = typeof any.weeklyKey === 'string' ? any.weeklyKey : weekStartISO();
    setChallengeState({
    dailyKey,
    weeklyKey,
    dailyNotes: typeof any.dailyNotes === 'number' ? any.dailyNotes : 0,
    dailyFocus: typeof any.dailyFocus === 'number' ? any.dailyFocus : 0,
    weeklyNotes: typeof any.weeklyNotes === 'number' ? any.weeklyNotes : 0,
    weeklyXp: typeof any.weeklyXp === 'number' ? any.weeklyXp : 0,
    claimed: (any.claimed && typeof any.claimed === 'object') ? any.claimed : {},
    });
    } else {
    setChallengeState(defaultChallengeState);
    }
    
    if (s.stats && typeof s.stats === 'object') {
      const stAny = s.stats as Partial<UserStats> & Record<string, unknown>;
      const migrated: UserStats = {
        ...defaultStats,
        ...stAny,
        totalXpEarned:
          typeof stAny.totalXpEarned === 'number'
            ? stAny.totalXpEarned
            : typeof stAny.xp === 'number'
              ? stAny.xp
              : defaultStats.totalXpEarned,
        streakRecord: typeof (stAny as any).streakRecord === 'number'
          ? (stAny as any).streakRecord
          : (typeof stAny.streak === 'number' ? stAny.streak : defaultStats.streakRecord),
        lastDailyChallengeNotified: typeof stAny.lastDailyChallengeNotified === 'string' ? stAny.lastDailyChallengeNotified : '',
      };
      setStats(migrated);
    }
    
    // Shop migration
    if (s.shop && typeof s.shop === 'object') {
      const any = s.shop as any;
      const ownedFrames = Array.isArray(any.ownedFrames) ? any.ownedFrames : defaultShopState.ownedFrames;
      const ownedSkins = Array.isArray(any.ownedSkins) ? any.ownedSkins : defaultShopState.ownedSkins;
      const ownedBadges = Array.isArray(any.ownedBadges) ? any.ownedBadges : defaultShopState.ownedBadges;
      const equippedFrame = typeof any.equippedFrame === 'string' ? any.equippedFrame : defaultShopState.equippedFrame;
      const equippedSkin = typeof any.equippedSkin === 'string' ? any.equippedSkin : defaultShopState.equippedSkin;
      const activeBoost = normalizeBoost(any.activeBoost);
    
      setShop({
        ownedFrames: ownedFrames.length ? ownedFrames : defaultShopState.ownedFrames,
        equippedFrame: ownedFrames.includes(equippedFrame) ? equippedFrame : (ownedFrames[0] || 'none'),
        ownedSkins: ownedSkins.length ? ownedSkins : defaultShopState.ownedSkins,
        equippedSkin: ownedSkins.includes(equippedSkin) ? equippedSkin : (ownedSkins[0] || 'default'),
        ownedBadges: ownedBadges.length ? ownedBadges : defaultShopState.ownedBadges,
        activeBoost,
      });
    }
    
    
    // Focus session migration
    const fsAny = (s as any).focusSession;
    if (fsAny && typeof fsAny === 'object') {
      const questId = typeof fsAny.questId === 'string' ? fsAny.questId : '';
      const startedAt = typeof fsAny.startedAt === 'number' ? fsAny.startedAt : 0;
      const endsAt = typeof fsAny.endsAt === 'number' ? fsAny.endsAt : 0;
      const durationMs = typeof fsAny.durationMs === 'number' ? fsAny.durationMs : 25 * 60 * 1000;
      const bonusXp = typeof fsAny.bonusXp === 'number' ? fsAny.bonusXp : 5;
      const awarded = !!fsAny.awarded;
      if (questId && endsAt) {
        setFocusSession({ questId, startedAt, endsAt, durationMs, bonusXp, awarded });
      } else {
        setFocusSession(null);
      }
    } else {
      setFocusSession(null);
    }
  }, [defaultChallengeState, stripClaimed, DAILY_CHALLENGE_IDS, WEEKLY_CHALLENGE_IDS]);

  const { hydrated } = useAppPersistence<PersistedSnapshot>({
    key: persistKey,
    version: persistVersion,
    snapshot: persistSnapshot,
    restore: restoreSnapshot,
  });

  const cloud = useSupabaseUserState<PersistedSnapshot>({
    enabled: !!userId && hydrated,
    userId,
    appKey: 'karmquest',
    version: persistVersion,
    snapshot: persistSnapshot,
    restore: restoreSnapshot,
  });

  const tasksCloud = useSupabaseTasksSync({
    enabled: !!userId && hydrated,
    userId,
    quests,
    debounceMs: 800,
  });

  // Phase 7: In-app notifications (Reminders)
  // - The DB cron job inserts rows into `in_app_notifications` when reminders are due.
  // - We subscribe here and push them into the existing Notifications UI.
  const inbox = useSupabaseInAppNotifications({
    enabled: !!userId && hydrated,
    userId,
    limit: 50,
    onNew: (row) => {
      setNotifications((prev) => {
        const n: AppNotification = {
          id: row.id,
          type: 'reminder',
          title: row.title,
          message: row.message,
          timestamp: row.created_at || new Date().toISOString(),
          read: !!row.read,
          icon: '⏰',
        };
        const seen = new Set<string>();
        const merged = [n, ...prev].filter((x) => {
          if (seen.has(x.id)) return false;
          seen.add(x.id);
          return true;
        });
        return merged.slice(0, 50);
      });
    },
  });

  // Merge already-existing cloud notifications (when the user opens the app)
  useEffect(() => {
    if (!inbox.items || inbox.items.length === 0) return;
    setNotifications((prev) => {
      const mapped: AppNotification[] = inbox.items.map((row) => ({
        id: row.id,
        type: 'reminder',
        title: row.title,
        message: row.message,
        timestamp: row.created_at || new Date().toISOString(),
        read: !!row.read,
        icon: '⏰',
      }));
      const seen = new Set<string>();
      const merged = [...mapped, ...prev].filter((x) => {
        if (seen.has(x.id)) return false;
        seen.add(x.id);
        return true;
      });
      return merged.slice(0, 50);
    });
  }, [inbox.items]);

  const { profile: cloudProfile, updateProfile: updateCloudProfile } = useSupabaseProfile(userId, userEmail);

  useEffect(() => {
    if (!userId) return;
    if (!cloudProfile) return;

    setStats((prev) => ({
      ...prev,
      username: cloudProfile.username ?? prev.username,
      avatarEmoji: cloudProfile.avatar_emoji ?? prev.avatarEmoji,
    }));

    // Apply theme from cloud only once per login (and don't override after user changes theme).
    if (!themeUserOverrideRef.current && themeHydratedRef.current !== userId) {
      const mode = cloudProfile.theme_mode as ThemeMode | null | undefined;
      if (mode && mode !== theme) setTheme(mode);
      themeHydratedRef.current = userId;
    }
  }, [cloudProfile, setTheme, theme, userId]);

  const onCloudSaveProfile = useCallback(
    async (username: string, avatarEmoji: string) => {
      if (!userId) return;
      await updateCloudProfile({ username, avatar_emoji: avatarEmoji, theme_mode: theme });
    },
    [theme, updateCloudProfile, userId]
  );

  const onThemeChange = useCallback(
    async (mode: ThemeMode) => {
      themeUserOverrideRef.current = true;
      setTheme(mode);

      if (!userId) return;
      try {
        await updateCloudProfile({ theme_mode: mode });
      } catch (e) {
        console.warn('[KarmQuest] Failed to persist theme_mode to cloud', e);
      }
    },
    [setTheme, updateCloudProfile, userId]
  );


  // Responsive layout metrics
  const sidebarOffsetPx = isMdUp ? ((sidebarCollapsed || !isLgUp) ? 80 : 256) : 0;
  const desktopSidebarExpanded = isMdUp && isLgUp && !sidebarCollapsed;

  useEffect(() => {
    if (isMdUp) setMobileOpen(false);
  }, [isMdUp]);

  // ── Boot checks after hydration ─────────────────────────────────────────
  const bootCheckedRef = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (bootCheckedRef.current) return;
    bootCheckedRef.current = true;

    // Streak validity
    if (stats.lastActiveDate) {
      const today = todayISO();
      const yesterday = yesterdayISO();
      if (stats.lastActiveDate !== today && stats.lastActiveDate !== yesterday) {
        if (stats.streak > 0) {
          addNotification(
            makeNotification(
              'streak',
              'Tapasya Streak Broken 💔',
              `Your ${stats.streak}-day streak ended. Complete a quest today to start fresh!`
            )
          );
        }
        setStats((prev) => ({ ...prev, streak: 0 }));
      }
    }

// Sync challenge reset keys (in case app was closed during reset)
setChallengeState((prev) => {
  const today = todayISO();
  const weekKey = weekStartISO();
  let next = prev || defaultChallengeState;
  let changed = false;

  if (!next || typeof next !== 'object') {
    next = defaultChallengeState;
    changed = true;
  }

  if (next.dailyKey !== today) {
    next = {
      ...next,
      dailyKey: today,
      dailyNotes: 0,
      dailyFocus: 0,
      claimed: stripClaimed(next.claimed, DAILY_CHALLENGE_IDS),
    };
    changed = true;
  }
  if (next.weeklyKey !== weekKey) {
    next = {
      ...next,
      weeklyKey: weekKey,
      weeklyNotes: 0,
      weeklyXp: 0,
      claimed: stripClaimed(next.claimed, WEEKLY_CHALLENGE_IDS),
    };
    changed = true;
  }

  return changed ? next : prev;
});

    // Daily challenges available (once per day)
    const today = todayISO();
    if (stats.lastDailyChallengeNotified !== today) {
      addNotification(
        makeNotification(
          'daily_challenge',
          'Daily Challenges Available! ⚡',
          'New daily missions are ready. Earn bonus Mudras by completing them today!'
        )
      );
      setStats((prev) => ({ ...prev, lastDailyChallengeNotified: today }));
    }

    // Recurring reset (in case the app was closed during midnight)
    setQuests((prev) => applyRecurringResets(prev));

    // Expired boost cleanup
    if (shop.activeBoost && !isBoostActive(shop.activeBoost)) {
      setShop((prev) => ({ ...prev, activeBoost: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);


  // ── Focus timer tick (only when a session is active)
  useEffect(() => {
    if (!focusSession) return;
    const tmr = window.setInterval(() => setFocusNow(Date.now()), 1000);
    return () => window.clearInterval(tmr);
  }, [focusSession?.questId, focusSession?.endsAt]);

  // Stop focus if the quest disappears or gets completed
  useEffect(() => {
    if (!focusSession) return;
    const q = quests.find((x) => x.id === focusSession.questId);
    if (!q || q.status === 'completed') setFocusSession(null);
  }, [quests, focusSession]);

  // Midnight scheduler for recurring quests
  useEffect(() => {
    if (!hydrated) return;
    let timer: number | null = null;

    const schedule = () => {
      const now = new Date();
      // a few seconds after midnight to avoid edge-case drift
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
      const ms = Math.max(1000, next.getTime() - now.getTime());
      timer = window.setTimeout(() => {
        setQuests((prev) => applyRecurringResets(prev));
        // Reset daily/weekly challenge counters & claim status
        setChallengeState((prev) => {
          const today = todayISO();
          const weekKey = weekStartISO();
          let next = prev || defaultChallengeState;

          if (next.dailyKey !== today) {
            next = {
              ...next,
              dailyKey: today,
              dailyNotes: 0,
              dailyFocus: 0,
              claimed: stripClaimed(next.claimed, DAILY_CHALLENGE_IDS),
            };
          }
          if (next.weeklyKey !== weekKey) {
            next = {
              ...next,
              weeklyKey: weekKey,
              weeklyNotes: 0,
              weeklyXp: 0,
              claimed: stripClaimed(next.claimed, WEEKLY_CHALLENGE_IDS),
            };
          }

          return next;
        });
        schedule();
      }, ms);
    };

    schedule();
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [hydrated]);

  const addNotification = useCallback((n: AppNotification) => {
    setNotifications((prev) => [n, ...prev].slice(0, 50));
  }, []);
  const markRead = useCallback(
    (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      // Best-effort cloud update (only affects rows that exist in in_app_notifications)
      void inbox.markRead(id);
    },
    [inbox]
  );
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    void inbox.markAllRead();
  }, [inbox]);
  const clearAll = useCallback(() => {
    setNotifications([]);
    void inbox.clearAll();
  }, [inbox]);

  const handleNavigate = useCallback((page: Page) => {
    setCurrentPage(page);
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    if (isMdUp) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen, isMdUp]);

  const handleUpdateQuest = useCallback((id: string, patch: Partial<Omit<Quest, 'id'>>) => {
    setQuests((prev) => prev.map((q) => (q.id === id ? ({ ...q, ...patch } as Quest) : q)));
  }, []);

  const handleCompleteQuest = useCallback(
    (id: string) => {
      const quest = quests.find((q) => q.id === id);
      if (!quest || quest.status === 'completed') return;

      // Checklist rule: completion requires all subtasks checked
      if (Array.isArray(quest.subtasks) && quest.subtasks.length > 0) {
        const allDone = quest.subtasks.every((s) => !!s.done);
        if (!allDone) {
          addNotification(
            makeNotification(
              'quest_complete',
              'Checklist Incomplete 🧩',
              `Finish all sub-tasks for "${quest.title}" before completing.`
            )
          );
          return;
        }
      }

      // XP boost
      let multiplier = 1;
      if (shop.activeBoost) {
        if (isBoostActive(shop.activeBoost)) multiplier = shop.activeBoost.multiplier;
        else setShop((prev) => ({ ...prev, activeBoost: null }));
      }
      const xpEarned = Math.round(quest.xpReward * multiplier);
      const coinsEarned = quest.xpReward * 2;

      // Mark quest completed
      const doneDate = todayISO();
      setQuests((prev) =>
        prev.map((q) =>
          q.id === id
            ? ({
                ...q,
                status: 'completed' as const,
                completedAt: doneDate,
              } as Quest)
            : q
        )
      );

      // Streak calc
      const today = doneDate;
      const yesterday = yesterdayISO();
      let newStreak = stats.streak;
      let newLastActiveDate = stats.lastActiveDate;

      if (stats.lastActiveDate !== today) {
        if (stats.lastActiveDate === yesterday) newStreak = stats.streak + 1;
        else newStreak = 1;
        newLastActiveDate = today;
      }

      const nextStreakRecord = Math.max(stats.streakRecord || 0, newStreak);

      // XP / level calc (supports multi-level jumps)
      let newXp = stats.xp + xpEarned;
      const newTotalXp = (stats.totalXpEarned ?? stats.xp) + xpEarned;
      let newLevel = stats.level;
      let newXpToNext = stats.xpToNext;
      let didLevelUp = false;
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
        coins: stats.coins + coinsEarned,
        questsCompleted: stats.questsCompleted + 1,
        streak: newStreak,
        streakRecord: nextStreakRecord,
        lastActiveDate: newLastActiveDate,
      };
      setStats(nextStats);

      // Challenges: track weekly XP earned (used for Divya Grind)
      setChallengeState((prev) => ({ ...prev, weeklyXp: (prev.weeklyXp || 0) + xpEarned }));

      // SFX: coin on XP gain
      sfx.play('coin', sfxEnabled);

      // Notifications
      const boostText = multiplier > 1 ? ` (⚡ ${multiplier}× boost!)` : '';
      addNotification(
        makeNotification(
          'quest_complete',
          'Quest Complete! ✅',
          `"${quest.title}" vanquished. +${xpEarned} Punya earned${boostText}.`
        )
      );

      const milestones = [3, 7, 14, 30, 100];
      if (newStreak !== stats.streak && milestones.includes(newStreak)) {
        addNotification(
          makeNotification('streak', `${newStreak}-Day Tapasya Streak! 🔥`, `${newStreak} days of unbroken practice. You are a true Yoddha!`)
        );
      }

      if (didLevelUp) {
        addNotification(
          makeNotification('level_up', `Level ${newLevel} Achieved! 🚀`, `Chakra ascended to Level ${newLevel}. New power unlocked!`)
        );
        // SFX: chime on level up
        sfx.play('levelUp', sfxEnabled);
      }

      // Achievements unlocked on this action
      const unlockedNow: Achievement[] = [];
      const nextAchievements = achievements.map((a) => {
        if (a.unlocked || newTotalXp < a.xpRequired) return a;
        const unlocked = { ...a, unlocked: true };
        unlockedNow.push(unlocked);
        addNotification(makeNotification('achievement', `${a.icon} ${a.title} Unlocked!`, a.description));
        return unlocked;
      });
      setAchievements(nextAchievements);
      if (unlockedNow.length > 0) {
        // SFX: temple bell on achievement unlock
        sfx.play('achievement', sfxEnabled);
      }

      // Level-up celebration
      if (didLevelUp) {
        setLevelUpData({
          newLevel,
          xpEarned,
          coinsEarned,
          unlockedAchievements: unlockedNow,
        });
      }

      setXpPopup({ xp: xpEarned, kind: 'quest' });
    },
    [quests, stats, achievements, addNotification, shop.activeBoost, sfxEnabled]
  );

  const handleAddQuest = useCallback(
    (quest: Omit<Quest, 'id' | 'status'>) =>
      setQuests((prev) => [{ ...quest, id: Date.now().toString(), status: 'active' }, ...prev]),
    []
  );
  const handleAddNote = useCallback((note: Omit<Note, 'id' | 'createdAt'>) => {
  setNotes((prev) => [{ ...note, id: Date.now().toString(), createdAt: 'Just now' }, ...prev]);
  // Challenges: track daily/weekly notes created (used for Vidya Seeker / Scroll Master)
  setChallengeState((prev) => ({
    ...prev,
    dailyNotes: (prev.dailyNotes || 0) + 1,
    weeklyNotes: (prev.weeklyNotes || 0) + 1,
  }));
}, []);
  const handleDeleteNote = useCallback((id: string) => setNotes((prev) => prev.filter((n) => n.id !== id)), []);

  // ── Profile actions ─────────────────────────────────────────────────────
  const handleExportData = useCallback(() => {
    const exportObj = {
      app: 'KarmQuest',
      version: '1.3.0',
      exportedAt: new Date().toISOString(),
      theme: { mode: isHinglish ? 'hinglish' : isDark ? 'dark' : 'light' },
      settings: { sfxEnabled },
      state: {
        quests,
        notes,
        stats,
        achievements,
        notifications,
        shop,
        focusSession,
      },
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `karmquest_export_${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [quests, notes, stats, achievements, notifications, shop, focusSession, isDark, isHinglish, sfxEnabled]);

  const handleResetAll = useCallback(() => {
    // Full reset (including theme) – easiest + most reliable.
    localStorage.removeItem('karmquest_state');
    localStorage.removeItem('kq_theme');
    window.location.reload();
  }, []);
  // ── Quest templates ───────────────────────────────────────────────────
  const applyQuestTemplate = useCallback(
    (templateId: QuestTemplateId) => {
      const tpl = questTemplates[templateId];
      if (!tpl) return;

      const today = todayISO();
      const isoPlusDays = (days: number) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().slice(0, 10);
      };
      const makeId = (suffix: string) => {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return (crypto as any).randomUUID();
        return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${suffix}`;
      };

      const newQuests = tpl.quests.map((q, i) => {
        const qid = makeId(String(i));
        return {
          id: qid,
          title: q.title,
          difficulty: q.difficulty,
          xpReward: q.xpReward,
          dueDate: typeof q.dueDateDaysFromToday === 'number' ? isoPlusDays(q.dueDateDaysFromToday) : today,
          status: 'active',
          category: q.category,
          recurring: q.recurring ?? 'none',
          completedAt: '',
          badge: 'none',
          subtasks: (q.subtasks || []).map((text, j) => ({
            id: `${qid}-st-${j}`,
            text,
            done: false,
          })),
        } as any;
      });

      setQuests((prev) => [...newQuests, ...prev]);
      addNotification(
        makeNotification(
          'daily_challenge',
          `Template added: ${tpl.name}`,
          `${newQuests.length} quests created — start your next run!`
        )
      );
    },
    [addNotification]
  );

  // ── Shop handlers ───────────────────────────────────────────────────────
  const handleEquipFrame = useCallback((frame: AvatarFrameId) => {
    setShop((prev) => ({ ...prev, equippedFrame: frame }));
  }, []);

  const handleEquipSkin = useCallback((skin: SidebarSkinId) => {
    setShop((prev) => ({ ...prev, equippedSkin: skin }));
  }, []);

  const handleBuyItem = useCallback(
    (itemId: string) => {
      const item = shopCatalog.find((i) => i.id === itemId);
      if (!item) return;

      // Frames
      if (item.kind === 'frame' && item.frameId) {
        const owned = shop.ownedFrames.includes(item.frameId);
        if (owned) {
          setShop((prev) => ({ ...prev, equippedFrame: item.frameId! }));
          return;
        }
        if (stats.coins < item.cost) {
          addNotification(makeNotification('achievement', 'Not enough coins 🪙', 'Earn more Mudras by completing quests.'));
          return;
        }
        setStats((prev) => ({ ...prev, coins: prev.coins - item.cost }));
        setShop((prev) => ({
          ...prev,
          ownedFrames: Array.from(new Set([...prev.ownedFrames, item.frameId!])),
          equippedFrame: item.frameId!,
        }));
        addNotification(makeNotification('achievement', 'Purchased! 🎁', `Avatar frame unlocked: ${item.name}`));
        return;
      }

      // Skins
      if (item.kind === 'skin' && item.skinId) {
        const owned = shop.ownedSkins.includes(item.skinId);
        if (owned) {
          setShop((prev) => ({ ...prev, equippedSkin: item.skinId! }));
          return;
        }
        if (stats.coins < item.cost) {
          addNotification(makeNotification('achievement', 'Not enough coins 🪙', 'Earn more Mudras by completing quests.'));
          return;
        }
        setStats((prev) => ({ ...prev, coins: prev.coins - item.cost }));
        setShop((prev) => ({
          ...prev,
          ownedSkins: Array.from(new Set([...prev.ownedSkins, item.skinId!])),
          equippedSkin: item.skinId!,
        }));
        addNotification(makeNotification('achievement', 'Purchased! 🎨', `Sidebar theme unlocked: ${item.name}`));
        return;
      }

      // Badges
      if (item.kind === 'badge' && item.badgeId) {
        const owned = shop.ownedBadges.includes(item.badgeId as any);
        if (owned) return;
        if (stats.coins < item.cost) {
          addNotification(makeNotification('achievement', 'Not enough coins 🪙', 'Earn more Mudras by completing quests.'));
          return;
        }
        setStats((prev) => ({ ...prev, coins: prev.coins - item.cost }));
        setShop((prev) => ({
          ...prev,
          ownedBadges: Array.from(new Set([...prev.ownedBadges, item.badgeId as any])),
        }));
        addNotification(makeNotification('achievement', 'Purchased! 🏷️', `Title badge unlocked: ${item.name}`));
        return;
      }

      // Boosts
      if (item.kind === 'boost') {
        const mult = item.boostMultiplier || 2;
        const dur = item.boostDurationMs || 60 * 60 * 1000;
        if (stats.coins < item.cost) {
          addNotification(makeNotification('achievement', 'Not enough coins 🪙', 'Earn more Mudras by completing quests.'));
          return;
        }
        setStats((prev) => ({ ...prev, coins: prev.coins - item.cost }));
        setShop((prev) => {
          const base = prev.activeBoost && isBoostActive(prev.activeBoost) ? prev.activeBoost.expiresAt : Date.now();
          return {
            ...prev,
            activeBoost: {
              multiplier: mult,
              expiresAt: base + dur,
            },
          };
        });
        addNotification(makeNotification('level_up', 'XP Boost Activated ⚡', `${mult}× XP for the next hour. Go grind!`));
      }
    },
    [shop, stats.coins, addNotification]
  );

  const startFocus = useCallback(
    (questId: string) => {
      const q = quests.find((x) => x.id === questId);
      if (!q || q.status === 'completed') return;

      const now = Date.now();
      const next: FocusSession = {
        questId,
        startedAt: now,
        endsAt: now + FOCUS_DURATION_MS,
        durationMs: FOCUS_DURATION_MS,
        bonusXp: FOCUS_BONUS_XP,
        awarded: false,
      };

      if (focusSession && focusSession.questId !== questId) {
        addNotification(makeNotification('focus', 'Focus switched ⏱️', `Switched focus to "${q.title}".`));
      } else {
        addNotification(makeNotification('focus', t('focusStartedTitle', lang), t('focusStartedMsg', lang)));
      }

      setFocusSession(next);
      setFocusNow(now);
    },
    [quests, focusSession, addNotification, lang]
  );

  const stopFocus = useCallback((reason?: string) => {
    if (!focusSession) return;
    setFocusSession(null);
    if (reason) {
      addNotification(makeNotification('focus', 'Focus stopped', reason));
    }
  }, [focusSession, addNotification]);

  const awardFocusBonus = useCallback(
    (questId: string, bonusXp: number) => {
      const q = quests.find((x) => x.id === questId);
      const title = q ? q.title : 'your quest';

      // XP / level calc (supports multi-level jumps)
      let newXp = stats.xp + bonusXp;
      const newTotalXp = (stats.totalXpEarned ?? stats.xp) + bonusXp;
      let newLevel = stats.level;
      let newXpToNext = stats.xpToNext;
      let didLevelUp = false;
      while (newXp >= newXpToNext) {
        newXp -= newXpToNext;
        newLevel++;
        newXpToNext = Math.round(newXpToNext * 1.2);
        didLevelUp = true;
      }

      setStats((prev) => ({
        ...prev,
        xp: newXp,
        xpToNext: newXpToNext,
        level: newLevel,
        totalXpEarned: newTotalXp,
      }));

      // Challenges: track focus sessions completed + weekly XP earned
      setChallengeState((prev) => ({
        ...prev,
        dailyFocus: (prev.dailyFocus || 0) + 1,
        weeklyXp: (prev.weeklyXp || 0) + bonusXp,
      }));

      // SFX: coin on XP gain
      sfx.play('coin', sfxEnabled);

      // Achievements unlocked on this action
      const unlockedNow: Achievement[] = [];
      const nextAchievements = achievements.map((a) => {
        if (a.unlocked || newTotalXp < a.xpRequired) return a;
        const unlocked = { ...a, unlocked: true };
        unlockedNow.push(unlocked);
        addNotification(makeNotification('achievement', `${a.icon} ${a.title} Unlocked!`, a.description));
        return unlocked;
      });
      setAchievements(nextAchievements);
      if (unlockedNow.length > 0) {
        // SFX: temple bell on achievement unlock
        sfx.play('achievement', sfxEnabled);
      }

      addNotification(
        makeNotification('focus', t('focusCompleteTitle', lang), `Pomodoro finished for "${title}". +${bonusXp} bonus XP.`)
      );

      if (didLevelUp) {
        addNotification(makeNotification('level_up', `Level ${newLevel} Achieved! 🚀`, `Chakra ascended to Level ${newLevel}.`));
        // SFX: chime on level up
        sfx.play('levelUp', sfxEnabled);
        setLevelUpData({
          newLevel,
          xpEarned: bonusXp,
          coinsEarned: 0,
          unlockedAchievements: unlockedNow,
        });
      }

      setXpPopup({ xp: bonusXp, kind: 'focus' });
      setFocusSession(null);
    },
    [quests, stats, achievements, addNotification, lang, sfxEnabled]
  );

  // Auto-award focus bonus when timer completes
  useEffect(() => {
    if (!hydrated) return;
    if (!focusSession || focusSession.awarded) return;
    if (Date.now() < focusSession.endsAt) return;
    awardFocusBonus(focusSession.questId, focusSession.bonusXp || FOCUS_BONUS_XP);
  }, [hydrated, focusSession, awardFocusBonus]);

// ── Challenge reward claims ────────────────────────────────────────────
const handleClaimChallenge = useCallback((challengeId: string, reward: number) => {
  setChallengeState((prev) => ({
    ...prev,
    claimed: { ...(prev.claimed || {}), [challengeId]: true },
  }));
  setStats((prev) => ({ ...prev, coins: prev.coins + reward }));
  addNotification(makeNotification('achievement', 'Challenge claimed 🪙', `+${reward} Mudras added to your wallet.`));
  sfx.play('coin', sfxEnabled);
}, [addNotification, sfxEnabled]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard stats={stats} quests={quests} notes={notes} achievements={achievements} onNavigate={handleNavigate} />;
      case 'quests':
        return (
          <QuestBoard
            quests={quests}
            onComplete={handleCompleteQuest}
            onAdd={handleAddQuest}
            onUpdate={handleUpdateQuest}
            ownedBadges={shop.ownedBadges}
            searchQuery={globalSearch}
            focusQuestId={focusQuestId}
            onFocusHandled={() => setFocusQuestId(null)}
            focusSession={focusSession}
            focusNowMs={focusNow}
            onStartFocus={startFocus}
            onStopFocus={stopFocus}
          />
        );
      case 'notes':
        return (
          <NotesVault
            notes={notes}
            onAdd={handleAddNote}
            onDelete={handleDeleteNote}
            externalSearchQuery={globalSearch}
            focusNoteId={focusNoteId}
            onFocusHandled={() => setFocusNoteId(null)}
          />
        );
      case 'achievements':
        return <Achievements achievements={achievements} stats={stats} />;
      case 'challenges':
        return <Challenges stats={stats} quests={quests} challengeState={challengeState} onClaim={handleClaimChallenge} />;
      case 'shop':
        return (
          <MudraShop
            stats={stats}
            shop={shop}
            onBuy={handleBuyItem}
            onEquipFrame={handleEquipFrame}
            onEquipSkin={handleEquipSkin}
          />
        );
      case 'profile':
        return (
          <ProfilePage
            stats={stats}
            quests={quests}
            notes={notes}
            achievements={achievements}
            onUpdateStats={(patch) => setStats((prev) => ({ ...prev, ...patch }))}
            onExport={handleExportData}
            onResetAll={handleResetAll}
            sfxEnabled={sfxEnabled}
            onToggleSfx={setSfxEnabled}
            onApplyTemplate={applyQuestTemplate}
            authEmail={userEmail}
            authUserId={userId}
            onSignOut={userId ? () => void signOut() : undefined}
            onCloudSaveProfile={userId ? onCloudSaveProfile : undefined}
            cloudStatus={
              userId
                ? { connected: cloud.remoteHydrated, saving: (cloud.saving || tasksCloud.syncing), error: (cloud.error ?? tasksCloud.error) }
                : { connected: false, saving: false, error: null }
            }
          />
        );
      default:
        return <Dashboard stats={stats} quests={quests} notes={notes} achievements={achievements} onNavigate={handleNavigate} />;
    }
  };

  const bgGradient = isHinglish
    ? 'bg-gradient-to-br from-[#FDF2F8] via-[#FAF5FF] to-[#F0F4FF]'
    : isDark
      ? 'bg-gradient-to-br from-[#0D0D1A] via-[#111122] to-[#0D0D1A]'
      : 'bg-gradient-to-br from-[#F7F8FC] via-[#F0F2F8] to-[#F5F3FF]';
  // ── Auth gate ─────────────────────────────────────────────────────────
  // Hooks above must run on every render. Only return conditionally *after* hooks.
  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-10 text-sm text-slate-500">
        Loading...
      </div>
    );
  }

  if (!userId && !guestMode) {
    return <AuthGate onContinueAsGuest={() => setGuestMode(true)} />;
  }

  return (
    <div className={`min-h-screen relative transition-colors duration-700 overflow-x-hidden ${bgGradient}`}>
      <SubtlePattern />
      <Particles />
      <OfflineSyncBootstrap />

      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((p) => !p)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        isDesktop={isMdUp}
        desktopWidthPx={sidebarOffsetPx}
        desktopExpanded={desktopSidebarExpanded}
        desktopCanExpand={isMdUp && isLgUp}
        sidebarSkin={shop.equippedSkin}
      />

      <TopNav
        stats={stats}
        avatarFrame={shop.equippedFrame}
        xpBoost={shop.activeBoost}
        onThemeChange={onThemeChange}
        sidebarOffsetPx={sidebarOffsetPx}
        onMobileMenuOpen={() => setMobileOpen(true)}
        notifications={notifications}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onClearAll={clearAll}
        searchQuery={globalSearch}
        onSearchChange={(q) => setGlobalSearch(q)}
        quests={quests}
        notes={notes}
        onNavigate={handleNavigate}
        onFocusQuest={(qid) => {
          setFocusQuestId(qid);
          setFocusNoteId(null);
        }}
        onFocusNote={(nid) => {
          setFocusNoteId(nid);
          setFocusQuestId(null);
        }}
      />

      <main
        className="relative z-10 transition-all duration-300 pt-16 md:pt-20 pb-24 md:pb-8 px-4 md:px-6"
        style={{ marginLeft: sidebarOffsetPx }}
      >
        {renderPage()}

        {import.meta.env.DEV && currentPage === 'profile' && (
          <div className="mt-8">
            <SupabaseTest />
          </div>
        )}
      </main>

      {xpPopup !== null && <XPPopup xp={xpPopup.xp} kind={xpPopup.kind} onDone={() => setXpPopup(null)} />}

      {levelUpData && <LevelUpOverlay data={levelUpData} onClose={() => setLevelUpData(null)} />}
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}