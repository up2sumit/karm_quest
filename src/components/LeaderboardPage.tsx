import { useState } from 'react';
import FriendsLeaderboard from './FriendsLeaderboard';
import { CommunityChallenges } from './CommunityChallenges';
import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';
import type { CustomChallenge } from '../store';

interface LeaderboardPageProps {
  enabled: boolean;
  customChallenges: CustomChallenge[];
  onAcceptChallenge: (ccId: string) => void;
  onClaimChallenge: (ccId: string) => void;
  onAddChallenge: (cc: Omit<CustomChallenge, 'id' | 'status' | 'progress' | 'isCommunity'>) => void;
}

export function LeaderboardPage({
  enabled,
  customChallenges,
  onAcceptChallenge,
  onClaimChallenge,
  onAddChallenge
}: LeaderboardPageProps) {
  const { isDark, isHinglish, isModern, lang } = useTheme();
  const [activeTab, setActiveTab] = useState<'friends' | 'challenges'>('friends');

  const card = isModern
    ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)]'
    : isHinglish
      ? 'bg-white/85 border border-indigo-200/40'
      : isDark
        ? 'bg-white/[0.03] border border-white/[0.06]'
        : 'bg-white/70 border border-slate-200/60';

  const tp = isModern
    ? 'text-[var(--kq-text-primary)]'
    : isHinglish
      ? 'text-slate-900'
      : isDark
        ? 'text-white/90'
        : 'text-slate-900';

  const ts = isModern
    ? 'text-[var(--kq-text-secondary)]'
    : isHinglish
      ? 'text-slate-600'
      : isDark
        ? 'text-white/50'
        : 'text-slate-500';

  const tabBtn = (id: 'friends' | 'challenges', label: string) => {
    const active = activeTab === id;
    const base = 'px-4 py-2 text-sm font-bold transition-all border-b-2';
    const activeCls = isModern
      ? 'text-[var(--kq-primary)] border-[var(--kq-primary)]'
      : 'text-indigo-600 border-indigo-600';
    const inactiveCls = 'text-slate-400 border-transparent hover:text-slate-500';

    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`${base} ${active ? activeCls : inactiveCls}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="px-4 md:px-6 py-6 max-w-6xl mx-auto animate-slide-up">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className={`text-2xl md:text-3xl font-black tracking-tight ${tp}`}>
            {t('navLeaderboard', lang)}
          </h2>
          <p className={`mt-1 text-sm ${ts}`}>
            {activeTab === 'friends'
              ? (isHinglish ? 'Apne dost add karo aur weekly XP compare karo.' : 'Compare weekly XP with your friends.')
              : (isHinglish ? 'Community challenges poore karo aur Mudra kamao.' : 'Participate in community quests and earn rewards.')}
          </p>
        </div>

        <div className="flex items-center gap-1 border-b border-slate-200/20">
          {tabBtn('friends', isHinglish ? 'Weekly Rank' : 'Weekly Rank')}
          {tabBtn('challenges', isHinglish ? 'Community Challenges' : 'Community Challenges')}
        </div>
      </div>

      <div className={`${card} rounded-3xl p-5 md:p-8 min-h-[400px]`}>
        {!enabled ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className={`text-lg font-bold ${tp}`}>Login Required</h3>
            <p className={`text-sm ${ts} max-w-xs mt-2`}>
              {isHinglish ? 'Leaderboard aur challenges ke liye login zaroori hai.' : 'Friends & Community features require a logged-in profile.'}
            </p>
          </div>
        ) : (
          activeTab === 'friends' ? (
            <FriendsLeaderboard />
          ) : (
            <CommunityChallenges
              challenges={customChallenges}
              onAccept={onAcceptChallenge}
              onClaim={onClaimChallenge}
              onCreate={onAddChallenge}
            />
          )
        )}
      </div>
    </div>
  );
}
