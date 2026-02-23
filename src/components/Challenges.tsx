import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';
import type { UserStats } from '../store';

interface ChallengesProps {
  stats: UserStats;
}

interface Challenge {
  id: string;
  titleKey: 'challengeBrahmaMuhurta' | 'challengeVidyaSeeker' | 'challengeTapasyaGuard' | 'challengeKarmaStorm' | 'challengeRavanaSlayer' | 'challengeScrollMaster' | 'challengeDivyaGrind' | 'challengeAsuraRush';
  descKey: 'challengeBrahmaDesc' | 'challengeVidyaDesc' | 'challengeTapasyaDesc' | 'challengeKarmaStormDesc' | 'challengeRavanaDesc' | 'challengeScrollDesc' | 'challengeDivyaDesc' | 'challengeAsuraDesc';
  reward: number;
  progress: number;
  total: number;
  emoji: string;
  type: 'daily' | 'weekly' | 'special';
}

export function Challenges({ stats }: ChallengesProps) {
  const { isDark, isHinglish, lang } = useTheme();
  const tp = isHinglish ? 'text-slate-800' : isDark ? 'text-slate-200' : 'text-slate-800';
  const ts = isHinglish ? 'text-slate-500' : isDark ? 'text-slate-400' : 'text-slate-500';
  const card = isHinglish
    ? 'bg-white/70 backdrop-blur-xl border border-rose-200/20 shadow-sm'
    : isDark
      ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] shadow-sm'
      : 'bg-white/80 backdrop-blur-xl border border-slate-200/40 shadow-sm';

  const totalXp = stats.totalXpEarned ?? stats.xp;

  const challenges: Challenge[] = [
    { id: '1', titleKey: 'challengeBrahmaMuhurta', descKey: 'challengeBrahmaDesc', reward: 30, progress: 1, total: 3, emoji: '🌅', type: 'daily' },
    { id: '2', titleKey: 'challengeVidyaSeeker', descKey: 'challengeVidyaDesc', reward: 20, progress: 0, total: 2, emoji: '📖', type: 'daily' },
    { id: '3', titleKey: 'challengeTapasyaGuard', descKey: 'challengeTapasyaDesc', reward: 15, progress: 1, total: 1, emoji: '🪔', type: 'daily' },
    { id: '4', titleKey: 'challengeKarmaStorm', descKey: 'challengeKarmaStormDesc', reward: 50, progress: stats.questsCompleted % 5, total: 5, emoji: '⚡', type: 'daily' },
    { id: '5', titleKey: 'challengeRavanaSlayer', descKey: 'challengeRavanaDesc', reward: 200, progress: Math.min(stats.questsCompleted, 15), total: 15, emoji: '🔱', type: 'weekly' },
    { id: '6', titleKey: 'challengeScrollMaster', descKey: 'challengeScrollDesc', reward: 150, progress: 6, total: 10, emoji: '📜', type: 'weekly' },
    { id: '7', titleKey: 'challengeDivyaGrind', descKey: 'challengeDivyaDesc', reward: 300, progress: Math.min(totalXp, 500), total: 500, emoji: '💎', type: 'weekly' },
    { id: '8', titleKey: 'challengeAsuraRush', descKey: 'challengeAsuraDesc', reward: 250, progress: 1, total: 3, emoji: '👑', type: 'special' },
  ];

  const daily = challenges.filter(c => c.type === 'daily');
  const weekly = challenges.filter(c => c.type === 'weekly');
  const special = challenges.filter(c => c.type === 'special');

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h2 className={`text-xl font-bold ${tp} flex items-center gap-2.5`}>
          <span className="text-2xl">{isHinglish ? '🔥' : '🔱'}</span> {t('challengesTitle', lang)}
        </h2>
        <p className={`text-[13px] mt-0.5 ${ts}`}>{t('challengesSub', lang)}</p>
      </div>

      <div className={`${card} rounded-2xl p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">⏰</span>
          <div>
            <p className={`text-[13px] font-semibold ${tp}`}>{t('dailyReset', lang)}</p>
            <p className={`text-[11px] ${ts}`}>{t('dailyResetSub', lang)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-base font-bold ${tp}`}>{24 - new Date().getHours()}h {60 - new Date().getMinutes()}m</p>
          <p className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{t('untilReset', lang)}</p>
        </div>
      </div>

      <Section title={t('dailyKarma', lang)} challenges={daily} isDark={isDark} isHinglish={isHinglish} lang={lang} card={card} tp={tp} ts={ts} />
      <Section title={t('weeklyCampaigns', lang)} challenges={weekly} isDark={isDark} isHinglish={isHinglish} lang={lang} card={card} tp={tp} ts={ts} />
      <Section title={t('specialMissions', lang)} challenges={special} isDark={isDark} isHinglish={isHinglish} lang={lang} card={card} tp={tp} ts={ts} />
    </div>
  );
}

function Section({ title, challenges, isDark, isHinglish, lang, card, tp, ts }: {
  title: string; challenges: Challenge[]; isDark: boolean; isHinglish: boolean; lang: 'en' | 'hi'; card: string; tp: string; ts: string;
}) {
  return (
    <div>
      <h3 className={`text-sm font-semibold ${tp} mb-3`}>{title}</h3>
      <div className="space-y-2.5">
        {challenges.map((c) => {
          const percent = Math.min(100, Math.round((c.progress / c.total) * 100));
          const isComplete = c.progress >= c.total;
          return (
            <div key={c.id}
              className={`${card} rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                isComplete ? isDark ? 'ring-1 ring-emerald-500/20' : 'ring-1 ring-emerald-200' : ''
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                  isComplete
                    ? isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'
                    : isDark ? 'bg-white/[0.03]' : 'bg-slate-50'
                }`}>
                  {isComplete ? '✅' : c.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium text-[13px] ${
                      isComplete ? isDark ? 'text-emerald-400 line-through' : 'text-emerald-600 line-through' : tp
                    }`}>{t(c.titleKey, lang)}</h4>
                    {isComplete && <span className={`text-[11px] font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`}>{t('jaiHo', lang)}</span>}
                  </div>
                  <p className={`text-[11px] mt-0.5 ${ts}`}>{t(c.descKey, lang)}</p>
                  <div className="mt-2 flex items-center gap-2.5">
                    <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
                      <div className={`h-full rounded-full transition-all duration-700 ${
                        isComplete
                          ? 'bg-emerald-400'
                          : isHinglish ? 'bg-gradient-to-r from-rose-400 to-violet-400' : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                      }`} style={{ width: `${percent}%` }} />
                    </div>
                    <span className={`text-[10px] font-semibold shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{c.progress}/{c.total}</span>
                  </div>
                </div>
                <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg shrink-0 ${
                  isDark ? 'bg-white/[0.03]' : 'bg-slate-50'
                }`}>
                  <span className="text-sm">🪙</span>
                  <span className={`text-[13px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>+{c.reward}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
