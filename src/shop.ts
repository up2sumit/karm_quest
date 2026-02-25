// KarmQuest Mudra Shop
// This module provides cosmetic skins, avatar frames, title badges, and XP boosts.
// It is intentionally defensive: persisted IDs are treated as strings so older saves
// won't crash if catalog changes.

export type ShopItemKind = 'frame' | 'skin' | 'badge' | 'boost';

// Keep these as string-y types for backward compatibility with persisted state.
export type AvatarFrameId = string;
export type SidebarSkinId = string;
export type TitleBadgeId = string;

export type ThemeMode = 'light' | 'dark' | 'hinglish' | 'modern' | (string & {});

export type XpBoost = {
  multiplier: number;
  /** Epoch ms when boost expires */
  expiresAt: number;
};

export type ShopItem = {
  id: string;
  kind: ShopItemKind;
  name: string;
  description: string;
  emoji: string;
  cost: number;

  // Cosmetic identifiers
  frameId?: AvatarFrameId;
  skinId?: SidebarSkinId;
  badgeId?: TitleBadgeId;

  // Boost config
  boostMultiplier?: number;
  boostDurationMs?: number;
};

export type ShopState = {
  ownedFrames: AvatarFrameId[];
  ownedSkins: SidebarSkinId[];
  ownedBadges: TitleBadgeId[];
  equippedFrame: AvatarFrameId;
  equippedSkin: SidebarSkinId;
  activeBoost: XpBoost | null;
};

// ── Catalog IDs ────────────────────────────────────────────────────────────

export const AVATAR_FRAMES = ['none', 'gold', 'neon', 'lotus', 'obsidian', 'royal'] as const;
export const SIDEBAR_SKINS = ['default', 'midnight', 'lotus', 'sunrise', 'obsidian'] as const;
export const TITLE_BADGES = ['none', 'karma_yogi', 'focus_monk', 'bug_slayer', 'streak_lord', 'vidya_guru'] as const;

export const defaultShopState: ShopState = {
  ownedFrames: ['none'],
  ownedSkins: ['default'],
  ownedBadges: ['none'],
  equippedFrame: 'none',
  equippedSkin: 'default',
  activeBoost: null,
};

// Items shown in MudraShop UI and used by App.tsx purchase logic.
export const shopCatalog: ShopItem[] = [
  // Frames
  {
    id: 'frame_gold',
    kind: 'frame',
    name: 'Golden Halo',
    description: 'A radiant ring for your avatar. Looks premium everywhere.',
    emoji: '✨',
    cost: 120,
    frameId: 'gold',
  },
  {
    id: 'frame_neon',
    kind: 'frame',
    name: 'Neon Pulse',
    description: 'Soft neon glow. Maximum game-feel.',
    emoji: '💜',
    cost: 160,
    frameId: 'neon',
  },
  {
    id: 'frame_lotus',
    kind: 'frame',
    name: 'Lotus Ring',
    description: 'Calm, clean, and devotional.',
    emoji: '🪷',
    cost: 140,
    frameId: 'lotus',
  },
  {
    id: 'frame_obsidian',
    kind: 'frame',
    name: 'Obsidian Edge',
    description: 'Sharp dark frame with a subtle aura.',
    emoji: '🖤',
    cost: 150,
    frameId: 'obsidian',
  },
  {
    id: 'frame_royal',
    kind: 'frame',
    name: 'Royal Crest',
    description: 'A dignified frame fit for a Chakravarti.',
    emoji: '👑',
    cost: 220,
    frameId: 'royal',
  },

  // Skins
  {
    id: 'skin_midnight',
    kind: 'skin',
    name: 'Midnight Indigo',
    description: 'Deep indigo sidebar with crisp accents.',
    emoji: '🌙',
    cost: 180,
    skinId: 'midnight',
  },
  {
    id: 'skin_lotus',
    kind: 'skin',
    name: 'Lotus Dawn',
    description: 'Warm lotus tones for a calmer workflow.',
    emoji: '🪷',
    cost: 180,
    skinId: 'lotus',
  },
  {
    id: 'skin_sunrise',
    kind: 'skin',
    name: 'Sunrise Saffron',
    description: 'Bright, optimistic, and energetic.',
    emoji: '🌅',
    cost: 180,
    skinId: 'sunrise',
  },
  {
    id: 'skin_obsidian',
    kind: 'skin',
    name: 'Obsidian Noir',
    description: 'Minimal, high-contrast, and sharp.',
    emoji: '⚫',
    cost: 190,
    skinId: 'obsidian',
  },

  // Title badges
  {
    id: 'badge_karma_yogi',
    kind: 'badge',
    name: 'Karma Yogi',
    description: 'For consistent finishers.',
    emoji: '🕉️',
    cost: 90,
    badgeId: 'karma_yogi',
  },
  {
    id: 'badge_focus_monk',
    kind: 'badge',
    name: 'Focus Monk',
    description: 'For deep workers and Pomodoro grinders.',
    emoji: '🧘',
    cost: 110,
    badgeId: 'focus_monk',
  },
  {
    id: 'badge_bug_slayer',
    kind: 'badge',
    name: 'Bug Slayer',
    description: 'For dev sprints and QA dominance.',
    emoji: '🪲',
    cost: 110,
    badgeId: 'bug_slayer',
  },
  {
    id: 'badge_streak_lord',
    kind: 'badge',
    name: 'Streak Lord',
    description: 'For the streak-obsessed tapasyas.',
    emoji: '🔥',
    cost: 140,
    badgeId: 'streak_lord',
  },
  {
    id: 'badge_vidya_guru',
    kind: 'badge',
    name: 'Vidya Guru',
    description: 'For knowledge builders and note hoarders.',
    emoji: '📿',
    cost: 120,
    badgeId: 'vidya_guru',
  },

  // Boost
  {
    id: 'boost_x2_60m',
    kind: 'boost',
    name: 'XP Boost (2×)',
    description: 'Double XP for 60 minutes.',
    emoji: '⚡',
    cost: 200,
    boostMultiplier: 2,
    boostDurationMs: 60 * 60 * 1000,
  },
];

// ── Title badge meta (used by MudraShop + quest title pills) ───────────────

export type TitleBadgeMeta = {
  id: TitleBadgeId;
  /** short label, UI-friendly */
  label: string;
  emoji: string;
  tone: 'slate' | 'indigo' | 'rose' | 'amber' | 'emerald' | 'violet';
  description?: string;
};

// We export `titleBadgeMeta` as a *callable function* because MudraShop.tsx
// uses it like: titleBadgeMeta(id). At the same time, some UI bits may treat
// it like a lookup map: titleBadgeMeta[id].
//
// To stay backward-compatible with both patterns, we create a function and
// also attach the map entries onto it.

const _titleBadgeMetaMap: Record<string, TitleBadgeMeta> = {
  none: { id: 'none', label: 'None', emoji: '🏷️', tone: 'slate', description: 'No title badge equipped.' },
  karma_yogi: { id: 'karma_yogi', label: 'Karma Yogi', emoji: '🕉️', tone: 'indigo', description: 'Consistent finisher energy.' },
  focus_monk: { id: 'focus_monk', label: 'Focus Monk', emoji: '🧘', tone: 'emerald', description: 'Deep work & calm mind.' },
  bug_slayer: { id: 'bug_slayer', label: 'Bug Slayer', emoji: '🪲', tone: 'rose', description: 'Dev sprint/QA grindset.' },
  streak_lord: { id: 'streak_lord', label: 'Streak Lord', emoji: '🔥', tone: 'amber', description: 'Streaks are the religion.' },
  vidya_guru: { id: 'vidya_guru', label: 'Vidya Guru', emoji: '📿', tone: 'violet', description: 'Knowledge builder.' },
};

export type TitleBadgeMetaExport = ((id: TitleBadgeId | string | undefined | null, ..._args: any[]) => TitleBadgeMeta) &
  Record<string, TitleBadgeMeta>;

export const titleBadgeMeta: TitleBadgeMetaExport = Object.assign(
  ((id: TitleBadgeId | string | undefined | null, ..._args: any[]) => {
    const key = (id || 'none') as string;
    return _titleBadgeMetaMap[key] || _titleBadgeMetaMap.none;
  }) as TitleBadgeMetaExport,
  _titleBadgeMetaMap
);

export function getTitleBadgeMeta(id: TitleBadgeId | string | undefined | null): TitleBadgeMeta {
  const key = (id || 'none') as string;
  return _titleBadgeMetaMap[key] || _titleBadgeMetaMap.none;
}


// Theme-aware badge meta (keeps IDs stable, only changes display labels in Theme 4)
export function titleBadgeMetaForTheme(id: TitleBadgeId | string | undefined | null, theme: ThemeMode): TitleBadgeMeta {
  const meta = getTitleBadgeMeta(id);
  if (theme !== 'modern') return meta;

  const overrides: Record<string, Partial<TitleBadgeMeta>> = {
    none:        { label: 'No badge', emoji: '🏷️', tone: 'slate' },
    karma_yogi:  { label: 'Consistent finisher', emoji: '✅', tone: 'emerald' },
    focus_monk:  { label: 'Deep focus', emoji: '⏱️', tone: 'indigo' },
    bug_slayer:  { label: 'Bug fixer', emoji: '🧩', tone: 'rose' },
    streak_lord: { label: 'Streak builder', emoji: '📅', tone: 'amber' },
    vidya_guru:  { label: 'Note keeper', emoji: '🗒️', tone: 'violet' },
  };

  const o = overrides[(id || 'none') as string];
  return o ? ({ ...meta, ...o } as TitleBadgeMeta) : meta;
}

export function titleBadgePillClass(id: TitleBadgeId | string | undefined, theme: ThemeMode): string {
  const meta = getTitleBadgeMeta(id);
  // Theme semantics:
  //  - theme === 'hinglish' → Indigo Dark (true dark)
  //  - theme === 'dark'     → Chakra Rings (light)
  const isDark = theme === 'hinglish';
  const isModern = theme === 'modern';

  // Theme base
  const base = isModern
      ? 'border border-[var(--kq-border)]'
      : isDark
        ? 'border border-white/10'
        : 'border border-slate-200/70';

  const tone = meta.tone;

  const toneMapLight: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
  };

  const toneMapDark: Record<string, string> = {
    slate: 'bg-white/6 text-slate-200',
    indigo: 'bg-indigo-500/15 text-indigo-200',
    rose: 'bg-rose-500/15 text-rose-200',
    amber: 'bg-amber-500/15 text-amber-200',
    emerald: 'bg-emerald-500/15 text-emerald-200',
    violet: 'bg-violet-500/15 text-violet-200',
  };

  const toneMapModern: Record<string, string> = {
    slate: 'bg-[var(--kq-bg2)] text-[var(--kq-text-primary)]',
    indigo: 'bg-[var(--kq-primary-soft)] text-[var(--kq-primary)]',
    rose: 'bg-[var(--kq-bg2)] text-[var(--kq-primary)]',
    amber: 'bg-[var(--kq-bg2)] text-[var(--kq-text-primary)]',
    emerald: 'bg-[var(--kq-primary-soft)] text-[var(--kq-primary)]',
    violet: 'bg-[var(--kq-bg2)] text-[var(--kq-text-primary)]',
  };

  const colors = isModern
      ? (toneMapModern[tone] || toneMapModern.slate)
      : isDark
        ? (toneMapDark[tone] || toneMapDark.slate)
        : (toneMapLight[tone] || toneMapLight.slate);

  return `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${base} ${colors}`;
}

// ── Sidebar skins ──────────────────────────────────────────────────────────

// Named export requested by Sidebar.tsx
export function sidebarSkinClasses(skinId: SidebarSkinId | string | undefined, theme: ThemeMode): { bg: string; accent: string } {
  const id = (skinId || 'default') as string;
  // Default accents per theme
  if (id === 'default') {
    if (theme === 'modern') return { bg: 'bg-[#1E2322]/95', accent: 'bg-[var(--kq-primary)]' };
    // Indigo Dark (Theme 4)
    if (theme === 'hinglish') return { bg: 'bg-gradient-to-br from-[#0C0C1A]/95 to-[#1B1B3A]/95', accent: 'bg-indigo-500' };
    // Theme 1 (Saffron Light): warm sidebar gradient (orange/brown) like the reference
    if (theme === 'light') {
      return {
        bg: 'bg-gradient-to-b from-[#6B2A00] via-[#B45309] to-[#F59E0B]',
        accent: 'bg-[#FFE2B8]',
      };
    }
    // Theme 3 (Chakra Rings): light UI with blue/violet accents → keep a cooler sidebar
    return { bg: 'bg-gradient-to-br from-slate-900/95 to-indigo-900/90', accent: 'bg-indigo-400' };
  }

  if (id === 'midnight') {
    return { bg: 'bg-gradient-to-br from-slate-950/90 to-indigo-950/80', accent: 'bg-indigo-400' };
  }

  if (id === 'lotus') {
    return theme === 'hinglish'
      ? { bg: 'bg-gradient-to-br from-[#1B1022]/90 to-[#2C1537]/85', accent: 'bg-fuchsia-400' }
      : { bg: 'bg-gradient-to-br from-rose-500/90 to-fuchsia-600/90', accent: 'bg-rose-200' };
  }

  if (id === 'sunrise') {
    return theme === 'hinglish'
      ? { bg: 'bg-gradient-to-br from-[#1A120C]/90 to-[#2A1A0C]/85', accent: 'bg-amber-400' }
      : { bg: 'bg-gradient-to-br from-amber-500/90 to-rose-500/90', accent: 'bg-amber-200' };
  }

  if (id === 'obsidian') {
    return { bg: 'bg-gradient-to-br from-slate-950/90 to-slate-900/80', accent: 'bg-slate-300' };
  }

  // Fallback
  return sidebarSkinClasses('default', theme);
}

// ── Avatar frames ──────────────────────────────────────────────────────────

// Named export requested by TopNav.tsx
export function avatarFrameClass(frameId: AvatarFrameId | string | undefined, theme: ThemeMode): string {
  const id = (frameId || 'none') as string;
  if (id === 'none') return '';

  const isDark = theme === 'hinglish';

  // A small consistent base ring that composes well with your existing UI.
  const base = 'ring-2 ring-offset-2 ring-offset-transparent';

  if (id === 'gold') {
    return `${base} ring-amber-400 ${isDark ? 'shadow-[0_0_14px_rgba(251,191,36,0.25)]' : 'shadow-[0_0_10px_rgba(251,191,36,0.20)]'}`;
  }

  if (id === 'neon') {
    return `${base} ring-fuchsia-400 ${isDark ? 'shadow-[0_0_16px_rgba(217,70,239,0.35)]' : 'shadow-[0_0_12px_rgba(217,70,239,0.25)]'}`;
  }

  if (id === 'lotus') {
    return `${base} ring-rose-300 ${isDark ? 'shadow-[0_0_14px_rgba(244,114,182,0.25)]' : 'shadow-[0_0_10px_rgba(244,114,182,0.20)]'}`;
  }

  if (id === 'obsidian') {
    return `${base} ring-slate-400 ${isDark ? 'shadow-[0_0_12px_rgba(148,163,184,0.18)]' : 'shadow-[0_0_10px_rgba(148,163,184,0.14)]'}`;
  }

  if (id === 'royal') {
    return `${base} ring-violet-400 ${isDark ? 'shadow-[0_0_16px_rgba(167,139,250,0.30)]' : 'shadow-[0_0_12px_rgba(167,139,250,0.22)]'}`;
  }

  return '';
}

// ── Boost helpers ──────────────────────────────────────────────────────────

export function isBoostActive(boost: XpBoost | null | undefined): boolean {
  return !!boost && typeof boost.expiresAt === 'number' && boost.expiresAt > Date.now();
}

// Named export requested by TopNav.tsx
export function boostRemainingMs(boost: XpBoost | null | undefined): number {
  if (!boost || typeof boost.expiresAt !== 'number') return 0;
  return Math.max(0, boost.expiresAt - Date.now());
}

// Named export requested by TopNav.tsx
export function formatMs(ms: number): string {
  const safe = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(safe / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);

  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}
