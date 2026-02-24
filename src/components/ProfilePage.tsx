import { useMemo, useState } from 'react';
import { Download, RefreshCcw, User, Volume2, VolumeX, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { CloudInspector } from './CloudInspector';
import { RemindersPanel } from './RemindersPanel';
import type { Achievement, Note, Quest, UserStats } from '../store';
import { questTemplates, type QuestTemplateId } from '../templates/questTemplates';
import FriendsLeaderboard from './FriendsLeaderboard';

interface ProfilePageProps {
  stats: UserStats;
  quests: Quest[];
  notes: Note[];
  achievements: Achievement[];
  onUpdateStats: (patch: Partial<UserStats>) => void;
  onExport: () => void;
  onResetAll: () => void;
  // New
  sfxEnabled: boolean;
  onToggleSfx: (enabled: boolean) => void;
  onApplyTemplate: (templateId: QuestTemplateId) => void;

  /** Supabase auth email (if signed in). */
  authEmail?: string | null;
  /** Supabase auth user id (if signed in). */
  authUserId?: string | null;
  /** Cloud sync status (if enabled). */
  cloudStatus?: { connected: boolean; saving: boolean; error: string | null };
  onSignOut?: () => void;
  onCloudSaveProfile?: (username: string, avatarEmoji: string) => Promise<void> | void;
}

const avatarEmojis = [
  '🧘','🪔','🦁','🦚','🐯','🐉','🧠','👑','⚔️','🏹','🛡️','🧿','✨','🔥','🌙','🌞','🌿','🌸','🍀','💎',
  '🧑‍💻','🧑‍🎓','🧑‍🚀','🧑‍🍳','🧑‍🎨','🧑‍🔬','🧑‍🏫','🧑‍💼',
];

function StatPill({ label, value, isDark, isHinglish }: { label: string; value: string | number; isDark: boolean; isHinglish: boolean }) {
  const pill = isHinglish
    ? 'bg-white/70 border border-rose-200/30'
    : isDark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-white/70 border border-slate-200/50';
  const labelCl = isDark ? 'text-slate-500' : 'text-slate-500';
  const valueCl = isHinglish ? 'text-rose-600' : isDark ? 'text-slate-100' : 'text-slate-900';
  return (
    <div className={`rounded-2xl px-4 py-3 ${pill}`}>
      <div className={`text-[10px] font-semibold uppercase tracking-wide ${labelCl}`}>{label}</div>
      <div className={`mt-1 text-lg font-black ${valueCl}`}>{value}</div>
    </div>
  );
}

export function ProfilePage({
  stats,
  quests,
  notes,
  achievements,
  onUpdateStats,
  onExport,
  onResetAll,
  sfxEnabled,
  onToggleSfx,
  onApplyTemplate,
  authEmail,
  authUserId,
  cloudStatus,
  onSignOut,
  onCloudSaveProfile,
}: ProfilePageProps) {
  const { isDark, isHinglish } = useTheme();
  const offlineSync = useOfflineSync(authUserId ?? null);

  const [username, setUsername] = useState(stats.username || 'Yoddha');
  const [avatar, setAvatar] = useState(stats.avatarEmoji || '🧘');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState('');

  const [confirmReset, setConfirmReset] = useState(false);
  const [openTemplate, setOpenTemplate] = useState<QuestTemplateId | null>(null);
  const [cloudMsg, setCloudMsg] = useState<string | null>(null);

  const [inspectorOpen, setInspectorOpen] = useState(false);

  const card = isHinglish
    ? 'bg-white/70 backdrop-blur-xl border border-rose-200/20 shadow-sm'
    : isDark
      ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] shadow-sm'
      : 'bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-sm';
  const tp = isHinglish ? 'text-slate-900' : isDark ? 'text-slate-100' : 'text-slate-900';
  const ts = isHinglish ? 'text-slate-500' : isDark ? 'text-slate-400' : 'text-slate-500';
  const btnPrimary = isHinglish
    ? 'bg-gradient-to-r from-rose-500 to-violet-500'
    : 'bg-gradient-to-r from-indigo-500 to-violet-500';
  const btnSoft = isHinglish
    ? 'bg-white/70 border border-rose-200/30 hover:bg-white'
    : isDark
      ? 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
      : 'bg-white/70 border border-slate-200/60 hover:bg-white';

  const totals = useMemo(() => {
    const totalQuests = quests.length;
    const completed = quests.filter(q => (q as any).status === 'completed').length;
    const active = totalQuests - completed;
    const totalNotes = notes.length;
    const unlockedAchievements = achievements.filter(a => a.unlocked).length;

    const streakRecord = (stats as any).streakRecord ?? stats.streak;
    const totalXp = (stats as any).totalXpEarned ?? (stats as any).totalXp ?? (stats as any).xp ?? 0;

    return {
      totalQuests,
      completed,
      active,
      totalNotes,
      unlockedAchievements,
      streakRecord,
      totalXp,
    };
  }, [quests, notes, achievements, stats]);

  const filteredAvatars = useMemo(() => {
    const q = emojiQuery.trim().toLowerCase();
    if (!q) return avatarEmojis;
    // Minimal keywording without adding a big emoji dataset
    const map: Record<string, string[]> = {
      yoga: ['🧘','🌿'],
      warrior: ['⚔️','🏹','🛡️','👑'],
      mind: ['🧠'],
      fire: ['🔥'],
      moon: ['🌙'],
      sun: ['🌞'],
      dev: ['🧑‍💻'],
      study: ['🧑‍🎓','📚'],
    };
    return (map[q] || avatarEmojis.filter(e => e.includes(q)))
      .filter((v, i, a) => a.indexOf(v) === i);
  }, [emojiQuery]);

  const saveProfile = async () => {
    const nextName = username.trim() || 'Yoddha';
    onUpdateStats({ username: nextName, avatarEmoji: avatar });

    if (onCloudSaveProfile) {
      setCloudMsg(null);
      try {
        await onCloudSaveProfile(nextName, avatar);
        setCloudMsg('Saved to cloud ✅');
      } catch {
        setCloudMsg('Cloud save failed. Check your Supabase policies.');
      }
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className={`text-2xl font-black ${tp} flex items-center gap-2.5`}>
          <span className="text-2xl">{isHinglish ? '🧑‍🎤' : '👤'}</span>
          {isHinglish ? 'Profile / Settings' : 'Profile'}
        </h2>
        <p className={`text-[13px] mt-1 ${ts}`}>
          {isHinglish ? 'Apna naam, avatar, stats aur settings manage karo.' : 'Manage your identity, stats, and account actions.'}
        </p>
      </div>

      {/* Identity */}
      <div className={`${card} rounded-3xl p-5 md:p-6`}> 
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowEmojiPicker(v => !v)}
              className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-sm ${btnSoft}`}
              title={isHinglish ? 'Avatar badlo' : 'Change avatar'}
            >
              {avatar}
            </button>
            <div>
              <div className={`text-[11px] font-semibold uppercase tracking-wide ${ts}`}>{isHinglish ? 'Username' : 'Username'}</div>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-[13px] outline-none ${
                    isHinglish
                      ? 'bg-white/70 border border-rose-200/30 text-slate-900'
                      : isDark
                        ? 'bg-white/[0.03] border border-white/[0.06] text-slate-100'
                        : 'bg-white/70 border border-slate-200/60 text-slate-900'
                  }`}
                />
                <button
                  onClick={saveProfile}
                  className={`px-4 py-2 rounded-xl text-white text-[13px] font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] transition-all ${btnPrimary}`}
                >
                  {isHinglish ? 'Save' : 'Save'}
                </button>
              </div>
              <div className={`text-[11px] mt-1.5 ${ts} flex items-center gap-1`}>
                <User size={12} className={isHinglish ? 'text-rose-500' : isDark ? 'text-indigo-400' : 'text-indigo-500'} />
                {isHinglish ? `Level ${stats.level} Yoddha` : `Level ${stats.level} adventurer`}
              </div>
            </div>
          </div>

          {/* Sound toggle */}
          <div className={`rounded-2xl px-4 py-3 ${btnSoft} flex items-center gap-3`}>
            {sfxEnabled ? <Volume2 size={18} className={isHinglish ? 'text-rose-500' : isDark ? 'text-indigo-400' : 'text-indigo-600'} /> : <VolumeX size={18} className={ts} />}
            <div className="min-w-[180px]">
              <div className={`text-[12px] font-bold ${tp}`}>{isHinglish ? 'Sound Effects' : 'Sound Effects'}</div>
              <div className={`text-[11px] ${ts}`}>{isHinglish ? 'Coins/level/achievements ke cues' : 'Coin / level-up / achievement cues'}</div>
            </div>
            <button
              onClick={() => onToggleSfx(!sfxEnabled)}
              className={`ml-auto w-12 h-7 rounded-full relative transition-all ${
                sfxEnabled
                  ? isHinglish
                    ? 'bg-rose-500'
                    : isDark
                      ? 'bg-indigo-500'
                      : 'bg-indigo-600'
                  : isDark
                    ? 'bg-white/[0.10]'
                    : 'bg-slate-200'
              }`}
              aria-label="Toggle sound effects"
            >
              <span
                className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-all ${sfxEnabled ? 'left-5' : 'left-0.5'}`}
              />
            </button>
          </div>
        </div>

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className={`mt-5 rounded-2xl p-4 ${btnSoft}`}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className={`text-[12px] font-bold ${tp}`}>{isHinglish ? 'Avatar Emojis' : 'Avatar Emojis'}</div>
              <input
                value={emojiQuery}
                onChange={e => setEmojiQuery(e.target.value)}
                placeholder={isHinglish ? 'Search: yoga / dev / warrior…' : 'Search: yoga / dev / warrior…'}
                className={`px-3 py-2 rounded-xl text-[12px] outline-none ${
                  isHinglish
                    ? 'bg-white/70 border border-rose-200/30 text-slate-900'
                    : isDark
                      ? 'bg-white/[0.03] border border-white/[0.06] text-slate-100'
                      : 'bg-white/70 border border-slate-200/60 text-slate-900'
                }`}
              />
            </div>
            <div className="mt-3 grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
              {filteredAvatars.map((e) => (
                <button
                  key={e}
                  onClick={() => { setAvatar(e); setShowEmojiPicker(false); setEmojiQuery(''); }}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-all ${
                    isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-black/[0.04]'
                  } ${e === avatar ? (isHinglish ? 'bg-rose-500/15' : isDark ? 'bg-indigo-500/15' : 'bg-indigo-500/10') : ''}`}
                  title={e}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Account & Sync */}
      <div className={`${card} rounded-3xl p-5 md:p-6`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className={`text-[11px] font-semibold uppercase tracking-wide ${ts}`}>{isHinglish ? 'Account' : 'Account'}</div>
            <div className={`mt-2 text-sm font-bold ${tp} flex items-center gap-2`}>
              <User size={16} /> {authEmail ? (isHinglish ? 'Signed in' : 'Signed in') : (isHinglish ? 'Guest mode' : 'Guest mode')}
            </div>

            <div className={`mt-1 text-xs ${ts}`}>
              {authEmail ? (
                <>Email: <b>{authEmail}</b></>
              ) : (
                <>No login. Data stays only on this device.</>
              )}
            </div>

            {cloudStatus ? (
              <div className={`mt-3 text-xs ${ts}`}>
                Cloud sync: {cloudStatus.connected ? (cloudStatus.saving ? 'Saving…' : 'Connected ✅') : 'Not connected'}
                {cloudStatus.error ? <span className="ml-2 text-[tomato]">({cloudStatus.error})</span> : null}
              </div>
            ) : null}

            {/* Offline queue (Phase 9) */}
            {authUserId ? (
              <div className={`mt-2 text-xs ${ts}`}>
                Network: {offlineSync.online ? 'Online ✅' : 'Offline ⚠️'}
                <span className="ml-3">Pending sync: <b>{offlineSync.pending}</b></span>
                {offlineSync.pending > 0 ? (
                  <button
                    onClick={() => void offlineSync.flushNow()}
                    disabled={!offlineSync.online || offlineSync.flushing}
                    className={`ml-3 px-2 py-0.5 rounded-lg text-[11px] font-semibold ${
                      !offlineSync.online || offlineSync.flushing
                        ? (isDark ? 'bg-white/[0.04] text-slate-500' : 'bg-slate-100 text-slate-400')
                        : (isHinglish ? 'bg-rose-500/15 text-rose-600' : isDark ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-700')
                    }`}
                    title={offlineSync.online ? 'Sync queued changes now' : 'Go online to sync'}
                  >
                    {offlineSync.flushing ? 'Syncing…' : 'Sync now'}
                  </button>
                ) : null}
                {offlineSync.error ? <span className="ml-2 text-[tomato]">({offlineSync.error})</span> : null}
              </div>
            ) : null}

            {cloudMsg ? (
              <div className={`mt-2 text-xs ${cloudMsg.includes('failed') ? 'text-[tomato]' : (isHinglish ? 'text-rose-700' : isDark ? 'text-amber-200' : 'text-slate-800')}`}>
                {cloudMsg}
              </div>
            ) : null}
          </div>

          {onSignOut ? (
            <button
              onClick={onSignOut}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold shadow-sm hover:shadow transition-all ${btnSoft}`}
            >
              {isHinglish ? 'Sign out' : 'Sign out'}
            </button>
          ) : null}
        </div>
      </div>


      {/* Friends / Leaderboard */}
      <div className={`${card} rounded-3xl p-5 md:p-6`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className={`text-[11px] font-semibold uppercase tracking-wide ${ts}`}>{isHinglish ? 'Friends' : 'Friends'}</div>
            <div className={`mt-2 text-sm font-bold ${tp}`}>
              {isHinglish ? 'Weekly XP Leaderboard' : 'Weekly XP Leaderboard'}
            </div>
            <div className={`mt-1 text-xs ${ts}`}>
              {isHinglish
                ? 'Username se friends add karo aur weekly Punya compare karo.'
                : 'Add friends by username and compare weekly Punya.'}
            </div>
            {!authUserId ? (
              <div className={`mt-3 text-xs ${ts}`}>
                {isHinglish ? 'Leaderboard ke liye login zaroori hai.' : 'Login is required to use Friends & Leaderboard.'}
              </div>
            ) : null}
          </div>
        </div>

        {authUserId ? (
          <div className="mt-4">
            <FriendsLeaderboard />
          </div>
        ) : null}
      </div>

      {/* Cloud Data Inspector */}
      <div className={`${card} rounded-3xl p-5 md:p-6`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className={`text-[11px] font-semibold uppercase tracking-wide ${ts}`}>{isHinglish ? 'Cloud Data' : 'Cloud Data'}</div>
            <div className={`mt-2 text-sm font-bold ${tp} flex items-center gap-2`}>
              <RefreshCcw size={16} /> {isHinglish ? 'Check Supabase tables' : 'Check Supabase tables'}
            </div>
            <div className={`mt-1 text-xs ${ts}`}>
              {isHinglish
                ? 'Yahan se tasks aur user_state table ka data dekh sakte ho (sirf tumhara).'
                : 'View what is stored in Supabase for your account (tasks + user_state).'}
            </div>
          </div>

          <button
            onClick={() => setInspectorOpen(true)}
            disabled={!authEmail}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold shadow-sm hover:shadow transition-all ${
              authEmail ? btnSoft : 'opacity-50 cursor-not-allowed ' + btnSoft
            }`}
            title={authEmail ? '' : (isHinglish ? 'Login required' : 'Login required')}
          >
            {isHinglish ? 'Open Inspector' : 'Open Inspector'}
          </button>
        </div>
      </div>

      <CloudInspector open={inspectorOpen} onClose={() => setInspectorOpen(false)} />

      {/* Reminders (Phase 7) */}
      <RemindersPanel
        enabled={!!authUserId}
        userId={authUserId ?? null}
        quests={quests}
        notes={notes}
      />

      {/* Stats */}
      <div className={`${card} rounded-3xl p-5 md:p-6`}>
        <div className="flex items-center gap-2">
          <Sparkles size={16} className={isHinglish ? 'text-rose-500' : isDark ? 'text-indigo-400' : 'text-indigo-600'} />
          <h3 className={`text-[14px] font-black ${tp}`}>{isHinglish ? 'All-time Stats' : 'All-time Stats'}</h3>
        </div>
        <p className={`text-[12px] mt-1 ${ts}`}>{isHinglish ? 'Progress ka asli hisaab.' : 'Your cumulative progress.'}</p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatPill label={isHinglish ? 'Total Quests' : 'Total Quests'} value={totals.totalQuests} isDark={isDark} isHinglish={isHinglish} />
          <StatPill label={isHinglish ? 'Completed' : 'Completed'} value={totals.completed} isDark={isDark} isHinglish={isHinglish} />
          <StatPill label={isHinglish ? 'Notes' : 'Notes'} value={totals.totalNotes} isDark={isDark} isHinglish={isHinglish} />
          <StatPill label={isHinglish ? 'Streak Record' : 'Streak Record'} value={totals.streakRecord} isDark={isDark} isHinglish={isHinglish} />
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <StatPill label={isHinglish ? 'Total XP' : 'Total XP'} value={totals.totalXp} isDark={isDark} isHinglish={isHinglish} />
          <StatPill label={isHinglish ? 'Coins' : 'Coins'} value={stats.coins} isDark={isDark} isHinglish={isHinglish} />
          <StatPill label={isHinglish ? 'Achievements' : 'Achievements'} value={`${totals.unlockedAchievements}/${achievements.length}`} isDark={isDark} isHinglish={isHinglish} />
        </div>
      </div>

      {/* Quest Templates */}
      <div className={`${card} rounded-3xl p-5 md:p-6`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className={`text-[14px] font-black ${tp}`}>{isHinglish ? 'Quest Templates Library' : 'Quest Templates Library'}</h3>
            <p className={`text-[12px] mt-1 ${ts}`}>{isHinglish ? 'Ready-made packs — ek click me quests add.' : 'Pre-built packs — add quests in one click.'}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.values(questTemplates).map((tpl) => {
            const open = openTemplate === tpl.id;
            return (
              <div key={tpl.id} className={`rounded-2xl p-4 ${btnSoft}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                    isHinglish ? 'bg-rose-500/10' : isDark ? 'bg-indigo-500/10' : 'bg-indigo-500/10'
                  }`}>{tpl.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className={`text-[13px] font-black ${tp}`}>{tpl.name}</div>
                        <div className={`text-[11px] mt-0.5 ${ts}`}>{tpl.description}</div>
                      </div>
                      <button
                        onClick={() => setOpenTemplate(open ? null : tpl.id)}
                        className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-black/[0.04]'}`}
                        aria-label="Toggle template preview"
                      >
                        {open ? <ChevronUp size={16} className={ts} /> : <ChevronDown size={16} className={ts} />}
                      </button>
                    </div>

                    {open && (
                      <div className="mt-3">
                        <div className={`text-[11px] font-semibold ${ts}`}>{isHinglish ? 'Includes:' : 'Includes:'}</div>
                        <ul className={`mt-2 space-y-1 text-[12px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {tpl.quests.map((q, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="mt-[2px]">•</span>
                              <span className="flex-1">{q.title}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isHinglish ? 'bg-rose-500/10 text-rose-600' : isDark ? 'bg-white/[0.06] text-slate-300' : 'bg-slate-100 text-slate-600'
                              }`}>+{q.xpReward} XP</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                      <div className={`text-[11px] ${ts}`}>{tpl.quests.length} quests</div>
                      <button
                        onClick={() => onApplyTemplate(tpl.id)}
                        className={`px-4 py-2 rounded-xl text-white text-[12px] font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] transition-all ${btnPrimary}`}
                      >
                        {isHinglish ? 'Add pack' : 'Add pack'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Account actions */}
      <div className={`${card} rounded-3xl p-5 md:p-6`}>
        <h3 className={`text-[14px] font-black ${tp}`}>{isHinglish ? 'Account' : 'Account'}</h3>
        <p className={`text-[12px] mt-1 ${ts}`}>{isHinglish ? 'Export ya reset — safe controls.' : 'Export and reset controls.'}</p>

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <button
            onClick={onExport}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${btnSoft}`}
          >
            <Download size={16} className={isHinglish ? 'text-rose-500' : isDark ? 'text-indigo-400' : 'text-indigo-600'} />
            {isHinglish ? 'Export Data' : 'Export Data'}
          </button>

          <button
            onClick={() => setConfirmReset(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/15'
                    : 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
            }`}
          >
            <RefreshCcw size={16} />
            {isHinglish ? 'Reset All Data' : 'Reset All Data'}
          </button>
        </div>
      </div>

      {/* Reset confirm */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmReset(false)} />
          <div className={`relative w-full max-w-md rounded-3xl p-6 ${card}`}>
            <h4 className={`text-[15px] font-black ${tp}`}>{isHinglish ? 'Pakki baat?' : 'Are you sure?'}</h4>
            <p className={`text-[12px] mt-2 ${ts}`}>
              {isHinglish
                ? 'Ye sab data delete karega (quests, notes, coins, shop, settings). Undo nahi hoga.'
                : 'This will delete all your data (quests, notes, coins, shop, settings). This cannot be undone.'}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold ${btnSoft}`}
              >
                {isHinglish ? 'Cancel' : 'Cancel'}
              </button>
              <button
                onClick={() => { setConfirmReset(false); onResetAll(); }}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 transition-all`}
              >
                {isHinglish ? 'Reset' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}