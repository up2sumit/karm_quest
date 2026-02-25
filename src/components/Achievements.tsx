import { Share2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';
import type { Achievement, Note, Quest, UserStats } from '../store';
import { todayISO } from '../store';

interface AchievementsProps {
  achievements: Achievement[];
  stats: UserStats;
  quests: Quest[];
  notes: Note[];
  onShareAchievement?: (a: Achievement) => void;
}

const rarityConfig = {
  common: {
    bg: 'from-slate-100 to-slate-200',
    darkBg: 'from-slate-700/20 to-slate-600/20',
    border: 'border-slate-200',
    darkBorder: 'border-slate-700/30',
    text: 'text-slate-500',
    darkText: 'text-slate-400',
    label: 'Common',
    labelHi: 'Normal',
  },
  rare: {
    bg: 'from-sky-50 to-sky-100',
    darkBg: 'from-sky-900/15 to-sky-800/15',
    border: 'border-sky-200',
    darkBorder: 'border-sky-500/15',
    text: 'text-sky-500',
    darkText: 'text-sky-400',
    label: 'Rare',
    labelHi: 'Accha Wala',
  },
  epic: {
    bg: 'from-violet-50 to-violet-100',
    darkBg: 'from-violet-900/15 to-violet-800/15',
    border: 'border-violet-200',
    darkBorder: 'border-violet-500/15',
    text: 'text-violet-500',
    darkText: 'text-violet-400',
    label: 'Epic',
    labelHi: 'Zabardast!',
  },
  legendary: {
    bg: 'from-amber-50 to-amber-100',
    darkBg: 'from-amber-900/15 to-amber-800/15',
    border: 'border-amber-200',
    darkBorder: 'border-amber-500/15',
    text: 'text-amber-500',
    darkText: 'text-amber-400',
    label: 'Divya',
    labelHi: 'LEGEND! 🐐',
  },
} as const;

export function Achievements({ achievements, stats, quests, notes, onShareAchievement }: AchievementsProps) {
  const { isDark, isHinglish, isModern, lang } = useTheme();

  const darkLike = isDark || isHinglish;

  const card = isModern
    ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)] shadow-[0_1px_0_rgba(0,0,0,0.02),0_10px_30px_rgba(0,0,0,0.06)]'
    : darkLike
      ? 'bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] shadow-sm'
      : 'bg-white/80 backdrop-blur-xl border border-slate-200/40 shadow-sm';

  const tp = isModern
    ? 'text-[var(--kq-text-primary)]'
    : darkLike
      ? 'text-slate-200'
      : 'text-slate-800';

  const ts = isModern
    ? 'text-[var(--kq-text-secondary)]'
    : darkLike
      ? 'text-slate-400'
      : 'text-slate-500';

  const tm = isModern
    ? 'text-[var(--kq-text-muted)]'
    : darkLike
      ? 'text-slate-600'
      : 'text-slate-400';

  const statCard = 'kq-card kq-card-hover backdrop-blur-xl';

  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);
  const nextAchievement = locked[0];

  // Lifetime XP is used for achievements so progress doesn't reset after leveling up.
  const totalXp = stats.totalXpEarned ?? stats.xp;
  const xpLabel = lang === 'pro' || isHinglish ? 'XP' : 'Punya';

  const getRarityLabel = (r: keyof typeof rarityConfig) => (isHinglish ? rarityConfig[r].labelHi : rarityConfig[r].label);

  type ProgressItem = {
    key: string;
    label: string;
    current: number;
    target: number;
    unit?: string;
  };

  const clampPct = (current: number, target: number) => {
    if (target <= 0) return 100;
    return Math.max(0, Math.min(100, (current / target) * 100));
  };

  const completedToday = (() => {
    const today = todayISO();
    return quests.filter((q) => q.status === 'completed' && (q.completedAt || '').trim() === today).length;
  })();

  const hasCompletedDifficulty = (diff: string) => quests.some((q) => q.status === 'completed' && q.difficulty === diff);

  const hasQuestBeforeHour = (hour: number) => {
    return quests.some((q) => {
      if (q.status !== 'completed') return false;
      if (!q.completedAtTs) return false;
      const d = new Date(q.completedAtTs);
      return d.getHours() < hour;
    });
  };

  const hasNoteBeforeHour = (hour: number) => {
    return notes.some((n) => {
      if (!n.createdAt) return false;
      const d = new Date(n.createdAt);
      if (Number.isNaN(d.getTime())) return false;
      return d.getHours() < hour;
    });
  };

  const progressForAchievement = (a: Achievement): ProgressItem[] => {
    const items: ProgressItem[] = [];
    const c: any = (a as any).criteria || {};

    // Criteria-based progress first
    if (typeof c.minQuestsCompleted === 'number') {
      items.push({ key: 'quests', label: 'Quests completed', current: stats.questsCompleted || 0, target: c.minQuestsCompleted });
    }
    if (typeof c.minQuestsCompletedInDay === 'number') {
      items.push({ key: 'quests_day', label: 'Quests completed today', current: completedToday, target: c.minQuestsCompletedInDay });
    }
    if (typeof c.minNotesCreated === 'number') {
      items.push({ key: 'notes', label: 'Notes created', current: notes.length, target: c.minNotesCreated });
    }
    if (typeof c.minLevel === 'number') {
      items.push({ key: 'level', label: 'Level', current: stats.level || 0, target: c.minLevel });
    }
    if (typeof c.minStreak === 'number') {
      items.push({ key: 'streak', label: 'Current streak', current: stats.streak || 0, target: c.minStreak, unit: 'days' });
    }
    if (typeof c.minStreakRecord === 'number') {
      items.push({ key: 'streak_record', label: 'Best streak record', current: stats.streakRecord || 0, target: c.minStreakRecord, unit: 'days' });
    }
    if (typeof c.anyCompletedDifficulty === 'string') {
      items.push({
        key: 'diff',
        label: `Complete a ${c.anyCompletedDifficulty} quest`,
        current: hasCompletedDifficulty(c.anyCompletedDifficulty) ? 1 : 0,
        target: 1,
      });
    }
    if (typeof c.questCompletedBeforeHour === 'number') {
      items.push({
        key: 'before_dawn',
        label: `Complete a quest before ${String(c.questCompletedBeforeHour).padStart(2, '0')}:00`,
        current: hasQuestBeforeHour(c.questCompletedBeforeHour) ? 1 : 0,
        target: 1,
      });
    }
    if (typeof c.noteCreatedBeforeHour === 'number') {
      items.push({
        key: 'after_midnight',
        label: `Create a note before ${String(c.noteCreatedBeforeHour).padStart(2, '0')}:00`,
        current: hasNoteBeforeHour(c.noteCreatedBeforeHour) ? 1 : 0,
        target: 1,
      });
    }
    if (c.requiresAllOtherAchievements) {
      const total = achievements.length;
      const unlockedCount = achievements.filter((x) => x.unlocked && x.id !== a.id).length;
      items.push({ key: 'all', label: 'Other achievements unlocked', current: unlockedCount, target: Math.max(0, total - 1) });
    }

    // XP progress last
    if (a.xpRequired > 0) {
      items.push({ key: 'xp', label: `${xpLabel} earned`, current: totalXp, target: a.xpRequired, unit: xpLabel });
    }
    return items;
  };

  const ProgressLine = ({ item }: { item: ProgressItem }) => {
    const track = isModern ? 'bg-[var(--kq-bg2)]' : isDark ? 'bg-white/[0.06]' : 'bg-slate-100';
    const fill = isModern
      ? 'bg-[var(--kq-primary)]'
      : isHinglish
        ? 'bg-gradient-to-r from-amber-400 to-orange-400'
        : 'bg-gradient-to-r from-indigo-500 to-violet-500';
    const pct = clampPct(item.current, item.target);
    const done = item.target > 0 && item.current >= item.target;

    return (
      <div className="mt-2">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-[11px] ${ts} truncate`}>{item.label}</p>
          <p className={`text-[11px] font-semibold ${tp} shrink-0`}>{done ? 'Done' : `${Math.min(item.current, item.target)}/${item.target}`}</p>
        </div>
        <div className={`mt-1 h-2 rounded-full overflow-hidden ${track}`}>
          <div className={`h-full rounded-full transition-all duration-500 ${fill}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h2 className={`text-xl font-bold ${tp} flex items-center gap-2.5`}>
          <span className="text-2xl">🏆</span> {t('achievementsTitle', lang)}
        </h2>
        <p className={`text-[13px] mt-0.5 ${ts}`}>{t('achievementsSub', lang)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className={`${statCard} rounded-2xl p-4 sm:p-5 transition-all duration-300 group cursor-default hover:-translate-y-0.5`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-[11px] font-medium ${ts}`}>{t('siddhiLabel', lang)}</p>
              <p className={`text-[22px] font-black mt-0.5 ${tp}`}>{unlocked.length}/{achievements.length}</p>
              <p className={`text-[11px] mt-0.5 ${tm}`}>{t('siddhiUnlocked', lang)}</p>
            </div>
            <span className="text-xl opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all">🏆</span>
          </div>
        </div>

        <div className={`${statCard} rounded-2xl p-4 sm:p-5 transition-all duration-300 group cursor-default hover:-translate-y-0.5`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-[11px] font-medium ${ts}`}>{t('totalExperience', lang)}</p>
              <p className={`text-[22px] font-black mt-0.5 ${tp}`}>{totalXp} {xpLabel}</p>
              <p className={`text-[11px] mt-0.5 ${tm}`}>{t('chakraLabel', lang)} {stats.level}</p>
            </div>
            <span className="text-xl opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all">🕉️</span>
          </div>
        </div>

        <div className={`${statCard} rounded-2xl p-4 sm:p-5 transition-all duration-300 group cursor-default hover:-translate-y-0.5`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-[11px] font-medium ${ts}`}>{t('untilNextSiddhi', lang)}</p>
              <p className={`text-[22px] font-black mt-0.5 ${tp}`}>{nextAchievement ? Math.max(0, nextAchievement.xpRequired - totalXp) : 0}</p>
              <p className={`text-[11px] mt-0.5 ${tm}`}>{t('nextSiddhi', lang)}</p>
            </div>
            <span className="text-xl opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all">🎯</span>
          </div>
        </div>
      </div>

      {nextAchievement && (() => {
        const cfg = rarityConfig[nextAchievement.rarity];
        const pill = isModern
          ? 'px-2 py-0.5 rounded text-[10px] font-semibold border border-[var(--kq-border)] bg-[var(--kq-bg2)] text-[var(--kq-text-primary)]'
          : `px-2 py-0.5 rounded text-[10px] font-semibold bg-gradient-to-r ${isDark ? cfg.darkBg : cfg.bg} ${isDark ? cfg.darkText : cfg.text}`;

        const track = isModern ? 'bg-[var(--kq-bg2)]' : (isDark ? 'bg-white/[0.04]' : 'bg-slate-100');
        const fill = isModern ? 'bg-[var(--kq-primary)]' : (isHinglish ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-indigo-500 to-violet-500');

        return (
          <div className={`${card} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className={`text-[13px] font-semibold ${tp}`}>{t('nextSiddhi', lang)}</h3>
              <span className={pill}>{getRarityLabel(nextAchievement.rarity)}</span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="text-3xl">{nextAchievement.icon}</div>
              <div className="flex-1">
                <p className={`font-semibold text-[13px] ${tp}`}>{nextAchievement.title}</p>
                <p className={`text-[12px] ${ts}`}>{nextAchievement.description}</p>
                <div className={`mt-2 h-2 rounded-full overflow-hidden ${track}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${fill}`}
                    style={{ width: `${Math.min(100, (totalXp / nextAchievement.xpRequired) * 100)}%` }}
                  />
                </div>
                <p className={`text-[10px] mt-1 ${isModern ? 'text-[var(--kq-text-muted)]' : (isDark ? 'text-slate-600' : 'text-slate-400')}`}>
                  {totalXp}/{nextAchievement.xpRequired} {xpLabel}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      <div>
        <h3 className={`text-sm font-semibold ${tp} mb-3 flex items-center gap-2`}>
          <span>{isModern ? '✓' : (isHinglish ? '✅' : '🪷')}</span> {t('earnedSiddhi', lang)}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {unlocked.map((a, i) => {
            const cfg = rarityConfig[a.rarity];
            const pill = isModern
              ? 'inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-semibold border border-[var(--kq-border)] bg-[var(--kq-bg2)] text-[var(--kq-text-primary)]'
              : `inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-semibold bg-gradient-to-r ${isDark ? cfg.darkBg : cfg.bg} ${isDark ? cfg.darkText : cfg.text}`;

            return (
              <div
                key={a.id}
                className={`${card} relative rounded-2xl p-4 text-center hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer group`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {onShareAchievement && (
                  <button
                    className={`absolute right-3 top-3 inline-flex items-center justify-center h-8 w-8 rounded-xl border transition-all ${isModern
                        ? 'bg-[var(--kq-surface)] border-[var(--kq-border)] hover:bg-[var(--kq-bg2)]'
                        : isDark
                          ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                          : 'bg-white/70 border-slate-200/40 hover:bg-white'
                      }`}
                    title="Share"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareAchievement(a);
                    }}
                  >
                    <Share2 size={14} className={isModern ? 'text-[var(--kq-text-secondary)]' : isDark ? 'text-white/70' : 'text-slate-600'} />
                  </button>
                )}
                <div className={`text-3xl mb-1.5 ${isModern ? '' : 'group-hover:scale-110'} transition-transform ${isModern ? '' : 'animate-badge-unlock'}`}>{a.icon}</div>
                <p className={`text-[13px] font-semibold ${tp}`}>{a.title}</p>
                <p className={`text-[10px] mt-0.5 ${ts}`}>{a.description}</p>
                <span className={pill}>{getRarityLabel(a.rarity)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${tp} mb-3 flex items-center gap-2`}>
          <span>🔒</span> {t('lockedSiddhi', lang)}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {locked.map((a) => {
            const items = progressForAchievement(a);
            return (
              <div
                key={a.id}
                className={`${card} rounded-2xl p-4 text-left hover:shadow-md transition-all cursor-pointer`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`text-3xl ${isModern ? 'opacity-90' : 'opacity-90 blur-[0.8px]'}`}>{a.icon}</div>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold ${isModern
                        ? 'text-[var(--kq-text-muted)] border border-[var(--kq-border)] bg-[var(--kq-bg2)]'
                        : isDark
                          ? 'text-slate-500 bg-white/[0.04]'
                          : 'text-slate-500 bg-slate-50'
                      }`}
                  >
                    🔒 {getRarityLabel(a.rarity)}
                  </span>
                </div>

                <p className={`mt-2 text-[13px] font-semibold ${tp}`}>{a.title}</p>
                <p className={`text-[11px] mt-0.5 ${ts}`}>{a.description}</p>

                <div className="mt-2">
                  {items.length === 0 ? (
                    <span
                      className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-semibold ${isModern
                          ? 'text-[var(--kq-text-muted)] border border-[var(--kq-border)] bg-[var(--kq-bg2)]'
                          : isDark
                            ? 'text-slate-600 bg-white/[0.03]'
                            : 'text-slate-400 bg-slate-50'
                        }`}
                    >
                      {a.xpRequired} {t('punyaNeeded', lang)}
                    </span>
                  ) : (
                    <>
                      {items.map((it) => (
                        <ProgressLine key={it.key} item={it} />
                      ))}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
