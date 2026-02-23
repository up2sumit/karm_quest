export type Difficulty = 'easy' | 'medium' | 'hard' | 'legendary';
export type QuestStatus = 'active' | 'completed';
export type Page = 'dashboard' | 'quests' | 'notes' | 'achievements' | 'challenges';

export interface Quest {
  id: string;
  title: string;
  difficulty: Difficulty;
  xpReward: number;
  dueDate: string;
  status: QuestStatus;
  category: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  color: string;
  createdAt: string;
  emoji: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  xpRequired: number;
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
  lastActiveDate: string; // YYYY-MM-DD, '' if never active
  /** YYYY-MM-DD of the last "daily challenges available" notification. */
  lastDailyChallengeNotified: string;
  questsCompleted: number;
  totalQuests: number;
  avatarEmoji: string;
  username: string;
}

export const difficultyConfig: Record<Difficulty, { label: string; color: string; bg: string; darkBg: string; xp: number }> = {
  easy: { label: 'Sahaj', color: 'text-emerald-600', bg: 'bg-emerald-50', darkBg: 'bg-emerald-500/10', xp: 10 },
  medium: { label: 'Madhyam', color: 'text-amber-600', bg: 'bg-amber-50', darkBg: 'bg-amber-500/10', xp: 25 },
  hard: { label: 'Kathin', color: 'text-red-500', bg: 'bg-red-50', darkBg: 'bg-red-500/10', xp: 50 },
  legendary: { label: 'Divya', color: 'text-violet-500', bg: 'bg-violet-50', darkBg: 'bg-violet-500/10', xp: 100 },
};

export const defaultQuests: Quest[] = [
  { id: '1', title: 'Complete the project proposal', difficulty: 'hard', xpReward: 50, dueDate: 'Today', status: 'active', category: 'Karma' },
  { id: '2', title: 'Read 20 pages of Bhagavad Gita', difficulty: 'easy', xpReward: 10, dueDate: 'Today', status: 'active', category: 'Vidya' },
  { id: '3', title: 'Morning Surya Namaskar – 12 rounds', difficulty: 'medium', xpReward: 25, dueDate: 'Today', status: 'active', category: 'Yoga' },
  { id: '4', title: 'Design the landing page mockup', difficulty: 'hard', xpReward: 50, dueDate: 'Tomorrow', status: 'active', category: 'Karma' },
  { id: '5', title: 'Dhyana meditation – 10 minutes', difficulty: 'easy', xpReward: 10, dueDate: 'Today', status: 'active', category: 'Sadhana' },
  { id: '6', title: 'Defeat the Asura of Procrastination', difficulty: 'legendary', xpReward: 100, dueDate: 'This Week', status: 'active', category: 'Boss Quest' },
  { id: '7', title: 'Organize workspace – Vastu style', difficulty: 'easy', xpReward: 10, dueDate: 'Today', status: 'completed', category: 'Griha' },
  { id: '8', title: 'Write blog post on Yoga benefits', difficulty: 'medium', xpReward: 25, dueDate: 'Yesterday', status: 'completed', category: 'Creative' },
];

export const defaultNotes: Note[] = [
  { id: '1', title: 'React Chakra Patterns', content: 'Compound components, render props, custom hooks – master these like Arjuna mastered the bow.', tags: ['React', 'Code'], color: '#6366F1', createdAt: '2 hours ago', emoji: '⚛️' },
  { id: '2', title: 'Weekly Sankalp Plan', content: 'Ship feature X, review PRs, plan sprint. Each task a step on the path of Dharma.', tags: ['Planning', 'Karma'], color: '#0EA5E9', createdAt: '5 hours ago', emoji: '🎯' },
  { id: '3', title: 'Creative Ideas Vault', content: 'AI-powered habit tracker, gamified reading app, micro-journaling with raga-based moods.', tags: ['Ideas', 'Creative'], color: '#8B5CF6', createdAt: '1 day ago', emoji: '💡' },
  { id: '4', title: 'Sprint Review Notes', content: 'Team velocity up 15%, address tech debt. Demo went as smooth as a Kathak performance!', tags: ['Meeting', 'Karma'], color: '#EC4899', createdAt: '2 days ago', emoji: '📋' },
  { id: '5', title: 'Gita Wisdom Notes', content: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन – Focus on actions, not on the fruits of actions.', tags: ['Wisdom', 'Vidya'], color: '#F59E0B', createdAt: '3 days ago', emoji: '🕉️' },
  { id: '6', title: 'Yoga & Wellness Log', content: 'Surya Namaskar, Pranayama, Dhyana. Balance mind-body like the perfect Nataraja pose.', tags: ['Yoga', 'Wellness'], color: '#10B981', createdAt: '4 days ago', emoji: '🧘' },
];

export const defaultAchievements: Achievement[] = [
  { id: '1', title: "Arjuna's First Arrow", description: 'Complete your first karma quest', icon: '🏹', unlocked: true, xpRequired: 0, rarity: 'common' },
  { id: '2', title: "Hanuman's Devotion", description: 'Reach a 3-day tapasya streak', icon: '🪔', unlocked: true, xpRequired: 50, rarity: 'common' },
  { id: '3', title: "Saraswati's Blessing", description: 'Create 5 vidya scrolls', icon: '🪷', unlocked: true, xpRequired: 100, rarity: 'rare' },
  { id: '4', title: 'Karma Yogi', description: 'Complete 10 quests', icon: '🕉️', unlocked: true, xpRequired: 200, rarity: 'rare' },
  { id: '5', title: "Durga's Shield", description: 'Complete a Kathin quest', icon: '🛡️', unlocked: true, xpRequired: 300, rarity: 'epic' },
  { id: '6', title: "Vayu's Speed", description: 'Complete 5 quests in one day', icon: '💨', unlocked: false, xpRequired: 400, rarity: 'epic' },
  { id: '7', title: 'Chakravarti', description: 'Reach Level 10', icon: '👑', unlocked: false, xpRequired: 500, rarity: 'legendary' },
  { id: '8', title: 'Vidya Guru', description: 'Create 20 knowledge scrolls', icon: '📿', unlocked: false, xpRequired: 600, rarity: 'legendary' },
  { id: '9', title: 'Tapasvi Supreme', description: '30-day tapasya streak', icon: '💎', unlocked: false, xpRequired: 800, rarity: 'legendary' },
  { id: '10', title: 'Moksha', description: 'Unlock all achievements', icon: '✨', unlocked: false, xpRequired: 1000, rarity: 'legendary' },
  { id: '11', title: 'Brahma Muhurta', description: 'Complete quest before dawn', icon: '🌅', unlocked: false, xpRequired: 150, rarity: 'rare' },
  { id: '12', title: 'Chandra Dev', description: 'Create a scroll after midnight', icon: '🌙', unlocked: false, xpRequired: 250, rarity: 'rare' },
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

function addDaysISO(baseISO: string, days: number): string {
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
  /** Whole-day difference from today (negative = overdue). null if unknown. */
  daysFromToday: number | null;
  isOverdue: boolean;
  isDueToday: boolean;
  /** "Soon" = within the next 3 days (excluding today). */
  isDueSoon: boolean;
};

/**
 * Accepts either:
 *  - ISO date (YYYY-MM-DD)
 *  - Seed strings: Today, Tomorrow, Yesterday, This Week
 */
export function parseDueDate(raw: string): ParsedDueDate {
  const s = (raw || '').trim();
  if (!s) {
    return { label: '', iso: '', daysFromToday: null, isOverdue: false, isDueToday: false, isDueSoon: false };
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
    return { label: s, iso: '', daysFromToday: null, isOverdue: false, isDueToday: false, isDueSoon: false };
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

  return { label, iso, daysFromToday, isOverdue, isDueToday, isDueSoon };
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
