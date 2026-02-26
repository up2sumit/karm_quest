import { Clock, Timer, Zap, Calendar, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';
import type { FocusHistoryEntry } from '../store';
import { todayISO, yesterdayISO } from '../store';
import { formatMs } from '../shop';

interface Props {
    history: FocusHistoryEntry[];
    onNavigateToQuests?: () => void;
}

function dayLabel(day: string): string {
    if (day === todayISO()) return 'Today';
    if (day === yesterdayISO()) return 'Yesterday';
    try {
        const [y, m, d] = day.split('-').map(Number);
        return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(
            new Date(y, m - 1, d)
        );
    } catch {
        return day;
    }
}

export function FocusSessionHistory({ history, onNavigateToQuests }: Props) {
    const { isDark, isHinglish, isModern, lang } = useTheme();
    const [showAll, setShowAll] = useState(false);

    // Group by day (newest first)
    const grouped = useMemo(() => {
        const map = new Map<string, FocusHistoryEntry[]>();
        const sorted = [...history].sort((a, b) => b.startedAt - a.startedAt);
        for (const entry of sorted) {
            const arr = map.get(entry.day);
            if (arr) arr.push(entry);
            else map.set(entry.day, [entry]);
        }
        return Array.from(map.entries());
    }, [history]);

    // Stats
    const totalSessions = history.length;
    const totalMs = history.reduce((a, e) => a + e.durationMs, 0);
    const totalXp = history.reduce((a, e) => a + e.xpAwarded, 0);
    const todaySessions = history.filter((e) => e.day === todayISO());
    const todayMs = todaySessions.reduce((a, e) => a + e.durationMs, 0);
    const todayXp = todaySessions.reduce((a, e) => a + e.xpAwarded, 0);

    const darkLike = isDark || isHinglish;
    const card = isModern
        ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)] shadow-[0_1px_1px_rgba(0,0,0,0.04)]'
        : darkLike
            ? 'bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] shadow-sm'
            : 'bg-white/80 backdrop-blur-xl border border-slate-200/40 shadow-sm';
    const tp = isModern ? 'text-[var(--kq-text-primary)]' : darkLike ? 'text-slate-200' : 'text-slate-800';
    const ts2 = isModern ? 'text-[var(--kq-text-secondary)]' : darkLike ? 'text-slate-400' : 'text-slate-500';
    const mutedTxt = isModern ? 'text-[var(--kq-text-muted)]' : darkLike ? 'text-slate-500' : 'text-slate-400';
    const btnGradient = isModern
        ? 'bg-[var(--kq-primary)] hover:bg-[var(--kq-primary-light)]'
        : 'bg-gradient-to-r from-indigo-500 to-violet-500';

    const visibleGroups = showAll ? grouped : grouped.slice(0, 5);

    return (
        <div className="space-y-5 animate-slide-up">
            {/* Header */}
            <div>
                <h2 className={`text-lg font-bold ${tp} flex items-center gap-2`}>
                    <Timer size={20} className={isHinglish ? 'text-indigo-500' : isModern ? 'text-[var(--kq-primary)]' : 'text-indigo-400'} />
                    {t('navFocus', lang)}
                </h2>
                <p className={`text-[13px] mt-1 ${ts2}`}>
                    {isModern ? 'Track your focus sessions and XP earned.' : isHinglish ? 'Apne focus sessions ka pura record yahan hai! ⏱️' : 'Your tapasya focus log — every session recorded.'}
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Today's Sessions", value: todaySessions.length, icon: <Clock size={16} className="text-indigo-400" />, sub: formatMs(todayMs) },
                    { label: "Today's XP", value: `+${todayXp}`, icon: <Zap size={16} className="text-emerald-400" />, sub: 'earned today' },
                    { label: 'Total Sessions', value: totalSessions, icon: <Calendar size={16} className="text-violet-400" />, sub: formatMs(totalMs) },
                    { label: 'Total XP', value: `+${totalXp}`, icon: <TrendingUp size={16} className="text-amber-400" />, sub: 'lifetime' },
                ].map((s, i) => (
                    <div key={i} className={`rounded-2xl p-4 ${card}`}>
                        <div className="flex items-center gap-2 mb-2">
                            {s.icon}
                            <span className={`text-[11px] font-semibold ${mutedTxt}`}>{s.label}</span>
                        </div>
                        <div className={`text-xl font-black ${tp}`}>{s.value}</div>
                        <div className={`text-[11px] ${mutedTxt} mt-0.5`}>{s.sub}</div>
                    </div>
                ))}
            </div>

            {/* Session History */}
            {history.length === 0 ? (
                <div className={`rounded-2xl p-8 text-center ${card}`}>
                    <div className="text-4xl mb-3">⏱️</div>
                    <p className={`text-[14px] font-bold ${tp}`}>No focus sessions yet</p>
                    <p className={`text-[12px] mt-1 ${ts2}`}>
                        {isHinglish ? 'Koi quest pe focus start karo — history yahan dikhega!' : 'Start a focus session on any quest to see your history here.'}
                    </p>
                    {onNavigateToQuests && (
                        <button
                            onClick={onNavigateToQuests}
                            className={`mt-4 px-5 py-2.5 rounded-xl text-white font-semibold text-[13px] shadow-md hover:shadow-lg transition-all ${btnGradient}`}
                        >
                            Go to Quests →
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {visibleGroups.map(([day, entries]) => (
                        <div key={day}>
                            {/* Day Header */}
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`text-[12px] font-bold ${tp}`}>{dayLabel(day)}</div>
                                <div className={`flex-1 h-px ${darkLike ? 'bg-white/[0.06]' : 'bg-slate-200/60'}`} />
                                <div className={`text-[11px] ${mutedTxt}`}>
                                    {entries.length} session{entries.length !== 1 ? 's' : ''} · {formatMs(entries.reduce((a, e) => a + e.durationMs, 0))} · +{entries.reduce((a, e) => a + e.xpAwarded, 0)} XP
                                </div>
                            </div>

                            {/* Session Rows */}
                            <div className="space-y-1.5">
                                {entries.map((entry) => {
                                    const time = new Date(entry.startedAt);
                                    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    return (
                                        <div
                                            key={entry.id}
                                            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${card} hover:scale-[1.01]`}
                                        >
                                            {/* Time */}
                                            <div className={`text-[11px] font-mono ${mutedTxt} w-[50px] shrink-0`}>{timeStr}</div>

                                            {/* Preset label badge */}
                                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${entry.label === 'Pomodoro' ? 'bg-indigo-500/10 text-indigo-400' :
                                                    entry.label === 'Deep Work' ? 'bg-violet-500/10 text-violet-400' :
                                                        entry.label === 'Marathon' ? 'bg-amber-500/10 text-amber-400' :
                                                            'bg-emerald-500/10 text-emerald-400'
                                                }`}>
                                                {entry.label}
                                            </div>

                                            {/* Quest title */}
                                            <div className={`flex-1 min-w-0 text-[12px] font-medium ${tp} truncate`}>
                                                {entry.questTitle}
                                            </div>

                                            {/* Duration */}
                                            <div className={`text-[11px] ${ts2} shrink-0 flex items-center gap-1`}>
                                                <Clock size={10} />
                                                {formatMs(entry.durationMs)}
                                            </div>

                                            {/* XP */}
                                            <div className="text-[11px] font-bold text-emerald-400 shrink-0">
                                                +{entry.xpAwarded}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Show more */}
                    {grouped.length > 5 && !showAll && (
                        <button
                            onClick={() => setShowAll(true)}
                            className={`w-full py-2.5 rounded-xl text-[12px] font-semibold transition-all ${darkLike ? 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.06]' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            Show all {grouped.length} days →
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
