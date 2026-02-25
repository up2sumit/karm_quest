import { useEffect, useMemo, useState } from 'react';
import { Copy, Share2, X, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { Achievement, UserStats } from '../store';

type Props = {
  achievement: Achievement | null;
  stats: UserStats;
  open: boolean;
  onClose: () => void;
};

export function AchievementShareCard({ achievement, stats, open, onClose }: Props) {
  const { isDark, isHinglish, isModern, lang } = useTheme();
  const isPro = lang === 'pro';
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const shareText = useMemo(() => {
    if (!achievement) return '';
    if (isPro) {
      return (
        `Achievement unlocked: ${achievement.title}\n` +
        `${achievement.description}\n` +
        `Level: ${stats.level} · Streak: ${stats.streak}d · Total XP: ${stats.totalXpEarned}\n` +
        `#Achievements #Productivity`
      );
    }
    const xpWord = isHinglish ? 'XP' : 'Punya';
    return (
      `🏆 ${achievement.title} unlocked!\n` +
      `${achievement.description}\n` +
      `Level: ${stats.level} · Streak: ${stats.streak}d · ${xpWord}: ${stats.totalXpEarned}\n` +
      `#KarmQuest #Achievements`
    );
  }, [achievement, isHinglish, isPro, stats.level, stats.streak, stats.totalXpEarned]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setToast('Copied ✅');
    } catch {
      setToast('Copy failed');
    }
  };

  const nativeShare = async () => {
    try {
      if (!('share' in navigator)) {
        await copy();
        return;
      }
      await (navigator as any).share({
        title: achievement?.title || 'Achievement unlocked',
        text: shareText,
      });
    } catch {
      // user cancelled or not supported
    }
  };

  if (!open || !achievement) return null;

  const darkLike = isDark || isHinglish;

  const shell = isModern
    ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)]'
    : darkLike
      ? 'bg-[var(--kq-surface)]/[0.03] border border-white/[0.06]'
      : 'bg-[var(--kq-surface)]/80 border border-[var(--kq-border)]/40';

  const tp = isModern ? 'text-[var(--kq-text-primary)]' : darkLike ? 'text-slate-200' : 'text-[var(--kq-text-primary)]';
  const ts = isModern ? 'text-[var(--kq-text-secondary)]' : darkLike ? 'text-[var(--kq-text-muted)]' : 'text-[var(--kq-text-muted)]';

  const grad = isModern
    ? 'bg-[var(--kq-primary)]'
    : darkLike
      ? 'bg-gradient-to-br from-[var(--kq-xp-start)] via-[var(--kq-primary)] to-[var(--kq-xp-end)]'
      : 'bg-gradient-to-br from-[var(--kq-xp-start)] via-[var(--kq-primary)] to-[var(--kq-xp-end)]';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className={`relative w-full max-w-lg rounded-3xl ${shell} shadow-2xl overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className={`text-[11px] font-semibold ${ts}`}>{isPro ? 'Share achievement' : 'Share your win'}</p>
            <p className={`text-[14px] font-black ${tp}`}>{achievement.title}</p>
          </div>
          <button
            className={`h-9 w-9 rounded-2xl inline-flex items-center justify-center ${isModern ? 'bg-[var(--kq-bg2)]' : isDark ? 'bg-[var(--kq-surface)]/[0.06]' : 'bg-[var(--kq-surface2)]'}`}
            onClick={onClose}
            title="Close"
          >
            <X size={16} className={isModern ? 'text-[var(--kq-text-secondary)]' : isDark ? 'text-white/70' : 'text-[var(--kq-text-secondary)]'} />
          </button>
        </div>

        {/* Shareable visual */}
        <div className={`mx-5 mb-5 rounded-3xl text-white overflow-hidden shadow-xl ${grad}`}>
          <div className="relative p-6">
            <div className="absolute inset-0 opacity-[0.10]">
              <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-[var(--kq-surface)]/20 blur-2xl" />
              <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-[var(--kq-surface)]/10 blur-2xl" />
            </div>

            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-[var(--kq-surface)]/15 ring-1 ring-white/25 flex items-center justify-center text-2xl">
                  {achievement.icon}
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-white/75 flex items-center gap-1.5">
                    <Sparkles size={12} className="opacity-90" />
                    Achievement unlocked
                  </p>
                  <p className="text-lg font-black leading-tight">{achievement.title}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-white/70">Level</p>
                <p className="text-lg font-black">{stats.level}</p>
              </div>
            </div>

            <p className="relative z-10 mt-4 text-[13px] leading-relaxed text-white/90">{achievement.description}</p>

            <div className="relative z-10 mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-[var(--kq-surface)]/10 ring-1 ring-white/15 px-3 py-3">
                <p className="text-[11px] text-white/70 font-semibold">Streak</p>
                <p className="text-xl font-black mt-0.5">{stats.streak}d</p>
              </div>
              <div className="rounded-2xl bg-[var(--kq-surface)]/10 ring-1 ring-white/15 px-3 py-3">
                <p className="text-[11px] text-white/70 font-semibold">Record</p>
                <p className="text-xl font-black mt-0.5">{stats.streakRecord}d</p>
              </div>
              <div className="rounded-2xl bg-[var(--kq-surface)]/10 ring-1 ring-white/15 px-3 py-3">
                <p className="text-[11px] text-white/70 font-semibold">Total</p>
                <p className="text-xl font-black mt-0.5">{stats.totalXpEarned}</p>
              </div>
            </div>

            <div className="relative z-10 mt-5 flex items-end justify-between">
              <p className="text-[10px] text-white/60">{new Date().toLocaleDateString()}</p>
              <p className="text-[10px] text-white/60">KarmQuest</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          <div className={`text-[11px] ${ts} line-clamp-2`}>{toast ? toast : 'Tip: take a screenshot of the card above.'}</div>
          <div className="flex items-center gap-2">
            <button
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-[12px] font-semibold border transition-all ${
                isModern
                  ? 'bg-[var(--kq-bg2)] border-[var(--kq-border)] text-[var(--kq-text-primary)] hover:bg-[var(--kq-surface)]'
                  : isDark
                    ? 'bg-[var(--kq-surface)]/[0.04] border-white/[0.06] text-slate-200 hover:bg-[var(--kq-surface)]/[0.06]'
                    : 'bg-[var(--kq-surface)] border-[var(--kq-border)]/50 text-[var(--kq-text-secondary)] hover:bg-[var(--kq-bg2)]'
              }`}
              onClick={copy}
            >
              <Copy size={14} /> Copy
            </button>
            <button
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-[12px] font-semibold transition-all ${
                isModern
                  ? 'bg-[var(--kq-primary)] text-white hover:opacity-95'
                  : 'bg-gradient-to-r from-[var(--kq-xp-start)] to-[var(--kq-xp-end)] text-white hover:opacity-95'
              }`}
              onClick={nativeShare}
            >
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
