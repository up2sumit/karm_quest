import { Bell, Search, Sparkles, Sun, Moon, Palette, ChevronDown, Menu, Check, Trash2, X, FileText, Swords } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme, type ThemeMode } from '../context/ThemeContext';
import { t } from '../i18n';
import type { Note, Page, Quest, UserStats, FocusSession } from '../store';
import { boostRemainingMs, formatMs, isBoostActive, type AvatarFrameId, type XpBoost } from '../shop';
import type { AppNotification, NotificationType } from '../notifications';
import { formatRelativeTime } from '../notifications';
import { UserMenu, type CloudBadgeStatus } from './UserMenu';

interface TopNavProps {
  stats: UserStats;
  avatarFrame: AvatarFrameId;
  xpBoost: XpBoost | null;
  // Focus Timer (Pomodoro)
  focusSession: FocusSession | null;
  focusRemainingMs: number;
  onStopFocus: () => void;

  /** Persist theme changes (optional). */
  onThemeChange?: (mode: ThemeMode) => void | Promise<void>;

  /** Left offset in px to account for the desktop sidebar (0 on mobile). */
  sidebarOffsetPx: number;
  onMobileMenuOpen: () => void;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;

  /** Global search (Bug #3 fix: search is now functional). */
  searchQuery: string;
  onSearchChange: (q: string) => void;
  quests: Quest[];
  notes: Note[];
  onNavigate: (page: Page) => void;
  onFocusQuest: (id: string) => void;
  onFocusNote: (id: string) => void;

  /** Optional: show signed-in email + cloud sync badge in the user chip. */
  authEmail?: string | null;
  cloudStatus?: CloudBadgeStatus;
  /** Optional: when in guest mode, open auth (sign in / sign up). */
  onOpenAuth?: () => void;
  onSignOut?: () => void;
}

const themeOptions: { mode: ThemeMode; icon: string; labelKey: 'themeLight' | 'themeModern' | 'themeDark' | 'themeHinglish'; desc: string; color: string }[] = [
  { mode: 'light',    icon: '☀️', labelKey: 'themeLight',    desc: 'Clean & minimal',                color: 'from-amber-200 to-orange-300' },
  { mode: 'modern',   icon: '🗒️', labelKey: 'themeModern',   desc: 'Editorial • professional',       color: 'from-teal-700 to-slate-700' },
  // Theme 3 (mode: "dark") is Chakra Rings — a LIGHT palette with blue/violet accents.
  { mode: 'dark',     icon: '🟣', labelKey: 'themeDark',     desc: 'Soft indigo • light',             color: 'from-indigo-500 to-violet-500' },
  // Theme 4 (mode: "hinglish") is Indigo Dark — a DARK palette (blue/black).
  { mode: 'hinglish', icon: '🌙', labelKey: 'themeHinglish', desc: 'Indigo dark • night mode',        color: 'from-slate-900 to-indigo-950' },
];

const typeAccent: Record<NotificationType, { dot: string; unreadBg: string; unreadBgDark: string }> = {
  quest_complete:  { dot: 'bg-emerald-500', unreadBg: 'bg-emerald-50',  unreadBgDark: 'bg-emerald-500/10' },
  achievement:     { dot: 'bg-amber-500',   unreadBg: 'bg-amber-50',    unreadBgDark: 'bg-amber-500/10'   },
  streak:          { dot: 'bg-orange-500',  unreadBg: 'bg-orange-50',   unreadBgDark: 'bg-orange-500/10'  },
  // Use theme primary so Theme 1 (saffron) doesn't show indigo.
  daily_challenge: { dot: 'bg-[var(--kq-primary)]',  unreadBg: 'bg-[var(--kq-primary-soft)]',   unreadBgDark: 'bg-[var(--kq-primary-soft)]'  },
  level_up:        { dot: 'bg-violet-500',  unreadBg: 'bg-violet-50',   unreadBgDark: 'bg-violet-500/10'  },
  focus:          { dot: 'bg-cyan-500',    unreadBg: 'bg-cyan-50',     unreadBgDark: 'bg-cyan-500/10'    },
  reminder:       { dot: 'bg-pink-500',    unreadBg: 'bg-pink-50',     unreadBgDark: 'bg-pink-500/10'    },
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
  // Token-driven panel (Theme 4 is already handled by isDark).
  const panelBg = isDark
    ? 'bg-[#13132A] border border-white/[0.08]'
    : 'bg-[var(--kq-surface)] border border-[var(--kq-border)]';
  const tp = isDark ? 'text-slate-200' : 'text-slate-800';
  const ts = isDark ? 'text-slate-500' : 'text-slate-400';
  const divider = isDark ? 'border-white/[0.05]' : 'border-slate-100';

  return (
    <div className={`absolute right-0 top-full mt-2 w-[340px] max-w-[calc(100vw-16px)] rounded-2xl shadow-2xl overflow-hidden animate-slide-up z-50 backdrop-blur-xl ${panelBg}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${divider}`}>
        <div className="flex items-center gap-2">
          <Bell size={14} className={isDark ? 'text-[var(--kq-primary)]' : 'text-[var(--kq-primary)]'} />
          <span className={`text-[13px] font-bold ${tp}`}>Notifications</span>
          {unread > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black text-white bg-[var(--kq-primary)]`}>
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {unread > 0 && (
            <button onClick={onMarkAllRead}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${isDark ? 'text-[var(--kq-primary)] hover:bg-white/[0.05]' : 'text-[var(--kq-primary)] hover:bg-[var(--kq-primary-soft)]'}`}>
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

// ─────────────────────────────────────────────────────────────────────────────
// Global Search (Bug #3 Fix)
// - Controlled input + real filtering
// - Dropdown results
// - Click to navigate + focus the matched item
// ─────────────────────────────────────────────────────────────────────────────

type SearchResult =
  | { kind: 'quest'; id: string; title: string; meta: string; emoji: string }
  | { kind: 'note'; id: string; title: string; meta: string; emoji: string };

function scoreMatch(q: string, text: string) {
  const t = (text || '').toLowerCase();
  const query = q.toLowerCase();
  if (!t) return 0;
  if (t === query) return 100;
  if (t.startsWith(query)) return 60;
  const idx = t.indexOf(query);
  if (idx >= 0) return 20 - Math.min(idx, 15);
  return 0;
}

function buildSearchResults(q: string, quests: Quest[], notes: Note[], isHinglish: boolean): SearchResult[] {
  const query = q.trim();
  if (!query) return [];

  const questMatches = quests
    .map((quest) => {
      const s = Math.max(
        scoreMatch(query, quest.title),
        scoreMatch(query, quest.category),
        scoreMatch(query, quest.difficulty),
      );
      return { quest, s };
    })
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .map(({ quest }) => ({
      kind: 'quest' as const,
      id: quest.id,
      title: quest.title,
      meta: `${quest.status === 'completed' ? (isHinglish ? 'Complete' : 'Completed') : (isHinglish ? 'Active' : 'Active')} · +${quest.xpReward} XP`,
      emoji: isHinglish ? '🏹' : '⚔️',
    }));

  const noteMatches = notes
    .map((note) => {
      const tagScores = note.tags?.map(tag => scoreMatch(query, tag)) ?? [];
      const s = Math.max(
        scoreMatch(query, note.title),
        scoreMatch(query, note.content),
        ...tagScores,
      );
      return { note, s };
    })
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .map(({ note }) => ({
      kind: 'note' as const,
      id: note.id,
      title: note.title,
      meta: `${isHinglish ? 'Scroll' : 'Note'} · ${note.createdAt}`,
      emoji: note.emoji || (isHinglish ? '📜' : '📝'),
    }));

  // Interleave a few of each type so the dropdown looks balanced.
  const out: SearchResult[] = [];
  const max = 8;
  let i = 0;
  while (out.length < max && (i < questMatches.length || i < noteMatches.length)) {
    if (i < questMatches.length) out.push(questMatches[i]);
    if (out.length >= max) break;
    if (i < noteMatches.length) out.push(noteMatches[i]);
    i++;
  }
  return out;
}

function SearchPanel({
  query,
  results,
  isDark,
  isHinglish,
  onSelect,
  onClose,
}: {
  query: string;
  results: SearchResult[];
  isDark: boolean;
  isHinglish: boolean;
  onSelect: (r: SearchResult) => void;
  onClose: () => void;
}) {
  const panelBg = isDark
    ? 'bg-[#13132A] border border-white/[0.08]'
    : 'bg-[var(--kq-surface)] border border-[var(--kq-border)]';
  const tp = isDark ? 'text-slate-200' : 'text-slate-800';
  const ts = isDark ? 'text-slate-500' : 'text-slate-500';
  const divider = isDark ? 'border-white/[0.05]' : 'border-slate-100';

  return (
    <div className={`absolute left-0 top-full mt-2 w-[420px] max-w-[calc(100vw-16px)] rounded-2xl shadow-2xl overflow-hidden animate-slide-up z-50 backdrop-blur-xl ${panelBg}`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${divider}`}>
        <div className="flex items-center gap-2">
          <Search size={14} className={'text-[var(--kq-primary)]'} />
          <span className={`text-[13px] font-bold ${tp}`}>Search</span>
          <span className={`text-[10px] font-semibold ${ts}`}>“{query.trim()}”</span>
        </div>
        <button onClick={onClose} className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-slate-500 hover:bg-white/[0.05]' : 'text-slate-400 hover:bg-slate-50'}`}>
          <X size={14} />
        </button>
      </div>

      <div className="max-h-[min(420px,65vh)] overflow-y-auto">
        {results.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-2.5">
            <span className="text-5xl opacity-25">🔎</span>
            <p className={`text-[13px] font-semibold ${tp}`}>{isHinglish ? 'Kuch nahi mila' : 'No results'}</p>
            <p className={`text-[11px] ${ts}`}>Try different keywords.</p>
          </div>
        ) : (
          results.map((r) => (
            <button
              key={`${r.kind}-${r.id}`}
              onClick={() => onSelect(r)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0 transition-all ${divider} ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/70'}`}
            >
              <div className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${isDark ? 'bg-white/[0.07]' : 'bg-white'} shadow-sm`}>
                {r.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-[12.5px] font-semibold truncate ${tp}`}>{r.title}</p>
                  <span className={`shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full ${
                    r.kind === 'quest'
                      ? isDark ? 'bg-white/[0.05] text-[var(--kq-primary)]' : 'bg-[var(--kq-primary-soft)] text-[var(--kq-primary)]'
                      : isDark ? 'bg-white/[0.05] text-[var(--kq-violet)]' : 'bg-[rgba(124,58,237,0.10)] text-[var(--kq-violet)]'
                  }`}>{r.kind === 'quest' ? 'Quest' : 'Note'}</span>
                </div>
                <p className={`text-[11px] mt-0.5 truncate ${ts}`}>{r.meta}</p>
              </div>
              {r.kind === 'quest'
                ? <Swords size={14} className={'text-[var(--kq-primary)]'} />
                : <FileText size={14} className={'text-[var(--kq-violet)]'} />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function TopNav({
  stats,
  avatarFrame,
  xpBoost,
  focusSession,
  focusRemainingMs,
  onStopFocus,
  onThemeChange,
  sidebarOffsetPx,
  onMobileMenuOpen,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  searchQuery,
  onSearchChange,
  quests,
  notes,
  onNavigate,
  onFocusQuest,
  onFocusNote,

  authEmail,
  cloudStatus,
  onOpenAuth,
  onSignOut,
}: TopNavProps) {
  const { theme, isDark, isHinglish, isModern, lang, setTheme } = useTheme();

  // Boost timer (ticks only when active)
  const boostActive = isBoostActive(xpBoost);
  const focusActive = !!focusSession && focusRemainingMs > 0;
  const focusQuestTitle = useMemo(() => {
    if (!focusSession) return '';
    const q = quests.find(x => x.id === focusSession.questId);
    return q?.title || '';
  }, [focusSession, quests]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!boostActive) return;
    const tmr = window.setInterval(() => setTick(v => v + 1), 1000);
    return () => window.clearInterval(tmr);
  }, [boostActive]);
  void tick;
  const boostLeft = boostRemainingMs(xpBoost);
  const [showThemeMenu,    setShowThemeMenu]    = useState(false);
  const [showNotifPanel,   setShowNotifPanel]   = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showSearchPanel,  setShowSearchPanel]  = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const xpPercent   = Math.round((stats.xp / stats.xpToNext) * 100);
  const unreadCount = notifications.filter(n => !n.read).length;

  const results = useMemo(() => buildSearchResults(searchQuery, quests, notes, isHinglish), [searchQuery, quests, notes, isHinglish]);

  const closeSearch = useCallback(() => {
    setShowSearchPanel(false);
    setShowMobileSearch(false);
  }, []);

  const onSelect = useCallback((r: SearchResult) => {
    if (r.kind === 'quest') {
      onNavigate('quests');
      onFocusQuest(r.id);
    } else {
      onNavigate('notes');
      onFocusNote(r.id);
    }
    closeSearch();
  }, [closeSearch, onFocusNote, onFocusQuest, onNavigate]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setShowThemeMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifPanel(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearchPanel(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeSearch]);

  const bg = isModern
    ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)] shadow-[0_1px_0_rgba(0,0,0,0.04)]'
    : isDark
      ? 'bg-[#12121F]/80 backdrop-blur-xl border border-white/[0.04]'
      : 'bg-[var(--kq-surface)] backdrop-blur-xl border border-[var(--kq-border)]';

  const inputBg = isModern
    ? 'bg-[var(--kq-bg2)] border border-[var(--kq-border)] text-[var(--kq-text-primary)] placeholder:text-[var(--kq-text-muted)] focus:ring-[var(--kq-primary)]/20 focus:border-[var(--kq-border2)]'
    : isDark
      ? 'bg-white/[0.04] border border-white/[0.06] text-slate-200 placeholder:text-slate-600 focus:ring-[var(--kq-primary)]/20 focus:border-white/[0.10]'
      : 'bg-[var(--kq-bg2)] border border-[var(--kq-border)] text-[var(--kq-text-primary)] placeholder:text-[var(--kq-text-muted)] focus:ring-[var(--kq-primary)]/20 focus:border-[var(--kq-border2)]';

  const tl  = isModern ? 'text-[var(--kq-text-secondary)]' : 'text-[var(--kq-text-secondary)]';
  const acc = isModern ? 'text-[var(--kq-primary)]'        : 'text-[var(--kq-primary)]';
  const ib  = isModern
    ? 'bg-[var(--kq-bg2)] border border-[var(--kq-border)] hover:bg-[var(--kq-bg3)]'
    : isDark
      ? 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06]'
      : 'bg-[var(--kq-bg2)] border border-[var(--kq-border)] hover:bg-[var(--kq-bg3)]';

  return (
    <header
      className="fixed top-0 right-0 z-20 transition-all duration-300"
      style={{ left: sidebarOffsetPx }}
    >
      <div className={`m-2 md:m-2.5 md:ml-0 px-3 md:px-5 py-2 md:py-2.5 rounded-2xl flex items-center gap-2 md:gap-3 shadow-sm ${bg}`}>

        {/* Hamburger — mobile only */}
        <button onClick={onMobileMenuOpen} aria-label="Open navigation"
          className={`flex md:hidden items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all ${ib}`}>
          <Menu size={17} className={isDark ? 'text-slate-400' : 'text-[var(--kq-text-secondary)]'} />
        </button>

        {/* Mini brand — mobile only */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          <span className="text-base">{isHinglish ? '🎉' : isModern ? '🗒️' : '🪔'}</span>
          <span className={`text-[13px] font-black ${isDark ? 'text-slate-200' : 'text-[var(--kq-text-primary)]'}`}>KQ</span>
        </div>

        {/* Search — sm+ */}
        <div className="hidden sm:flex items-center flex-1 max-w-xs" ref={searchRef}>
          <div className="relative flex-1 group">
            <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${acc} opacity-50 group-focus-within:opacity-80`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setShowSearchPanel(true)}
              placeholder={t('searchPlaceholder', lang)}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-[13px] focus:outline-none focus:ring-2 transition-all ${inputBg}`}
            />
            {showSearchPanel && searchQuery.trim().length > 0 && (
              <SearchPanel
                query={searchQuery}
                results={results}
                isDark={isDark}
                isHinglish={isHinglish}
                onSelect={onSelect}
                onClose={() => setShowSearchPanel(false)}
              />
            )}
          </div>
        </div>

        {/* Search icon — xs only */}
        <button onClick={() => { setShowMobileSearch(v => !v); setShowNotifPanel(false); setShowThemeMenu(false); }} aria-label="Search"
          className={`flex sm:hidden items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all ${ib}`}>
          <Search size={15} className={acc} />
        </button>

        {/* XP bar — sm+ */}
        <div className="hidden sm:flex items-center gap-2 flex-1 max-w-[240px] md:max-w-sm">
          <div className="flex items-center gap-1.5 shrink-0">
            <Sparkles size={14} className={acc} />
            <span className={`text-[11px] font-semibold ${tl} whitespace-nowrap`}>{t('levelLabel', lang)} {stats.level}</span>
          </div>
          <div className="flex-1 relative min-w-[50px]">
            <div className={`h-3 rounded-full overflow-hidden bg-[var(--kq-bg2)] border border-[var(--kq-border)]`}>
              <div className={`h-full rounded-full animate-xp-fill transition-all duration-500 bg-gradient-to-r from-[var(--kq-xp-start)] to-[var(--kq-xp-end)]`}
                style={{ width: `${xpPercent}%` }} />
            </div>
            <span className={`absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[var(--kq-text-muted)]`}>{stats.xp}/{stats.xpToNext}</span>
          </div>

          {/* XP boost pill */}
          {boostActive && (
            <div className={`hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg border ${
              isDark
                ? 'bg-white/[0.03] border-white/[0.06]'
                : 'bg-[var(--kq-primary-soft)] border-[var(--kq-border2)]'
            }`} title="XP boost active">
              <span className="text-sm">⚡</span>
              <span className={`text-[10px] font-black text-[var(--kq-primary)]`}>{xpBoost?.multiplier}×</span>
              <span className={`text-[10px] font-semibold text-[var(--kq-text-muted)]`}>{formatMs(boostLeft)}</span>
            </div>
          )}

          {/* Focus pill */}
          {focusActive && (
            <div className={`hidden md:flex items-center overflow-hidden rounded-lg border ${
              isHinglish
                ? 'bg-cyan-50/70 border-cyan-200/40'
                : isDark
                  ? 'bg-white/[0.03] border-white/[0.06]'
                  : 'bg-cyan-50 border-cyan-200/40'
            }`} title={focusQuestTitle ? `Focus: ${focusQuestTitle}` : 'Focus timer'}>
              <button
                onClick={() => {
                  onNavigate('quests');
                  if (focusSession) onFocusQuest(focusSession.questId);
                }}
                className={`flex items-center gap-1.5 px-2 py-1 transition-all ${isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-white/60'}`}
              >
                <span className="text-sm">⏱️</span>
                <span className={`text-[10px] font-black ${isHinglish ? 'text-cyan-700' : isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>{formatMs(focusRemainingMs)}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStopFocus();
                }}
                className={`px-2 py-1 transition-all ${isDark ? 'text-slate-500 hover:bg-white/[0.05]' : 'text-slate-400 hover:bg-white/60'}`}
                aria-label="Stop focus timer"
                title="Stop"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Spacer on mobile */}
        <div className="flex-1 sm:hidden" />

        {/* Coins — md+ */}
        <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-[var(--kq-bg2)] border border-[var(--kq-border)]'}`}>
          <span className="text-sm">🪙</span>
          <span className={`font-semibold text-[13px] ${isDark ? 'text-slate-300' : 'text-[var(--kq-text-primary)]'}`}>{stats.coins}</span>
        </div>

        {/* Streak — sm+ */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-[var(--kq-bg2)] border border-[var(--kq-border)]'}`}>
          <span className="text-sm">🪔</span>
          <span className={`font-semibold text-[13px] ${isDark ? 'text-slate-300' : 'text-[var(--kq-text-primary)]'}`}>
            {stats.streak}<span className="hidden lg:inline"> {t('daysLabel', lang)}</span>
          </span>
        </div>

        {/* Theme selector */}
        <div className="relative shrink-0" ref={themeRef}>
          <button onClick={() => { setShowThemeMenu(v => !v); setShowNotifPanel(false); }}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border transition-all ${isDark ? 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.06]' : 'bg-[var(--kq-bg2)] border-[var(--kq-border)] hover:bg-[var(--kq-bg3)]'}`}>
            {theme === 'light'    && <Sun     size={15} className="text-[var(--kq-primary)]" />}
            {theme === 'modern'   && <FileText size={15} className="text-[var(--kq-primary)]" />}
            {theme === 'dark'     && <Moon    size={15} className="text-[var(--kq-text-muted)]" />}
            {theme === 'hinglish' && <Palette size={15} className="text-[var(--kq-primary)]" />}
            <ChevronDown size={11} className={`transition-transform ${showThemeMenu ? 'rotate-180' : ''} ${isDark ? 'text-slate-500' : 'text-[var(--kq-text-muted)]'}`} />
          </button>
          {showThemeMenu && (
            <div className={`absolute right-0 top-full mt-2 w-56 rounded-xl p-1.5 shadow-xl border animate-slide-up z-50 ${
              isModern
                ? 'bg-[var(--kq-surface)] border-[var(--kq-border)]'
                : isDark
                  ? 'bg-[#1A1A2E] border-white/[0.06] backdrop-blur-xl'
                  : 'bg-[var(--kq-surface)] border-[var(--kq-border)] backdrop-blur-xl'
            }`}>
              <p className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-[var(--kq-text-muted)]'}`}>Theme</p>
              {themeOptions.map(opt => (
                <button key={opt.mode} onClick={() => {
                    const fn = onThemeChange ?? setTheme;
                    Promise.resolve(fn(opt.mode));
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-left ${theme === opt.mode ? (isDark ? 'bg-white/[0.06] ring-1 ring-white/[0.12]' : 'bg-[var(--kq-bg2)] ring-1 ring-[var(--kq-border2)]') : (isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-[var(--kq-bg2)]')}`}>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${opt.color} flex items-center justify-center text-sm shadow-sm`}>{opt.icon}</div>
                  <div className="flex-1">
                    <p className={`text-[13px] font-medium ${isDark ? 'text-slate-200' : 'text-[var(--kq-text-primary)]'}`}>{t(opt.labelKey, lang)}</p>
                    <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-[var(--kq-text-muted)]'}`}>{opt.desc}</p>
                  </div>
                  {theme === opt.mode && <span className={`text-xs text-[var(--kq-primary)]`}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bell — notifications */}
        <div className="relative shrink-0" ref={notifRef}>
          <button onClick={() => { setShowNotifPanel(v => !v); setShowThemeMenu(false); }}
            aria-label={`${unreadCount} unread notifications`}
            className={`relative p-2 rounded-lg border transition-all ${ib} ${showNotifPanel ? (isDark ? 'bg-white/[0.08] border-white/[0.12]' : 'bg-[var(--kq-primary-soft)] border-[var(--kq-border2)]') : ''}`}>
            <Bell size={16} className={unreadCount > 0 ? 'text-[var(--kq-primary)]' : (isDark ? 'text-slate-400' : 'text-[var(--kq-text-muted)]')} />
            {unreadCount > 0 && (
              <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] text-white font-black flex items-center justify-center bg-[var(--kq-primary)]`}>
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

        {/* User chip (responsive + professional dropdown) */}
        <UserMenu
          stats={stats}
          avatarFrame={avatarFrame}
          xpBoost={xpBoost}
          theme={theme}
          isDark={isDark}
          isHinglish={isHinglish}
          authEmail={authEmail}
          cloudStatus={cloudStatus}
          onOpenProfile={() => onNavigate('profile')}
          onOpenAuth={onOpenAuth}
          onSignOut={onSignOut}
        />
      </div>

      {/* Mobile search expand */}
      {showMobileSearch && (
        <div className="sm:hidden mx-2 mb-1 animate-slide-up">
          <div className="relative">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${acc} opacity-60`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
              placeholder={t('searchPlaceholder', lang)}
              className={`w-full pl-9 pr-10 py-2.5 rounded-xl text-[13px] focus:outline-none focus:ring-2 transition-all ${inputBg}`}
            />
            <button
              onClick={() => { onSearchChange(''); closeSearch(); }}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg ${isDark ? 'text-slate-500 hover:bg-white/[0.05]' : 'text-slate-400 hover:bg-white/60'}`}
              aria-label="Close search"
            >
              <X size={14} />
            </button>
          </div>

          {searchQuery.trim().length > 0 && (
            <div className="relative mt-2">
              <SearchPanel
                query={searchQuery}
                results={results}
                isDark={isDark}
                isHinglish={isHinglish}
                onSelect={onSelect}
                onClose={closeSearch}
              />
            </div>
          )}
        </div>
      )}
    </header>
  );
}
