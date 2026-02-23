import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';
import type { Achievement, UserStats } from '../store';

interface AchievementsProps {
  achievements: Achievement[];
  stats: UserStats;
}

const rarityConfig = {
  common: { bg: 'from-slate-100 to-slate-200', darkBg: 'from-slate-700/20 to-slate-600/20', border: 'border-slate-200', darkBorder: 'border-slate-700/30', text: 'text-slate-500', darkText: 'text-slate-400', label: 'Common', labelHi: 'Normal' },
  rare: { bg: 'from-sky-50 to-sky-100', darkBg: 'from-sky-900/15 to-sky-800/15', border: 'border-sky-200', darkBorder: 'border-sky-500/15', text: 'text-sky-500', darkText: 'text-sky-400', label: 'Rare', labelHi: 'Accha Wala' },
  epic: { bg: 'from-violet-50 to-violet-100', darkBg: 'from-violet-900/15 to-violet-800/15', border: 'border-violet-200', darkBorder: 'border-violet-500/15', text: 'text-violet-500', darkText: 'text-violet-400', label: 'Epic', labelHi: 'Zabardast!' },
  legendary: { bg: 'from-amber-50 to-amber-100', darkBg: 'from-amber-900/15 to-amber-800/15', border: 'border-amber-200', darkBorder: 'border-amber-500/15', text: 'text-amber-500', darkText: 'text-amber-400', label: 'Divya', labelHi: 'LEGEND! 🐐' },
};

export function Achievements({ achievements, stats }: AchievementsProps) {
  const { isDark, isHinglish, lang } = useTheme();
  const card = isHinglish
    ? 'bg-white/70 backdrop-blur-xl border border-rose-200/20 shadow-sm'
    : isDark
      ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] shadow-sm'
      : 'bg-white/80 backdrop-blur-xl border border-slate-200/40 shadow-sm';
  const tp = isHinglish ? 'text-slate-800' : isDark ? 'text-slate-200' : 'text-slate-800';
  const ts = isHinglish ? 'text-slate-500' : isDark ? 'text-slate-400' : 'text-slate-500';

  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);
  const nextAchievement = locked[0];

  // Lifetime XP is used for achievements so progress doesn't reset after leveling up.
  const totalXp = stats.totalXpEarned ?? stats.xp;

  const getRarityLabel = (r: keyof typeof rarityConfig) => isHinglish ? rarityConfig[r].labelHi : rarityConfig[r].label;
  const getRarityBg = (r: keyof typeof rarityConfig) => isDark ? rarityConfig[r].darkBg : rarityConfig[r].bg;

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h2 className={`text-xl font-bold ${tp} flex items-center gap-2.5`}>
          <span className="text-2xl">🏆</span> {t('achievementsTitle', lang)}
        </h2>
        <p className={`text-[13px] mt-0.5 ${ts}`}>{t('achievementsSub', lang)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className={`${card} rounded-2xl p-4 text-center`}>
          <span className="text-2xl">🏅</span>
          <p className={`text-lg font-bold mt-1.5 ${tp}`}>{unlocked.length}/{achievements.length}</p>
          <p className={`text-[11px] ${ts}`}>{t('siddhiUnlocked', lang)}</p>
        </div>
        <div className={`${card} rounded-2xl p-4 text-center`}>
          <span className="text-2xl">🕉️</span>
          <p className={`text-lg font-bold mt-1.5 ${tp}`}>{totalXp} {isHinglish ? 'XP' : 'Punya'}</p>
          <p className={`text-[11px] ${ts}`}>{t('totalExperience', lang)}</p>
        </div>
        <div className={`${card} rounded-2xl p-4 text-center`}>
          <span className="text-2xl">🎯</span>
          <p className={`text-lg font-bold mt-1.5 ${tp}`}>{nextAchievement ? Math.max(0, nextAchievement.xpRequired - totalXp) : 0}</p>
          <p className={`text-[11px] ${ts}`}>{t('untilNextSiddhi', lang)}</p>
        </div>
      </div>

      {nextAchievement && (() => {
        const config = rarityConfig[nextAchievement.rarity];
        return (
          <div className={`${card} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className={`text-[13px] font-semibold ${tp}`}>{t('nextSiddhi', lang)}</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold bg-gradient-to-r ${getRarityBg(nextAchievement.rarity)} ${isDark ? config.darkText : config.text}`}>
                {getRarityLabel(nextAchievement.rarity)}
              </span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="text-3xl">{nextAchievement.icon}</div>
              <div className="flex-1">
                <p className={`font-semibold text-[13px] ${tp}`}>{nextAchievement.title}</p>
                <p className={`text-[12px] ${ts}`}>{nextAchievement.description}</p>
                <div className={`mt-2 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
                  <div className={`h-full rounded-full transition-all duration-500 ${isHinglish ? 'bg-gradient-to-r from-rose-400 to-violet-400' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`}
                    style={{ width: `${Math.min(100, (totalXp / nextAchievement.xpRequired) * 100)}%` }} />
                </div>
                <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{totalXp}/{nextAchievement.xpRequired} {isHinglish ? 'XP' : 'Punya'}</p>
              </div>
            </div>
          </div>
        );
      })()}

      <div>
        <h3 className={`text-sm font-semibold ${tp} mb-3 flex items-center gap-2`}>
          <span>{isHinglish ? '✅' : '🪷'}</span> {t('earnedSiddhi', lang)}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {unlocked.map((a, i) => {
            const config = rarityConfig[a.rarity];
            return (
              <div key={a.id}
                className={`${card} rounded-2xl p-4 text-center hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 cursor-pointer group`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="text-3xl mb-1.5 group-hover:scale-110 transition-transform animate-badge-unlock">{a.icon}</div>
                <p className={`text-[13px] font-semibold ${tp}`}>{a.title}</p>
                <p className={`text-[10px] mt-0.5 ${ts}`}>{a.description}</p>
                <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-semibold bg-gradient-to-r ${getRarityBg(a.rarity)} ${isDark ? config.darkText : config.text}`}>
                  {getRarityLabel(a.rarity)}
                </span>
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
          {locked.map((a) => (
            <div key={a.id} className={`${card} rounded-2xl p-4 text-center opacity-40 grayscale hover:opacity-60 transition-all cursor-pointer`}>
              <div className="text-3xl mb-1.5 blur-[1.5px]">{a.icon}</div>
              <p className={`text-[13px] font-semibold ${tp}`}>???</p>
              <p className={`text-[10px] mt-0.5 ${ts}`}>{a.description}</p>
              <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-semibold ${isDark ? 'text-slate-600 bg-white/[0.03]' : 'text-slate-400 bg-slate-50'}`}>
                {a.xpRequired} {t('punyaNeeded', lang)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
