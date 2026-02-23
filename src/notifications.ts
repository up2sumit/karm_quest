export type NotificationType =
  | 'quest_complete'
  | 'achievement'
  | 'streak'
  | 'daily_challenge'
  | 'level_up';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string; // ISO
  read: boolean;
  icon: string;
}

export const notificationIcons: Record<NotificationType, string> = {
  quest_complete:  '✅',
  achievement:     '🏆',
  streak:          '🔥',
  daily_challenge: '⚡',
  level_up:        '🚀',
};

export function makeNotification(
  type: NotificationType,
  title: string,
  message: string,
): AppNotification {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    title,
    message,
    timestamp: new Date().toISOString(),
    read: false,
    icon: notificationIcons[type],
  };
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

function ago(hours: number): string {
  return new Date(Date.now() - hours * 3600000).toISOString();
}

export const defaultNotifications: AppNotification[] = [
  {
    id: 'seed-1', type: 'daily_challenge', read: false,
    title: 'Daily Challenges Available! ⚡',
    message: 'New karma quests await. Complete 3 before noon for bonus Punya!',
    timestamp: ago(0.1), icon: '⚡',
  },
  {
    id: 'seed-2', type: 'streak', read: false,
    title: '12-Day Tapasya Streak! 🔥',
    message: "You've maintained your practice for 12 days. Jai Ho, Yoddha!",
    timestamp: ago(2), icon: '🔥',
  },
  {
    id: 'seed-3', type: 'achievement', read: false,
    title: "🛡️ Durga's Shield Unlocked!",
    message: 'You completed a Kathin quest. The Devi smiles upon your efforts.',
    timestamp: ago(5), icon: '🏆',
  },
  {
    id: 'seed-4', type: 'quest_complete', read: true,
    title: 'Quest Complete! ✅',
    message: '"Organize workspace – Vastu style" has been vanquished. +10 Punya.',
    timestamp: ago(24), icon: '✅',
  },
  {
    id: 'seed-5', type: 'level_up', read: true,
    title: 'Level 5 Achieved! 🚀',
    message: 'Your Chakra has ascended. New challenges and rewards await, Yoddha.',
    timestamp: ago(48), icon: '🚀',
  },
];
