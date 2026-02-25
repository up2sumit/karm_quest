import type { Quest } from '../store';
import { addDaysISO } from '../store';
import { weekStartFromISO } from './recurrence';

/**
 * Computes a weekly quest-completion target that scales with the user's recent velocity.
 *
 * - Looks at the last N *completed* weeks (excluding the current week)
 * - Averages completed quests per week
 * - Returns a target slightly above the average, with safe bounds
 */
export function computeWeeklyQuestTarget(
  quests: Quest[],
  currentWeekStart: string,
  lookbackWeeks: number = 4
): number {
  if (!currentWeekStart) return 15;

  const weeks: string[] = [];
  for (let i = 1; i <= lookbackWeeks; i++) {
    weeks.push(addDaysISO(currentWeekStart, -7 * i));
  }

  if (weeks.length === 0) return 15;

  const idx = new Map<string, number>();
  weeks.forEach((w, i) => idx.set(w, i));
  const counts = new Array<number>(weeks.length).fill(0);

  for (const q of quests) {
    if (q.status !== 'completed') continue;
    const d = (q.completedAt || '').trim();
    if (!d) continue;
    const ws = weekStartFromISO(d);
    const i = idx.get(ws);
    if (i === undefined) continue;
    counts[i] += 1;
  }

  const sum = counts.reduce((a, b) => a + b, 0);
  const avg = sum / counts.length;

  // New users / no history: keep the familiar default.
  if (sum === 0) return 15;

  // Slightly above average, bounded.
  const target = Math.round(avg * 1.15 + 2);
  return Math.max(8, Math.min(50, target));
}
