import { createContext, useContext, useCallback, useEffect, type ReactNode } from 'react';
import type { Lang } from '../i18n';
import { usePersistentState } from '../hooks/usePersistentState';

export type ThemeMode = 'light' | 'dark' | 'hinglish';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  isHinglish: boolean;
  lang: Lang;
  setTheme: (theme: ThemeMode) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  isDark: false,
  isHinglish: false,
  lang: 'en',
  setTheme: () => {},
  cycleTheme: () => {},
});

// ── Theme token maps ────────────────────────────────────────────────────────
//
//  dark     → KarmQuest Analysis palette (warm black + gold/saffron)
//  hinglish → existing rose/violet Desi palette
//  light    → clean warm-light palette
//
const themeVars: Record<ThemeMode, Record<string, string>> = {
  dark: {
    // Backgrounds
    '--kq-bg':              '#0A0805',
    '--kq-bg2':             '#0F0C09',
    '--kq-bg3':             '#141009',
    '--kq-surface':         'rgba(255,255,255,0.03)',
    '--kq-surface2':        'rgba(201,146,42,0.06)',

    // Borders
    '--kq-border':          'rgba(255,255,255,0.06)',
    '--kq-border2':         'rgba(201,146,42,0.14)',

    // Primary accent — gold
    '--kq-primary':         '#C9922A',
    '--kq-primary-light':   '#E8B84B',
    '--kq-primary-soft':    '#F5D478',

    // Secondary accent — saffron
    '--kq-accent':          '#E8622A',
    '--kq-accent-light':    '#F5A070',

    // Violet (kept for shop/badges)
    '--kq-violet':          '#8B5CF6',
    '--kq-violet-light':    '#A78BFA',

    // Text
    '--kq-text-primary':    '#F0E8D8',
    '--kq-text-secondary':  '#A89880',
    '--kq-text-muted':      '#5C5040',

    // XP bar
    '--kq-xp-start':        '#C9922A',
    '--kq-xp-end':          '#E8622A',

    // Ambient glow
    '--kq-glow':            'rgba(201,146,42,0.12)',
  },

  hinglish: {
    // Backgrounds
    '--kq-bg':              '#100818',
    '--kq-bg2':             '#0D0612',
    '--kq-bg3':             '#160B20',
    '--kq-surface':         'rgba(255,255,255,0.04)',
    '--kq-surface2':        'rgba(244,63,94,0.06)',

    // Borders
    '--kq-border':          'rgba(255,255,255,0.07)',
    '--kq-border2':         'rgba(244,63,94,0.15)',

    // Primary accent — rose
    '--kq-primary':         '#F43F5E',
    '--kq-primary-light':   '#FB7185',
    '--kq-primary-soft':    '#FECDD3',

    // Secondary — violet
    '--kq-accent':          '#8B5CF6',
    '--kq-accent-light':    '#A78BFA',

    // Violet alias
    '--kq-violet':          '#8B5CF6',
    '--kq-violet-light':    '#A78BFA',

    // Text
    '--kq-text-primary':    '#F1E8FF',
    '--kq-text-secondary':  '#B8A8D0',
    '--kq-text-muted':      '#6B5080',

    // XP bar
    '--kq-xp-start':        '#F43F5E',
    '--kq-xp-end':          '#8B5CF6',

    // Ambient glow
    '--kq-glow':            'rgba(244,63,94,0.10)',
  },

  light: {
    // Backgrounds
    '--kq-bg':              '#F7F4EE',
    '--kq-bg2':             '#F0EDE6',
    '--kq-bg3':             '#EAE6DD',
    '--kq-surface':         'rgba(255,255,255,0.85)',
    '--kq-surface2':        'rgba(201,146,42,0.07)',

    // Borders
    '--kq-border':          'rgba(30,20,0,0.09)',
    '--kq-border2':         'rgba(201,146,42,0.2)',

    // Primary accent — gold (light-mode friendly)
    '--kq-primary':         '#A07020',
    '--kq-primary-light':   '#C9922A',
    '--kq-primary-soft':    '#E8B84B',

    // Secondary — saffron
    '--kq-accent':          '#C04810',
    '--kq-accent-light':    '#E8622A',

    // Violet
    '--kq-violet':          '#7C3AED',
    '--kq-violet-light':    '#8B5CF6',

    // Text
    '--kq-text-primary':    '#1A0F00',
    '--kq-text-secondary':  '#6B5030',
    '--kq-text-muted':      '#A08060',

    // XP bar
    '--kq-xp-start':        '#C9922A',
    '--kq-xp-end':          '#E8622A',

    // Ambient glow
    '--kq-glow':            'rgba(201,146,42,0.08)',
  },
};

// ── Inject vars into :root ──────────────────────────────────────────────────
function applyThemeVars(mode: ThemeMode) {
  const vars = themeVars[mode];
  const root = document.documentElement;
  Object.entries(vars).forEach(([prop, val]) => root.style.setProperty(prop, val));
}

// ── Provider ────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = usePersistentState<ThemeMode>('kq_theme', 'dark');

  const isDark     = theme === 'dark';
  const isHinglish = theme === 'hinglish';
  const lang: Lang = isHinglish ? 'hi' : 'en';

  // Apply CSS vars whenever theme changes
  useEffect(() => {
    applyThemeVars(theme);
  }, [theme]);

  const setTheme = useCallback((t: ThemeMode) => setThemeState(t), [setThemeState]);

  const cycleTheme = useCallback(() => {
    setThemeState(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'hinglish';
      return 'light';
    });
  }, [setThemeState]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, isHinglish, lang, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
