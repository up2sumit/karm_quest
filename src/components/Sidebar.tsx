import { Settings, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';
import type { Page } from '../store';

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
}

const navItems = [
  { page: 'dashboard'    as Page, labelKey: 'navDashboard'    as const, emoji: '🪔', hi: '🏠' },
  { page: 'quests'       as Page, labelKey: 'navQuests'       as const, emoji: '🏹', hi: '💪' },
  { page: 'notes'        as Page, labelKey: 'navNotes'        as const, emoji: '📜', hi: '🧠' },
  { page: 'achievements' as Page, labelKey: 'navAchievements' as const, emoji: '🏆', hi: '🏆' },
  { page: 'challenges'   as Page, labelKey: 'navChallenges'   as const, emoji: '🔱', hi: '🔥' },
];

function Panel({ currentPage, onNavigate, showExpanded, onToggle, isMobile, onMobileClose, allowToggle }: {
  currentPage: Page;
  onNavigate: (p: Page) => void;
  showExpanded: boolean;
  onToggle: () => void;
  isMobile: boolean;
  onMobileClose?: () => void;
  allowToggle?: boolean;
}) {
  const { isDark, isHinglish, lang } = useTheme();
  const bg = isHinglish
    ? 'bg-gradient-to-b from-[#2A1B3D] via-[#1F1530] to-[#1A1028]'
    : isDark ? 'bg-gradient-to-b from-[#0C0C1A] via-[#101022] to-[#0C0C1A]'
             : 'bg-gradient-to-b from-[#1A1A2E] via-[#22223A] to-[#1A1A2E]';
  const accent = isHinglish ? 'bg-rose-400' : 'bg-indigo-400';

  return (
    <div className={`flex flex-col h-full m-2.5 mr-0 rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden ${bg}`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-5 py-5 border-b border-white/[0.06] ${!showExpanded ? 'justify-center' : ''}`}>
        <div className="relative shrink-0">
          <span className="text-2xl">{isHinglish ? '🎉' : '🪔'}</span>
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-400 animate-subtle-pulse" />
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
              {active && <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full ${accent}`} />}
              <span className="text-base shrink-0">{isHinglish ? item.hi : item.emoji}</span>
              {showExpanded && <span className="font-medium text-[13px] truncate">{t(item.labelKey, lang)}</span>}
              {active && showExpanded && <div className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${accent}`} />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2.5 pb-3 pt-3 space-y-1 border-t border-white/[0.06]">
        <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-white/30 hover:bg-white/[0.04] hover:text-white/50 ${!showExpanded ? 'justify-center' : ''}`}>
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
  const { isDark, isHinglish } = useTheme();
  const bg = isHinglish
    ? 'bg-white/95 backdrop-blur-xl border-t border-rose-200/40'
    : isDark ? 'bg-[#0C0C1A]/95 backdrop-blur-xl border-t border-white/[0.06]'
             : 'bg-white/95 backdrop-blur-xl border-t border-slate-200/60';

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-30 flex ${bg}`} aria-label="Mobile navigation">
      {navItems.map(item => {
        const active = currentPage === item.page;
        const activeCl = isHinglish ? 'text-rose-500' : isDark ? 'text-indigo-400' : 'text-indigo-600';
        const dotCl    = isHinglish ? 'bg-rose-500'   : isDark ? 'bg-indigo-400'   : 'bg-indigo-600';
        return (
          <button key={item.page} onClick={() => onNavigate(item.page)} aria-current={active ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all
              ${active ? activeCl : isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}>
            <span className={`text-xl transition-transform ${active ? 'scale-110' : ''}`}>{isHinglish ? item.hi : item.emoji}</span>
            <div className={`w-1 h-1 rounded-full transition-all ${active ? dotCl : 'bg-transparent'}`} />
          </button>
        );
      })}
    </nav>
  );
}

export function Sidebar({ currentPage, onNavigate, collapsed, onToggle, mobileOpen, onMobileClose, isDesktop, desktopWidthPx, desktopExpanded, desktopCanExpand }: SidebarProps) {
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
            />
          </aside>

          <BottomNav currentPage={currentPage} onNavigate={onNavigate} />
        </>
      )}
    </>
  );
}
