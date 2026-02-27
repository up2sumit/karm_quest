import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, RefreshCcw, User, Volume2, VolumeX, Sparkles, ChevronDown, ChevronUp, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { CloudInspector } from './CloudInspector';
import { RemindersPanel } from './RemindersPanel';
import type { Achievement, Note, Quest, UserStats } from '../store';
import { questTemplates, type QuestTemplateId } from '../templates/questTemplates';
import { supabase } from '../lib/supabase';
import { weekStartISO, addDaysISO } from '../utils/recurrence';

interface ProfilePageProps {
  stats: UserStats;
  quests: Quest[];
  notes: Note[];
  achievements: Achievement[];
  onUpdateStats: (patch: Partial<UserStats>) => void;
  onExport: () => void;
  onImport?: (file: File) => Promise<void> | void;
  onResetAll: () => void;
  // New
  sfxEnabled: boolean;
  onToggleSfx: (enabled: boolean) => void;
  onApplyTemplate: (templateId: QuestTemplateId | string, isCustom?: boolean) => void;
  customTemplates?: import('../templates/questTemplates').QuestTemplate[];
  onSaveCustomTemplate?: (template: import('../templates/questTemplates').QuestTemplate) => void;
  onDeleteCustomTemplate?: (templateId: string) => void;

  /** Supabase auth email (if signed in). */
  authEmail?: string | null;
  /** Supabase auth user id (if signed in). */
  authUserId?: string | null;
  /** Cloud sync status (if enabled). */
  cloudStatus?: {
    connected: boolean;
    saving: boolean;
    queued: boolean;
    error: string | null;
    lastSyncedAt: string | null;
  };
  onSignOut?: () => void;
  onCloudSaveProfile?: (name: string, emoji: string, imgPath: string | null) => Promise<void>;
  onImportTodoist?: (file: File) => Promise<void>;
  onImportHabitica?: (file: File) => Promise<void>;
}

const avatarEmojis = [
  '🧘', '🪔', '🦁', '🦚', '🐯', '🐉', '🧠', '👑', '⚔️', '🏹', '🛡️', '🧿', '✨', '🔥', '🌙', '🌞', '🌿', '🌸', '🍀', '💎',
  '🧑‍💻', '🧑‍🎓', '🧑‍🚀', '🧑‍🍳', '🧑‍🎨', '🧑‍🔬', '🧑‍🏫', '🧑‍💼',
];

function StatPill({
  label,
  value,
  isDark,
  isHinglish,
  isModern,
}: {
  label: string;
  value: string | number;
  isDark: boolean;
  isHinglish: boolean;
  isModern: boolean;
}) {
  const darkLike = isDark || isHinglish;
  const pill = isModern
    ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)]'
    : darkLike
      ? 'bg-white/[0.04] border border-white/[0.06]'
      : 'bg-white/70 border border-slate-200/50';

  const labelCl = isModern ? 'text-[var(--kq-text-muted)]' : darkLike ? 'text-slate-500' : 'text-slate-500';
  const valueCl = isModern
    ? 'text-[var(--kq-text-primary)]'
    : darkLike
      ? 'text-slate-100'
      : 'text-slate-900';

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
  onImport,
  onResetAll,
  sfxEnabled,
  onToggleSfx,
  onApplyTemplate,
  customTemplates = [],
  onSaveCustomTemplate,
  onDeleteCustomTemplate,
  authEmail,
  authUserId,
  cloudStatus,
  onSignOut,
  onCloudSaveProfile,
  onImportTodoist,
  onImportHabitica,
}: ProfilePageProps) {
  const { isDark, isHinglish, isModern } = useTheme();
  const offlineSync = useOfflineSync(authUserId ?? null);

  const [username, setUsername] = useState(() => stats.username || (isModern ? 'User' : 'Yoddha'));
  const [avatar, setAvatar] = useState(stats.avatarEmoji || '🧘');
  const [avatarImagePath, setAvatarImagePath] = useState<string | null>(() => (stats as any).avatarImagePath ?? null);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState('');

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importPending, setImportPending] = useState<File | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);

  const [confirmReset, setConfirmReset] = useState(false);
  const [openTemplate, setOpenTemplate] = useState<QuestTemplateId | string | null>(null);
  const [cloudMsg, setCloudMsg] = useState<string | null>(null);

  // Custom Template Creation State
  const [isCreatingPack, setIsCreatingPack] = useState(false);
  const [newPack, setNewPack] = useState<{ id: string; name: string; icon: string; description: string; quests: Omit<import('../templates/questTemplates').TemplateQuest, 'subtasks'>[] }>({
    id: '', name: '', icon: '🌟', description: '', quests: []
  });

  const [inspectorOpen, setInspectorOpen] = useState(false);

  const darkLike = isDark || isHinglish;

  const card = isModern
    ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)] shadow-sm'
    : darkLike
      ? 'bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] shadow-sm'
      : 'bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-sm';
  const tp = isModern ? 'text-[var(--kq-text-primary)]' : (darkLike ? 'text-slate-100' : 'text-slate-900');
  const ts = isModern ? 'text-[var(--kq-text-secondary)]' : (darkLike ? 'text-slate-400' : 'text-slate-500');
  const btnPrimary = isModern
    ? 'bg-[var(--kq-primary)] hover:bg-[var(--kq-primary-light)]'
    : 'bg-gradient-to-r from-indigo-500 to-violet-500';
  const btnSoft = isModern
    ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)] hover:bg-[var(--kq-primary-soft)]'
    : darkLike
      ? 'bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06]'
      : 'bg-white/70 border border-slate-200/60 hover:bg-white';

  const totals = useMemo(() => {
    const totalQuests = quests.length;
    const completed = quests.filter(q => (q as any).status === 'completed').length;
    const active = totalQuests - completed;
    const totalNotes = notes.length;
    const unlockedAchievements = achievements.filter(a => a.unlocked).length;

    const streakRecord = (stats as any).streakRecord ?? stats.streak;
    const totalXp = (stats as any).totalXpEarned ?? (stats as any).totalXp ?? (stats as any).xp ?? 0;

    const currentWeekStart = weekStartISO();
    const lastWeekStart = addDaysISO(currentWeekStart, -7);

    const completedThisWeek = quests.filter(q =>
      (q as any).status === 'completed' &&
      (q.completedAt || '') >= currentWeekStart
    );
    const completedLastWeek = quests.filter(q =>
      (q as any).status === 'completed' &&
      (q.completedAt || '') >= lastWeekStart &&
      (q.completedAt || '') < currentWeekStart
    );

    const xpThisWeek = completedThisWeek.reduce((sum, q) => sum + (q.earnedXp ?? q.xpReward), 0);
    const xpLastWeek = completedLastWeek.reduce((sum, q) => sum + (q.earnedXp ?? q.xpReward), 0);

    return {
      totalQuests,
      completed,
      active,
      totalNotes,
      unlockedAchievements,
      streakRecord,
      totalXp,
      questsThisWeek: completedThisWeek.length,
      questsLastWeek: completedLastWeek.length,
      xpThisWeek,
      xpLastWeek,
    };
  }, [quests, notes, achievements, stats]);

  const filteredAvatars = useMemo(() => {
    const q = emojiQuery.trim().toLowerCase();
    if (!q) return avatarEmojis;
    // Minimal keywording without adding a big emoji dataset
    const map: Record<string, string[]> = {
      yoga: ['🧘', '🌿'],
      warrior: ['⚔️', '🏹', '🛡️', '👑'],
      mind: ['🧠'],
      fire: ['🔥'],
      moon: ['🌙'],
      sun: ['🌞'],
      dev: ['🧑‍💻'],
      study: ['🧑‍🎓', '📚'],
    };
    return (map[q] || avatarEmojis.filter(e => e.includes(q)))
      .filter((v, i, a) => a.indexOf(v) === i);
  }, [emojiQuery]);

  const saveProfile = async () => {
    const nextName = username.trim() || (isModern ? 'User' : 'Yoddha');
    onUpdateStats({ username: nextName, avatarEmoji: avatar, avatarImagePath });

    if (onCloudSaveProfile) {
      setCloudMsg(null);
      try {
        await onCloudSaveProfile(nextName, avatar, avatarImagePath);
        setCloudMsg('Saved to cloud ✅');
      } catch {
        setCloudMsg('Cloud save failed. Check your Supabase policies.');
      }
    }
  };

  // Keep local state synced if stats changes from cloud hydration.
  useEffect(() => {
    setUsername(stats.username || (isModern ? 'User' : 'Yoddha'));
    setAvatar(stats.avatarEmoji || '🧘');
    setAvatarImagePath((stats as any).avatarImagePath ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.username, stats.avatarEmoji, (stats as any).avatarImagePath]);

  // Render uploaded avatar via signed URL (bucket is private).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authUserId || !avatarImagePath) {
        setAvatarSignedUrl(null);
        return;
      }
      const { data, error } = await supabase.storage.from('attachments').createSignedUrl(avatarImagePath, 60 * 60 * 24 * 7);
      if (cancelled) return;
      if (error) {
        setAvatarSignedUrl(null);
        return;
      }
      setAvatarSignedUrl(data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, avatarImagePath]);

  const uploadAvatarImage = async (file: File) => {
    if (!authUserId) {
      setCloudMsg('Sign in to upload a custom avatar.');
      return;
    }
    const maxBytes = 1 * 1024 * 1024; // 1MB
    if (file.size > maxBytes) {
      setCloudMsg(`Avatar too large. Max 1MB.`);
      return;
    }

    setCloudMsg(null);
    try {
      const stamp = Date.now();
      const safe = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 80) || `avatar_${stamp}.png`;
      const path = `${authUserId}/profile/${stamp}_${safe}`;
      const up = await supabase.storage.from('attachments').upload(path, file, { upsert: true });
      if (up.error) throw up.error;

      // Best-effort cleanup of previous avatar object.
      if (avatarImagePath) {
        void supabase.storage.from('attachments').remove([avatarImagePath]);
      }

      setAvatarImagePath(path);
      setCloudMsg('Avatar uploaded ✅ (remember to Save)');
    } catch (e: any) {
      setCloudMsg(e?.message || 'Avatar upload failed');
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const formatLastSynced = (ts?: string | null) => {
    if (!ts) return null;
    const t = new Date(ts).getTime();
    if (!Number.isFinite(t)) return null;
    const diff = Date.now() - t;
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className={`text-2xl font-black ${tp} flex items-center gap-2.5`}>
          <span className="text-2xl">{isHinglish ? '🧑‍🎤' : '👤'}</span>
          {isModern ? 'Account' : isHinglish ? 'Profile / Settings' : 'Profile'}
        </h2>
        <p className={`text-[13px] mt-1 ${ts}`}>
          {isModern ? 'Manage your profile, sync, and preferences.' : isHinglish ? 'Apna naam, avatar, stats aur settings manage karo.' : 'Manage your identity, stats, and account actions.'}
        </p>
      </div>

      {/* Identity */}
      <div className={`${card} rounded-3xl p-5 md:p-6`}>
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar Preview Section */}
          <div className="flex flex-col items-center gap-3">
            <div className={`relative w-32 h-32 rounded-[2rem] overflow-hidden flex items-center justify-center text-6xl shadow-inner ${btnSoft}`}>
              {avatarSignedUrl ? (
                <img src={avatarSignedUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="animate-float">{avatar}</div>
              )}
              <div className={`absolute inset-0 ring-1 ring-inset ${isModern ? 'ring-[var(--kq-border)]' : 'ring-white/20'} rounded-[2rem] pointer-events-none`} />
            </div>

            <div className="flex gap-2 w-full justify-center">
              <button
                onClick={() => setShowEmojiPicker(v => !v)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all ${btnSoft}`}
                title="Change Emoji"
              >
                <span>😀</span> Emoji
              </button>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={!authUserId}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all ${authUserId ? btnSoft : 'opacity-50 cursor-not-allowed ' + btnSoft}`}
                title={authUserId ? 'Upload Photo' : 'Sign in to upload'}
              >
                <ImageIcon size={14} /> Photo
              </button>
            </div>
            {avatarImagePath && (
              <button
                onClick={() => { setAvatarImagePath(null); setAvatarSignedUrl(null); setCloudMsg('Avatar removed (remember to Save)'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
              >
                <Trash2 size={12} /> Remove custom image
              </button>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadAvatarImage(f);
              }}
            />
          </div>

          <div className="flex-1 flex flex-col gap-5">
            <div className="w-full">
              <div className={`text-[12px] font-bold uppercase tracking-wider ${ts} mb-1.5`}>Profile Details</div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className={`flex-1 min-w-[200px] px-4 py-2.5 rounded-2xl text-[15px] font-bold outline-none ring-2 ring-transparent transition-all focus:ring-indigo-500/50 ${darkLike
                    ? 'bg-white/[0.04] text-white placeholder-white/40'
                    : 'bg-slate-100/70 text-slate-900 placeholder-slate-400'
                    }`}
                  placeholder="Enter your name"
                />
                <button
                  onClick={saveProfile}
                  className={`px-5 py-2.5 rounded-2xl text-white text-[14px] font-bold shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all ${btnPrimary}`}
                >
                  {isHinglish ? 'Save' : 'Save'}
                </button>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg inline-flex text-[12px] font-semibold ${isModern ? 'bg-[var(--kq-primary-soft)] text-[var(--kq-primary)]' : darkLike ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
                <User size={14} />
                Level {stats.level}
                <span className="mx-1 opacity-50">•</span>
                {totals.totalXp} XP
              </div>
            </div>

            {/* Sound toggle */}
            <div className={`rounded-2xl px-4 py-3 border ${isModern ? 'border-[var(--kq-border)] bg-[var(--kq-surface)]' : darkLike ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200/60 bg-white/50'} flex items-center justify-between gap-3`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sfxEnabled ? (isModern ? 'bg-[var(--kq-primary-soft)] text-[var(--kq-primary)]' : darkLike ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600') : (darkLike ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400')}`}>
                  {sfxEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </div>
                <div>
                  <div className={`text-[13px] font-bold ${tp}`}>{isHinglish ? 'Sound Effects' : 'Sound Effects'}</div>
                  <div className={`text-[11px] ${ts}`}>Cues for coins, levels, & achievements</div>
                </div>
              </div>
              <button
                onClick={() => onToggleSfx(!sfxEnabled)}
                className={`w-12 h-7 rounded-full relative transition-all ${sfxEnabled
                  ? isHinglish
                    ? 'bg-indigo-500'
                    : isDark
                      ? 'bg-indigo-500'
                      : 'bg-[var(--kq-primary)]'
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
                className={`px-3 py-2 rounded-xl text-[12px] outline-none ${darkLike
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
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-all ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-black/[0.04]'
                    } ${e === avatar ? (isHinglish ? 'bg-indigo-500/15' : isDark ? 'bg-indigo-500/15' : 'bg-indigo-500/10') : ''}`}
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
                Cloud sync: {cloudStatus.connected ? (cloudStatus.saving ? 'Saving…' : (cloudStatus.queued ? 'Queued…' : 'Connected ✅')) : 'Not connected'}
                {cloudStatus.error ? <span className="ml-2 text-[tomato]">({cloudStatus.error})</span> : null}
                {cloudStatus.lastSyncedAt ? (
                  <span className="ml-2">• Last synced: <b>{formatLastSynced(cloudStatus.lastSyncedAt) ?? '—'}</b></span>
                ) : null}
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
                    className={`ml-3 px-2 py-0.5 rounded-lg text-[11px] font-semibold ${!offlineSync.online || offlineSync.flushing
                      ? (isDark ? 'bg-white/[0.04] text-slate-500' : 'bg-slate-100 text-slate-400')
                      : (darkLike ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-700')
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
              <div className={`mt-2 text-xs ${cloudMsg.includes('failed') ? 'text-[tomato]' : (darkLike ? 'text-amber-200' : 'text-slate-800')}`}>
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
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold shadow-sm hover:shadow transition-all ${authEmail ? btnSoft : 'opacity-50 cursor-not-allowed ' + btnSoft
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
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} className={isHinglish ? 'text-indigo-500' : isDark ? 'text-indigo-400' : 'text-indigo-600'} />
          <h3 className={`text-[14px] font-black ${tp}`}>{isHinglish ? 'Stats & Progress' : 'Stats & Progress'}</h3>
        </div>
        <p className={`text-[12px] mb-5 ${ts}`}>{isHinglish ? 'Progress ka asli hisaab.' : 'Your cumulative progress.'}</p>

        {/* Weekly Comparison */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={`rounded-2xl p-4 border relative overflow-hidden ${isModern ? 'border-[var(--kq-border)] bg-[var(--kq-surface)]' : darkLike ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200/60 bg-white/50'}`}>
            <div className={`text-[11px] font-semibold uppercase tracking-wider ${ts} mb-2`}>Tasks Completed</div>
            <div className="flex items-end gap-3">
              <div className={`text-3xl font-black ${tp}`}>{totals.questsThisWeek}</div>
              <div className="flex flex-col pb-1">
                <span className={`text-[11px] ${ts}`}>This Week</span>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-medium ${totals.questsThisWeek >= totals.questsLastWeek ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {totals.questsThisWeek >= totals.questsLastWeek ? '↑' : '↓'}
                  </span>
                  <span className={`text-[10px] ${ts}`}>vs {totals.questsLastWeek} last week</span>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-3 opacity-[0.03] text-5xl pointer-events-none">✅</div>
          </div>

          <div className={`rounded-2xl p-4 border relative overflow-hidden ${isModern ? 'border-[var(--kq-border)] bg-[var(--kq-surface)]' : darkLike ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200/60 bg-white/50'}`}>
            <div className={`text-[11px] font-semibold uppercase tracking-wider ${ts} mb-2`}>XP Earned</div>
            <div className="flex items-end gap-3">
              <div className={`text-3xl font-black ${tp}`}>{totals.xpThisWeek}</div>
              <div className="flex flex-col pb-1">
                <span className={`text-[11px] ${ts}`}>This Week</span>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-medium ${totals.xpThisWeek >= totals.xpLastWeek ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {totals.xpThisWeek >= totals.xpLastWeek ? '↑' : '↓'}
                  </span>
                  <span className={`text-[10px] ${ts}`}>vs {totals.xpLastWeek} last week</span>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-3 opacity-[0.03] text-5xl pointer-events-none">✨</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatPill label={isHinglish ? 'Total Quests' : 'Total Tasks'} value={totals.totalQuests} isDark={isDark} isHinglish={isHinglish} isModern={isModern} />
          <StatPill label={isHinglish ? 'Completed' : 'Completed'} value={totals.completed} isDark={isDark} isHinglish={isHinglish} isModern={isModern} />
          <StatPill label={isHinglish ? 'Notes' : 'Notes'} value={totals.totalNotes} isDark={isDark} isHinglish={isHinglish} isModern={isModern} />
          <StatPill label={isHinglish ? 'Streak Record' : 'Streak Record'} value={`${totals.streakRecord}d`} isDark={isDark} isHinglish={isHinglish} isModern={isModern} />
        </div>
      </div>

      {/* Achievement Showcase Wall */}
      <div className={`${card} rounded-3xl p-5 md:p-6`}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
          <div>
            <h3 className={`text-[14px] font-black ${tp}`}>Achievement Showcase</h3>
            <p className={`text-[12px] mt-1 ${ts}`}>Your unlocked trophies and milestones.</p>
          </div>
          <div className={`px-3 py-1.5 rounded-xl text-[12px] font-bold ${isModern ? 'bg-[var(--kq-primary-soft)] text-[var(--kq-primary)]' : darkLike ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
            {totals.unlockedAchievements} / {achievements.length} Unlocked
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {achievements.map(ach => {
            const isUnlocked = ach.unlocked;
            return (
              <div
                key={ach.id}
                className={`flex flex-col items-center text-center p-4 rounded-2xl transition-all ${isUnlocked
                  ? `${btnSoft} cursor-pointer hover:scale-105 active:scale-95`
                  : `border ${isModern ? 'border-[var(--kq-border)] bg-transparent' : darkLike ? 'border-white/[0.04] bg-transparent' : 'border-slate-200/50 bg-transparent'} opacity-60 grayscale`
                  }`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl mb-3 shadow-inner ${isUnlocked
                  ? isModern ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)]' : darkLike ? 'bg-white/10' : 'bg-white'
                  : isModern ? 'bg-[var(--kq-surface)]' : darkLike ? 'bg-black/20' : 'bg-slate-100'
                  }`}>
                  {ach.icon}
                </div>
                <div className={`text-[12px] font-bold leading-tight mb-1 ${isUnlocked ? tp : ts}`}>{ach.title}</div>
                {isUnlocked && <div className={`text-[9px] uppercase tracking-wide opacity-70 ${ts}`}>{ach.rarity}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Templates */}
      <div className={`${card} rounded-3xl p-5 md:p-6 mb-4`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className={`text-[14px] font-black ${tp}`}>My Custom Packs</h3>
            <p className={`text-[12px] mt-1 ${ts}`}>Your own personalized quest templates. (Max 6)</p>
          </div>
          <button
            onClick={() => setIsCreatingPack(true)}
            disabled={customTemplates.length >= 6}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${customTemplates.length >= 6 ? 'opacity-50 cursor-not-allowed bg-slate-200 text-slate-500' : btnSoft}`}
            title={customTemplates.length >= 6 ? 'Maximum 6 custom packs allowed' : 'Create new pack'}
          >
            + Create New Pack
          </button>
        </div>

        {customTemplates.length === 0 ? (
          <div className={`mt-6 p-6 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed ${isModern ? 'border-[var(--kq-border)]' : 'border-slate-200/50'} text-center`}>
            <div className="text-3xl mb-2 opacity-50">📦</div>
            <p className={`text-[13px] font-bold ${tp}`}>No custom packs yet</p>
            <p className={`text-[11px] mt-1 ${ts}`}>Create one to quickly add your own recurring quests.</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {customTemplates.map((tpl) => {
              const open = openTemplate === tpl.id;
              return (
                <div key={tpl.id} className={`rounded-2xl p-4 ${btnSoft}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${isHinglish ? 'bg-indigo-500/10' : isDark ? 'bg-indigo-500/10' : 'bg-indigo-500/10'
                      }`}>{tpl.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className={`text-[13px] font-black ${tp}`}>{tpl.name}</div>
                          <div className={`text-[11px] mt-0.5 ${ts}`}>{tpl.description}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          {onDeleteCustomTemplate && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Delete this custom pack?')) {
                                  onDeleteCustomTemplate(tpl.id);
                                }
                              }}
                              className={`p-2 rounded-xl transition-all text-red-500/70 hover:text-red-500 hover:bg-red-500/10`}
                              aria-label="Delete template"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => setOpenTemplate(open ? null : tpl.id)}
                            className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-black/[0.04]'}`}
                            aria-label="Toggle template preview"
                          >
                            {open ? <ChevronUp size={16} className={ts} /> : <ChevronDown size={16} className={ts} />}
                          </button>
                        </div>
                      </div>

                      {open && (
                        <div className="mt-3">
                          <div className={`text-[11px] font-semibold ${ts}`}>{isHinglish ? 'Includes:' : 'Includes:'}</div>
                          <ul className={`mt-2 space-y-1 text-[12px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            {tpl.quests.map((q, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="mt-[2px]">•</span>
                                <span className="flex-1">{q.title}</span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${darkLike ? 'bg-white/[0.06] text-slate-300' : 'bg-slate-100 text-slate-600'
                                  }`}>+{q.xpReward} XP</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                        <div className={`text-[11px] ${ts}`}>{tpl.quests.length} quests</div>
                        <button
                          onClick={() => onApplyTemplate(tpl.id, true)}
                          className={`px-4 py-2 rounded-xl text-white text-[12px] font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] transition-all flexitems-center gap-2 ${btnPrimary}`}
                        >
                          <Sparkles size={14} /> Add pack
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quest Templates */}
      <div className={`${card} rounded-3xl p-5 md:p-6 mb-4`}>
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
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${isHinglish ? 'bg-indigo-500/10' : isDark ? 'bg-indigo-500/10' : 'bg-indigo-500/10'
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
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${darkLike ? 'bg-white/[0.06] text-slate-300' : 'bg-slate-100 text-slate-600'
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
            <Download size={16} className={isHinglish ? 'text-indigo-500' : isDark ? 'text-indigo-400' : 'text-indigo-600'} />
            {isHinglish ? 'Export Data' : 'Export Data'}
          </button>

          <button
            onClick={() => importInputRef.current?.click()}
            disabled={!onImport}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${onImport ? btnSoft : 'opacity-50 cursor-not-allowed ' + btnSoft
              }`}
            title={onImport ? '' : 'Import handler missing'}
          >
            <Upload size={16} className={isHinglish ? 'text-indigo-500' : isDark ? 'text-indigo-400' : 'text-indigo-600'} />
            {isHinglish ? 'Import Data' : 'Import Data'}
          </button>

          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (!f) return;
              setImportPending(f);
              setImportMsg(null);
              setImportErr(null);
              // reset input so selecting same file again works
              if (importInputRef.current) importInputRef.current.value = '';
            }}
          />

          <button
            onClick={() => {
              const el = document.getElementById('todoist-import-input');
              if (el) el.click();
            }}
            disabled={!onImportTodoist}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${onImportTodoist ? btnSoft : 'opacity-50 cursor-not-allowed ' + btnSoft}`}
            title="Import tasks from a Todoist CSV export"
          >
            <Upload size={16} className={isHinglish ? 'text-indigo-500' : isDark ? 'text-indigo-400' : 'text-indigo-600'} />
            Todoist (CSV)
          </button>
          <input
            id="todoist-import-input"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (!f || !onImportTodoist) return;
              onImportTodoist(f).then(() => {
                setImportMsg('Todoist import successful! ✅');
              }).catch((err: any) => {
                setImportErr(err.message || 'Todoist import failed');
              }).finally(() => { e.target.value = ''; });
            }}
          />

          <button
            onClick={() => {
              const el = document.getElementById('habitica-import-input');
              if (el) el.click();
            }}
            disabled={!onImportHabitica}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${onImportHabitica ? btnSoft : 'opacity-50 cursor-not-allowed ' + btnSoft}`}
            title="Import active tasks from a Habitica JSON export"
          >
            <Upload size={16} className={isHinglish ? 'text-indigo-500' : isDark ? 'text-indigo-400' : 'text-indigo-600'} />
            Habitica (JSON)
          </button>
          <input
            id="habitica-import-input"
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (!f || !onImportHabitica) return;
              onImportHabitica(f).then(() => {
                setImportMsg('Habitica import successful! ✅');
              }).catch((err: any) => {
                setImportErr(err.message || 'Habitica import failed');
              }).finally(() => { e.target.value = ''; });
            }}
          />

          <button
            onClick={() => setConfirmReset(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/15'
              : 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
              }`}
          >
            <RefreshCcw size={16} />
            {isHinglish ? 'Reset All Data' : 'Reset All Data'}
          </button>
        </div>

        {(importMsg || importErr) && (
          <div className={`mt-3 text-xs ${importErr ? 'text-[tomato]' : (isDark ? 'text-emerald-300' : 'text-emerald-700')}`}>
            {importErr ?? importMsg}
          </div>
        )}
      </div>

      {/* Import confirm */}
      {importPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setImportPending(null)} />
          <div className={`relative w-full max-w-md rounded-3xl p-6 ${card}`}>
            <h4 className={`text-[15px] font-black ${tp}`}>{isHinglish ? 'Import pakka?' : 'Import this backup?'}</h4>
            <p className={`text-[12px] mt-2 ${ts}`}>
              {isHinglish
                ? 'Ye current data ko replace karega (quests, notes, coins, settings).'
                : 'This will replace your current data (quests, notes, coins, settings) with the imported file.'}
            </p>
            <div className={`mt-3 text-xs ${ts}`}>File: <b>{importPending.name}</b></div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setImportPending(null)}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold ${btnSoft}`}
              >
                {isHinglish ? 'Cancel' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  const f = importPending;
                  setImportPending(null);
                  if (!onImport || !f) return;
                  try {
                    setImportErr(null);
                    setImportMsg('Importing…');
                    await onImport(f);
                    setImportMsg('Import successful ✅');
                  } catch (e: any) {
                    setImportMsg(null);
                    setImportErr(e?.message || 'Import failed');
                  }
                }}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold text-white ${btnPrimary}`}
              >
                {isHinglish ? 'Import' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Custom Template Creation Modal */}
      {isCreatingPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsCreatingPack(false)} />
          <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 ${card}`}>
            <h4 className={`text-[18px] font-black mb-4 ${tp}`}>Create Custom Pack</h4>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-16 h-16 shrink-0 relative">
                  <div className={`w-full h-full rounded-2xl flex items-center justify-center text-3xl cursor-pointer ${isHinglish ? 'bg-indigo-500/10' : isDark ? 'bg-indigo-500/10' : 'bg-indigo-500/10'}`}>
                    {newPack.icon}
                  </div>
                  <input
                    type="text"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    title="Change Icon Emoji"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      // Extract first emoji/char
                      const char = Array.from(val)[val.length - 1] || '🌟';
                      setNewPack({ ...newPack, icon: char });
                      e.target.value = '';
                    }}
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    value={newPack.name}
                    onChange={(e) => setNewPack({ ...newPack, name: e.target.value })}
                    placeholder="Pack Name (e.g. My Morning Flow)"
                    className={`w-full px-4 py-2 rounded-xl text-[14px] font-bold outline-none transition-all ${isModern ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)] focus:border-[var(--kq-primary)] text-[var(--kq-text-primary)]' : darkLike ? 'bg-black/20 focus:bg-white/10 text-white placeholder:text-white/30' : 'bg-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-100 text-slate-800 placeholder:text-slate-400'}`}
                  />
                  <input
                    type="text"
                    value={newPack.description}
                    onChange={(e) => setNewPack({ ...newPack, description: e.target.value })}
                    placeholder="Short description..."
                    className={`w-full px-4 py-2 rounded-xl text-[12px] outline-none transition-all ${isModern ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)] focus:border-[var(--kq-primary)] text-[var(--kq-text-primary)]' : darkLike ? 'bg-black/20 focus:bg-white/10 text-white placeholder:text-white/30' : 'bg-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-100 text-slate-800 placeholder:text-slate-400'}`}
                  />
                </div>
              </div>

              <div className={`pt-4 border-t ${isModern ? 'border-[var(--kq-border)]' : darkLike ? 'border-white/10' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h5 className={`text-[13px] font-bold ${tp}`}>Quests ({newPack.quests.length}/5)</h5>
                  {newPack.quests.length < 5 && (
                    <button
                      onClick={() => setNewPack({
                        ...newPack,
                        quests: [...newPack.quests, { title: '', difficulty: 'easy', category: 'General', xpReward: 10 }]
                      })}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${btnSoft}`}
                    >
                      + Add Quest
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {newPack.quests.map((q, idx) => (
                    <div key={idx} className={`p-3 rounded-xl flex items-center gap-3 ${isModern ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)]' : darkLike ? 'bg-black/20' : 'bg-slate-50'}`}>
                      <input
                        type="text"
                        value={q.title}
                        onChange={(e) => {
                          const qs = [...newPack.quests];
                          qs[idx].title = e.target.value;
                          setNewPack({ ...newPack, quests: qs });
                        }}
                        placeholder={`Quest ${idx + 1} title`}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-[12px] outline-none ${isModern ? 'bg-transparent text-[var(--kq-text-primary)]' : darkLike ? 'bg-transparent text-white' : 'bg-transparent text-slate-800'}`}
                      />
                      <select
                        value={q.difficulty}
                        onChange={(e) => {
                          const qs = [...newPack.quests];
                          const diff = e.target.value as 'easy' | 'medium' | 'hard' | 'legendary';
                          qs[idx].difficulty = diff;
                          qs[idx].xpReward = diff === 'easy' ? 10 : diff === 'medium' ? 25 : diff === 'hard' ? 50 : 100;
                          setNewPack({ ...newPack, quests: qs });
                        }}
                        className={`w-28 px-2 py-1.5 rounded-lg text-[11px] font-medium outline-none cursor-pointer ${isModern ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)] text-[var(--kq-text-primary)]' : darkLike ? 'bg-white/10 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}
                      >
                        <option value="easy">Easy (10 XP)</option>
                        <option value="medium">Medium (25 XP)</option>
                        <option value="hard">Hard (50 XP)</option>
                        <option value="legendary">Legendary (100 XP)</option>
                      </select>
                      <button
                        onClick={() => {
                          const qs = newPack.quests.filter((_, i) => i !== idx);
                          setNewPack({ ...newPack, quests: qs });
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        aria-label="Remove quest"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {newPack.quests.length === 0 && (
                    <p className={`text-[12px] text-center italic opacity-60 ${ts}`}>No quests added yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className={`mt-6 pt-4 border-t flex justify-end gap-2 ${isModern ? 'border-[var(--kq-border)]' : darkLike ? 'border-white/10' : 'border-slate-200'}`}>
              <button
                onClick={() => setIsCreatingPack(false)}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold ${btnSoft}`}
              >
                Cancel
              </button>
              <button
                disabled={!newPack.name.trim() || newPack.quests.length === 0 || newPack.quests.some(q => !q.title.trim())}
                onClick={() => {
                  if (onSaveCustomTemplate) {
                    onSaveCustomTemplate({
                      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` as any,
                      name: newPack.name.trim(),
                      icon: newPack.icon,
                      description: newPack.description.trim(),
                      quests: newPack.quests.filter(q => q.title.trim())
                    });
                  }
                  setIsCreatingPack(false);
                  setNewPack({ id: '', name: '', icon: '🌟', description: '', quests: [] });
                }}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${btnPrimary}`}
              >
                Save Pack
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}