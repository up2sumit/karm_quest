import { createContext, useContext, useCallback, useEffect, type ReactNode } from 'react';
import type { Lang } from '../i18n';
import { usePersistentState } from '../hooks/usePersistentState';

export type ThemeMode = 'light' | 'dark' | 'hinglish' | 'modern';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  isHinglish: boolean;
  isModern: boolean;
  lang: Lang;
  setTheme: (theme: ThemeMode) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  isDark: false,
  isHinglish: false,
  isModern: false,
  lang: 'en',
  setTheme: () => {},
  cycleTheme: () => {},
});

// ── Theme token maps ────────────────────────────────────────────────────────
//
// Theme order in UI:
//  1) light    → Saffron Light (warm, minimal)
//  2) modern   → Field Notes (editorial, professional)
//  3) dark     → Chakra Rings (LIGHT theme with blue/violet accents)
//  4) hinglish → Indigo Dark (DARK theme with blue/black)
//
const themeVars: Record<ThemeMode, Record<string, string>> = {
  // Modern, editorial, professional (no Hindu/Hinglish tone)
  modern: {
    // Backgrounds
    '--kq-bg':              '#F6F2EA',
    '--kq-bg2':             '#EEE7DD',
    '--kq-bg3':             '#E6DFD4',
    '--kq-surface':         'rgba(255,255,255,0.92)',
    '--kq-surface2':        'rgba(31,94,90,0.06)',

    // Borders
    '--kq-border':          'rgba(36,36,36,0.12)',
    '--kq-border2':         'rgba(31,94,90,0.22)',

    // Primary accent — deep teal
    '--kq-primary':         '#1F5E5A',
    '--kq-primary-light':   '#2D7A74',
    '--kq-primary-soft':    '#E4F0EE',

    // Secondary accent — muted charcoal
    '--kq-accent':          '#2F3A39',
    '--kq-accent-light':    '#4B5A58',

    // Violet (kept for shop/badges)
    '--kq-violet':          '#4F46E5',
    '--kq-violet-light':    '#6366F1',

    // Text
    '--kq-text-primary':    '#242424',
    '--kq-text-secondary':  '#5A5A5A',
    '--kq-text-muted':      '#8A837A',

    // XP bar
    '--kq-xp-start':        '#1F5E5A',
    '--kq-xp-end':          '#1F5E5A',

    // Ambient glow (minimal)
    '--kq-glow':            'rgba(31,94,90,0.06)',

    // Typography (applied via CSS)
    '--kq-font-body':       "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    '--kq-font-display':    "'Source Serif 4', Georgia, serif",
  },

  // Chakra Rings (Theme 3): light UI with blue/violet accents
  dark: {
    // Backgrounds
    '--kq-bg':              '#F7F8FF',
    '--kq-bg2':             '#EEF0FF',
    '--kq-bg3':             '#E6E9FF',
    '--kq-surface':         'rgba(255,255,255,0.92)',
    '--kq-surface2':        'rgba(109,99,255,0.08)',

    // Borders
    '--kq-border':          'rgba(40,45,70,0.10)',
    '--kq-border2':         'rgba(109,99,255,0.22)',

    // Primary accent — indigo/violet
    '--kq-primary':         '#6D63FF',
    '--kq-primary-light':   '#7C73FF',
    '--kq-primary-soft':    'rgba(109,99,255,0.14)',

    // Secondary accent — blue
    '--kq-accent':          '#3B82F6',
    '--kq-accent-light':    '#60A5FA',

    // Violet (kept for shop/badges)
    '--kq-violet':          '#8B5CF6',
    '--kq-violet-light':    '#A78BFA',

    // Text
    '--kq-text-primary':    '#0F172A',
    '--kq-text-secondary':  '#475569',
    '--kq-text-muted':      '#94A3B8',

    // XP bar
    '--kq-xp-start':        '#5B7CFF',
    '--kq-xp-end':          '#8F4CFF',

    // Ambient glow
    '--kq-glow':            'rgba(109,99,255,0.10)',

    '--kq-font-body':       "'Outfit', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    '--kq-font-display':    "'Cormorant Garamond', Georgia, serif",
  },

  // Indigo Dark (Theme 4): dark UI with blue/black
  hinglish: {
    // Backgrounds
    '--kq-bg':              '#0B0D18',
    '--kq-bg2':             '#0E1122',
    '--kq-bg3':             '#14182A',
    '--kq-surface':         'rgba(255,255,255,0.03)',
    '--kq-surface2':        'rgba(109,99,255,0.08)',

    // Borders
    '--kq-border':          'rgba(255,255,255,0.06)',
    '--kq-border2':         'rgba(109,99,255,0.20)',

    // Primary accent — indigo/violet
    '--kq-primary':         '#6D63FF',
    '--kq-primary-light':   '#7C73FF',
    '--kq-primary-soft':    'rgba(109,99,255,0.12)',

    // Secondary accent — blue
    '--kq-accent':          '#3B82F6',
    '--kq-accent-light':    '#60A5FA',

    // Violet
    '--kq-violet':          '#A78BFA',
    '--kq-violet-light':    '#C4B5FD',

    // Text
    '--kq-text-primary':    'rgba(255,255,255,0.92)',
    '--kq-text-secondary':  'rgba(255,255,255,0.68)',
    '--kq-text-muted':      'rgba(255,255,255,0.50)',

    // XP bar
    '--kq-xp-start':        '#5B7CFF',
    '--kq-xp-end':          '#8F4CFF',

    // Ambient glow
    '--kq-glow':            'rgba(109,99,255,0.14)',

    '--kq-font-body':       "'Outfit', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    '--kq-font-display':    "'Cormorant Garamond', Georgia, serif",
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

    '--kq-font-body':       "'Outfit', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    '--kq-font-display':    "'Cormorant Garamond', Georgia, serif",
  },
};

// ── Inject vars into :root ──────────────────────────────────────────────────
function applyThemeVars(mode: ThemeMode) {
  const vars = themeVars[mode];
  const root = document.documentElement;
  root.setAttribute('data-kq-theme', mode);
  Object.entries(vars).forEach(([prop, val]) => root.style.setProperty(prop, val));
}

// ── Provider ────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = usePersistentState<ThemeMode>('kq_theme', 'dark');

  // IMPORTANT: ThemeMode name "dark" here maps to Chakra Rings (a light theme).
  // The only true dark palette is Theme 4 (mode: "hinglish").
  const isDark     = theme === 'hinglish';
  const isHinglish = theme === 'hinglish';
  const isModern   = theme === 'modern';
  const lang: Lang = isHinglish ? 'hi' : isModern ? 'pro' : 'en';

  // Apply CSS vars whenever theme changes
  useEffect(() => {
    applyThemeVars(theme);
  }, [theme]);

  const setTheme = useCallback((t: ThemeMode) => setThemeState(t), [setThemeState]);

  const cycleTheme = useCallback(() => {
    setThemeState(prev => {
      // Order: Light → Modern → Dark → Hinglish → Light
      if (prev === 'light') return 'modern';
      if (prev === 'modern') return 'dark';
      if (prev === 'dark') return 'hinglish';
      return 'light';
    });
  }, [setThemeState]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, isHinglish, isModern, lang, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
