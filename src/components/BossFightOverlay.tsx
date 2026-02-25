import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

interface BossFightOverlayProps {
  open: boolean;
  onClose: () => void;
  rewardCoins: number;
}

type Phase = 'intro' | 'hits' | 'explode' | 'reward';

interface Slash {
  id: string;
  left: number; // %
  top: number; // %
  rot: number; // deg
}

interface ConfettiPiece {
  id: string;
  left: number; // %
  size: number; // px
  color: string;
  delay: number; // s
  duration: number; // s
  drift: number; // px
  rotEnd: number; // deg
}

function reducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

export function BossFightOverlay({ open, onClose, rewardCoins }: BossFightOverlayProps) {
  const { isDark, isHinglish, isModern } = useTheme();
  const [phase, setPhase] = useState<Phase>('intro');
  const [hits, setHits] = useState(0);
  const [slashes, setSlashes] = useState<Slash[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const confetti = useConfetti(isHinglish, isDark, isModern);

  // Kick off the sequence when opened
  useEffect(() => {
    if (!open) return;

    setPhase('intro');
    setHits(0);
    setSlashes([]);
    setShowConfetti(false);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const rm = reducedMotion();
    if (rm) {
      setPhase('reward');
      setShowConfetti(true);
      const tFocus = window.setTimeout(() => closeBtnRef.current?.focus(), 200);
      return () => {
        window.clearTimeout(tFocus);
        document.body.style.overflow = prevOverflow;
      };
    }

    const t1 = window.setTimeout(() => setPhase('hits'), 450);
    const hitInterval = window.setInterval(() => {
      setHits((h) => {
        const next = h + 1;
        addSlash(setSlashes);
        return next;
      });
    }, 520);

    const tExplode = window.setTimeout(() => {
      window.clearInterval(hitInterval);
      setPhase('explode');
    }, 450 + 520 * 6);

    const tReward = window.setTimeout(() => {
      setPhase('reward');
      setShowConfetti(true);
    }, 450 + 520 * 6 + 1100);

    const tFocus = window.setTimeout(() => closeBtnRef.current?.focus(), 450 + 520 * 6 + 1350);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(tExplode);
      window.clearTimeout(tReward);
      window.clearTimeout(tFocus);
      window.clearInterval(hitInterval);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const backdrop = 'rgba(0,0,0,0.86)';

  const cardBg = isModern
    ? 'bg-[#121514]'
    : isHinglish
      ? 'bg-gradient-to-b from-[#2A1B3D] via-[#1F1530] to-[#130D22]'
      : isDark
        ? 'bg-gradient-to-b from-[#0E0E20] via-[#13132A] to-[#0E0E20]'
        : 'bg-gradient-to-b from-[#1A1A2E] via-[#1E1E38] to-[#16162C]';

  const accentBar = isModern ? 'bg-[var(--kq-primary)]' : `bg-gradient-to-r ${isHinglish ? 'from-indigo-500 via-violet-500 to-indigo-500' : 'from-indigo-500 via-violet-500 to-purple-600'}`;
  const accentBtn = isModern ? 'bg-[var(--kq-primary)] hover:bg-[var(--kq-primary-light)]' : `bg-gradient-to-r ${isHinglish ? 'from-indigo-500 via-violet-500 to-indigo-500' : 'from-indigo-500 via-violet-500 to-purple-600'} hover:opacity-95`;

  const title = isModern ? 'WEEKLY MILESTONE' : isHinglish ? '🔥 BOSS FIGHT!' : '⚔️ BOSS FIGHT!';
  const subtitle = isModern
    ? 'Weekly goal reached — quick celebration, then back to work.'
    : isHinglish
      ? 'Ravana ko final hit! Dekh magic…'
      : 'Final blows on Ravana… watch the magic.';

  const winTitle = isModern ? 'MILESTONE COMPLETE' : isHinglish ? '💥 RAVANA DOWN! JAI HO!' : '💥 RAVANA DEFEATED!';
  const winSub = isModern
    ? 'You hit the weekly target. Reward unlocked.'
    : isHinglish
      ? 'Weekly boss complete. Reward le aur next week phir se aana.'
      : 'Weekly boss complete. Collect your reward and come back next week.';

  const healthPct =
    phase === 'intro'
      ? 100
      : phase === 'hits'
        ? Math.max(0, 100 - (hits / 6) * 92)
        : 0;

  return (
    <>
      <BossFightStyles />

      {showConfetti && <ConfettiLayer pieces={confetti} />}

      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 kq-boss-backdrop"
        style={{ background: backdrop }}
        role="dialog"
        aria-modal="true"
        aria-label="Milestone celebration"
        onClick={onClose}
      >
        <div
          className={`relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl ${cardBg} kq-boss-card`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`h-1.5 w-full ${accentBar}`} />

          <div className="px-6 sm:px-8 pt-8 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[4px] text-white/55">{title}</p>
                <p className="text-sm text-white/40 mt-1">{subtitle}</p>
              </div>

              <button
                ref={closeBtnRef}
                onClick={onClose}
                className="shrink-0 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] text-white/80 transition"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Arena */}
            <div className="mt-6 relative rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
              {/* Subtle moving glow (disabled in modern theme) */}
              {!isModern && <div className="absolute inset-0 kq-boss-aurora" />}

              {/* Health */}
              <div className="relative z-10 px-4 pt-4">
                <div className="flex items-center justify-between text-[11px] text-white/60">
                  <span>{isModern ? 'Progress' : 'Boss HP'}</span>
                  <span>{phase === 'reward' ? '0%' : `${Math.round(healthPct)}%`}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${isModern ? 'bg-[var(--kq-primary)]' : 'bg-gradient-to-r from-red-400 via-indigo-500 to-amber-400'
                      }`}
                    style={{ width: `${Math.max(0, Math.min(100, healthPct))}%` }}
                  />
                </div>
              </div>

              {/* Sprite */}
              <div className="relative z-10 px-4 pb-6 pt-5 flex items-center justify-center min-h-[220px]">
                <div className="relative">
                  {slashes.map((s) => (
                    <div
                      key={s.id}
                      className="absolute kq-boss-slash"
                      style={{ left: `${s.left}%`, top: `${s.top}%`, transform: `translate(-50%, -50%) rotate(${s.rot}deg)` }}
                    />
                  ))}

                  {phase === 'explode' && !isModern && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 kq-boss-explosion" />
                  )}

                  <div className={`kq-ravana ${phase === 'hits' ? 'kq-ravana-hit' : ''} ${phase === 'explode' ? 'kq-ravana-explode' : ''}`}>
                    {isModern ? <MilestoneSprite /> : <RavanaSprite isHinglish={isHinglish} isDark={isDark} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Reward */}
            <div
              className={`mt-5 transition-all ${phase === 'reward' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
                } kq-boss-reward`}
            >
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
                <p className="text-sm font-black text-white">{winTitle}</p>
                <p className="text-[12px] text-white/55 mt-1">{winSub}</p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🪙</span>
                      <span className="text-[12px] text-white/60">{isHinglish ? 'Mudra Reward' : 'Coin reward'}</span>
                    </div>
                    <span className="text-[13px] font-black text-white">+{rewardCoins}</span>
                  </div>

                  <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✓</span>
                      <span className="text-[12px] text-white/60">{isModern ? 'Weekly target' : 'Boss Loot'}</span>
                    </div>
                    <span className="text-[13px] font-black text-white">{isModern ? 'Unlocked' : 'Legend Feel'}</span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className={`mt-4 w-full py-3 rounded-2xl text-white font-black text-sm active:scale-[0.99] transition ${accentBtn}`}
                >
                  {isModern ? 'Back to tasks' : isHinglish ? 'Wapas Ja (Continue) 💪' : 'Continue 💪'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function addSlash(setSlashes: React.Dispatch<React.SetStateAction<Slash[]>>) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const left = 35 + Math.random() * 30;
  const top = 35 + Math.random() * 30;
  const rot = -35 + Math.random() * 70;
  setSlashes((prev) => {
    const next = [...prev, { id, left, top, rot }];
    return next.slice(-6);
  });
  window.setTimeout(() => {
    setSlashes((prev) => prev.filter((s) => s.id !== id));
  }, 850);
}

function useConfetti(isHinglish: boolean, isDark: boolean, isModern: boolean): ConfettiPiece[] {
  return useMemo(() => {
    const modernColors = ['#1F5E5A', '#2F3A39', '#D7D0C6', '#E4F0EE', '#EEE7DD'];
    const lightColors = ['#6366F1', '#8B5CF6', '#A78BFA', '#F59E0B', '#10B981', '#F43F5E', '#06B6D4', '#EC4899', '#FBBF24', '#34D399'];
    const darkColors = ['#818CF8', '#A78BFA', '#C4B5FD', '#FCD34D', '#6EE7B7', '#FB7185', '#67E8F9', '#F9A8D4', '#FDE68A', '#6EE7B7'];
    // Hinglish uses the same color composition as Charcoal Dark.
    const palette = isModern ? modernColors : (isHinglish || isDark) ? darkColors : lightColors;

    return [...Array(40)].map((_, i) => ({
      id: `c${i}-${Math.random().toString(16).slice(2)}`,
      left: Math.random() * 100,
      size: 6 + Math.random() * 8,
      color: palette[Math.floor(Math.random() * palette.length)],
      delay: Math.random() * 0.8,
      duration: 2.4 + Math.random() * 1.6,
      drift: (Math.random() - 0.5) * 120,
      rotEnd: (Math.random() - 0.5) * 720,
    }));
  }, [isHinglish, isDark, isModern]);
}

function ConfettiLayer({ pieces }: { pieces: ConfettiPiece[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[71] overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 kq-confetti"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.7,
            backgroundColor: p.color,
            borderRadius: '3px',
            opacity: 0,
            animation: `kq-confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            ['--kq-drift' as string]: `${p.drift}px`,
            ['--kq-rot' as string]: `${p.rotEnd}deg`,
          }}
        />
      ))}
    </div>
  );
}

function MilestoneSprite() {
  return (
    <svg width="220" height="220" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="kqModernGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(110 120) rotate(90) scale(90)">
          <stop stopColor="#1F5E5A" stopOpacity="0.35" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="110" cy="125" r="88" fill="url(#kqModernGlow)" />

      <circle cx="110" cy="110" r="56" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
      <circle cx="110" cy="110" r="44" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" strokeWidth="2" />

      <path
        d="M88 112L104 128L136 92"
        stroke="#E4F0EE"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M110 64C122 64 132 72 136 82"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M110 156C98 156 88 148 84 138"
        stroke="rgba(255,255,255,0.20)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RavanaSprite({ isHinglish, isDark }: { isHinglish: boolean; isDark: boolean }) {
  const headFill = isHinglish ? '#FB7185' : '#A78BFA';
  const headStroke = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.22)';
  const bodyFill = isHinglish ? '#7C3AED' : '#4F46E5';
  const bodyStroke = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.18)';

  return (
    <svg width="220" height="220" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="kqGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(110 130) rotate(90) scale(90)">
          <stop stopColor={isHinglish ? '#FB7185' : '#8B5CF6'} stopOpacity="0.35" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="110" cy="135" r="88" fill="url(#kqGlow)" />

      <path d="M70 190C72 158 89 142 110 142C131 142 148 158 150 190" fill={bodyFill} stroke={bodyStroke} strokeWidth="2" strokeLinejoin="round" />
      <path d="M95 155L110 168L125 155" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />

      {Array.from({ length: 10 }).map((_, i) => {
        const x = 40 + i * 16;
        const y = 70 + (i % 2) * 10;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="12" fill={headFill} stroke={headStroke} strokeWidth="2" />
            <circle cx={x - 4} cy={y - 1} r="1.8" fill="rgba(0,0,0,0.55)" />
            <circle cx={x + 4} cy={y - 1} r="1.8" fill="rgba(0,0,0,0.55)" />
            <path d={`M${x - 4} ${y + 4} Q ${x} ${y + 7} ${x + 4} ${y + 4}`} stroke="rgba(0,0,0,0.45)" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      })}

      <path d="M86 48L98 60L110 44L122 60L134 48" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M84 62H136" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" />

      <circle cx="110" cy="110" r="34" fill={headFill} stroke={headStroke} strokeWidth="2" />
      <circle cx="98" cy="106" r="3" fill="rgba(0,0,0,0.55)" />
      <circle cx="122" cy="106" r="3" fill="rgba(0,0,0,0.55)" />
      <path d="M95 124Q110 134 125 124" stroke="rgba(0,0,0,0.45)" strokeWidth="3" strokeLinecap="round" />
      <path d="M110 92L106 104" stroke="rgba(0,0,0,0.35)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BossFightStyles() {
  return (
    <style>{`
      @keyframes kq-boss-backdrop-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes kq-boss-card-in {
        0% { opacity: 0; transform: scale(0.92) translateY(14px); }
        60% { opacity: 1; transform: scale(1.02) translateY(-2px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      .kq-boss-backdrop { animation: kq-boss-backdrop-in 180ms ease-out forwards; }
      .kq-boss-card { animation: kq-boss-card-in 280ms ease-out forwards; }

      @keyframes kq-aurora {
        0% { transform: translateX(-20%) translateY(-10%) rotate(0deg); opacity: 0.28; }
        50% { transform: translateX(20%) translateY(10%) rotate(12deg); opacity: 0.18; }
        100% { transform: translateX(-20%) translateY(-10%) rotate(0deg); opacity: 0.28; }
      }
      .kq-boss-aurora {
        background: radial-gradient( circle at 30% 20%, rgba(99,102,241,0.32), transparent 55%),
                    radial-gradient( circle at 70% 50%, rgba(244,63,94,0.22), transparent 52%),
                    radial-gradient( circle at 40% 80%, rgba(16,185,129,0.18), transparent 55%);
        filter: blur(20px);
        animation: kq-aurora 5.5s ease-in-out infinite;
      }

      @keyframes kq-ravana-idle {
        0%,100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      .kq-ravana { animation: kq-ravana-idle 3.2s ease-in-out infinite; transform-origin: 50% 70%; }

      @keyframes kq-hit {
        0% { transform: translateY(0) rotate(0deg) scale(1); filter: brightness(1); }
        20% { transform: translateY(-2px) rotate(-2deg) scale(1.01); filter: brightness(1.25); }
        45% { transform: translateY(0) rotate(2deg) scale(0.99); }
        70% { transform: translateY(-1px) rotate(-1deg) scale(1.01); }
        100% { transform: translateY(0) rotate(0deg) scale(1); filter: brightness(1); }
      }
      .kq-ravana-hit { animation: kq-hit 420ms ease-out; }

      @keyframes kq-explode {
        0% { transform: scale(1) rotate(0deg); opacity: 1; filter: saturate(1.2) brightness(1.15); }
        35% { transform: scale(1.06) rotate(2deg); filter: saturate(1.6) brightness(1.55); }
        100% { transform: scale(0.6) rotate(-10deg); opacity: 0; filter: blur(2px) brightness(1.4); }
      }
      .kq-ravana-explode { animation: kq-explode 900ms ease-out forwards; }

      @keyframes kq-slash {
        0% { opacity: 0; transform: translate(-50%,-50%) scale(0.7) rotate(var(--kq-rot, 0deg)); }
        10% { opacity: 1; }
        60% { opacity: 1; }
        100% { opacity: 0; transform: translate(-50%,-50%) scale(1.05) rotate(calc(var(--kq-rot, 0deg) + 8deg)); }
      }
      .kq-boss-slash {
        width: 120px;
        height: 10px;
        border-radius: 999px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent);
        filter: drop-shadow(0 0 10px rgba(255,255,255,0.22));
        opacity: 0;
        animation: kq-slash 700ms ease-out forwards;
      }

      @keyframes kq-burst {
        0% { transform: scale(0.2); opacity: 0.2; }
        35% { transform: scale(1); opacity: 1; }
        100% { transform: scale(1.6); opacity: 0; }
      }
      .kq-boss-explosion {
        width: 220px;
        height: 220px;
        border-radius: 999px;
        background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95), rgba(244,63,94,0.35) 35%, rgba(99,102,241,0.22) 55%, transparent 70%);
        filter: blur(0.5px) drop-shadow(0 0 16px rgba(244,63,94,0.25));
        animation: kq-burst 900ms ease-out forwards;
      }

      @keyframes kq-confetti-fall {
        0% { opacity: 0; transform: translateY(-5vh) translateX(0) rotate(0deg) scale(0.6); }
        10% { opacity: 1; }
        90% { opacity: 0.85; transform: translateY(95vh) translateX(var(--kq-drift, 40px)) rotate(var(--kq-rot, 180deg)) scale(1); }
        100% { opacity: 0; transform: translateY(110vh) translateX(var(--kq-drift, 40px)) rotate(calc(var(--kq-rot, 180deg) * 1.2)) scale(0.8); }
      }
    `}</style>
  );
}
