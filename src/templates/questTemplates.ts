import type { Difficulty, Recurrence } from '../store';

export type QuestTemplateId =
  | 'morning_routine'
  | 'developer_sprint'
  | 'wellness_week'
  | 'study_session';

export type TemplateQuest = {
  title: string;
  difficulty: Difficulty;
  category: string;
  xpReward: number;
  // If provided, due date = today + N days (local time).
  dueDateDaysFromToday?: number;
  // Optional recurrence for recurring quests.
  recurring?: Recurrence;
  // Optional checklist.
  subtasks?: string[];
};

export type QuestTemplate = {
  id: QuestTemplateId;
  name: string;
  icon: string;
  description: string;
  quests: TemplateQuest[];
};

const XP: Record<Difficulty, number> = {
  easy: 10,
  medium: 25,
  hard: 50,
  legendary: 100,
};

export const questTemplates: Record<QuestTemplateId, QuestTemplate> = {
  morning_routine: {
    id: 'morning_routine',
    name: 'Morning Routine',
    icon: '🌅',
    description: 'Start the day with a clean, repeatable set of micro-wins.',
    quests: [
      {
        title: 'Drink water + light stretch (5 mins)',
        difficulty: 'easy',
        category: 'Wellness',
        xpReward: XP.easy,
        recurring: 'daily',
        subtasks: ['Water', 'Stretch'],
      },
      {
        title: 'Plan top 3 priorities (10 mins)',
        difficulty: 'medium',
        category: 'Planning',
        xpReward: XP.medium,
        recurring: 'daily',
      },
      {
        title: 'No phone for first 30 minutes',
        difficulty: 'medium',
        category: 'Discipline',
        xpReward: XP.medium,
        recurring: 'daily',
      },
      {
        title: 'Quick tidy — desk reset',
        difficulty: 'easy',
        category: 'Home',
        xpReward: XP.easy,
        recurring: 'daily',
      },
    ],
  },

  developer_sprint: {
    id: 'developer_sprint',
    name: 'Developer Sprint',
    icon: '🧑‍💻',
    description: 'A tight mini-sprint pack for dev flow: plan → build → test → ship.',
    quests: [
      {
        title: 'Pick 1 ticket + write acceptance criteria',
        difficulty: 'medium',
        category: 'Work',
        xpReward: XP.medium,
        dueDateDaysFromToday: 0,
      },
      {
        title: 'Implement core logic (focus block)',
        difficulty: 'hard',
        category: 'Work',
        xpReward: XP.hard,
        dueDateDaysFromToday: 0,
        subtasks: ['Set up branch', 'Implement', 'Self-review'],
      },
      {
        title: 'Write tests (unit/integration)',
        difficulty: 'hard',
        category: 'Work',
        xpReward: XP.hard,
        dueDateDaysFromToday: 1,
      },
      {
        title: 'Open PR + request review',
        difficulty: 'medium',
        category: 'Work',
        xpReward: XP.medium,
        dueDateDaysFromToday: 1,
      },
      {
        title: 'Ship + verify in staging',
        difficulty: 'legendary',
        category: 'Work',
        xpReward: XP.legendary,
        dueDateDaysFromToday: 2,
      },
    ],
  },

  wellness_week: {
    id: 'wellness_week',
    name: 'Wellness Week',
    icon: '🧘',
    description: 'Seven days of sleep, movement, and recovery basics.',
    quests: [
      {
        title: 'Walk 20 minutes',
        difficulty: 'easy',
        category: 'Wellness',
        xpReward: XP.easy,
        recurring: 'daily',
      },
      {
        title: 'Protein + veggies with 1 meal',
        difficulty: 'easy',
        category: 'Nutrition',
        xpReward: XP.easy,
        recurring: 'daily',
      },
      {
        title: 'No caffeine after 2 PM',
        difficulty: 'medium',
        category: 'Sleep',
        xpReward: XP.medium,
        recurring: 'daily',
      },
      {
        title: 'Wind-down routine (10 mins)',
        difficulty: 'medium',
        category: 'Sleep',
        xpReward: XP.medium,
        recurring: 'daily',
        subtasks: ['Dim lights', 'No screens', 'Quick journal'],
      },
      {
        title: 'One deep recovery session (yoga / stretch 30 mins)',
        difficulty: 'hard',
        category: 'Wellness',
        xpReward: XP.hard,
        dueDateDaysFromToday: 6,
      },
    ],
  },

  study_session: {
    id: 'study_session',
    name: 'Study Session',
    icon: '📚',
    description: 'A frictionless study pack: prep → deep work → recap.',
    quests: [
      {
        title: 'Choose topic + gather resources (5 mins)',
        difficulty: 'easy',
        category: 'Study',
        xpReward: XP.easy,
        dueDateDaysFromToday: 0,
      },
      {
        title: '45 min deep work (no distractions)',
        difficulty: 'hard',
        category: 'Study',
        xpReward: XP.hard,
        dueDateDaysFromToday: 0,
      },
      {
        title: 'Write a 5-line recap',
        difficulty: 'medium',
        category: 'Study',
        xpReward: XP.medium,
        dueDateDaysFromToday: 0,
      },
      {
        title: 'Create 3 flashcards / questions',
        difficulty: 'medium',
        category: 'Study',
        xpReward: XP.medium,
        dueDateDaysFromToday: 0,
      },
    ],
  },
};
