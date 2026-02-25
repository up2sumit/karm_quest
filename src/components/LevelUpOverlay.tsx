import { useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import type { Achievement } from '../store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LevelUpData {
  newLevel: number;
  xpEarned: number;
  coinsEarned: number;
  unlockedAchievements: Achievement[];
}

interface LevelUpOverlayProps {
  data: LevelUpData;
  onClose: () => void;
}

// ─── Rarity colours (mirrors Achievements page) ───────────────────────────────

const rarityConfig = {
  common:    { label: 'Common',    labelHi: 'Normal',       gradient: 'from-slate-100 to-slate-200',   darkGradient: 'from-slate-700/30 to-slate-600/30',   text: 'text-slate-500',   darkText: 'text-slate-400' },
  rare:      { label: 'Rare',      labelHi: 'Accha Wala',   gradient: 'from-sky-50 to-sky-100',         darkGradient: 'from-sky-900/20 to-sky-800/20',        text: 'text-sky-500',     darkText: 'text-sky-400'   },
  epic:      { label: 'Epic',      labelHi: 'Zabardast!',   gradient: 'from-violet-50 to-violet-100',   darkGradient: 'from-violet-900/20 to-violet-800/20',  text: 'text-violet-500',  darkText: 'text-violet-400'},
  legendary: { label: 'Legendary', labelHi: 'LEGEND! 🐐',  gradient: 'from-amber-50 to-amber-100',     darkGradient: 'from-amber-900/20 to-amber-800/20',    text: 'text-amber-500',   darkText: 'text-amber-400' },
};

// ─── Confetti piece data ───────────────────────────────────────────────────────

interface ConfettiPiece {
  id: number;
  x: number;           // vw units
  size: number;        // px
  color: string;
  shape: 'square' | 'circle' | 'rect';
  duration: number;    // seconds
  delay: number;       // seconds
  drift: number;       // px horizontal drift during fall
  rotation: number;    // initial rotation deg
  rotationSpeed: number; // degrees per second
}

function useConfetti(isHinglish: boolean, isDark: boolean): ConfettiPiece[] {
  return useMemo(() => {
    const lightColors  = ['#6366F1', '#8B5CF6', '#A78BFA', '#F59E0B', '#10B981', '#F43F5E', '#06B6D4', '#EC4899', '#FBBF24', '#34D399'];
    const darkColors   = ['#818CF8', '#A78BFA', '#C4B5FD', '#FCD34D', '#6EE7B7', '#FB7185', '#67E8F9', '#F9A8D4', '#FDE68A', '#6EE7B7'];
    // Hinglish uses the same color composition as Charcoal Dark.
    const palette = (isHinglish || isDark) ? darkColors : lightColors;
    const shapes: ConfettiPiece['shape'][] = ['square', 'circle', 'rect'];

    return [...Array(48)].map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 8 + 5,
      color: palette[Math.floor(Math.random() * palette.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      duration: Math.random() * 2 + 2.5,
      delay: Math.random() * 1.8,
      drift: (Math.random() - 0.5) * 120,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 720,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ─── Confetti layer (pure CSS animations injected as inline styles) ────────────

function ConfettiLayer({ pieces }: { pieces: ConfettiPiece[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[61] overflow-hidden">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute top-0 confetti-piece"
          style={{
            left: `${p.x}vw`,
            width: p.shape === 'rect' ? p.size * 0.5 : p.size,
            height: p.shape === 'rect' ? p.size * 1.8 : p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'rect' ? '2px' : '2px',
            opacity: 0,
            // Inline animation so each piece has unique timing
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            transform: `rotate(${p.rotation}deg)`,
            // CSS custom props for the animation
            ['--drift' as string]: `${p.drift}px`,
            ['--rot-end' as string]: `${p.rotation + p.rotationSpeed}deg`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Ripple rings behind the level badge ──────────────────────────────────────

function RippleRings({ isHinglish }: { isHinglish: boolean }) {
  const color = isHinglish ? 'rgba(244, 63, 94, 0.3)' : 'rgba(99, 102, 241, 0.3)';
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="absolute rounded-full border-2 levelup-ripple"
          style={{
            width: 120 + i * 60,
            height: 120 + i * 60,
            borderColor: color,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

export function LevelUpOverlay({ data, onClose }: LevelUpOverlayProps) {
  const { isDark, isHinglish, lang } = useTheme();
  const isPro = lang === 'pro';
  const confetti = useConfetti(isHinglish, isDark);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [onClose]);

  // Escape key to dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Focus the continue button for keyboard accessibility
  useEffect(() => {
    const t = setTimeout(() => btnRef.current?.focus(), 600);
    return () => clearTimeout(t);
  }, []);

  // ── Copy ──────────────────────────────────────────────────────────────────
  const copy = {
    eyebrow:      isPro ? 'LEVEL UP' : (isHinglish ? '🎊 BHAI LEVEL UP HO GAYA!' : '✨ LEVEL UP!'),
    levelLabel:   'Level',
    headline:     isPro
                    ? `Level ${data.newLevel}`
                    : isHinglish
                      ? `Level ${data.newLevel} ka Yoddha ban gaya tu! 🔥`
                      : `You've reached Level ${data.newLevel}!`,
    subtitle:     isPro
                    ? 'Nice progress. Keep going.'
                    : isHinglish
                      ? 'Teri mehnat rang laayi! Keep grinding, champion!'
                      : 'Your dedication is paying off. Keep climbing, Yoddha!',
    xpLabel:      isPro ? 'XP earned' : (isHinglish ? 'XP Mila' : 'Punya Earned'),
    coinsLabel:   isPro ? 'Coins earned' : (isHinglish ? 'Mudra Kamaye' : 'Mudras Earned'),
    achieveLabel: isPro ? 'New milestones' : (isHinglish ? 'Naye Trophies Mile! 🏆' : 'New Siddhis Unlocked!'),
    ctaLabel:     isPro ? 'Back to tasks' : (isHinglish ? 'Aur Quest Karo! 💪' : 'Continue Your Journey 🏹'),
  };

  // ── Theme colours ─────────────────────────────────────────────────────────
  const backdropBg = 'rgba(0,0,0,0.85)';
  const cardBg = isHinglish
    ? 'bg-gradient-to-b from-[#2A1B3D] via-[#1F1530] to-[#130D22]'
    : isDark
      ? 'bg-gradient-to-b from-[#0E0E20] via-[#13132A] to-[#0E0E20]'
      : 'bg-gradient-to-b from-[#1A1A2E] via-[#1E1E38] to-[#16162C]';

  const badgeGradient = isHinglish
    ? 'from-indigo-400 via-violet-500 to-indigo-500'
    : 'from-indigo-400 via-violet-500 to-purple-600';

  const badgeRingColor = isHinglish
    ? 'ring-indigo-400/40'
    : 'ring-indigo-400/40';

  const accentText = isHinglish ? 'text-indigo-400' : 'text-indigo-400';
  const btnGradient = isHinglish
    ? 'from-indigo-500 via-violet-500 to-indigo-500'
    : 'from-indigo-500 via-violet-500 to-purple-600';

  return (
    <>
      {/* ── Confetti falls above everything ─────────────────────────── */}
      <ConfettiLayer pieces={confetti} />

      {/* ── Backdrop ──────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 levelup-backdrop"
        style={{ background: backdropBg }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Level Up celebration"
      >
        {/* ── Main card ───────────────────────────────────────────────── */}
        <div
          className={`relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl levelup-card ${cardBg}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Glow border */}
          <div className={`absolute inset-0 rounded-3xl ring-2 ${badgeRingColor} pointer-events-none`} />

          {/* Top gradient band */}
          <div className={`h-1.5 w-full bg-gradient-to-r ${btnGradient}`} />

          <div className="relative px-8 pt-10 pb-8 flex flex-col items-center text-center">

            {/* ── Ripple rings + level badge ─────────────────────────── */}
            <div className="relative flex items-center justify-center mb-6" style={{ height: 160 }}>
              <RippleRings isHinglish={isHinglish} />

              {/* Badge */}
              <div className={`relative z-10 levelup-badge-pop`}>
                <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${badgeGradient} flex flex-col items-center justify-center shadow-2xl ring-4 ${badgeRingColor}`}>
                  <span className="text-[11px] font-bold text-white/60 uppercase tracking-[3px] leading-none mb-0.5">
                    {copy.levelLabel}
                  </span>
                  <span className="text-5xl font-black text-white leading-none levelup-number">
                    {data.newLevel}
                  </span>
                </div>
                {/* Sparkle dots */}
                {[0, 72, 144, 216, 288].map((deg, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-white levelup-sparkle"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `rotate(${deg}deg) translateY(-70px)`,
                      animationDelay: `${i * 0.12 + 0.4}s`,
                      opacity: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* ── Eyebrow ───────────────────────────────────────────── */}
            <p className={`text-xs font-black uppercase tracking-[4px] mb-1 ${accentText} levelup-text-1`}>
              {copy.eyebrow}
            </p>

            {/* ── Headline ─────────────────────────────────────────── */}
            <h2 className="text-xl font-black text-white mb-1.5 levelup-text-2 leading-snug">
              {copy.headline}
            </h2>
            <p className="text-sm text-white/40 mb-6 levelup-text-3 max-w-xs">
              {copy.subtitle}
            </p>

            {/* ── XP + Coins earned ────────────────────────────────── */}
            <div className="flex gap-3 w-full mb-5 levelup-stats">
              {/* XP */}
              <div className={`flex-1 rounded-2xl py-3 px-4 bg-white/[0.06] border border-white/[0.08] flex flex-col items-center gap-0.5`}>
                <span className="text-xl">✨</span>
                <span className="text-lg font-black text-white">+{data.xpEarned}</span>
                <span className="text-[10px] text-white/40 font-medium">{copy.xpLabel}</span>
              </div>
              {/* Coins */}
              <div className="flex-1 rounded-2xl py-3 px-4 bg-white/[0.06] border border-white/[0.08] flex flex-col items-center gap-0.5">
                <span className="text-xl">🪙</span>
                <span className="text-lg font-black text-white">+{data.coinsEarned}</span>
                <span className="text-[10px] text-white/40 font-medium">{copy.coinsLabel}</span>
              </div>
            </div>

            {/* ── Newly unlocked achievements ───────────────────────── */}
            {data.unlockedAchievements.length > 0 && (
              <div className="w-full mb-5">
                <p className={`text-[11px] font-bold uppercase tracking-[3px] mb-3 ${accentText}`}>
                  {copy.achieveLabel}
                </p>
                <div className="space-y-2">
                  {data.unlockedAchievements.map((ach, i) => {
                    const rc = rarityConfig[ach.rarity];
                    return (
                      <div
                        key={ach.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.07] levelup-achievement"
                        style={{ animationDelay: `${0.6 + i * 0.12}s` }}
                      >
                        <span className="text-2xl animate-badge-unlock" style={{ animationDelay: `${0.7 + i * 0.12}s` }}>
                          {ach.icon}
                        </span>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-[13px] font-bold text-white truncate">{ach.title}</p>
                          <p className="text-[10px] text-white/40 truncate">{ach.description}</p>
                        </div>
                        <span className={`shrink-0 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-gradient-to-r ${rc.gradient} ${rc.text}`}>
                          {lang === 'hi' ? rc.labelHi : rc.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── CTA button ────────────────────────────────────────── */}
            <button
              ref={btnRef}
              onClick={onClose}
              className={`w-full py-3.5 rounded-2xl bg-gradient-to-r ${btnGradient} text-white font-black text-[15px] shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all levelup-cta focus:outline-none focus:ring-2 focus:ring-white/30`}
            >
              {copy.ctaLabel}
            </button>

            {/* Dismiss hint */}
            <p className="text-[10px] text-white/20 mt-3">
              {isHinglish ? 'Tap kahi bhi ya Esc dabao' : 'Click anywhere or press Esc to dismiss'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
