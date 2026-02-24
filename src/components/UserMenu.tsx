import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Cloud, CloudOff, LogIn, LogOut, Settings, ShieldAlert, User2 } from 'lucide-react';
import type { ThemeMode } from '../context/ThemeContext';
import type { UserStats } from '../store';
import type { AvatarFrameId, XpBoost } from '../shop';
import { avatarFrameClass, boostRemainingMs, formatMs, isBoostActive } from '../shop';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { formatRelativeTime } from '../notifications';

export type CloudBadgeStatus = {
  connected: boolean;
  saving: boolean;
  queued?: boolean;
  error?: string | null;
  lastSyncedAt?: number | null;
};

type UserMenuProps = {
  stats: UserStats;
  avatarFrame: AvatarFrameId;
  xpBoost: XpBoost | null;
  theme: ThemeMode;
  isDark: boolean;
  isHinglish: boolean;
  authEmail?: string | null;
  cloudStatus?: CloudBadgeStatus;
  onOpenProfile: () => void;
  /** When user is in guest mode, open the auth screen (sign in / sign up). */
  onOpenAuth?: () => void;
  onSignOut?: () => void;
};

export function UserMenu({
  stats,
  avatarFrame,
  xpBoost,
  theme,
  isDark,
  isHinglish,
  authEmail,
  cloudStatus,
  onOpenProfile,
  onOpenAuth,
  onSignOut,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const online = useOnlineStatus();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const boostActive = isBoostActive(xpBoost);
  const boostLeft = boostRemainingMs(xpBoost);

  const badge = useMemo(() => {
    // Guest
    if (!authEmail) {
      return {
        label: 'Guest',
        icon: <User2 size={12} />,
        cls: isHinglish
          ? 'bg-rose-50/70 text-rose-700 border border-rose-200/40'
          : isDark
            ? 'bg-white/[0.03] text-slate-300 border border-white/[0.06]'
            : 'bg-slate-50 text-slate-700 border border-slate-200/60',
      };
    }

    // Offline
    if (!online) {
      return {
        label: 'Offline',
        icon: <CloudOff size={12} />,
        cls: isHinglish
          ? 'bg-orange-50/70 text-orange-700 border border-orange-200/40'
          : isDark
            ? 'bg-orange-500/10 text-orange-300 border border-orange-500/20'
            : 'bg-orange-50 text-orange-700 border border-orange-200/60',
      };
    }

    // Cloud errors
    if (cloudStatus?.error) {
      return {
        label: 'Sync error',
        icon: <ShieldAlert size={12} />,
        cls: isHinglish
          ? 'bg-red-50/70 text-red-700 border border-red-200/40'
          : isDark
            ? 'bg-red-500/10 text-red-300 border border-red-500/20'
            : 'bg-red-50 text-red-700 border border-red-200/60',
      };
    }

    // Saving/Queued
    if (cloudStatus?.saving) {
      return {
        label: 'Syncing',
        icon: <Cloud size={12} className="animate-subtle-pulse" />,
        cls: isHinglish
          ? 'bg-violet-50/70 text-violet-700 border border-violet-200/40'
          : isDark
            ? 'bg-white/[0.04] text-indigo-300 border border-white/[0.06]'
            : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
      };
    }
    if (cloudStatus?.queued) {
      return {
        label: 'Queued',
        icon: <Cloud size={12} />,
        cls: isHinglish
          ? 'bg-orange-50/70 text-orange-700 border border-orange-200/40'
          : isDark
            ? 'bg-orange-500/10 text-orange-300 border border-orange-500/20'
            : 'bg-orange-50 text-orange-700 border border-orange-200/60',
      };
    }

    // Connected
    if (cloudStatus?.connected) {
      return {
        label: 'Synced',
        icon: <Cloud size={12} />,
        cls: isHinglish
          ? 'bg-emerald-50/70 text-emerald-700 border border-emerald-200/40'
          : isDark
            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
      };
    }

    // Signed in, but not reporting cloud
    return {
      label: 'Connected',
      icon: <Cloud size={12} />,
      cls: isHinglish
        ? 'bg-emerald-50/70 text-emerald-700 border border-emerald-200/40'
        : isDark
          ? 'bg-white/[0.03] text-slate-300 border border-white/[0.06]'
          : 'bg-slate-50 text-slate-700 border border-slate-200/60',
    };
  }, [authEmail, cloudStatus?.connected, cloudStatus?.error, cloudStatus?.queued, cloudStatus?.saving, isDark, isHinglish, online]);

  const chipHover = isHinglish
    ? 'hover:bg-white/60 hover:border-rose-200/40'
    : isDark
      ? 'hover:bg-white/[0.04] hover:border-white/[0.08]'
      : 'hover:bg-white/60 hover:border-slate-200/60';

  const menuBg = isHinglish
    ? 'bg-white/95 border border-rose-200/30'
    : isDark
      ? 'bg-[#141428] border border-white/[0.08]'
      : 'bg-white border border-slate-200/70';

  const label = isDark ? 'text-slate-500' : 'text-slate-500';
  const strong = isDark ? 'text-slate-100' : 'text-slate-900';
  const subtle = isDark ? 'text-slate-400' : 'text-slate-500';

  const lastSyncText = useMemo(() => {
    const ts = cloudStatus?.lastSyncedAt;
    if (!ts) return null;
    return formatRelativeTime(new Date(ts).toISOString());
  }, [cloudStatus?.lastSyncedAt]);

  return (
    <div className="relative shrink-0" ref={ref}>
      {/* The chip shown in your screenshot */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-xl border transition-all ${
          isDark ? 'border-transparent bg-transparent' : 'border-transparent bg-transparent'
        } ${chipHover}`}
        aria-label="Open user menu"
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shadow-sm ${
            isHinglish
              ? 'bg-gradient-to-br from-rose-400 to-violet-400'
              : 'bg-gradient-to-br from-indigo-500 to-violet-500'
          } ${avatarFrameClass(avatarFrame, theme)}`}
        >
          {stats.avatarEmoji}
        </div>

        {/* Text is hidden on smaller screens for responsiveness */}
        <div className="hidden lg:block text-left min-w-[160px]">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-[13px] font-semibold leading-tight ${strong} truncate`}>{stats.username}</p>
            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${badge.cls}`}>
              {badge.icon}
              {badge.label}
            </span>
          </div>
          <p className={`text-[10px] mt-0.5 ${subtle}`}>
            {isHinglish ? `Boss · Level ${stats.level}` : `Yoddha · Lvl ${stats.level}`}
            {boostActive ? ` · ⚡ ${xpBoost?.multiplier}× ${formatMs(boostLeft)}` : ''}
          </p>
        </div>

        <ChevronDown
          size={14}
          className={`hidden lg:block transition-transform ${open ? 'rotate-180' : ''} ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
        />
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-16px)] rounded-2xl shadow-2xl overflow-hidden animate-slide-up z-50 backdrop-blur-xl ${menuBg}`}>
          {/* Header */}
          <div className={`px-4 py-3 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100/80'}`}>
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-sm ${
                  isHinglish
                    ? 'bg-gradient-to-br from-rose-400 to-violet-400'
                    : 'bg-gradient-to-br from-indigo-500 to-violet-500'
                } ${avatarFrameClass(avatarFrame, theme)}`}
              >
                {stats.avatarEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[14px] font-black ${strong} truncate`}>{stats.username}</p>
                <p className={`text-[11px] mt-0.5 ${subtle} truncate`}>{authEmail ?? 'Guest mode (local only)'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${badge.cls}`}>
                    {badge.icon}
                    {badge.label}
                  </span>
                  {lastSyncText && (
                    <span className={`text-[10px] font-semibold ${label}`}>Last sync: {lastSyncText}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mini stats */}
          <div className="px-4 py-3 grid grid-cols-3 gap-2">
            <div className={`rounded-xl px-3 py-2 ${isDark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-slate-50 border border-slate-200/60'}`}>
              <div className={`text-[10px] font-semibold uppercase tracking-wide ${label}`}>Level</div>
              <div className={`mt-1 text-[14px] font-black ${strong}`}>{stats.level}</div>
            </div>
            <div className={`rounded-xl px-3 py-2 ${isDark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-slate-50 border border-slate-200/60'}`}>
              <div className={`text-[10px] font-semibold uppercase tracking-wide ${label}`}>Coins</div>
              <div className={`mt-1 text-[14px] font-black ${strong}`}>{stats.coins}</div>
            </div>
            <div className={`rounded-xl px-3 py-2 ${isDark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-slate-50 border border-slate-200/60'}`}>
              <div className={`text-[10px] font-semibold uppercase tracking-wide ${label}`}>Streak</div>
              <div className={`mt-1 text-[14px] font-black ${strong}`}>{stats.streak}d</div>
            </div>
          </div>

          {/* Actions */}
          <div className={`px-2 pb-2`}> 

            {/* Guest mode: allow upgrading to cloud right from this menu */}
            {!authEmail && onOpenAuth && (
              <button
                onClick={() => {
                  setOpen(false);
                  onOpenAuth();
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all mb-1 ${
                  isHinglish
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : isDark
                      ? 'bg-[color:var(--kq-primary)] hover:brightness-110 text-black'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <LogIn size={16} />
                <div className="flex-1">
                  <div className="text-[13px] font-extrabold">Sign in to sync</div>
                  <div className={`text-[11px] ${isDark ? 'text-black/70' : 'text-white/80'}`}>
                    Save progress to cloud & use on any device
                  </div>
                </div>
              </button>
            )}

            <button
              onClick={() => {
                setOpen(false);
                onOpenProfile();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all ${
                isHinglish
                  ? 'hover:bg-rose-50'
                  : isDark
                    ? 'hover:bg-white/[0.04]'
                    : 'hover:bg-slate-50'
              }`}
            >
              <Settings size={16} className={isHinglish ? 'text-rose-500' : isDark ? 'text-indigo-300' : 'text-indigo-600'} />
              <div className="flex-1">
                <div className={`text-[13px] font-semibold ${strong}`}>Profile & Settings</div>
                <div className={`text-[11px] ${subtle}`}>Edit username, avatar, backups & sync</div>
              </div>
            </button>

            {onSignOut && authEmail && (
              <button
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className={`w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all ${
                  isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                }`}
              >
                <LogOut size={16} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                <div className="flex-1">
                  <div className={`text-[13px] font-semibold ${strong}`}>Sign out</div>
                  <div className={`text-[11px] ${subtle}`}>Switch account or return to guest mode</div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
