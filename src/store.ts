export type Difficulty = 'easy' | 'medium' | 'hard' | 'legendary';
export type QuestStatus = 'active' | 'completed';
export type Recurrence = 'none' | 'daily' | 'weekly';
export type Page =
  | 'dashboard'
  | 'quests'
  | 'notes'
  | 'achievements'
  | 'challenges'
  | 'shop'
  | 'leaderboard'
  | 'focus'
  | 'profile';

export interface FocusSession {
  questId: string;
  startedAt: number;
  endsAt: number;
  durationMs: number;
  bonusXp: number;
  /** Optional label for the chosen focus mode (e.g. Pomodoro, Deep Work). */
  label?: string;
  /** Guard against awarding twice on refresh. */
  awarded: boolean;
}

export interface BreakSession {
  startedAt: number;
  endsAt: number;
  durationMs: number;
  kind: 'short' | 'long';
}

export interface FocusHistoryEntry {
  id: string;
  questId: string;
  questTitle: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  label: string;
  xpAwarded: number;
  day: string; // YYYY-MM-DD
}

export interface SubTask {
  id: string;
  text: string;
  done: boolean;
}

export interface Quest {
  id: string;
  title: string;
  difficulty: Difficulty;
  xpReward: number;
  dueDate: string;
  status: QuestStatus;
  category: string;

  /** Optional: XP actually earned at completion (after boosts). */
  earnedXp?: number;

  // New features
  recurring: Recurrence;
  /** YYYY-MM-DD of completion (used for recurring resets). Empty when not completed. */
  completedAt: string;
  /** Epoch ms of completion for time-based achievements (optional). */
  completedAtTs?: number;
  /** Optional list of checklist items. */
  subtasks: SubTask[];
  /** Optional special title badge (from Mudra Shop). */
  badge: string; // TitleBadgeId, kept as string for backward-compat
  /** Optional manual sorting order. */
  order?: number;
}

export interface NoteRevision {
  /** ISO timestamp when this revision was created (edit time). */
  editedAt: string;
  title: string;
  content: string;
  tags: string[];
  color: string;
  emoji: string;
  /** Optional folder categorization. */
  folder?: string;
  /** Optional ID of a quest this note is linked to. */
  linkedQuestId?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  color: string;
  /** ISO timestamp of creation. */
  createdAt: string;
  /** ISO timestamp of last edit (optional). */
  updatedAt?: string;
  /** Previous versions (newest first). */
  revisions?: NoteRevision[];
  emoji: string;
  /** Optional folder categorization. */
  folder?: string;
  /** Optional ID of a quest this note is linked to. */
  linkedQuestId?: string;
}

export type AchievementCriteria = {
  /** Level requirement. */
  minLevel?: number;
  /** Current streak requirement. */
  minStreak?: number;
  /** Best streak ever achieved. */
  minStreakRecord?: number;
  /** Total quests completed (lifetime). */
  minQuestsCompleted?: number;
  /** Quests completed on a specific day (usually today). */
  minQuestsCompletedInDay?: number;
  /** Notes (Vidya scrolls) created (lifetime). */
  minNotesCreated?: number;
  /** Require at least one completed quest of this difficulty. */
  anyCompletedDifficulty?: Difficulty;
  /** Unlock if a quest was completed before this local hour (e.g., 6 = before dawn). */
  questCompletedBeforeHour?: number;
  /** Unlock if a note was created before this local hour (e.g., 3 = after midnight). */
  noteCreatedBeforeHour?: number;
  /** Special: unlock when all other achievements are unlocked. */
  requiresAllOtherAchievements?: boolean;
};

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  xpRequired: number;
  /** Optional semantic unlock rules (in addition to xpRequired). */
  criteria?: AchievementCriteria;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserStats {
  level: number;
  /** XP progress within the current level (used for the TopNav bar). */
  xp: number;
  xpToNext: number;
  /** Lifetime XP earned across the whole profile (used for achievements). */
  totalXpEarned: number;
  coins: number;
  streak: number;
  /** Best streak ever achieved. */
  streakRecord: number;
  lastActiveDate: string; // YYYY-MM-DD, '' if never active
  /** YYYY-MM-DD of the last "daily challenges available" notification. */
  lastDailyChallengeNotified: string;
  questsCompleted: number;
  totalQuests: number;
  avatarEmoji: string;
  /** Optional uploaded avatar image stored in Supabase Storage (private). */
  avatarImagePath?: string | null;
  username: string;
}

export interface CustomChallenge {
  id: string;
  title: string;
  description: string;
  targetCount: number; // e.g., complete X quests or earn X XP
  rewardCoins: number;
  creator: string; // 'community' or username
  isCommunity: boolean;
  requiresChallengeId?: string; // For chains (A -> B unlock)
  status: 'available' | 'active' | 'completed';
  progress: number;
  type: 'quests' | 'xp'; // What are we tracking?
}

export const defaultCommunityChallenges: CustomChallenge[] = [
  {
    id: 'cc-1',
    title: 'The Path of Karma I',
    description: 'Complete 5 karma quests to show your dedication.',
    targetCount: 5,
    rewardCoins: 100,
    creator: 'Community',
    isCommunity: true,
    status: 'available',
    progress: 0,
    type: 'quests'
  },
  {
    id: 'cc-2',
    title: 'The Path of Karma II',
    description: 'Master your routine by completing 15 more quests.',
    targetCount: 15,
    rewardCoins: 300,
    creator: 'Community',
    isCommunity: true,
    requiresChallengeId: 'cc-1',
    status: 'available',
    progress: 0,
    type: 'quests'
  },
  {
    id: 'cc-3',
    title: 'XP Grind Champion',
    description: 'Earn 1000 XP through any activity.',
    targetCount: 1000,
    rewardCoins: 500,
    creator: 'Community',
    isCommunity: true,
    status: 'available',
    progress: 0,
    type: 'xp'
  }
];

// Optional event type used by analytics (safe even if you don't persist it yet).
export type FocusLogEvent = {
  earnedAt: number; // epoch ms
  category: string;
  xp: number;
  questId?: string;
};

export const difficultyConfig: Record<Difficulty, { label: string; color: string; bg: string; darkBg: string; xp: number }> = {
  easy: { label: 'Sahaj', color: 'text-emerald-600', bg: 'bg-emerald-50', darkBg: 'bg-emerald-500/10', xp: 10 },
  medium: { label: 'Madhyam', color: 'text-[var(--kq-accent)]', bg: 'bg-amber-50', darkBg: 'bg-[var(--kq-accent)]/10', xp: 25 },
  hard: { label: 'Kathin', color: 'text-red-500', bg: 'bg-red-50', darkBg: 'bg-red-500/10', xp: 50 },
  legendary: { label: 'Divya', color: 'text-[var(--kq-primary)]', bg: 'bg-violet-50', darkBg: 'bg-[var(--kq-primary)]/10', xp: 100 },
};

export const defaultQuests: Quest[] = [
  { id: '1', title: 'Complete the project proposal', difficulty: 'hard', xpReward: 50, dueDate: 'Today', status: 'active', category: 'Karma', recurring: 'none', completedAt: '', subtasks: [], badge: 'none' },
  { id: '2', title: 'Read 20 pages of Bhagavad Gita', difficulty: 'easy', xpReward: 10, dueDate: 'Today', status: 'active', category: 'Vidya', recurring: 'none', completedAt: '', subtasks: [], badge: 'none' },
  // Perfect recurring habit example + checklist
  {
    id: '3', title: 'Morning Surya Namaskar – 12 rounds', difficulty: 'medium', xpReward: 25, dueDate: 'Today', status: 'active', category: 'Yoga', recurring: 'daily', completedAt: '', subtasks: [
      { id: '3-1', text: 'Warm-up (2 min)', done: false },
      { id: '3-2', text: '12 rounds', done: false },
      { id: '3-3', text: 'Cool down + water', done: false },
    ], badge: 'none'
  },
  { id: '4', title: 'Design the landing page mockup', difficulty: 'hard', xpReward: 50, dueDate: 'Tomorrow', status: 'active', category: 'Karma', recurring: 'none', completedAt: '', subtasks: [], badge: 'none' },
  { id: '5', title: 'Dhyana meditation – 10 minutes', difficulty: 'easy', xpReward: 10, dueDate: 'Today', status: 'active', category: 'Sadhana', recurring: 'daily', completedAt: '', subtasks: [], badge: 'none' },
  { id: '6', title: 'Defeat the Asura of Procrastination', difficulty: 'legendary', xpReward: 100, dueDate: 'This Week', status: 'active', category: 'Boss Quest', recurring: 'weekly', completedAt: '', subtasks: [], badge: 'none' },
  { id: '7', title: 'Organize workspace – Vastu style', difficulty: 'easy', xpReward: 10, dueDate: 'Today', status: 'completed', category: 'Griha', recurring: 'none', completedAt: todayISO(), subtasks: [], badge: 'none' },
  { id: '8', title: 'Write blog post on Yoga benefits', difficulty: 'medium', xpReward: 25, dueDate: 'Yesterday', status: 'completed', category: 'Creative', recurring: 'none', completedAt: yesterdayISO(), subtasks: [], badge: 'none' },
];

export const defaultNotes: Note[] = [
  { id: '1', title: 'React Chakra Patterns', content: 'Compound components, render props, custom hooks – master these like Arjuna mastered the bow.', tags: ['React', 'Code'], color: '#6366F1', createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(), emoji: '⚛️' },
  { id: '2', title: 'Weekly Sankalp Plan', content: 'Ship feature X, review PRs, plan sprint. Each task a step on the path of Dharma.', tags: ['Planning', 'Karma'], color: '#0EA5E9', createdAt: new Date(Date.now() - 5 * 3600_000).toISOString(), emoji: '🎯' },
  { id: '3', title: 'Creative Ideas Vault', content: 'AI-powered habit tracker, gamified reading app, micro-journaling with raga-based moods.', tags: ['Ideas', 'Creative'], color: '#8B5CF6', createdAt: new Date(Date.now() - 24 * 3600_000).toISOString(), emoji: '💡' },
  { id: '4', title: 'Sprint Review Notes', content: 'Team velocity up 15%, address tech debt. Demo went as smooth as a Kathak performance!', tags: ['Meeting', 'Karma'], color: '#EC4899', createdAt: new Date(Date.now() - 2 * 24 * 3600_000).toISOString(), emoji: '📋' },
  { id: '5', title: 'Gita Wisdom Notes', content: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन – Focus on actions, not on the fruits of actions.', tags: ['Wisdom', 'Vidya'], color: '#F59E0B', createdAt: new Date(Date.now() - 3 * 24 * 3600_000).toISOString(), emoji: '🕉️' },
  { id: '6', title: 'Yoga & Wellness Log', content: 'Surya Namaskar, Pranayama, Dhyana. Balance mind-body like the perfect Nataraja pose.', tags: ['Yoga', 'Wellness'], color: '#10B981', createdAt: new Date(Date.now() - 4 * 24 * 3600_000).toISOString(), emoji: '🧘' },
];

export const defaultAchievements: Achievement[] = [
  { id: '1', title: "Arjuna's First Arrow", description: 'Complete your first karma quest', icon: '🏹', unlocked: true, xpRequired: 0, criteria: { minQuestsCompleted: 1 }, rarity: 'common' },
  { id: '2', title: "Hanuman's Devotion", description: 'Reach a 3-day tapasya streak', icon: '🪔', unlocked: true, xpRequired: 50, criteria: { minStreak: 3 }, rarity: 'common' },
  { id: '3', title: "Saraswati's Blessing", description: 'Create 5 vidya scrolls', icon: '🪷', unlocked: true, xpRequired: 100, criteria: { minNotesCreated: 5 }, rarity: 'rare' },
  { id: '4', title: 'Karma Yogi', description: 'Complete 10 quests', icon: '🕉️', unlocked: true, xpRequired: 200, criteria: { minQuestsCompleted: 10 }, rarity: 'rare' },
  { id: '5', title: "Durga's Shield", description: 'Complete a Kathin quest', icon: '🛡️', unlocked: true, xpRequired: 300, criteria: { anyCompletedDifficulty: 'hard' }, rarity: 'epic' },
  { id: '6', title: "Vayu's Speed", description: 'Complete 5 quests in one day', icon: '💨', unlocked: false, xpRequired: 400, criteria: { minQuestsCompletedInDay: 5 }, rarity: 'epic' },
  { id: '7', title: 'Chakravarti', description: 'Reach Level 10', icon: '👑', unlocked: false, xpRequired: 500, criteria: { minLevel: 10 }, rarity: 'legendary' },
  { id: '8', title: 'Vidya Guru', description: 'Create 20 knowledge scrolls', icon: '📿', unlocked: false, xpRequired: 600, criteria: { minNotesCreated: 20 }, rarity: 'legendary' },
  { id: '9', title: 'Tapasvi Supreme', description: '30-day tapasya streak', icon: '💎', unlocked: false, xpRequired: 800, criteria: { minStreakRecord: 30 }, rarity: 'legendary' },
  { id: '10', title: 'Moksha', description: 'Unlock all achievements', icon: '✨', unlocked: false, xpRequired: 1000, criteria: { requiresAllOtherAchievements: true }, rarity: 'legendary' },
  { id: '11', title: 'Brahma Muhurta', description: 'Complete quest before dawn', icon: '🌅', unlocked: false, xpRequired: 150, criteria: { questCompletedBeforeHour: 6 }, rarity: 'rare' },
  { id: '12', title: 'Chandra Dev', description: 'Create a scroll after midnight', icon: '🌙', unlocked: false, xpRequired: 250, criteria: { noteCreatedBeforeHour: 3 }, rarity: 'rare' },
];

export const motivationalQuotes = [
  "कर्मण्येवाधिकारस्ते – Focus on your Karma! 🙏",
  "Your Tapasya streak is your superpower!",
  "Level up like Arjuna mastered the bow! 🏹",
  "Every quest is a step on the path of Dharma!",
  "Vidya scrolls make you wiser! 📜",
  "Today's Karma is tomorrow's Punya!",
  "You walk the path of greatness, Yoddha!",
  "Consistency is the ultimate Sadhana!",
];

export const noteColors = ['#6366F1', '#0EA5E9', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#F43F5E', '#06B6D4'];

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers (used by QuestBoard + streak logic)
// ─────────────────────────────────────────────────────────────────────────────

/** Today as YYYY-MM-DD in the user's local time. */
export function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Yesterday as YYYY-MM-DD in the user's local time. */
export function yesterdayISO(): string {
  const d = new Date(Date.now() - 86_400_000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDaysISO(baseISO: string, days: number): string {
  const [y, m, dd] = baseISO.split('-').map(Number);
  const base = new Date(y, (m - 1), dd);
  const next = new Date(base.getTime() + days * 86_400_000);
  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const ddd = String(next.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${ddd}`;
}

export type ParsedDueDate = {
  /** A short, UI-friendly label (e.g., Today, Tomorrow, 23 Feb). */
  label: string;
  /** Normalized ISO date if we could resolve it; empty string otherwise. */
  iso: string;
  /** Local-midnight Date for calendar views; null if unknown. */
  date: Date | null;
  /** Whole-day difference from today (negative = overdue). null if unknown. */
  daysFromToday: number | null;
  isOverdue: boolean;
  isDueToday: boolean;
  /** "Soon" = within the next 3 days (excluding today). */
  isDueSoon: boolean;
};

// ── Weekly progress report (shareable card) ────────────────────────────────
export type WeeklyReport = {
  /** Unique id for UI lists (not used for logic). */
  id: string;
  /** Optional display title for the report card (older saves may not have it). */
  title?: string;
  /** Monday of the week (local time) as YYYY-MM-DD. */
  weekStart: string;
  /** Sunday of the week (local time) as YYYY-MM-DD. */
  weekEnd: string;
  /** When the report was generated (ISO timestamp). */
  generatedAt: string;
  /** Weekly totals */
  questsCompleted: number;
  xpEarned: number;
  coinsEarned: number;
  /** Streak snapshot at generation time */
  streakDays: number;
  /** Optional label used by some UI variants (older saves may not have it). */
  levelLabel?: string;
  /** For branding */
  username: string;
  avatarEmoji: string;
  /** Optional: whether user hid it from the dashboard */
  dismissedAt?: string;
};

/**
 * Accepts either:
 *  - ISO date (YYYY-MM-DD)
 *  - Seed strings: Today, Tomorrow, Yesterday, This Week
 */
export function parseDueDate(raw: string): ParsedDueDate {
  const s = (raw || '').trim();
  if (!s) {
    return { label: '', iso: '', date: null, daysFromToday: null, isOverdue: false, isDueToday: false, isDueSoon: false };
  }

  const today = todayISO();
  let iso = '';

  // Seed labels
  const lower = s.toLowerCase();
  if (lower === 'today') iso = today;
  else if (lower === 'tomorrow') iso = addDaysISO(today, 1);
  else if (lower === 'yesterday') iso = addDaysISO(today, -1);
  else if (lower === 'this week' || lower === 'thisweek') iso = addDaysISO(today, 6);
  else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) iso = s;

  if (!iso) {
    // Unknown format – show as-is, but treat as "no sortable date"
    return { label: s, iso: '', date: null, daysFromToday: null, isOverdue: false, isDueToday: false, isDueSoon: false };
  }

  const [y, m, d] = iso.split('-').map(Number);
  const due = toLocalMidnight(new Date(y, m - 1, d));
  const now = toLocalMidnight(new Date());
  const daysFromToday = Math.round((due.getTime() - now.getTime()) / 86_400_000);

  const isOverdue = daysFromToday < 0;
  const isDueToday = daysFromToday === 0;
  const isDueSoon = daysFromToday > 0 && daysFromToday <= 3;

  // Human label
  let label = s;
  if (daysFromToday === 0) label = 'Today';
  else if (daysFromToday === 1) label = 'Tomorrow';
  else if (daysFromToday === -1) label = 'Yesterday';
  else if (lower === 'this week' || lower === 'thisweek') label = 'This Week';
  else {
    // 23 Feb format (stable, compact)
    label = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(due);
  }

  if (isOverdue) {
    // Make overdue obvious even when the caller doesn't add extra text.
    label = `Overdue • ${label}`;
  }

  return { label, iso, date: due, daysFromToday, isOverdue, isDueToday, isDueSoon };
}

/**
 * Sorting key used in QuestBoard.
 * - Overdue comes first (most overdue first)
 * - Then today, then upcoming (soonest first)
 * - Unknown/no date goes last
 */
export function dueDateSortKey(raw: string): number {
  const p = parseDueDate(raw);
  if (p.daysFromToday === null) return 1_000_000;
  // Overdue: more negative => smaller key (shows first)
  return p.daysFromToday;
}
