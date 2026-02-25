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
import { FloatingTimerPill } from './components/FloatingTimerPill';
import { Dashboard } from './components/Dashboard';
import { QuestBoard } from './components/QuestBoard';
import { NotesVault } from './components/NotesVault';
import { Achievements } from './components/Achievements';
import { AchievementShareCard } from './components/AchievementShareCard';
import { Challenges } from './components/Challenges';
import { MudraShop } from './components/MudraShop';
import { ProfilePage } from './components/ProfilePage';
import { LeaderboardPage } from './components/LeaderboardPage';
import { PublicProfilePage } from './components/PublicProfilePage';
import { LevelUpOverlay, type LevelUpData } from './components/LevelUpOverlay';
import { t } from './i18n';
import type { Page, Quest, Note, NoteRevision, UserStats, Achievement, AchievementCriteria, Difficulty, Recurrence, SubTask, FocusSession, BreakSession, WeeklyReport } from './store';
import { defaultQuests, defaultNotes, defaultAchievements, todayISO, yesterdayISO, noteColors, addDaysISO } from './store';
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
import { logActivity } from './lib/activity';
import { supabase } from './lib/supabase';
import { applyXpGain, uniqueId } from './utils/xp';
import { ErrorBoundary } from './components/ErrorBoundary';

// ── Particles ────────────────────────────────────────────────────────────────
// Geometry is computed once (stable). Palette changes with theme.
function Particles() {
  const { isDark, isHinglish, isModern } = useTheme();

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

  // Use theme tokens so particles match every theme (warm light uses saffron/orange).
  const palette = useMemo(
    () => ['var(--kq-xp-start)', 'var(--kq-primary)', 'var(--kq-xp-end)', 'var(--kq-violet)'],
    []
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
            opacity: isModern ? 0.045 : (isDark || isHinglish) ? 0.15 : 0.08,
          }}
        />
      ))}
    </div>
  );
}

function SubtlePattern() {
  const { isDark, isModern } = useTheme();
  // Token-driven stroke so light theme isn't forced into indigo.
  const stroke = isModern ? 'var(--kq-border2)' : 'var(--kq-primary)';

  if (isModern) {
    // Calm, editorial paper-grid (no mandala / no glow)
    return (
      <div className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.35 }}>
        <svg width="100%" height="100%" className="opacity-[0.12]">
          <defs>
            <pattern id="kq-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke={stroke} strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#kq-grid)" />
        </svg>
      </div>
    );
  }
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
  const { isDark, isHinglish, isModern, lang } = useTheme();
  useEffect(() => {
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  const isFocus = kind === 'focus';
  const subtitle = isFocus ? t('focusCompleteMsg', lang) : t('karmaQuestComplete', lang);

  return (
    <div className="fixed top-20 right-4 md:right-8 z-50 animate-slide-up">
      <div
        className={`px-5 py-2.5 rounded-xl flex items-center gap-2.5 shadow-xl ${isModern
          ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)] text-[var(--kq-text-primary)]'
          : 'bg-gradient-to-r from-[var(--kq-xp-start)] to-[var(--kq-xp-end)] text-white'
          }`}
      >
        <span className="text-xl animate-coin-bounce inline-block">{isFocus ? '⏱️' : (isModern ? '✅' : (isHinglish ? '🎉' : '🪔'))}</span>
        <div>
          <p className="font-bold text-sm">{isFocus ? t('focusCompleteTitle', lang) : `+${xp} ${t('xpGained', lang)}`}</p>
          <p className={`text-[10px] ${isModern ? "text-[var(--kq-text-secondary)]" : "text-white/60"}`}>{subtitle}</p>
        </div>
        <span className="text-lg">{isFocus ? '🌿' : (isModern ? '→' : (isHinglish ? '🤩' : '🙏'))}</span>
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


// ── Achievements: semantic unlocks (in addition to XP) ─────────────────────
type AchievementEvalCtx = {
  stats: UserStats;
  quests: Quest[];
  notes: Note[];
  today: string;
  totalXp: number;
  lastQuestCompletedTs?: number;
  lastNoteCreatedAt?: string;
};

function localHourFromEpoch(ts: number): number {
  return new Date(ts).getHours();
}

function localHourFromISO(iso: string): number | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).getHours();
}

function countCompletedOnDay(quests: Quest[], dayISO: string): number {
  return quests.filter((q) => q.status === 'completed' && (q.completedAt || '').trim() === dayISO).length;
}

function hasCompletedDifficulty(quests: Quest[], difficulty: Difficulty): boolean {
  return quests.some((q) => q.status === 'completed' && q.difficulty === difficulty);
}

function shouldUnlockByCriteria(a: Achievement, ctx: AchievementEvalCtx): boolean {
  const c: AchievementCriteria | undefined = (a as any).criteria;
  if (!c) return false;

  // Special achievement handled after the first pass.
  if (c.requiresAllOtherAchievements) return false;

  if (typeof c.minLevel === 'number' && ctx.stats.level < c.minLevel) return false;
  if (typeof c.minStreak === 'number' && ctx.stats.streak < c.minStreak) return false;
  if (typeof c.minStreakRecord === 'number' && (ctx.stats.streakRecord || 0) < c.minStreakRecord) return false;
  if (typeof c.minQuestsCompleted === 'number' && (ctx.stats.questsCompleted || 0) < c.minQuestsCompleted) return false;
  if (typeof c.minNotesCreated === 'number' && ctx.notes.length < c.minNotesCreated) return false;

  if (typeof c.minQuestsCompletedInDay === 'number') {
    const done = countCompletedOnDay(ctx.quests, ctx.today);
    if (done < c.minQuestsCompletedInDay) return false;
  }

  if (c.anyCompletedDifficulty) {
    if (!hasCompletedDifficulty(ctx.quests, c.anyCompletedDifficulty)) return false;
  }

  if (typeof c.questCompletedBeforeHour === 'number') {
    const ts = ctx.lastQuestCompletedTs;
    if (typeof ts !== 'number') return false;
    const hour = localHourFromEpoch(ts);
    if (hour >= c.questCompletedBeforeHour) return false;
  }

  if (typeof c.noteCreatedBeforeHour === 'number') {
    const iso = ctx.lastNoteCreatedAt;
    if (!iso) return false;
    const hour = localHourFromISO(iso);
    if (hour === null) return false;
    if (hour >= c.noteCreatedBeforeHour) return false;
  }

  return true;
}

function unlockAchievementsWithContext(
  achievements: Achievement[],
  ctx: AchievementEvalCtx,
  notify: (a: Achievement) => void
): { next: Achievement[]; unlockedNow: Achievement[] } {
  const unlockedNow: Achievement[] = [];

  let next = achievements.map((a) => {
    if (a.unlocked) return a;
    const byXp = ctx.totalXp >= a.xpRequired;
    const byCriteria = shouldUnlockByCriteria(a, ctx);
    if (!byXp && !byCriteria) return a;

    const unlocked = { ...a, unlocked: true };
    unlockedNow.push(unlocked);
    notify(unlocked);
    return unlocked;
  });

  // Second pass: "Moksha" style achievement (unlock all)
  const mokshaIdx = next.findIndex((a) => {
    const c: AchievementCriteria | undefined = (a as any).criteria;
    return !!c?.requiresAllOtherAchievements;
  });

  if (mokshaIdx >= 0) {
    const moksha = next[mokshaIdx];
    if (!moksha.unlocked) {
      const othersUnlocked = next.every((a, i) => i === mokshaIdx || a.unlocked);
      if (othersUnlocked) {
        const unlocked = { ...moksha, unlocked: true };
        next = next.map((a, i) => (i === mokshaIdx ? unlocked : a));
        unlockedNow.push(unlocked);
        notify(unlocked);
      }
    }
  }

  return { next, unlockedNow };
}

function applyRecurringResets(list: Quest[]): Quest[] {
  const today = todayISO();
  const currentWeek = weekStartISO();

  return list.map((q) => {
    const recurring = normalizeRecurrence(q.recurring);
    if (recurring === 'none') return q;
    if (q.status !== 'completed') return q;

    // B13 fix: normalize completedAt to date-only (YYYY-MM-DD) for comparison,
    // since cloud sync may store it as a full ISO timestamp.
    const rawCompletedAt = (q.completedAt || '').trim();
    const completedAt = rawCompletedAt.length > 10 ? rawCompletedAt.slice(0, 10) : rawCompletedAt;

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
  const { isDark, isHinglish, isModern, lang, theme, setTheme } = useTheme();
  const isPro = lang === 'pro';
  const xpWord = (isPro || isHinglish) ? 'XP' : 'Punya';
  const coinWord = isPro ? 'coins' : isHinglish ? 'Mudra' : 'Mudras';
  const taskWord = isPro ? 'task' : 'quest';
  const tasksWord = isPro ? 'tasks' : 'quests';
  // Prevent cloud profile from overriding theme after the user changes it.
  const themeHydratedRef = useRef<string | null>(null);
  const themeUserOverrideRef = useRef(false);
  const { user, loading: authLoading, signOut } = useAuth();
  const [guestMode, setGuestMode] = useState(false);
  const [guestBooting, setGuestBooting] = useState(false);
  const guestHadStateRef = useRef(false);

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

  // ── Public profile route (/u/:username) ───────────────────────────────
  const [publicUsername, setPublicUsername] = useState<string | null>(null);
  useEffect(() => {
    const read = () => {
      const path = window.location.pathname || '/';
      const m = path.match(/^\/u\/([^/]+)\/?$/);
      setPublicUsername(m ? decodeURIComponent(m[1]) : null);
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [focusQuestId, setFocusQuestId] = useState<string | null>(null);
  const [focusNoteId, setFocusNoteId] = useState<string | null>(null);
  const [focusSession, setFocusSession] = useState<FocusSession | null>(null);
  const [focusNow, setFocusNow] = useState(() => Date.now());
  const focusRemainingMs = focusSession ? Math.max(0, focusSession.endsAt - focusNow) : 0;
  const [breakSession, setBreakSession] = useState<BreakSession | null>(null);
  const breakRemainingMs = breakSession ? Math.max(0, breakSession.endsAt - focusNow) : 0;

  // Idempotency guards for timers (prevents double-award / double-end under rapid re-renders)
  const focusAwardGuardRef = useRef<string>('');
  const breakEndGuardRef = useRef<number>(0);


  // Seed mode: keep the old "demo" starter progression available (for screenshots / demos),
  // but default new users to a true fresh start (0 progress).
  const seedMode = useMemo<'fresh' | 'demo'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const seed = (params.get('seed') || '').toLowerCase();
      if (seed === 'demo') return 'demo';
      if (seed === 'fresh') return 'fresh';
    } catch {
      // ignore
    }
    try {
      const stored = (localStorage.getItem('karmquest_seed_mode') || '').toLowerCase();
      if (stored === 'demo') return 'demo';
      if (stored === 'fresh') return 'fresh';
    } catch {
      // ignore
    }
    return 'fresh';
  }, []);

  const demoStats = useMemo<UserStats>(() => ({
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
  }), []);

  const freshStats = useMemo<UserStats>(() => ({
    level: 1,
    xp: 0,
    xpToNext: 100,
    totalXpEarned: 0,
    coins: 0,
    streak: 0,
    streakRecord: 0,
    lastActiveDate: '',
    lastDailyChallengeNotified: '',
    questsCompleted: 0,
    totalQuests: defaultQuests.length,
    avatarEmoji: '🧘',
    username: 'User',
  }), []);

  // Always use fresh defaults for migrations (so missing fields don't resurrect demo values).
  const statsDefaults = freshStats;
  const defaultStats: UserStats = seedMode === 'demo' ? demoStats : freshStats;

  const initialQuests = useMemo<Quest[]>(() => {
    if (seedMode === 'demo') return defaultQuests;
    // Fresh start: keep the starter quest templates, but remove any seeded completions.
    return defaultQuests.map((q) => ({
      ...q,
      status: 'active' as const,
      completedAt: '',
      completedAtTs: undefined,
      earnedXp: undefined,
      subtasks: resetSubtasks(q.subtasks),
    }));
  }, [seedMode]);

  const initialAchievements = useMemo<Achievement[]>(() => {
    if (seedMode === 'demo') return defaultAchievements;
    return defaultAchievements.map((a) => ({ ...a, unlocked: false }));
  }, [seedMode]);

  const [quests, setQuests] = useState<Quest[]>(initialQuests);

  const initialNotes = useMemo<Note[]>(() => {
    if (seedMode === 'demo') return defaultNotes;
    return [];
  }, [seedMode]);
  const [notes, setNotes] = useState<Note[]>(initialNotes);

  const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);

  const initialNotifications = useMemo<AppNotification[]>(() => {
    if (seedMode === 'demo') return defaultNotifications;
    return [];
  }, [seedMode]);
  const [xpPopup, setXpPopup] = useState<{ xp: number; kind: 'quest' | 'focus' } | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null);
  const [shareAchievement, setShareAchievement] = useState<Achievement | null>(null);
  const [shareAchievementOpen, setShareAchievementOpen] = useState(false);
  const shareAchievementSeenRef = useRef<Record<string, boolean>>({});

  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [shop, setShop] = useState<ShopState>(defaultShopState);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);
  const [bootReady, setBootReady] = useState(false);

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

  // Notes: normalize createdAt to ISO so Supabase (timestamptz) can store it reliably.
  const normalizeNoteCreatedAt = useCallback((v: unknown): string => {
    if (typeof v !== 'string') return new Date().toISOString();
    const s = v.trim();
    if (!s) return new Date().toISOString();
    const parsed = Date.parse(s);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();

    const lower = s.toLowerCase();
    if (lower === 'just now') return new Date().toISOString();
    if (lower === 'yesterday') return new Date(Date.now() - 86_400_000).toISOString();

    const m = lower.match(/^(\d+)\s*(m|min|mins|minute|minutes)\s*ago$/);
    if (m) return new Date(Date.now() - Number(m[1]) * 60_000).toISOString();
    const h = lower.match(/^(\d+)\s*(h|hr|hrs|hour|hours)\s*ago$/);
    if (h) return new Date(Date.now() - Number(h[1]) * 3_600_000).toISOString();
    const d = lower.match(/^(\d+)\s*(d|day|days)\s*ago$/);
    if (d) return new Date(Date.now() - Number(d[1]) * 86_400_000).toISOString();

    // Unknown human string: fall back to "now" (keeps app stable + backend-friendly).
    return new Date().toISOString();
  }, []);

  const stripClaimed = useCallback((claimed: Record<string, boolean>, ids: Set<string>) => {
    const next = { ...(claimed || {}) };
    ids.forEach((id) => { delete next[id]; });
    return next;
  }, []);


  // Focus Timer (Pomodoro)
  const FOCUS_DEFAULT_MS = 25 * 60 * 1000;
  const FOCUS_BONUS_XP = 5;
  const SHORT_BREAK_MS = 5 * 60 * 1000;
  const LONG_BREAK_MS = 15 * 60 * 1000;

  const calcFocusBonusXp = useCallback((durationMs: number) => {
    const raw = Math.round(FOCUS_BONUS_XP * (durationMs / FOCUS_DEFAULT_MS));
    return Math.max(1, raw);
  }, []);

  // ── Persistence ─────────────────────────────────────────────────────────
  type PersistedSnapshot = {
    quests: Quest[];
    notes: Note[];
    stats: UserStats;
    achievements: Achievement[];
    notifications: AppNotification[];
    shop: ShopState;
    focusSession: FocusSession | null;
    breakSession: BreakSession | null;
    sfxEnabled: boolean;
    challengeState: ChallengeState;
  };

  const persistVersion = '1.3.0';
  const persistKey = userId ? `karmquest_state:${userId}` : guestMode ? 'karmquest_state:guest' : 'karmquest_state:anon';

  // Completion history (additive): used by the Habit Heatmap to show true daily density,
  // especially for recurring habits (multiple completions over many days).
  const completionLogKey = useMemo(
    () => (userId ? `karmquest_completion_log_v1:${userId}` : guestMode ? 'karmquest_completion_log_v1:guest' : 'karmquest_completion_log_v1:anon'),
    [userId, guestMode]
  );

  // Weekly report cards (shareable): generated locally from completion history.
  const weeklyReportsKey = useMemo(
    () => (userId ? `karmquest_weekly_reports_v1:${userId}` : guestMode ? 'karmquest_weekly_reports_v1:guest' : 'karmquest_weekly_reports_v1:anon'),
    [userId, guestMode]
  );

  type CompletionEvent = {
    ts: number; // epoch ms
    day: string; // YYYY-MM-DD
    questId: string;
    title: string;
    category: string;
    difficulty: Difficulty;
    xp: number;
    coins: number;
  };

  const appendCompletionLog = useCallback(
    (ev: CompletionEvent) => {
      try {
        const raw = localStorage.getItem(completionLogKey);
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        const arr: CompletionEvent[] = Array.isArray(parsed) ? (parsed as any[]) : [];
        const safe = arr
          .filter(Boolean)
          .map((x: any) => ({
            ts: typeof x.ts === 'number' ? x.ts : Date.now(),
            day: typeof x.day === 'string' ? x.day : todayISO(),
            questId: typeof x.questId === 'string' ? x.questId : '',
            title: typeof x.title === 'string' ? x.title : '',
            category: typeof x.category === 'string' ? x.category : 'Karma',
            difficulty: (typeof x.difficulty === 'string' ? x.difficulty : 'easy') as Difficulty,
            xp: typeof x.xp === 'number' ? x.xp : 0,
            coins: typeof x.coins === 'number' ? x.coins : 0,
          }))
          .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.day) && x.questId);

        safe.push(ev);
        // Keep enough for long usage; still tiny in localStorage.
        const trimmed = safe.slice(-2000);
        localStorage.setItem(completionLogKey, JSON.stringify(trimmed));
      } catch {
        // ignore storage errors
      }

      // Best-effort cloud log (no-op for guests). Never blocks.
      void logActivity({
        eventType: 'quest_complete',
        entityType: 'quest',
        entityId: ev.questId,
        payload: {
          day: ev.day,
          ts: ev.ts,
          title: ev.title,
          xp: ev.xp,
          coins: ev.coins,
          category: ev.category,
          difficulty: ev.difficulty,
        },
      });
    },
    [completionLogKey]
  );

  // ── Social leaderboard: XP event logging (offline-safe) ────────────────
  // The weekly Friends leaderboard uses server-side `xp_events` rows.
  // We log XP events on quest completion / focus bonus when the user is authenticated.
  type XpEventOp = {
    xp: number;
    source: string;
    meta: Record<string, unknown>;
    ts: number; // epoch ms
  };

  const xpEventQueueKey = useMemo(() => (userId ? `karmquest_xp_event_queue_v1:${userId}` : null), [userId]);
  const [xpQueueCount, setXpQueueCount] = useState<number>(0);

  const readXpQueue = useCallback((): XpEventOp[] => {
    if (!xpEventQueueKey) return [];
    try {
      const raw = localStorage.getItem(xpEventQueueKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      if (!Array.isArray(parsed)) return [];
      return (parsed as any[])
        .filter(Boolean)
        .map((x: any) => ({
          xp: typeof x.xp === 'number' ? x.xp : 0,
          source: typeof x.source === 'string' ? x.source : 'quest_complete',
          meta: (x.meta && typeof x.meta === 'object' ? (x.meta as Record<string, unknown>) : {}),
          ts: typeof x.ts === 'number' ? x.ts : Date.now(),
        }))
        .filter((x) => x.xp >= 0)
        .slice(-400);
    } catch {
      return [];
    }
  }, [xpEventQueueKey]);

  const writeXpQueue = useCallback(
    (ops: XpEventOp[]) => {
      if (!xpEventQueueKey) return;
      try {
        localStorage.setItem(xpEventQueueKey, JSON.stringify(ops.slice(-400)));
      } catch {
        // ignore storage errors
      }
      setXpQueueCount(ops.length);
    },
    [xpEventQueueKey]
  );

  useEffect(() => {
    // keep count in sync on login/logout
    setXpQueueCount(readXpQueue().length);
  }, [readXpQueue]);

  const enqueueXpEvent = useCallback(
    (op: XpEventOp) => {
      if (!xpEventQueueKey) return;
      const next = [...readXpQueue(), op].slice(-400);
      writeXpQueue(next);
    },
    [readXpQueue, writeXpQueue, xpEventQueueKey]
  );

  const flushXpQueue = useCallback(async () => {
    if (!userId || !xpEventQueueKey) return { flushed: 0, remaining: 0 };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return { flushed: 0, remaining: xpQueueCount };

    const ops = readXpQueue();
    if (ops.length === 0) return { flushed: 0, remaining: 0 };

    const remaining: XpEventOp[] = [];
    let flushed = 0;

    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      try {
        const { error } = await supabase.rpc('log_xp_event', {
          p_xp: op.xp,
          p_source: op.source,
          p_meta: op.meta ?? {},
        });
        if (error) throw error;
        flushed++;
      } catch {
        // stop early (likely auth/session/offline). keep the rest.
        remaining.push(...ops.slice(i));
        break;
      }
    }

    if (remaining.length !== ops.length) writeXpQueue(remaining);
    return { flushed, remaining: remaining.length };
  }, [userId, xpEventQueueKey, readXpQueue, writeXpQueue, xpQueueCount]);

  const logXpEventWithQueue = useCallback(
    async (xp: number, source: string, meta: Record<string, unknown>) => {
      if (!userId) return; // guests don't write to Supabase
      try {
        const { error } = await supabase.rpc('log_xp_event', { p_xp: xp, p_source: source, p_meta: meta ?? {} });
        if (error) throw error;
      } catch {
        enqueueXpEvent({ xp, source, meta: meta ?? {}, ts: Date.now() });
      }
    },
    [enqueueXpEvent, userId]
  );

  // Flush XP queue on login + when the browser comes online
  useEffect(() => {
    if (!userId) return;
    void flushXpQueue();
  }, [userId, flushXpQueue]);

  useEffect(() => {
    const onOnline = () => {
      if (!userId) return;
      void flushXpQueue();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flushXpQueue, userId]);



  // ── Weekly report cards (shareable) ────────────────────────────────────
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [weeklyReportAutoOpen, setWeeklyReportAutoOpen] = useState(false);

  const readWeeklyReports = useCallback((): WeeklyReport[] => {
    try {
      const raw = localStorage.getItem(weeklyReportsKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      if (!Array.isArray(parsed)) return [];
      return (parsed as any[])
        .filter(Boolean)
        .map((r: any, idx: number) => ({
          id: typeof r.id === 'string' ? r.id : `${Date.now()}-${idx}`,
          weekStart: typeof r.weekStart === 'string' ? r.weekStart : '',
          weekEnd: typeof r.weekEnd === 'string' ? r.weekEnd : '',
          generatedAt: typeof r.generatedAt === 'string' ? r.generatedAt : new Date().toISOString(),
          questsCompleted: typeof r.questsCompleted === 'number' ? r.questsCompleted : 0,
          xpEarned: typeof r.xpEarned === 'number' ? r.xpEarned : 0,
          coinsEarned: typeof r.coinsEarned === 'number' ? r.coinsEarned : 0,
          streakDays: typeof r.streakDays === 'number' ? r.streakDays : 0,
          username: typeof r.username === 'string' ? r.username : (stats.username || 'Yoddha'),
          avatarEmoji: typeof r.avatarEmoji === 'string' ? r.avatarEmoji : (stats.avatarEmoji || '🧘'),
          dismissedAt: typeof r.dismissedAt === 'string' ? r.dismissedAt : undefined,
        }))
        .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.weekStart) && /^\d{4}-\d{2}-\d{2}$/.test(r.weekEnd))
        .slice(-26);
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyReportsKey, stats.username, stats.avatarEmoji]);

  useEffect(() => {
    setWeeklyReports(readWeeklyReports());
  }, [readWeeklyReports]);

  useEffect(() => {
    try {
      localStorage.setItem(weeklyReportsKey, JSON.stringify(weeklyReports.slice(-26)));
    } catch {
      // ignore
    }
  }, [weeklyReportsKey, weeklyReports]);

  const computeWeeklyReport = useCallback(
    (weekStart: string): WeeklyReport => {
      const weekEnd = weekEndFromWeekStart(weekStart);
      // Prefer completion history log (accurate for recurring habits)
      let events: CompletionEvent[] = [];
      try {
        const raw = localStorage.getItem(completionLogKey);
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        if (Array.isArray(parsed)) events = parsed as any as CompletionEvent[];
      } catch {
        // ignore
      }
      const inWeek = (d: string) => d >= weekStart && d <= weekEnd;
      const weekEvents = (events || []).filter((e: any) => e && typeof e.day === 'string' && inWeek(e.day));
      const fromEvents = {
        questsCompleted: weekEvents.length,
        xpEarned: weekEvents.reduce((a, e: any) => a + (typeof e.xp === 'number' ? e.xp : 0), 0),
        coinsEarned: weekEvents.reduce((a, e: any) => a + (typeof e.coins === 'number' ? e.coins : 0), 0),
      };

      // Fallback for older data (before completion log existed)
      if (fromEvents.questsCompleted === 0) {
        const done = quests.filter((q) => q.status === 'completed' && q.completedAt && inWeek(q.completedAt));
        fromEvents.questsCompleted = done.length;
        fromEvents.xpEarned = done.reduce((a, q) => a + (typeof (q as any).earnedXp === 'number' ? (q as any).earnedXp : q.xpReward || 0), 0);
        fromEvents.coinsEarned = done.reduce((a, q) => a + (typeof (q as any).earnedCoins === 'number' ? (q as any).earnedCoins : 0), 0);
      }

      return {
        id: `wr-${weekStart}-${Date.now()}`,
        weekStart,
        weekEnd,
        generatedAt: new Date().toISOString(),
        questsCompleted: fromEvents.questsCompleted,
        xpEarned: fromEvents.xpEarned,
        coinsEarned: fromEvents.coinsEarned,
        streakDays: stats.streak || 0,
        username: stats.username || 'Yoddha',
        avatarEmoji: stats.avatarEmoji || '🧘',
      };
    },
    [completionLogKey, quests, stats.avatarEmoji, stats.streak, stats.username]
  );

  const upsertWeeklyReport = useCallback((r: WeeklyReport) => {
    setWeeklyReports((prev) => {
      const filtered = (prev || []).filter((x) => x.weekStart !== r.weekStart);
      const next = [...filtered, r].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
      return next.slice(-26);
    });
  }, []);

  const getTargetWeekStartForReport = useCallback((): string => {
    const params = new URLSearchParams(window.location.search);
    const force = params.get('forceWeeklyReport') === '1';
    const now = new Date();
    const isSunday = now.getDay() === 0;
    const current = weekStartISO(now);
    // On Sunday -> generate for the week ending today; on other days -> last completed week.
    if (isSunday || force) return current;
    return addDaysISO(current, -7);
  }, []);

  const maybeGenerateWeeklyReport = useCallback(() => {
    const targetWeekStart = getTargetWeekStartForReport();
    if (!targetWeekStart) return;

    const existing = weeklyReports.find((r) => r.weekStart === targetWeekStart);
    if (existing) return;

    const r = computeWeeklyReport(targetWeekStart);
    upsertWeeklyReport(r);
    // Auto-open the share modal for fresh reports (once)
    setWeeklyReportAutoOpen(true);
  }, [computeWeeklyReport, getTargetWeekStartForReport, upsertWeeklyReport, weeklyReports]);

  const handleDismissWeeklyReport = useCallback((weekStart: string) => {
    setWeeklyReports((prev) =>
      (prev || []).map((r) => (r.weekStart === weekStart ? { ...r, dismissedAt: new Date().toISOString() } : r))
    );
  }, []);

  const activeWeeklyReport = useMemo(() => {
    const targetWeekStart = getTargetWeekStartForReport();
    const r = weeklyReports.find((x) => x.weekStart === targetWeekStart);
    if (!r) return null;
    if (r.dismissedAt) return null;
    return r;
  }, [getTargetWeekStartForReport, weeklyReports]);

  const persistSnapshot: PersistedSnapshot = {
    quests,
    notes,
    stats,
    achievements,
    notifications,
    shop,
    focusSession,
    breakSession,
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

    if (Array.isArray(s.notes)) {
      setNotes(
        (s.notes as any[]).filter(Boolean).map((n: any, idx: number) => ({
          id: typeof n.id === 'string' ? n.id : `${Date.now()}-${idx}`,
          title: String(n.title || ''),
          content: String(n.content || ''),
          tags: Array.isArray(n.tags) ? n.tags.map((x: any) => String(x)).filter(Boolean) : [],
          color: typeof n.color === 'string' ? n.color : (noteColors[0] || '#6366F1'),
          createdAt: normalizeNoteCreatedAt(n.createdAt),

          updatedAt: n.updatedAt ? normalizeNoteCreatedAt(n.updatedAt) : undefined,
          revisions: Array.isArray(n.revisions)
            ? n.revisions
              .filter(Boolean)
              .map((r: any) => ({
                editedAt: normalizeNoteCreatedAt(r.editedAt),
                title: String(r.title || ''),
                content: String(r.content || ''),
                tags: Array.isArray(r.tags) ? r.tags.map((x: any) => String(x)).filter(Boolean) : [],
                color: typeof r.color === 'string' ? r.color : (noteColors[0] || '#6366F1'),
                emoji: typeof r.emoji === 'string' ? r.emoji : '📜',
              }))
              .slice(0, 25)
            : undefined,
          emoji: typeof n.emoji === 'string' ? n.emoji : '📜',
        }))
      );
    }
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
        ...statsDefaults,
        ...stAny,
        totalXpEarned:
          typeof stAny.totalXpEarned === 'number'
            ? stAny.totalXpEarned
            : typeof stAny.xp === 'number'
              ? stAny.xp
              : statsDefaults.totalXpEarned,
        streakRecord: typeof (stAny as any).streakRecord === 'number'
          ? (stAny as any).streakRecord
          : (typeof stAny.streak === 'number' ? stAny.streak : statsDefaults.streakRecord),
        lastDailyChallengeNotified: typeof stAny.lastDailyChallengeNotified === 'string' ? stAny.lastDailyChallengeNotified : '',
        avatarImagePath:
          typeof (stAny as any).avatarImagePath === 'string'
            ? (stAny as any).avatarImagePath
            : (stAny as any).avatarImagePath === null
              ? null
              : (statsDefaults as any).avatarImagePath ?? null,
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
        setBreakSession(null);
      }
    } else {
      setFocusSession(null);
      setBreakSession(null);
    }

    // Break session migration
    const bsAny = (s as any).breakSession;
    if (bsAny && typeof bsAny === 'object') {
      const startedAt = typeof bsAny.startedAt === 'number' ? bsAny.startedAt : 0;
      const endsAt = typeof bsAny.endsAt === 'number' ? bsAny.endsAt : 0;
      const durationMs = typeof bsAny.durationMs === 'number' ? bsAny.durationMs : 0;
      const kind = bsAny.kind === 'long' ? 'long' : 'short';
      if (endsAt && durationMs) {
        setBreakSession({ startedAt, endsAt, durationMs, kind });
      } else {
        setBreakSession(null);
      }
    } else {
      setBreakSession(null);
    }
  }, [defaultChallengeState, stripClaimed, DAILY_CHALLENGE_IDS, WEEKLY_CHALLENGE_IDS, normalizeNoteCreatedAt, statsDefaults]);

  const { hydrated } = useAppPersistence<PersistedSnapshot>({
    key: persistKey,
    version: persistVersion,
    snapshot: persistSnapshot,
    restore: restoreSnapshot,
  });

  // Guest bootstrap:
  // We always start Guest fresh (no persistence across guest sessions).
  // This prevents "anon" state from leaking into guest and guarantees a 0-day streak every time.
  useEffect(() => {
    if (!guestMode || userId) return;
    if (!guestBooting) return;
    if (!hydrated) return;
    // Fresh guest profile (local-only)
    setStats({
      level: 1,
      xp: 0,
      xpToNext: 100,
      totalXpEarned: 0,
      coins: 0,
      streak: 0,
      streakRecord: 0,
      lastActiveDate: '',
      lastDailyChallengeNotified: '',
      questsCompleted: 0,
      totalQuests: defaultQuests.length,
      avatarEmoji: '🧘',
      username: 'Guest',
    });

    // Sample quests, but start them as "active" (no retroactive completions).
    setQuests(
      defaultQuests.map((q) => ({
        ...q,
        status: 'active',
        completedAt: '',
        earnedXp: undefined,
        subtasks: resetSubtasks(q.subtasks),
      }))
    );

    // Optional onboarding content
    setNotes(defaultNotes);
    // Keep achievements available but start locked for a true fresh guest session.
    setAchievements(defaultAchievements.map((a) => ({ ...a, unlocked: false })));

    setShop(defaultShopState);
    setNotifications([]);
    setFocusSession(null);
    setBreakSession(null);
    setChallengeState(defaultChallengeState);
    setCurrentPage('dashboard');

    setGuestBooting(false);
  }, [guestMode, userId, guestBooting, hydrated, defaultChallengeState]);


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
      avatarImagePath: (cloudProfile as any).avatar_url ?? (prev as any).avatarImagePath ?? null,
    }));

    // Apply theme from cloud only once per login (and don't override after user changes theme).
    if (!themeUserOverrideRef.current && themeHydratedRef.current !== userId) {
      const mode = cloudProfile.theme_mode as ThemeMode | null | undefined;
      if (mode && mode !== theme) setTheme(mode);
      themeHydratedRef.current = userId;
    }
  }, [cloudProfile, setTheme, theme, userId]);

  const onCloudSaveProfile = useCallback(
    async (username: string, avatarEmoji: string, avatarImagePath?: string | null) => {
      if (!userId) return;
      await updateCloudProfile({ username, avatar_emoji: avatarEmoji, avatar_url: avatarImagePath ?? null, theme_mode: theme } as any);
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


  // Defer boot checks by 1 tick so restoreSnapshot state updates land before we run
  // recurring resets / streak checks. Also re-run when switching storage key (anon ↔ guest ↔ user).
  useEffect(() => {
    if (!hydrated) return;
    setBootReady(false);
    const t = window.setTimeout(() => setBootReady(true), 0);
    return () => window.clearTimeout(t);
  }, [hydrated, persistKey]);

  // ── Boot checks after hydration ─────────────────────────────────────────
  const bootCheckedRef = useRef(false);
  useEffect(() => {
    bootCheckedRef.current = false;
  }, [persistKey]);
  useEffect(() => {
    if (!hydrated || !bootReady) return;
    if (!userId && !guestMode) return;
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
              isPro ? 'Streak reset' : 'Tapasya Streak Broken 💔',
              `Your ${stats.streak}-day streak ended. Complete a ${taskWord} today to start fresh!`
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
          isPro ? 'Daily goals available' : 'Daily Challenges Available! ⚡',
          isPro
            ? `New daily goals are ready. Earn bonus ${coinWord} by completing them today!`
            : 'New daily missions are ready. Earn bonus Mudras by completing them today!'
        )
      );
      setStats((prev) => ({ ...prev, lastDailyChallengeNotified: today }));
    }

    // Weekly share card (auto-generated):
    // - On Sundays: generates the report for the week ending today.
    // - On Mon–Sat: ensures last week's report exists (so users who missed Sunday still get it).
    maybeGenerateWeeklyReport();

    // Recurring reset (in case the app was closed during midnight)
    setQuests((prev) => applyRecurringResets(prev));

    // Expired boost cleanup
    if (shop.activeBoost && !isBoostActive(shop.activeBoost)) {
      setShop((prev) => ({ ...prev, activeBoost: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, bootReady]);


  // ── Timer tick (focus or break) ─────────────────────────────────────────
  useEffect(() => {
    if (!focusSession && !breakSession) return;
    const tmr = window.setInterval(() => setFocusNow(Date.now()), 1000);
    return () => window.clearInterval(tmr);
  }, [focusSession?.questId, focusSession?.endsAt, breakSession?.endsAt, breakSession?.kind]);

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
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const openAchievementShare = useCallback((a: Achievement) => {
    setShareAchievement(a);
    setShareAchievementOpen(true);
  }, []);

  const maybeAutoShareMoksha = useCallback(
    (unlockedNow: Achievement[]) => {
      const moksha = unlockedNow.find((a) => {
        const c: any = (a as any).criteria;
        return !!c?.requiresAllOtherAchievements || a.title.toLowerCase() === 'moksha';
      });
      if (!moksha) return;
      if (shareAchievementSeenRef.current[moksha.id]) return;
      shareAchievementSeenRef.current[moksha.id] = true;
      openAchievementShare(moksha);
    },
    [openAchievementShare]
  );

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
      const coinsEarned = Math.round(xpEarned * 2);
      const completionTs = Date.now();

      // Mark quest completed
      const doneDate = todayISO();

      // Heatmap completion history (supports recurring habits over time)
      appendCompletionLog({
        ts: completionTs,
        day: doneDate,
        questId: id,
        title: quest.title,
        category: quest.category,
        difficulty: quest.difficulty,
        xp: xpEarned,
        coins: coinsEarned,
      });
      // Social leaderboard: log XP to Supabase (offline-safe; queued if needed)
      void logXpEventWithQueue(xpEarned, 'quest_complete', {
        questId: id,
        title: quest.title,
        day: doneDate,
        multiplier,
        coins: coinsEarned,
      });

      const nextQuestsForCriteria = quests.map((q) =>
        q.id === id
          ? ({
            ...q,
            status: 'completed' as const,
            completedAt: doneDate,
            completedAtTs: completionTs,
            earnedXp: xpEarned,
          } as Quest)
          : q
      );
      setQuests((prev) =>
        prev.map((q) =>
          q.id === id
            ? ({
              ...q,
              status: 'completed' as const,
              completedAt: doneDate,
              completedAtTs: completionTs,
              earnedXp: xpEarned,
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

      // XP / level calc (shared utility — B5 fix)
      const { xp: newXp, xpToNext: newXpToNext, level: newLevel, totalXpEarned: newTotalXp, didLevelUp } =
        applyXpGain(stats.xp, stats.xpToNext, stats.level, stats.totalXpEarned ?? stats.xp, xpEarned);

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
          isPro ? 'Task completed ✅' : 'Quest Complete! ✅',
          `"${quest.title}" ${isPro ? 'completed' : 'vanquished'}. +${xpEarned} ${xpWord} earned${boostText}.`
        )
      );

      const milestones = [3, 7, 14, 30, 100];
      if (newStreak !== stats.streak && milestones.includes(newStreak)) {
        addNotification(
          makeNotification(
            'streak',
            isPro ? `${newStreak}-day streak 🔥` : `${newStreak}-Day Tapasya Streak! 🔥`,
            isPro ? 'Nice consistency. Keep it going.' : `${newStreak} days of unbroken practice. You are a true Yoddha!`
          )
        );
      }

      if (didLevelUp) {
        addNotification(
          makeNotification(
            'level_up',
            isPro ? `Level ${newLevel} reached` : `Level ${newLevel} Achieved! 🚀`,
            isPro ? `You're now Level ${newLevel}. Keep going.` : `Chakra ascended to Level ${newLevel}. New power unlocked!`
          )
        );
        // SFX: chime on level up
        sfx.play('levelUp', sfxEnabled);
      }
      // Achievements unlocked on this action (XP + semantic criteria)
      const ctx: AchievementEvalCtx = {
        stats: nextStats,
        quests: nextQuestsForCriteria,
        notes,
        today: doneDate,
        totalXp: newTotalXp,
        lastQuestCompletedTs: completionTs,
      };

      const { next: nextAchievements, unlockedNow } = unlockAchievementsWithContext(achievements, ctx, (a) =>
        addNotification(makeNotification('achievement', `${a.icon} ${a.title} Unlocked!`, a.description))
      );
      setAchievements(nextAchievements);
      if (unlockedNow.length > 0) {
        // SFX: temple bell on achievement unlock
        sfx.play('achievement', sfxEnabled);
      }

      // Auto-share card for Moksha (unlock all)
      maybeAutoShareMoksha(unlockedNow);

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
    [quests, notes, stats, achievements, addNotification, shop.activeBoost, sfxEnabled, appendCompletionLog, logXpEventWithQueue, userId, lang, isHinglish, maybeAutoShareMoksha]
  );

  const handleAddQuest = useCallback(
    (quest: Omit<Quest, 'id' | 'status'>) =>
      setQuests((prev) => [{ ...quest, id: uniqueId(), status: 'active' }, ...prev]),
    []
  );
  const handleAddNote = useCallback((note: Omit<Note, 'id' | 'createdAt'>) => {
    const createdAt = new Date().toISOString();
    const nextNote: Note = { ...note, id: uniqueId(), createdAt };

    setNotes((prev) => [nextNote, ...prev]);

    // Challenges: track daily/weekly notes created (used for Vidya Seeker / Scroll Master)
    setChallengeState((prev) => ({
      ...prev,
      dailyNotes: (prev.dailyNotes || 0) + 1,
      weeklyNotes: (prev.weeklyNotes || 0) + 1,
    }));

    // Achievements: semantic unlocks based on notes
    const ctx: AchievementEvalCtx = {
      stats,
      quests,
      notes: [nextNote, ...notes],
      today: todayISO(),
      totalXp: stats.totalXpEarned ?? stats.xp,
      lastNoteCreatedAt: createdAt,
    };

    const { next: nextAchievements, unlockedNow } = unlockAchievementsWithContext(achievements, ctx, (a) =>
      addNotification(makeNotification('achievement', `${a.icon} ${a.title} Unlocked!`, a.description))
    );

    if (unlockedNow.length > 0) {
      setAchievements(nextAchievements);
      sfx.play('achievement', sfxEnabled);
      maybeAutoShareMoksha(unlockedNow);
    }
  }, [notes, quests, stats, achievements, addNotification, sfxEnabled, maybeAutoShareMoksha]);

  const handleUpdateNote = useCallback(
    (id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'tags' | 'color' | 'emoji'>>) => {
      const now = new Date().toISOString();
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n;
          const rev: NoteRevision = {
            editedAt: now,
            title: n.title,
            content: n.content,
            tags: n.tags,
            color: n.color,
            emoji: n.emoji,
          };
          const prevRevs = Array.isArray((n as any).revisions) ? ((n as any).revisions as NoteRevision[]) : [];
          const revisions = [rev, ...prevRevs].slice(0, 25);
          return {
            ...n,
            ...patch,
            updatedAt: now,
            revisions,
          };
        })
      );
    },
    []
  );

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
        challengeState,
        weeklyReports,
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
  }, [quests, notes, stats, achievements, notifications, shop, focusSession, isDark, isHinglish, sfxEnabled, challengeState, weeklyReports]);

  const handleImportData = useCallback(
    async (file: File) => {
      const text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON file');
      }

      // Support both our export format and raw snapshot-only imports.
      const snapshot = parsed?.state ?? parsed?.snapshot ?? parsed?.data?.state ?? null;
      if (!snapshot || typeof snapshot !== 'object') {
        throw new Error('No KarmQuest state found in this file');
      }

      // Stop any running timers before swapping state.
      setFocusSession(null);
      setBreakSession(null);

      // Apply snapshot through the same migration path as persistence restore.
      restoreSnapshot(snapshot as PersistedSnapshot);

      // Optional settings/theme from export wrapper.
      if (parsed?.settings && typeof parsed.settings?.sfxEnabled === 'boolean') {
        setSfxEnabled(!!parsed.settings.sfxEnabled);
      }
      const mode = parsed?.theme?.mode;
      if (mode === 'light' || mode === 'dark' || mode === 'hinglish' || mode === 'pro') {
        // Importing should not override a signed-in user's cloud theme choice unless explicitly present.
        themeUserOverrideRef.current = true;
        setTheme(mode as any);
      }

      // After import, re-check achievements based on the imported snapshot so users see correct unlocks.
      try {
        const sAny = snapshot as any;
        const importedQuests: Quest[] = Array.isArray(sAny.quests) ? sAny.quests : [];
        const importedNotes: Note[] = Array.isArray(sAny.notes) ? sAny.notes : [];
        const importedStats: UserStats = (sAny.stats && typeof sAny.stats === 'object') ? ({ ...statsDefaults, ...sAny.stats } as any) : statsDefaults;
        const importedAchievements: Achievement[] = Array.isArray(sAny.achievements) ? sAny.achievements : defaultAchievements;

        const lastCompletionTs = (() => {
          const done = importedQuests
            .filter((q) => (q as any).status === 'completed' && (q.completedAt || '').trim())
            .map((q) => new Date(q.completedAt).getTime())
            .filter((n) => Number.isFinite(n));
          if (done.length === 0) return undefined;
          return Math.max(...done);
        })();

        const ctx: AchievementEvalCtx = {
          stats: importedStats,
          quests: importedQuests,
          notes: importedNotes,
          today: todayISO(),
          totalXp: importedStats.totalXpEarned ?? (importedStats as any).xp ?? 0,
          lastQuestCompletedTs: lastCompletionTs,
        };

        const { next } = unlockAchievementsWithContext(importedAchievements, ctx, () => void 0);
        setAchievements(next);
      } catch {
        // ignore
      }

      // Bring user back to dashboard so they can see imported data immediately.
      setCurrentPage('dashboard');
    },
    [restoreSnapshot, setTheme, statsDefaults]
  );

  const handleResetAll = useCallback(() => {
    // Full reset (including theme) – remove all per-user/guest/anon snapshots + additive logs.
    try {
      const prefixes = [
        'karmquest_state',
        'karmquest_state:',
        'karmquest_completion_log_v1:',
        'karmquest_weekly_reports_v1:',
        'karmquest_xp_event_queue_v1:',
        'karmquest_activity_queue_v1:',
        'karmquest_offline_queue_v1:',
      ];
      const exact = new Set<string>(['kq_theme', 'karmquest_seed_mode']);

      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) keys.push(k);
      }
      keys.forEach((k) => {
        if (exact.has(k) || prefixes.some((p) => k.startsWith(p))) {
          localStorage.removeItem(k);
        }
      });
    } catch {
      // ignore
    }
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
          `${newQuests.length} ${tasksWord} created — start your next run!`
        )
      );
    },
    [addNotification, tasksWord]
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
          addNotification(makeNotification('achievement', 'Not enough coins 🪙', `Earn more ${coinWord} by completing ${tasksWord}.`));
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
          addNotification(makeNotification('achievement', 'Not enough coins 🪙', `Earn more ${coinWord} by completing ${tasksWord}.`));
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
          addNotification(makeNotification('achievement', 'Not enough coins 🪙', `Earn more ${coinWord} by completing ${tasksWord}.`));
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
          addNotification(makeNotification('achievement', 'Not enough coins 🪙', `Earn more ${coinWord} by completing ${tasksWord}.`));
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
    [shop, stats.coins, addNotification, coinWord, tasksWord]
  );

  const startFocus = useCallback(
    (questId: string, opts?: { durationMs?: number; label?: string }) => {
      const q = quests.find((x) => x.id === questId);
      if (!q || q.status === 'completed') return;

      // Starting a new focus session ends any break.
      if (breakSession) setBreakSession(null);

      const now = Date.now();
      const durationMs =
        typeof opts?.durationMs === 'number' && opts.durationMs > 0 ? opts.durationMs : FOCUS_DEFAULT_MS;
      const label = (opts?.label || (durationMs === FOCUS_DEFAULT_MS ? 'Pomodoro' : 'Focus')).trim();
      const bonusXp = calcFocusBonusXp(durationMs);

      const next: FocusSession = {
        questId,
        startedAt: now,
        endsAt: now + durationMs,
        durationMs,
        bonusXp,
        label,
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
    [quests, focusSession, breakSession, addNotification, lang, calcFocusBonusXp]
  );

  const stopFocus = useCallback((reason?: string) => {
    if (!focusSession) return;
    setFocusSession(null);
    if (reason) {
      addNotification(makeNotification('focus', 'Focus stopped', reason));
    }
  }, [focusSession, addNotification]);


  // Cancel/Delete an active task:
  // - removed from UI and local state
  // - removed from backend on next sync (tasks table mirrors local state)
  // - no coins / XP are awarded
  // NOTE: Completed tasks are not deletable (they remain for history + backend).
  const handleDeleteQuest = useCallback((id: string) => {
    const q = quests.find((x) => x.id === id);
    if (!q) return;
    if (q.status === 'completed') return;

    if (focusSession?.questId === id) {
      stopFocus('Task cancelled. Focus ended.');
    }

    setQuests((prev) => prev.filter((x) => x.id !== id));

    addNotification(
      makeNotification(
        'quest_complete',
        isPro ? 'Task deleted' : 'Quest cancelled',
        `"${q.title}" removed. No ${coinWord} awarded.`
      )
    );
  }, [quests, focusSession, stopFocus, addNotification, isPro, coinWord]);


  const startBreak = useCallback(
    (kind: 'short' | 'long') => {
      const now = Date.now();
      const durationMs = kind === 'long' ? LONG_BREAK_MS : SHORT_BREAK_MS;
      setBreakSession({
        startedAt: now,
        endsAt: now + durationMs,
        durationMs,
        kind,
      });
      setFocusNow(now);
      addNotification(
        makeNotification('focus', kind === 'long' ? 'Long break started ☕' : 'Short break started ☕', `Timer: ${Math.round(durationMs / 60_000)} min`)
      );
    },
    [addNotification]
  );

  const stopBreak = useCallback(
    (reason?: string) => {
      if (!breakSession) return;
      setBreakSession(null);
      if (reason) addNotification(makeNotification('focus', 'Break ended', reason));
    },
    [breakSession, addNotification]
  );

  const awardFocusBonus = useCallback(
    (questId: string, bonusXp: number) => {
      const q = quests.find((x) => x.id === questId);
      if (!q) {
        // Quest was deleted during the session → end quietly, no bonus.
        setFocusSession(null);
        addNotification(makeNotification('focus', 'Focus ended', 'That quest was removed, so no bonus was awarded.'));
        return;
      }
      const title = q.title;

      // XP / level calc (shared utility — B5 fix)
      const { xp: newXp, xpToNext: newXpToNext, level: newLevel, totalXpEarned: newTotalXp, didLevelUp } =
        applyXpGain(stats.xp, stats.xpToNext, stats.level, stats.totalXpEarned ?? stats.xp, bonusXp);

      setStats((prev) => ({
        ...prev,
        xp: newXp,
        xpToNext: newXpToNext,
        level: newLevel,
        totalXpEarned: newTotalXp,
      }));

      // Social leaderboard: log focus bonus XP (offline-safe; queued if needed)
      void logXpEventWithQueue(bonusXp, 'focus', { questId, title });

      // Challenges: track focus sessions completed + weekly XP earned
      setChallengeState((prev) => ({
        ...prev,
        dailyFocus: (prev.dailyFocus || 0) + 1,
        weeklyXp: (prev.weeklyXp || 0) + bonusXp,
      }));

      // SFX: coin on XP gain
      sfx.play('coin', sfxEnabled);
      // Achievements unlocked on this action (XP + semantic criteria)
      const nextStatsForCriteria: UserStats = {
        ...stats,
        xp: newXp,
        xpToNext: newXpToNext,
        level: newLevel,
        totalXpEarned: newTotalXp,
      };
      const ctx: AchievementEvalCtx = {
        stats: nextStatsForCriteria,
        quests,
        notes,
        today: todayISO(),
        totalXp: newTotalXp,
      };

      const { next: nextAchievements, unlockedNow } = unlockAchievementsWithContext(achievements, ctx, (a) =>
        addNotification(makeNotification('achievement', `${a.icon} ${a.title} Unlocked!`, a.description))
      );
      setAchievements(nextAchievements);
      if (unlockedNow.length > 0) {
        // SFX: temple bell on achievement unlock
        sfx.play('achievement', sfxEnabled);
      }

      addNotification(
        makeNotification('focus', t('focusCompleteTitle', lang), `Pomodoro finished for "${title}". +${bonusXp} bonus XP.`)
      );

      if (didLevelUp) {
        addNotification(makeNotification(
          'level_up',
          isPro ? `Level ${newLevel} reached` : `Level ${newLevel} Achieved! 🚀`,
          isPro ? `You're now Level ${newLevel}.` : `Chakra ascended to Level ${newLevel}.`
        ));
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

      // Auto-start a Pomodoro break between sessions (short every session, long every 4th)
      const nextFocusCount = (challengeState.dailyFocus || 0) + 1;
      const kind: 'short' | 'long' = nextFocusCount % 4 === 0 ? 'long' : 'short';
      startBreak(kind);

      setFocusSession(null);
    },
    [quests, notes, stats, achievements, challengeState, startBreak, addNotification, lang, sfxEnabled, logXpEventWithQueue, userId]
  );

  // Auto-award focus bonus when timer completes (idempotent)
  useEffect(() => {
    if (!hydrated) return;
    if (!focusSession) return;
    if (focusSession.awarded) return;
    if (Date.now() < focusSession.endsAt) return;

    const key = `${focusSession.questId}:${focusSession.endsAt}`;
    if (focusAwardGuardRef.current === key) return;
    focusAwardGuardRef.current = key;

    // Mark awarded immediately to prevent double-award during rapid re-renders
    setFocusSession((prev) => {
      if (!prev) return prev;
      if (prev.questId !== focusSession.questId || prev.endsAt !== focusSession.endsAt) return prev;
      return { ...prev, awarded: true };
    });

    const bonus = typeof focusSession.bonusXp === 'number' ? focusSession.bonusXp : calcFocusBonusXp(focusSession.durationMs || FOCUS_DEFAULT_MS);
    awardFocusBonus(focusSession.questId, bonus);
  }, [hydrated, focusSession, awardFocusBonus, calcFocusBonusXp]);

  // Auto-end break when timer completes
  useEffect(() => {
    if (!hydrated) return;
    if (!breakSession) return;
    if (Date.now() < breakSession.endsAt) return;

    if (breakEndGuardRef.current === breakSession.endsAt) return;
    breakEndGuardRef.current = breakSession.endsAt;

    setBreakSession(null);
    addNotification(makeNotification('focus', 'Break complete ✅', 'Ready for the next session.'));
  }, [hydrated, breakSession, addNotification]);

  // ── Challenge reward claims ────────────────────────────────────────────
  const handleClaimChallenge = useCallback((challengeId: string, reward: number) => {
    setChallengeState((prev) => ({
      ...prev,
      claimed: { ...(prev.claimed || {}), [challengeId]: true },
    }));
    setStats((prev) => ({ ...prev, coins: prev.coins + reward }));
    addNotification(makeNotification(
      'achievement',
      isPro ? 'Reward claimed 🪙' : 'Challenge claimed 🪙',
      isPro ? `+${reward} ${coinWord} added.` : `+${reward} Mudras added to your wallet.`
    ));
    sfx.play('coin', sfxEnabled);
  }, [addNotification, sfxEnabled, isPro, coinWord]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            stats={stats}
            quests={quests}
            notes={notes}
            achievements={achievements}
            onNavigate={handleNavigate}
            weeklyReport={activeWeeklyReport}
            onDismissWeeklyReport={handleDismissWeeklyReport}
            weeklyReportAutoOpen={weeklyReportAutoOpen}
            onWeeklyReportAutoOpenConsumed={() => setWeeklyReportAutoOpen(false)}
          />
        );
      case 'quests':
        return (
          <QuestBoard
            quests={quests}
            onComplete={handleCompleteQuest}
            onAdd={handleAddQuest}
            onUpdate={handleUpdateQuest}
            onDelete={handleDeleteQuest}
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
            onUpdate={handleUpdateNote}
            externalSearchQuery={globalSearch}
            focusNoteId={focusNoteId}
            onFocusHandled={() => setFocusNoteId(null)}
          />
        );
      case 'achievements':
        return (
          <Achievements
            achievements={achievements}
            stats={stats}
            quests={quests}
            notes={notes}
            onShareAchievement={openAchievementShare}
          />
        );
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
      case 'leaderboard':
        return <LeaderboardPage enabled={!!userId} />;
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
                ? { connected: cloud.remoteHydrated, saving: (cloud.saving || tasksCloud.syncing), queued: cloud.queued || xpQueueCount > 0, error: (cloud.error ?? tasksCloud.error), lastSyncedAt: cloud.lastSyncedAt ?? null }
                : { connected: false, saving: false, queued: false, error: null, lastSyncedAt: null }
            }
            onImport={handleImportData}
          />
        );
      default:
        return (
          <Dashboard
            stats={stats}
            quests={quests}
            notes={notes}
            achievements={achievements}
            onNavigate={handleNavigate}
            weeklyReport={activeWeeklyReport}
            onDismissWeeklyReport={handleDismissWeeklyReport}
            weeklyReportAutoOpen={weeklyReportAutoOpen}
            onWeeklyReportAutoOpenConsumed={() => setWeeklyReportAutoOpen(false)}
          />
        );
    }
  };

  // Use theme tokens for backgrounds so each theme controls the overall feel.
  // Theme 1 (Saffron Light) becomes warm/cream, Theme 3 becomes light blue/violet, Theme 4 stays deep indigo.
  const bgGradient = theme === 'modern'
    ? 'bg-[var(--kq-bg)]'
    : theme === 'hinglish'
      ? 'bg-gradient-to-br from-[var(--kq-bg)] via-[var(--kq-bg2)] to-[var(--kq-bg)]'
      : 'bg-gradient-to-br from-[var(--kq-bg)] via-[var(--kq-bg2)] to-[var(--kq-bg3)]';
  // ── Auth gate ─────────────────────────────────────────────────────────
  // Hooks above must run on every render. Only return conditionally *after* hooks.
  if (publicUsername) {
    return (
      <div className={`min-h-screen ${bgGradient} relative overflow-x-hidden`}>
        <Particles />
        <SubtlePattern />
        <div className="relative z-10 pt-10 pb-10 px-4 md:px-6">
          <PublicProfilePage username={publicUsername} />
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-10 text-sm text-slate-500">
        Loading...
      </div>
    );
  }

  if (!userId && guestMode && guestBooting) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-10 text-sm text-slate-500">
        Setting up guest profile...
      </div>
    );
  }

  if (!userId && !guestMode) {
    return (
      <AuthGate
        onContinueAsGuest={() => {
          // Always start Guest fresh (no persistence across guest sessions)
          try {
            localStorage.removeItem('karmquest_state:guest');
            localStorage.removeItem('karmquest_completion_log_v1:guest');
            localStorage.removeItem('karmquest_weekly_reports_v1:guest');
          } catch {
            // ignore
          }
          guestHadStateRef.current = false;
          setGuestBooting(true);
          setGuestMode(true);
        }}
      />
    );
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
        focusSession={focusSession}
        focusRemainingMs={focusRemainingMs}
        onStopFocus={() => stopFocus()}
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
        authEmail={userEmail}
        cloudStatus={
          userId
            ? {
              connected: cloud.remoteHydrated,
              saving: cloud.saving || tasksCloud.syncing,
              queued: cloud.queued || xpQueueCount > 0,
              error: cloud.error ?? tasksCloud.error,
              lastSyncedAt: cloud.lastSyncedAt ?? null,
            }
            : { connected: false, saving: false, queued: false, error: null, lastSyncedAt: null }
        }
        onOpenAuth={!userId ? () => setGuestMode(false) : undefined}
        onSignOut={userId ? () => void signOut() : undefined}
      />

      <FloatingTimerPill
        focusSession={focusSession}
        focusRemainingMs={focusRemainingMs}
        breakSession={breakSession}
        breakRemainingMs={breakRemainingMs}
        quests={quests}
        onNavigate={handleNavigate}
        onFocusQuest={(qid) => {
          setFocusQuestId(qid);
          setFocusNoteId(null);
        }}
        onStopFocus={() => stopFocus()}
        onStopBreak={() => stopBreak('Break skipped')}
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

      <AchievementShareCard
        achievement={shareAchievement}
        stats={stats}
        open={shareAchievementOpen}
        onClose={() => setShareAchievementOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
