import { useEffect, useMemo, useState } from 'react';
import { Copy, X, Calendar, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { WeeklyReport } from '../store';

type Props = {
  report: WeeklyReport;
  autoOpen?: boolean;
  onAutoOpenConsumed?: () => void;
  onDismissFromDashboard?: (weekStart: string) => void;
};

function fmtRange(ws: string, we: string) {
  return `${ws} → ${we}`;
}

export function WeeklyReportCard({ report, autoOpen, onAutoOpenConsumed, onDismissFromDashboard }: Props) {
  const { isDark, isHinglish, isModern, lang } = useTheme();
  const isPro = lang === 'pro';

  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!autoOpen) return;
    setOpen(true);
    onAutoOpenConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const shareText = useMemo(() => {
    if (isPro) {
      return (
        `Field Notes — Weekly Review (${report.weekStart} - ${report.weekEnd})\n` +
        `✅ Tasks completed: ${report.questsCompleted}\n` +
        `✨ XP earned: ${report.xpEarned}\n` +
        `🔥 Streak: ${report.streakDays} days\n` +
        `#FieldNotes #WeeklyReview`
      );
    }
    const punyaWord = isHinglish ? 'XP' : 'Punya';
    return (
      `Karam_QUEST Weekly Progress (${report.weekStart} - ${report.weekEnd})\n` +
      `✅ Quests: ${report.questsCompleted}\n` +
      `✨ ${punyaWord}: ${report.xpEarned}\n` +
      `🪔 Tapasya streak: ${report.streakDays} days\n` +
      `#KaramQuest #Tapasya #Productivity`
    );
  }, [isHinglish, isPro, report.weekEnd, report.weekStart, report.questsCompleted, report.streakDays, report.xpEarned]);

  const darkLike = isDark || isHinglish;
  const cardShell = isModern
    ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)]'
    : darkLike
      ? 'bg-white/[0.04] border border-white/[0.06]'
      : 'bg-white/80 border border-slate-200/40';

  const tp = isModern ? 'text-[var(--kq-text-primary)]' : darkLike ? 'text-slate-200' : 'text-slate-800';
  const ts = isModern ? 'text-[var(--kq-text-secondary)]' : darkLike ? 'text-slate-400' : 'text-slate-500';

  const grad = darkLike
    ? 'bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700'
    : 'bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setToast('Copied ✅');
    } catch {
      setToast('Copy failed');
    }
  };

  const Stat = ({ label, value, icon }: { label: string; value: string; icon: string }) => {
    if (isModern) {
      return (
        <div className="rounded-2xl px-3 py-3 bg-[var(--kq-surface)] border border-[var(--kq-border)]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-[var(--kq-text-muted)]">{label}</p>
            <span className="text-base opacity-70">{icon}</span>
          </div>
          <p className="text-xl font-black text-[var(--kq-text-primary)] mt-0.5">{value}</p>
        </div>
      );
    }
    return (
      <div className={`rounded-2xl px-3 py-3 ${isDark ? 'bg-white/[0.04]' : 'bg-white/70'} border ${isDark ? 'border-white/[0.06]' : 'border-slate-200/40'}`}>
        <div className="flex items-center justify-between">
          <p className={`text-[11px] font-semibold ${isDark ? 'text-white/60' : 'text-white/70'}`}>{label}</p>
          <span className="text-base opacity-80">{icon}</span>
        </div>
        <p className="text-xl font-black text-white mt-0.5">{value}</p>
      </div>
    );
  };

  const CardVisual = ({ compact }: { compact?: boolean }) => {
    if (isModern) {
      const streakIcon = '🔥';
      return (
        <div
          className={`relative overflow-hidden rounded-3xl bg-[var(--kq-surface)] border border-[var(--kq-border)] shadow-xl ${compact ? 'p-5' : 'p-7'}`}
          style={{ minHeight: compact ? undefined : 340 }}
        >
          {/* Accent bar */}
          <div className="absolute inset-x-0 top-0 h-1 bg-[var(--kq-primary)]" />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-2xl bg-[var(--kq-primary-soft)] border border-[var(--kq-border)]">☑️</span>
                <div>
                  <p className="text-[11px] font-semibold text-[var(--kq-text-muted)]">Weekly review</p>
                  <p className="text-base font-black leading-tight text-[var(--kq-text-primary)]">{report.title || 'This week'}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[11px] text-[var(--kq-text-secondary)] flex items-center gap-1.5">
                  <Calendar size={12} className="opacity-80" />
                  {fmtRange(report.weekStart, report.weekEnd)}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[11px] text-[var(--kq-text-muted)]">Level</p>
              <p className="text-lg font-black text-[var(--kq-text-primary)]">{report.levelLabel || '—'}</p>
            </div>
          </div>

          <div className="relative z-10 mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat label="Tasks" value={`${report.questsCompleted}`} icon="✅" />
            <Stat label="XP" value={`${report.xpEarned}`} icon="✨" />
            <Stat label="Streak" value={`${report.streakDays}d`} icon={streakIcon} />
          </div>

          <div className="relative z-10 mt-5 rounded-2xl bg-[var(--kq-primary-soft)] border border-[var(--kq-border)] p-4">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="opacity-90 text-[var(--kq-primary)]" />
              <p className="text-[11px] font-semibold text-[var(--kq-text-secondary)]">Summary</p>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--kq-text-primary)]">
              You completed {report.questsCompleted} tasks, earned {report.xpEarned} XP, and kept a {report.streakDays}-day streak.
            </p>
          </div>

          <div className="relative z-10 mt-5 flex items-end justify-between">
            <p className="text-[10px] text-[var(--kq-text-muted)]">{new Date(report.generatedAt).toLocaleDateString()}</p>
            <p className="text-[10px] text-[var(--kq-text-muted)]">Field Notes</p>
          </div>
        </div>
      );
    }

    // Existing visual for other themes
    return (
      <div
        className={`relative overflow-hidden rounded-3xl ${grad} text-white shadow-xl ${compact ? 'p-5' : 'p-7'}`}
        style={{ minHeight: compact ? undefined : 360 }}
      >
        <div className="absolute inset-0 opacity-[0.10]">
          <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-2xl bg-white/15 ring-1 ring-white/20">🦁</span>
              <div>
                <p className="text-[11px] font-semibold text-white/70">Weekly Report Card</p>
                <p className="text-base font-black leading-tight">{report.title || "This Week's Karma"}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[11px] text-white/70 flex items-center gap-1.5">
                <Calendar size={12} className="opacity-80" />
                {fmtRange(report.weekStart, report.weekEnd)}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[11px] text-white/70">Level</p>
            <p className="text-lg font-black">{report.levelLabel || 'Yoddha'}</p>
          </div>
        </div>

        <div className="relative z-10 mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat label="Quests" value={`${report.questsCompleted}`} icon="✅" />
          <Stat label={isHinglish ? 'XP' : 'Punya'} value={`${report.xpEarned}`} icon="✨" />
          <Stat label="Streak" value={`${report.streakDays}d`} icon="🪔" />
        </div>

        <div className="relative z-10 mt-5 rounded-2xl bg-white/10 ring-1 ring-white/15 p-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="opacity-90" />
            <p className="text-[11px] font-semibold text-white/80">Weekly Summary</p>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/90">
            {isHinglish
              ? `Is hafte aapne ${report.questsCompleted} quests complete kiye, ${report.xpEarned} XP kamaya, aur ${report.streakDays}-din ki Tapasya streak maintain ki.`
              : `This week you completed ${report.questsCompleted} quests, earned ${report.xpEarned} Punya, and maintained a ${report.streakDays}-day Tapasya streak.`}
          </p>
        </div>

        <div className="relative z-10 mt-5 flex items-end justify-between">
          <p className="text-[10px] text-white/55">#KaramQuest · #Tapasya · {new Date(report.generatedAt).toLocaleDateString()}</p>
          <p className="text-[10px] text-white/55">Karam_QUEST</p>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Dashboard preview container */}
      <div className={`${cardShell} rounded-2xl p-4 ${isModern ? '' : 'backdrop-blur-xl'} shadow-sm`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className={`text-[11px] font-semibold ${ts}`}>{isPro ? 'Weekly review' : 'Weekly Progress'}</p>
            <p className={`text-sm font-bold ${tp}`}>{isPro ? 'Weekly report card' : 'Weekly Report Card'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen(true)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all ${isModern
                  ? 'bg-[var(--kq-primary-soft)] border border-[var(--kq-border)] text-[var(--kq-text-primary)] hover:bg-[var(--kq-primary-soft)]'
                  : isDark
                    ? 'bg-white/[0.03] text-slate-200 hover:bg-white/[0.05]'
                    : 'bg-slate-900/5 text-slate-700 hover:bg-slate-900/10'
                }`}
            >
              Open
            </button>
            <button
              onClick={() => onDismissFromDashboard?.(report.weekStart)}
              className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/[0.05]' : isModern ? 'hover:bg-[var(--kq-primary-soft)]' : 'hover:bg-slate-900/5'}`}
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="w-full flex justify-center">
          <div className="w-full max-w-[520px]">
            <CardVisual compact />
          </div>
        </div>
      </div>

      {/* Modal */}
      {open ? (
        <div className="fixed inset-0 z-[100]">
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/60" onClick={() => setOpen(false)} />

          {/* TOP-ANCHORED container */}
          <div className="fixed inset-0 overflow-y-auto">
            <div className="min-h-full w-full flex items-start justify-center p-3 sm:p-6">
              <div className={`relative w-full max-w-[720px] mt-2 sm:mt-6 ${tp}`}>
                <div className={`rounded-3xl p-4 sm:p-5 ${cardShell} ${isModern ? '' : 'backdrop-blur-xl'} shadow-2xl`}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <p className={`text-[11px] font-semibold ${ts}`}>{isPro ? 'Share' : 'Screenshot & share'}</p>
                      <p className={`text-sm font-bold ${tp}`}>{isPro ? 'Weekly report' : 'Weekly Progress Card'}</p>
                    </div>
                    <button
                      onClick={() => setOpen(false)}
                      className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/[0.05]' : isModern ? 'hover:bg-[var(--kq-primary-soft)]' : 'hover:bg-slate-900/5'}`}
                      title="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="w-full flex justify-center">
                    <div className="w-full max-w-[560px]">
                      <CardVisual />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className={`text-[11px] ${ts}`}>
                      {isPro ? 'Tip: screenshot the card to share it.' : isHinglish ? 'Tip: Is card ka screenshot lo aur WhatsApp/Instagram pe share karo.' : 'Tip: Take a screenshot of the card and share on WhatsApp/Instagram.'}
                    </p>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={copy}
                        className={`px-3 py-2 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 transition-all ${isModern
                            ? 'bg-[var(--kq-primary-soft)] border border-[var(--kq-border)] text-[var(--kq-text-primary)] hover:bg-[var(--kq-primary-soft)]'
                            : isDark
                              ? 'bg-white/[0.03] text-slate-200 hover:bg-white/[0.05]'
                              : 'bg-slate-900/5 text-slate-700 hover:bg-slate-900/10'
                          }`}
                      >
                        <Copy size={14} /> Copy text
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* toast */}
              {toast ? (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[110]">
                  <div
                    className={`px-4 py-2 rounded-full text-[12px] font-semibold shadow-lg ${isModern
                        ? 'bg-[var(--kq-surface)] text-[var(--kq-text-primary)] border border-[var(--kq-border)]'
                        : isDark
                          ? 'bg-white/[0.06] text-slate-200 border border-white/[0.08]'
                          : 'bg-white text-slate-800 border border-slate-200'
                      }`}
                  >
                    {toast}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
