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
// NOTE:
// We deliberately keep Theme 1 (light) and Theme 3 (dark) exactly as-is.
// Only Theme 2 (modern) + Theme 4 (hinglish) get extra card polish vars so
// they behave like Theme 1 Dashboard cards (premium surface + sheen), without
// affecting Theme 1/3.
const themeVars: Record<ThemeMode, Record<string, string>> = {
  // Theme 2: Modern / Field Notes
  modern: {
    // Backgrounds
    '--kq-bg':              '#F6F2EA',
    '--kq-bg2':             '#EEE7DD',
    '--kq-bg3':             '#E6DFD4',
    '--kq-surface':         'rgba(255,255,255,0.92)',
    '--kq-surface2':        'rgba(31,94,90,0.06)',

    // Borders
    '--kq-border':          'rgba(36,36,36,0.12)',
    '--kq-border2':         'rgba(31,94,90,0.26)',

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

    // ✅ Card polish (match Theme 1 dashboard “premium paper” feel)
    '--kq-surface-grad':    'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.86))',
    '--kq-card-sheen':      'radial-gradient(circle at 18% 0%, rgba(31,94,90,0.16), transparent 60%)',

    // Layout polish
    '--kq-sidebar-start':   '#1E2322',
    '--kq-sidebar-end':     '#1B1F1E',

    // ✅ Slightly stronger base card depth like Theme 1
    '--kq-shadow-card':     '0 14px 34px rgba(0,0,0,0.12)',
    '--kq-shadow-btn':      '0 12px 26px rgba(0,0,0,0.14)',

    '--kq-shell-glow-1':    'rgba(31,94,90,0.06)',
    '--kq-shell-glow-2':    'rgba(31,94,90,0.04)',

    // Typography (applied via CSS)
    '--kq-font-body':       "'Outfit', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    '--kq-font-display':    "'Cormorant Garamond', Georgia, serif",
  },

  // Theme 3: Chakra Rings (LIGHT palette with blue/violet accents)
  // ⛔ No changes here (revert-safe)
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

    // Explicitly set to avoid leaking Theme 1/2 sheen when cycling themes
    '--kq-surface-grad':    'none',
    '--kq-card-sheen':      'none',

    // Layout polish
    '--kq-sidebar-start':   '#12142A',
    '--kq-sidebar-end':     '#0E1020',
    '--kq-shadow-card':     '0 10px 28px rgba(0,0,0,0.10)',
    '--kq-shadow-btn':      '0 12px 26px rgba(91,124,255,0.18)',
    '--kq-shell-glow-1':    'rgba(91,124,255,0.10)',
    '--kq-shell-glow-2':    'rgba(143,76,255,0.08)',

    '--kq-font-body':       "'Outfit', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    '--kq-font-display':    "'Cormorant Garamond', Georgia, serif",
  },

  // Theme 4: Indigo Dark (dark UI with blue/black)
  hinglish: {
    // Backgrounds
    '--kq-bg':              '#0B0D18',
    '--kq-bg2':             '#0E1122',
    '--kq-bg3':             '#14182A',
    '--kq-surface':         'rgba(255,255,255,0.055)',
    '--kq-surface2':        'rgba(109,99,255,0.08)',

    // Borders
    '--kq-border':          'rgba(255,255,255,0.075)',
    '--kq-border2':         'rgba(109,99,255,0.26)',

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

    // ✅ Card polish (match Theme 1 dashboard “premium” feel, but as glass)
    '--kq-surface-grad':    'linear-gradient(180deg, rgba(255,255,255,0.065), rgba(255,255,255,0.032))',
    '--kq-card-sheen':      'radial-gradient(circle at 18% 0%, rgba(109,99,255,0.26), transparent 60%)',

    // Layout polish
    '--kq-sidebar-start':   '#0C0C1A',
    '--kq-sidebar-end':     '#1B1B3A',

    // ✅ More depth like Theme 1 cards
    '--kq-shadow-card':     '0 18px 54px rgba(0,0,0,0.50)',
    '--kq-shadow-btn':      '0 16px 40px rgba(91,124,255,0.20)',

    '--kq-shell-glow-1':    'rgba(91,124,255,0.12)',
    '--kq-shell-glow-2':    'rgba(143,76,255,0.08)',

    '--kq-font-body':       "'Outfit', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    '--kq-font-display':    "'Cormorant Garamond', Georgia, serif",
  },

  // Theme 1: Saffron Light
  // ⛔ No changes here (revert-safe)
  light: {
    // Backgrounds
    // Warm paper + soft saffron wash (professional, minimal)
    '--kq-bg':              '#FBF6EE',
    '--kq-bg2':             '#F5E9D6',
    '--kq-bg3':             '#F0DFC5',
    '--kq-surface':         'rgba(255,255,255,0.92)',
    '--kq-surface2':        'rgba(217,119,6,0.08)',

    // Borders
    '--kq-border':          'rgba(26,15,0,0.10)',
    '--kq-border2':         'rgba(217,119,6,0.24)',

    // Primary accent — saffron/orange (matches reference)
    '--kq-primary':         '#D97706',
    '--kq-primary-light':   '#EA580C',
    '--kq-primary-soft':    'rgba(217,119,6,0.16)',

    // Secondary — deeper burnt orange (used sparingly)
    '--kq-accent':          '#9A3412',
    '--kq-accent-light':    '#C2410C',

    // Violet
    '--kq-violet':          '#7C3AED',
    '--kq-violet-light':    '#8B5CF6',

    // Text
    '--kq-text-primary':    '#1A0F00',
    '--kq-text-secondary':  '#6B4B2A',
    '--kq-text-muted':      '#9A7B56',

    // XP bar
    '--kq-xp-start':        '#F59E0B',
    '--kq-xp-end':          '#EA580C',

    // Ambient glow
    '--kq-glow':            'rgba(217,119,6,0.10)',

    // Card polish (Theme 1 should feel like warm paper, not flat white)
    '--kq-surface-grad':    'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.88))',
    '--kq-card-sheen':      'radial-gradient(circle at 18% 0%, rgba(245,158,11,0.14), transparent 56%)',

    // Layout polish (Theme 1 needs warm depth, not flat white)
    '--kq-sidebar-start':   '#7C2D12',
    '--kq-sidebar-end':     '#D97706',
    '--kq-shadow-card':     '0 14px 34px rgba(124,45,18,0.12)',
    '--kq-shadow-btn':      '0 12px 26px rgba(234,88,12,0.20)',
    '--kq-shell-glow-1':    'rgba(245,158,11,0.16)',
    '--kq-shell-glow-2':    'rgba(234,88,12,0.12)',

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
