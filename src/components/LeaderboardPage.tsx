import FriendsLeaderboard from './FriendsLeaderboard';
import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';

export function LeaderboardPage({ enabled }: { enabled: boolean }) {
  const { isDark, isHinglish, isModern, lang } = useTheme();

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

  return (
    <div className="px-4 md:px-6 py-6 max-w-6xl mx-auto">
      <div className="mb-5">
        <h2 className={`text-xl md:text-2xl font-extrabold tracking-tight ${tp}`}>
          {t('navLeaderboard', lang)}
        </h2>
        <p className={`mt-1 text-sm ${ts}`}>
          {isHinglish
            ? 'Apne dost add karo aur weekly XP compare karo.'
            : (lang === 'pro'
              ? 'Add friends and compare weekly XP.'
              : 'Add friends by username and compare weekly XP.')}
        </p>
        {!enabled ? (
          <div className={`mt-3 text-xs ${ts}`}>
            {isHinglish ? 'Leaderboard ke liye login zaroori hai.' : 'Login is required to use Friends & Leaderboard.'}
          </div>
        ) : null}
      </div>

      <div className={`${card} rounded-3xl p-5 md:p-6`}>
        {enabled ? <FriendsLeaderboard /> : null}
      </div>
    </div>
  );
}
