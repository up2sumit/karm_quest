import { Bell, Search, Sparkles, Sun, Moon, Palette, ChevronDown, Menu, Check, Trash2, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTheme, type ThemeMode } from '../context/ThemeContext';
import { t } from '../i18n';
import type { UserStats } from '../store';
import type { AppNotification, NotificationType } from '../notifications';
import { formatRelativeTime } from '../notifications';

interface TopNavProps {
  stats: UserStats;
  /** Left offset in px to account for the desktop sidebar (0 on mobile). */
  sidebarOffsetPx: number;
  onMobileMenuOpen: () => void;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

const themeOptions: { mode: ThemeMode; icon: string; labelKey: 'themeLight' | 'themeDark' | 'themeHinglish'; desc: string; color: string }[] = [
  { mode: 'light',    icon: '☀️', labelKey: 'themeLight',    desc: 'Clean & minimal',       color: 'from-slate-200 to-slate-300' },
  { mode: 'dark',     icon: '🌙', labelKey: 'themeDark',     desc: 'Easy on the eyes',      color: 'from-slate-700 to-slate-800' },
  { mode: 'hinglish', icon: '🎉', labelKey: 'themeHinglish', desc: 'Desi vibes + Hinglish', color: 'from-rose-400 to-violet-500' },
];

const typeAccent: Record<NotificationType, { dot: string; unreadBg: string; unreadBgDark: string }> = {
  quest_complete:  { dot: 'bg-emerald-500', unreadBg: 'bg-emerald-50',  unreadBgDark: 'bg-emerald-500/10' },
  achievement:     { dot: 'bg-amber-500',   unreadBg: 'bg-amber-50',    unreadBgDark: 'bg-amber-500/10'   },
  streak:          { dot: 'bg-orange-500',  unreadBg: 'bg-orange-50',   unreadBgDark: 'bg-orange-500/10'  },
  daily_challenge: { dot: 'bg-indigo-500',  unreadBg: 'bg-indigo-50',   unreadBgDark: 'bg-indigo-500/10'  },
  level_up:        { dot: 'bg-violet-500',  unreadBg: 'bg-violet-50',   unreadBgDark: 'bg-violet-500/10'  },
};

function NotifRow({ n, isDark, onMarkRead }: {
  n: AppNotification; isDark: boolean; onMarkRead: (id: string) => void;
}) {
  const cfg = typeAccent[n.type];
  return (
    <div onClick={() => onMarkRead(n.id)}
      className={`flex gap-3 px-4 py-3.5 cursor-pointer transition-all group border-b last:border-b-0 ${
        isDark ? 'border-white/[0.04]' : 'border-slate-100/80'
      } ${!n.read
          ? isDark ? cfg.unreadBgDark : cfg.unreadBg
          : isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/70'
      }`}>
      {/* Icon bubble */}
      <div className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${isDark ? 'bg-white/[0.07]' : 'bg-white'} shadow-sm`}>
        {n.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[12.5px] leading-snug ${
            !n.read
              ? isDark ? 'font-bold text-white' : 'font-bold text-slate-900'
              : isDark ? 'font-medium text-slate-300' : 'font-medium text-slate-700'
          }`}>{n.title}</p>
          {!n.read && <div className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${cfg.dot}`} />}
        </div>
        <p className={`text-[11px] mt-0.5 leading-relaxed line-clamp-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{n.message}</p>
        <p className={`text-[10px] mt-1 font-medium ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{formatRelativeTime(n.timestamp)}</p>
      </div>
    </div>
  );
}

function NotificationPanel({ notifications, isDark, isHinglish, onMarkRead, onMarkAllRead, onClearAll, onClose }: {
  notifications: AppNotification[]; isDark: boolean; isHinglish: boolean;
  onMarkRead: (id: string) => void; onMarkAllRead: () => void; onClearAll: () => void; onClose: () => void;
}) {
  const unread = notifications.filter(n => !n.read).length;
  const panelBg = isHinglish
    ? 'bg-white border border-rose-200/40'
    : isDark ? 'bg-[#13132A] border border-white/[0.08]' : 'bg-white border border-slate-200/70';
  const tp = isDark ? 'text-slate-200' : 'text-slate-800';
  const ts = isDark ? 'text-slate-500' : 'text-slate-400';
  const divider = isDark ? 'border-white/[0.05]' : 'border-slate-100';

  return (
    <div className={`absolute right-0 top-full mt-2 w-[340px] max-w-[calc(100vw-16px)] rounded-2xl shadow-2xl overflow-hidden animate-slide-up z-50 backdrop-blur-xl ${panelBg}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${divider}`}>
        <div className="flex items-center gap-2">
          <Bell size={14} className={isHinglish ? 'text-rose-500' : isDark ? 'text-indigo-400' : 'text-indigo-500'} />
          <span className={`text-[13px] font-bold ${tp}`}>Notifications</span>
          {unread > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black text-white ${isHinglish ? 'bg-rose-500' : 'bg-indigo-500'}`}>
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {unread > 0 && (
            <button onClick={onMarkAllRead}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${isDark ? 'text-indigo-400 hover:bg-white/[0.05]' : 'text-indigo-600 hover:bg-indigo-50'}`}>
              <Check size={11} /> {isHinglish ? 'Sab padha' : 'Mark all read'}
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={onClearAll}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${isDark ? 'text-slate-500 hover:bg-white/[0.05]' : 'text-slate-400 hover:bg-slate-50'}`}>
              <Trash2 size={11} /> {isHinglish ? 'Clear' : 'Clear all'}
            </button>
          )}
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-slate-500 hover:bg-white/[0.05]' : 'text-slate-400 hover:bg-slate-50'}`}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-[min(420px,65vh)] scrollbar-hide">
        {notifications.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2.5">
            <span className="text-5xl opacity-25">🔕</span>
            <p className={`text-[13px] font-semibold ${tp}`}>{isHinglish ? 'Koi notification nahi!' : 'All caught up!'}</p>
            <p className={`text-[11px] ${ts}`}>{isHinglish ? 'Quest karo, tab notification milegi 😄' : 'Complete quests to earn rewards & alerts.'}</p>
          </div>
        ) : (
          notifications.map(n => <NotifRow key={n.id} n={n} isDark={isDark} onMarkRead={onMarkRead} />)
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className={`px-4 py-2 border-t ${divider} text-center`}>
          <p className={`text-[10px] ${ts}`}>
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''} · Tap to mark as read
          </p>
        </div>
      )}
    </div>
  );
}

export function TopNav({ stats, sidebarOffsetPx, onMobileMenuOpen, notifications, onMarkRead, onMarkAllRead, onClearAll }: TopNavProps) {
  const { theme, isDark, isHinglish, lang, setTheme } = useTheme();
  const [showThemeMenu,    setShowThemeMenu]    = useState(false);
  const [showNotifPanel,   setShowNotifPanel]   = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const xpPercent   = Math.round((stats.xp / stats.xpToNext) * 100);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setShowThemeMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifPanel(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const bg = isHinglish
    ? 'bg-white/60 backdrop-blur-xl border border-rose-200/20'
    : isDark ? 'bg-[#12121F]/80 backdrop-blur-xl border border-white/[0.04]'
             : 'bg-white/70 backdrop-blur-xl border border-slate-200/50';

  const inputBg = isHinglish
    ? 'bg-white/60 border border-rose-200/30 text-slate-800 placeholder:text-slate-400 focus:ring-rose-300/30 focus:border-rose-300'
    : isDark
      ? 'bg-white/[0.04] border border-white/[0.06] text-slate-200 placeholder:text-slate-600 focus:ring-indigo-500/20 focus:border-indigo-500/30'
      : 'bg-slate-50/80 border border-slate-200/60 text-slate-800 placeholder:text-slate-400 focus:ring-indigo-400/20 focus:border-indigo-300';

  const tl  = isHinglish ? 'text-slate-700' : isDark ? 'text-slate-400' : 'text-slate-600';
  const acc = isHinglish ? 'text-rose-500'  : isDark ? 'text-indigo-400' : 'text-indigo-500';
  const ib  = isHinglish
    ? 'bg-white/50 border border-rose-200/30 hover:bg-white/80'
    : isDark ? 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06]'
             : 'bg-slate-50 border border-slate-200/40 hover:bg-slate-100';

  return (
    <header
      className="fixed top-0 right-0 z-20 transition-all duration-300"
      style={{ left: sidebarOffsetPx }}
    >
      <div className={`m-2 md:m-2.5 md:ml-0 px-3 md:px-5 py-2 md:py-2.5 rounded-2xl flex items-center gap-2 md:gap-3 shadow-sm ${bg}`}>

        {/* Hamburger — mobile only */}
        <button onClick={onMobileMenuOpen} aria-label="Open navigation"
          className={`flex md:hidden items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all ${ib}`}>
          <Menu size={17} className={isDark ? 'text-slate-400' : 'text-slate-600'} />
        </button>

        {/* Mini brand — mobile only */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          <span className="text-base">{isHinglish ? '🎉' : '🪔'}</span>
          <span className={`text-[13px] font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>KQ</span>
        </div>

        {/* Search — sm+ */}
        <div className="hidden sm:flex items-center flex-1 max-w-xs">
          <div className="relative flex-1 group">
            <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${acc} opacity-50 group-focus-within:opacity-80`} />
            <input type="text" placeholder={t('searchPlaceholder', lang)}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-[13px] focus:outline-none focus:ring-2 transition-all ${inputBg}`} />
          </div>
        </div>

        {/* Search icon — xs only */}
        <button onClick={() => setShowMobileSearch(v => !v)} aria-label="Search"
          className={`flex sm:hidden items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all ${ib}`}>
          <Search size={15} className={acc} />
        </button>

        {/* XP bar — sm+ */}
        <div className="hidden sm:flex items-center gap-2 flex-1 max-w-[200px] md:max-w-xs">
          <div className="flex items-center gap-1.5 shrink-0">
            <Sparkles size={14} className={acc} />
            <span className={`text-[11px] font-semibold ${tl} whitespace-nowrap`}>{t('levelLabel', lang)} {stats.level}</span>
          </div>
          <div className="flex-1 relative min-w-[50px]">
            <div className={`h-3 rounded-full overflow-hidden ${isHinglish ? 'bg-rose-100/50' : isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
              <div className={`h-full rounded-full animate-xp-fill transition-all duration-500 ${isHinglish ? 'bg-gradient-to-r from-rose-400 to-violet-400' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`}
                style={{ width: `${xpPercent}%` }} />
            </div>
            <span className={`absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{stats.xp}/{stats.xpToNext}</span>
          </div>
        </div>

        {/* Spacer on mobile */}
        <div className="flex-1 sm:hidden" />

        {/* Coins — md+ */}
        <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${isHinglish ? 'bg-amber-50/60 border border-amber-200/30' : isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-slate-50 border border-slate-200/40'}`}>
          <span className="text-sm">🪙</span>
          <span className={`font-semibold text-[13px] ${isHinglish ? 'text-amber-700' : isDark ? 'text-slate-300' : 'text-slate-700'}`}>{stats.coins}</span>
        </div>

        {/* Streak — sm+ */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${isHinglish ? 'bg-orange-50/60 border border-orange-200/30' : isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-slate-50 border border-slate-200/40'}`}>
          <span className="text-sm">🪔</span>
          <span className={`font-semibold text-[13px] ${isHinglish ? 'text-orange-700' : isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {stats.streak}<span className="hidden lg:inline"> {t('daysLabel', lang)}</span>
          </span>
        </div>

        {/* Theme selector */}
        <div className="relative shrink-0" ref={themeRef}>
          <button onClick={() => { setShowThemeMenu(v => !v); setShowNotifPanel(false); }}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border transition-all ${isHinglish ? 'bg-rose-50/60 border-rose-200/30 hover:bg-rose-100/60' : isDark ? 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.06]' : 'bg-slate-50 border-slate-200/40 hover:bg-slate-100'}`}>
            {theme === 'light'    && <Sun     size={15} className="text-slate-500" />}
            {theme === 'dark'     && <Moon    size={15} className="text-slate-400" />}
            {theme === 'hinglish' && <Palette size={15} className="text-rose-400" />}
            <ChevronDown size={11} className={`transition-transform ${showThemeMenu ? 'rotate-180' : ''} ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          </button>
          {showThemeMenu && (
            <div className={`absolute right-0 top-full mt-2 w-56 rounded-xl p-1.5 shadow-xl border animate-slide-up z-50 ${isHinglish ? 'bg-white/95 backdrop-blur-xl border-rose-200/30' : isDark ? 'bg-[#1A1A2E] border-white/[0.06] backdrop-blur-xl' : 'bg-white border-slate-200/50 backdrop-blur-xl'}`}>
              <p className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Theme</p>
              {themeOptions.map(opt => (
                <button key={opt.mode} onClick={() => { setTheme(opt.mode); setShowThemeMenu(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-left ${theme === opt.mode ? isDark ? 'bg-white/[0.06] ring-1 ring-indigo-500/30' : 'bg-slate-50 ring-1 ring-indigo-300/30' : isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'}`}>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${opt.color} flex items-center justify-center text-sm shadow-sm`}>{opt.icon}</div>
                  <div className="flex-1">
                    <p className={`text-[13px] font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{t(opt.labelKey, lang)}</p>
                    <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{opt.desc}</p>
                  </div>
                  {theme === opt.mode && <span className={`text-xs ${isHinglish ? 'text-rose-400' : 'text-indigo-400'}`}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bell — notifications */}
        <div className="relative shrink-0" ref={notifRef}>
          <button onClick={() => { setShowNotifPanel(v => !v); setShowThemeMenu(false); }}
            aria-label={`${unreadCount} unread notifications`}
            className={`relative p-2 rounded-lg border transition-all ${ib} ${showNotifPanel ? isDark ? 'bg-white/[0.08] border-indigo-500/30' : 'bg-indigo-50 border-indigo-200/60' : ''}`}>
            <Bell size={16} className={unreadCount > 0 ? isHinglish ? 'text-rose-500' : isDark ? 'text-indigo-400' : 'text-indigo-500' : isDark ? 'text-slate-400' : 'text-slate-500'} />
            {unreadCount > 0 && (
              <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] text-white font-black flex items-center justify-center ${isHinglish ? 'bg-rose-500' : 'bg-red-500'}`}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifPanel && (
            <NotificationPanel
              notifications={notifications} isDark={isDark} isHinglish={isHinglish}
              onMarkRead={onMarkRead} onMarkAllRead={onMarkAllRead} onClearAll={onClearAll}
              onClose={() => setShowNotifPanel(false)}
            />
          )}
        </div>

        {/* Avatar */}
        <button className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all border shrink-0 ${isDark ? 'border-transparent hover:border-white/[0.05] hover:bg-white/[0.03]' : 'border-transparent hover:border-slate-200/40 hover:bg-slate-50'}`}>
          <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-sm md:text-base shadow-sm ${isHinglish ? 'bg-gradient-to-br from-rose-400 to-violet-400' : 'bg-gradient-to-br from-indigo-500 to-violet-500'}`}>
            {stats.avatarEmoji}
          </div>
          <div className="text-left hidden xl:block">
            <p className={`text-[13px] font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{stats.username}</p>
            <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{isHinglish ? `Boss · Level ${stats.level}` : `Yoddha · Lvl ${stats.level}`}</p>
          </div>
        </button>
      </div>

      {/* Mobile search expand */}
      {showMobileSearch && (
        <div className="sm:hidden mx-2 mb-1 animate-slide-up">
          <div className="relative">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${acc} opacity-60`} />
            <input type="text" autoFocus placeholder={t('searchPlaceholder', lang)}
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] focus:outline-none focus:ring-2 transition-all ${inputBg}`}
              onBlur={() => setShowMobileSearch(false)} />
          </div>
        </div>
      )}
    </header>
  );
}
