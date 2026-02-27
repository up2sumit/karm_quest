import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import type { CustomChallenge } from '../store';

interface CommunityChallengesProps {
    challenges: CustomChallenge[];
    onAccept: (ccId: string) => void;
    onClaim: (ccId: string) => void;
    onCreate: (cc: Omit<CustomChallenge, 'id' | 'status' | 'progress' | 'isCommunity'>) => void;
}

export function CommunityChallenges({
    challenges,
    onAccept,
    onClaim,
    onCreate,
}: CommunityChallengesProps) {
    const { isDark, isHinglish, isModern } = useTheme();
    const [showCreate, setShowCreate] = useState(false);

    // Form State
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newTarget, setNewTarget] = useState(1);
    const [newReward, setNewReward] = useState(50);
    const [newType, setNewType] = useState<'quests' | 'xp'>('quests');
    const [newRequiresChallengeId, setNewRequiresChallengeId] = useState<string>('');

    const tp = isModern ? 'text-[var(--kq-text-primary)]' : isDark ? 'text-slate-100' : 'text-slate-900';
    const ts = isModern ? 'text-[var(--kq-text-secondary)]' : isDark ? 'text-slate-400' : 'text-slate-500';

    const btnPrimary = isModern
        ? 'bg-[var(--kq-primary)] text-white hover:bg-[var(--kq-primary-light)]'
        : 'bg-indigo-600 text-white hover:bg-indigo-700';

    const btnSecondary = isModern
        ? 'bg-[var(--kq-primary-soft)] text-[var(--kq-text-primary)] hover:bg-[var(--kq-border)]'
        : 'bg-slate-100 text-slate-700 hover:bg-slate-200';

    const cardCls = isModern
        ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)]'
        : 'bg-white border border-slate-200 shadow-sm';

    const activeChallenges = challenges.filter((c) => c.status === 'active');
    const finishedChallenges = challenges.filter((c) => c.status === 'completed');
    const availableChallenges = challenges.filter((c) => c.status === 'available');

    const handleCreate = () => {
        if (!newTitle.trim()) return;
        onCreate({
            title: newTitle,
            description: newDesc,
            targetCount: newTarget,
            rewardCoins: newReward,
            creator: 'You',
            type: newType,
            requiresChallengeId: newRequiresChallengeId || undefined,
        });
        setNewTitle('');
        setNewDesc('');
        setNewTarget(1);
        setNewReward(50);
        setNewRequiresChallengeId('');
        setShowCreate(false);
    };

    const isLockedBy = (c: CustomChallenge) => {
        if (!c.requiresChallengeId) return null;
        const requirement = challenges.find((x) => x.id === c.requiresChallengeId);
        return requirement && requirement.status !== 'completed' ? requirement : null;
    };

    return (
        <div className="space-y-8">
            {/* Header & Create Button */}
            <div className="flex items-center justify-between">
                <h3 className={`text-xl font-bold ${tp}`}>Community Quests</h3>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${showCreate ? btnSecondary : btnPrimary}`}
                >
                    {showCreate ? 'Cancel' : (isHinglish ? '+ Create Sankalp' : '+ Create Challenge')}
                </button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className={`${cardCls} rounded-2xl p-6 space-y-4 animate-slide-up`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={`text-xs font-bold uppercase tracking-wider ${ts}`}>Title</label>
                            <input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="e.g. Master Archer"
                                className="w-full bg-transparent border border-slate-200/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className={`text-xs font-bold uppercase tracking-wider ${ts}`}>Type</label>
                            <select
                                value={newType}
                                onChange={(e) => setNewType(e.target.value as any)}
                                className="w-full bg-transparent border border-slate-200/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                            >
                                <option value="quests">Complete Quests</option>
                                <option value="xp">Earn XP</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className={`text-xs font-bold uppercase tracking-wider ${ts}`}>Description (Why this challenge?)</label>
                        <textarea
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            placeholder="Provide background context for other users..."
                            className="w-full bg-transparent border border-slate-200/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 h-20 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={`text-xs font-bold uppercase tracking-wider ${ts}`}>Target Count</label>
                            <input
                                type="number"
                                value={newTarget}
                                onChange={(e) => setNewTarget(parseInt(e.target.value) || 1)}
                                className="w-full bg-transparent border border-slate-200/50 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className={`text-xs font-bold uppercase tracking-wider ${ts}`}>Reward (Mudra)</label>
                            <input
                                type="number"
                                value={newReward}
                                onChange={(e) => setNewReward(parseInt(e.target.value) || 50)}
                                className="w-full bg-transparent border border-slate-200/50 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className={`text-xs font-bold uppercase tracking-wider ${ts}`}>Prerequisite Challenge (Optional Chain)</label>
                        <select
                            value={newRequiresChallengeId}
                            onChange={(e) => setNewRequiresChallengeId(e.target.value)}
                            className="w-full bg-transparent border border-slate-200/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">None (Available immediately)</option>
                            {challenges.filter(c => c.status !== 'completed').map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={!newTitle.trim()}
                        className={`w-full py-3 rounded-xl font-bold transition-all mt-2 ${btnPrimary} disabled:opacity-50`}
                    >
                        Deploy Challenge
                    </button>
                </div>
            )}

            {/* Active Section */}
            {activeChallenges.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🔥</span>
                        <h4 className={`text-sm font-black uppercase tracking-widest ${tp}`}>Active Tapasya</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeChallenges.map((c) => (
                            <ChallengeCard key={c.id} cc={c} onAccept={onAccept} onClaim={onClaim} />
                        ))}
                    </div>
                </section>
            )}

            {/* Available Section */}
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <span className="text-xl">✨</span>
                    <h4 className={`text-sm font-black uppercase tracking-widest ${tp}`}>Discovery Arena</h4>
                </div>
                {availableChallenges.length === 0 ? (
                    <p className={`text-sm ${ts}`}>No new challenges available. Why not create one?</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {availableChallenges.map((c) => (
                            <ChallengeCard key={c.id} cc={c} onAccept={onAccept} onClaim={onClaim} lockedBy={isLockedBy(c)} />
                        ))}
                    </div>
                )}
            </section>

            {/* Completed Section */}
            {finishedChallenges.length > 0 && (
                <section className="space-y-4 pt-4 border-t border-slate-200/10">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🕉️</span>
                        <h4 className={`text-sm font-black uppercase tracking-widest ${ts}`}>Legends Archive</h4>
                    </div>
                    <div className="opacity-60 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {finishedChallenges.map((c) => (
                            <div key={c.id} className={`${cardCls} rounded-2xl p-4 flex flex-col justify-between`}>
                                <div>
                                    <h5 className={`font-bold text-sm ${tp}`}>{c.title}</h5>
                                    <p className={`text-[11px] mt-1 ${ts}`}>Completed by {c.creator === 'You' ? 'You' : c.creator}</p>
                                </div>
                                <div className="mt-2 text-xs font-black text-emerald-500">PAID +{c.rewardCoins} Mudra</div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function ChallengeCard({
    cc,
    onAccept,
    onClaim,
    lockedBy
}: {
    cc: CustomChallenge;
    onAccept: (id: string) => void;
    onClaim: (id: string) => void;
    lockedBy?: CustomChallenge | null;
}) {
    const { isModern, isDark } = useTheme();

    const tp = isModern ? 'text-[var(--kq-text-primary)]' : isDark ? 'text-slate-100' : 'text-slate-900';
    const ts = isModern ? 'text-[var(--kq-text-secondary)]' : isDark ? 'text-slate-400' : 'text-slate-500';
    const cardCls = isModern
        ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)]'
        : isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200 shadow-sm';

    const progressPct = Math.min(100, Math.round((cc.progress / cc.targetCount) * 100));
    const isReady = cc.progress >= cc.targetCount && cc.status === 'active';

    return (
        <div className={`${cardCls} rounded-2xl p-5 flex flex-col transition-all hover:shadow-md ${lockedBy ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-black px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 uppercase tracking-widest">
                    {cc.creator}
                </span>
                <div className="flex items-center gap-1 text-sm font-bold text-amber-500">
                    <span>🪙</span> {cc.rewardCoins}
                </div>
            </div>

            <h4 className={`font-black text-lg ${tp}`}>{cc.title}</h4>
            <p className={`text-[12px] leading-relaxed mt-2 line-clamp-2 ${ts}`}>{cc.description}</p>

            {lockedBy ? (
                <div className="mt-auto pt-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 text-center">
                    <span>🔒 Locked: Complete "{lockedBy.title}"</span>
                </div>
            ) : cc.status === 'active' ? (
                <div className="mt-auto pt-4 space-y-3">
                    <div className="flex justify-between items-center text-[11px] font-bold">
                        <span className={ts}>{cc.type === 'quests' ? 'Quests' : 'XP'} Progress</span>
                        <span className={tp}>{cc.progress}/{cc.targetCount}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                    {isReady ? (
                        <button
                            onClick={() => onClaim(cc.id)}
                            className="w-full py-2 bg-emerald-500 text-white rounded-xl text-sm font-black animate-pulse"
                        >
                            CLAIM REWARD
                        </button>
                    ) : (
                        <div className="text-center text-[10px] uppercase font-black text-indigo-400 tracking-widest py-2">
                            In Progress...
                        </div>
                    )}
                </div>
            ) : (
                <button
                    onClick={() => !lockedBy && onAccept(cc.id)}
                    disabled={!!lockedBy}
                    className="mt-auto py-2.5 bg-slate-900 text-white rounded-xl text-sm font-black hover:bg-black transition-all"
                >
                    ACCEPT CHALLENGE
                </button>
            )}
        </div>
    );
}
