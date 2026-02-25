import { X } from 'lucide-react';
import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import type { BreakSession, FocusSession, Page, Quest } from '../store';
import { formatMs } from '../shop';

type Props = {
  focusSession: FocusSession | null;
  focusRemainingMs: number;
  breakSession: BreakSession | null;
  breakRemainingMs: number;
  quests: Quest[];
  onNavigate: (page: Page) => void;
  onFocusQuest: (id: string) => void;
  onStopFocus: () => void;
  onStopBreak: () => void;
};

export function FloatingTimerPill({
  focusSession,
  focusRemainingMs,
  breakSession,
  breakRemainingMs,
  quests,
  onNavigate,
  onFocusQuest,
  onStopFocus,
  onStopBreak,
}: Props) {
  const { isDark, isHinglish, isModern } = useTheme();

  const focusActive = !!focusSession && focusRemainingMs > 0;
  const breakActive = !focusActive && !!breakSession && breakRemainingMs > 0;

  const focusTitle = useMemo(() => {
    if (!focusSession) return '';
    return quests.find((q) => q.id === focusSession.questId)?.title || 'Focus';
  }, [focusSession, quests]);

  if (!focusActive && !breakActive) return null;

  const bg = isModern
    ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)]'
    : isHinglish
      ? 'bg-white/80 border border-indigo-200/40'
      : isDark
        ? 'bg-[#12121F]/85 border border-white/[0.06]'
        : 'bg-white/85 border border-slate-200/60';

  const text = isModern
    ? 'text-[var(--kq-text-primary)]'
    : isDark
      ? 'text-slate-200'
      : 'text-slate-800';

  const sub = isModern
    ? 'text-[var(--kq-text-muted)]'
    : isDark
      ? 'text-slate-500'
      : 'text-slate-500';

  const accent = isHinglish
    ? 'from-indigo-500 to-violet-500'
    : 'from-indigo-500 to-violet-500';

  const label = focusActive
    ? (focusSession?.label || 'Pomodoro')
    : (breakSession?.kind === 'long' ? 'Long Break' : 'Short Break');

  const remaining = focusActive ? focusRemainingMs : breakRemainingMs;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className={`rounded-2xl shadow-2xl backdrop-blur-xl ${bg} overflow-hidden min-w-[260px] max-w-[min(86vw,320px)]`}>
        <div className={`h-1.5 bg-gradient-to-r ${accent}`} style={{ width: `${Math.max(6, Math.min(100, Math.round((remaining / (focusActive ? (focusSession?.durationMs || 1) : (breakSession?.durationMs || 1))) * 100)))}%` }} />

        <div className="px-3 py-2.5 flex items-center gap-2">
          <button
            onClick={() => {
              if (focusActive && focusSession) {
                onNavigate('quests');
                onFocusQuest(focusSession.questId);
              }
            }}
            className="flex-1 min-w-0 text-left"
            aria-label={focusActive ? 'Open focused quest' : 'Break timer'}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className={`text-[11px] font-black ${text} truncate`}>
                  {focusActive ? `⏱️ ${label}` : `☕ ${label}`}
                </p>
                <p className={`text-[11px] ${sub} truncate`}>
                  {focusActive ? focusTitle : 'Take a breather — you earned it.'}
                </p>
              </div>
              <div className={`shrink-0 text-[12px] font-black ${text}`}>
                {formatMs(remaining)}
              </div>
            </div>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (focusActive) onStopFocus();
              else onStopBreak();
            }}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
            aria-label={focusActive ? 'Stop focus timer' : 'Skip break'}
            title={focusActive ? 'Stop' : 'Skip'}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
