import { Settings, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';
import type { Page } from '../store';
import { sidebarSkinClasses, type SidebarSkinId } from '../shop';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;

  /** True when viewport is md+ (desktop/tablet layout). */
  isDesktop: boolean;
  /** Desktop sidebar width in px (0 on mobile). */
  desktopWidthPx: number;
  /** Whether desktop sidebar is actually expanded (text visible). */
  desktopExpanded: boolean;
  /** Whether desktop sidebar can expand beyond the rail (lg+). */
  desktopCanExpand: boolean;

  /** Equipped sidebar skin from Mudra Shop. */
  sidebarSkin: SidebarSkinId;
}

const navItems = [
  { page: 'dashboard'    as Page, labelKey: 'navDashboard'    as const, emoji: '🪔', hi: '🏠', pro: '🗂️' },
  { page: 'quests'       as Page, labelKey: 'navQuests'       as const, emoji: '🏹', hi: '💪', pro: '✅' },
  { page: 'notes'        as Page, labelKey: 'navNotes'        as const, emoji: '📜', hi: '🧠', pro: '📝' },
  { page: 'achievements' as Page, labelKey: 'navAchievements' as const, emoji: '🏆', hi: '🏆', pro: '⭐' },
  { page: 'challenges'   as Page, labelKey: 'navChallenges'   as const, emoji: '🔱', hi: '🔥', pro: '🎯' },
  { page: 'shop'         as Page, labelKey: 'navShop'         as const, emoji: '🛍️', hi: '🛍️', pro: '🛒' },
  { page: 'leaderboard'  as Page, labelKey: 'navLeaderboard'  as const, emoji: '🏅', hi: '🏅', pro: '📈' },
];

function Panel({ currentPage, onNavigate, showExpanded, onToggle, isMobile, onMobileClose, allowToggle, sidebarSkin }: {
  currentPage: Page;
  onNavigate: (p: Page) => void;
  showExpanded: boolean;
  onToggle: () => void;
  isMobile: boolean;
  onMobileClose?: () => void;
  allowToggle?: boolean;
  sidebarSkin: SidebarSkinId;
}) {
  const { isHinglish, isModern, lang, theme } = useTheme();
  const skin = sidebarSkinClasses(sidebarSkin, theme);
  const settingsActive = currentPage === ('profile' as Page);

  return (
    <div className={`flex flex-col h-full m-2.5 mr-0 rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden ${skin.bg}`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-5 py-5 border-b border-white/[0.06] ${!showExpanded ? 'justify-center' : ''}`}>
        <div className="relative shrink-0">
          <span className="text-2xl">{isHinglish ? '🎉' : isModern ? '🗒️' : '🪔'}</span>
          <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${skin.accent} animate-subtle-pulse`} />
        </div>
        {showExpanded && (
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white/90 tracking-tight truncate">{t('appName', lang)}</h1>
            <p className="text-[10px] -mt-0.5 text-white/30">{t('appTagline', lang)}</p>
          </div>
        )}
        {isMobile && onMobileClose && (
          <button onClick={onMobileClose} aria-label="Close"
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all shrink-0">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto scrollbar-hide">
        {navItems.map(item => {
          const active = currentPage === item.page;
          return (
            <button key={item.page} onClick={() => onNavigate(item.page)} title={t(item.labelKey, lang)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative
                ${active ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'}
                ${!showExpanded ? 'justify-center' : ''}`}>
              {active && <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full ${skin.accent}`} />}
              <span className="text-base shrink-0">{isHinglish ? item.hi : isModern ? item.pro : item.emoji}</span>
              {showExpanded && <span className="font-medium text-[13px] truncate">{t(item.labelKey, lang)}</span>}
              {active && showExpanded && <div className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${skin.accent}`} />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2.5 pb-3 pt-3 space-y-1 border-t border-white/[0.06]">
        <button
          onClick={() => onNavigate('profile' as Page)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
            settingsActive
              ? 'bg-white/[0.08] text-white shadow-sm'
              : 'text-white/30 hover:bg-white/[0.04] hover:text-white/50'
          } ${!showExpanded ? 'justify-center' : ''}`}
        >
          <Settings size={18} />
          {showExpanded && <span className="font-medium text-[13px]">{t('navSettings', lang)}</span>}
        </button>
        {!isMobile && allowToggle && (
          <button onClick={onToggle}
            className="w-full flex items-center justify-center py-2 rounded-lg text-white/20 hover:bg-white/[0.04] hover:text-white/40 transition-all">
            {showExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

function BottomNav({ currentPage, onNavigate }: { currentPage: Page; onNavigate: (p: Page) => void }) {
  const { isDark, isHinglish, isModern } = useTheme();
  const bg = (isDark || isHinglish)
    ? 'bg-[#0C0C1A]/95 backdrop-blur-xl border-t border-white/[0.06]'
    : 'bg-white/95 backdrop-blur-xl border-t border-slate-200/60';

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-30 flex ${bg}`} aria-label="Mobile navigation">
      {navItems.map(item => {
        const active = currentPage === item.page;
        // Token-driven so Theme 1 uses saffron/orange, Theme 3 uses blue/violet, Theme 4 uses indigo.
        const activeCl = 'text-[var(--kq-primary)]';
        const dotCl    = 'bg-[var(--kq-primary)]';
        return (
          <button key={item.page} onClick={() => onNavigate(item.page)} aria-current={active ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all
              ${active ? activeCl : 'text-[var(--kq-text-muted)] hover:text-[var(--kq-text-secondary)]'}`}>
            <span className={`text-xl transition-transform ${active ? 'scale-110' : ''}`}>{isHinglish ? item.hi : isModern ? item.pro : item.emoji}</span>
            <div className={`w-1 h-1 rounded-full transition-all ${active ? dotCl : 'bg-transparent'}`} />
          </button>
        );
      })}
    </nav>
  );
}

export function Sidebar({ currentPage, onNavigate, collapsed, onToggle, mobileOpen, onMobileClose, isDesktop, desktopWidthPx, desktopExpanded, desktopCanExpand, sidebarSkin }: SidebarProps) {
  const desktopShowExpanded = desktopExpanded && !collapsed; // when false, we show icon-only rail

  return (
    <>
      {/* Desktop sidebar (md+) */}
      {isDesktop && (
        <aside
          className="fixed left-0 top-0 h-full z-30 flex flex-col transition-all duration-300 ease-in-out"
          style={{ width: desktopWidthPx }}
        >
          <Panel
            currentPage={currentPage}
            onNavigate={onNavigate}
            showExpanded={desktopShowExpanded}
            onToggle={onToggle}
            isMobile={false}
            allowToggle={desktopCanExpand}
            sidebarSkin={sidebarSkin}
          />
        </aside>
      )}

      {/* Mobile drawer + backdrop (only when NOT desktop) */}
      {!isDesktop && (
        <>
          <div onClick={onMobileClose} aria-hidden="true"
            className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />

          <aside aria-label="Navigation menu"
            className={`fixed left-0 top-0 h-full w-72 z-50 transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <Panel
              currentPage={currentPage}
              onNavigate={onNavigate}
              showExpanded={true}
              onToggle={onToggle}
              isMobile={true}
              onMobileClose={onMobileClose}
              allowToggle={false}
              sidebarSkin={sidebarSkin}
            />
          </aside>

          <BottomNav currentPage={currentPage} onNavigate={onNavigate} />
        </>
      )}
    </>
  );
}
