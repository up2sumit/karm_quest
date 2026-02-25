import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import type { Quest } from '../store';
import { useMoodLogUnified, type MoodEntry, type MoodValue } from '../hooks/useMoodLogUnified';

type Props = {
  quests: Quest[];
  /** Default 30. */
  days?: number;
};

function isoFromDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function localMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function moodEmoji(v: MoodValue | null | undefined) {
  if (!v) return '';
  return v === 1 ? '😫' : v === 2 ? '😕' : v === 3 ? '😐' : v === 4 ? '🙂' : '😄';
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function fmtDateShort(d: Date) {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function fmtDateLong(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
}

function bestStreakFromCounts(counts: number[]) {
  let best = 0;
  let run = 0;
  for (const c of counts) {
    if (c > 0) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

function currentStreakFromCounts(counts: number[]) {
  let s = 0;
  for (let i = counts.length - 1; i >= 0; i--) {
    if (counts[i] > 0) s += 1;
    else break;
  }
  return s;
}

// GitHub-ish thresholds requested:
// 0 = grey, 1-5 = yellow, 6-10 = green, 11+ = dark green
function levelForCount(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  if (count <= 5) return 1;
  if (count <= 10) return 2;
  return 3;
}

type HeatMode = 'constellation' | 'orbit' | 'chakra';

type DayDatum = {
  iso: string;
  date: Date;
  count: number;
  xp: number;
  mood: MoodEntry | null;
  lvl: 0 | 1 | 2 | 3;
};

function starRadius(count: number) {
  if (count <= 0) return 2.4;
  if (count <= 5) return 4.6;
  if (count <= 10) return 7.2;
  return 9.5;
}

function starRGBA(lvl: 0 | 1 | 2 | 3) {
  // tuned for cosmic look but preserves the same semantic thresholds (0 / 1–5 / 6–10 / 11+)
  if (lvl === 0) return { r: 148, g: 163, b: 184, a: 0.22 }; // slate-400
  if (lvl === 1) return { r: 250, g: 204, b: 21, a: 0.75 }; // amber-ish
  if (lvl === 2) return { r: 52, g: 211, b: 153, a: 0.8 }; // emerald-400
  return { r: 16, g: 185, b: 129, a: 0.95 }; // emerald-500
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawStarfield(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  // deterministic-ish: same background per session for less flicker
  const count = 48;
  ctx.fillStyle = 'rgba(226,232,240,0.10)';
  for (let i = 0; i < count; i++) {
    const t = (i + 1) * 137.5 + seed * 17.3;
    const bx = (Math.sin((t * Math.PI) / 180) * 0.52 + 0.5) * w;
    const by = (Math.cos((t * 0.71 * Math.PI) / 180) * 0.42 + 0.52) * h;
    const rr = 0.7 + ((i + seed) % 5) * 0.12;
    ctx.beginPath();
    ctx.arc(bx, by, rr, 0, Math.PI * 2);
    ctx.fill();
  }
}

function monthTicksForDays(days: DayDatum[]) {
  const items: Array<{ label: string; start: number }> = [];
  let lastM = -1;
  for (let i = 0; i < days.length; i++) {
    const m = days[i].date.getMonth();
    if (m !== lastM) {
      items.push({ label: days[i].date.toLocaleDateString(undefined, { month: 'short' }), start: i });
      lastM = m;
    }
  }
  return items;
}

function useCanvasSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      setW(el.clientWidth || 0);
    });
    ro.observe(el);
    setW(el.clientWidth || 0);
    return () => ro.disconnect();
  }, []);
  return { ref, w } as const;
}

function ConstellationCanvas(props: {
  days: DayDatum[];
  isDark: boolean;
  selectedISO: string | null;
  onSelectISO: (iso: string) => void;
  onHoverISO: (iso: string | null) => void;
}) {
  const { days, isDark, selectedISO, onSelectISO, onHoverISO } = props;
  const wrap = useCanvasSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store positions so hover detection is stable between renders
  const posRef = useRef<Array<{ x: number; y: number; iso: string; idx: number }>>([]);
  const hoverIdxRef = useRef<number>(-1);

  const height = 210;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  const draw = () => {
    const canvas = canvasRef.current;
    const w = wrap.w;
    if (!canvas || !w) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    const bg = ctx.createLinearGradient(0, 0, w, height);
    bg.addColorStop(0, isDark ? 'rgba(2, 6, 23, 0.9)' : 'rgba(2, 6, 23, 0.92)');
    bg.addColorStop(1, isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(15, 23, 42, 0.9)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, height);
    drawStarfield(ctx, w, height, days.length);

    const PAD = 18;
    const n = Math.max(1, days.length);
    const xStep = n === 1 ? 0 : (w - PAD * 2) / (n - 1);

    const positions: Array<{ x: number; y: number; iso: string; idx: number }> = [];
    for (let i = 0; i < n; i++) {
      const d = days[i];
      const x = PAD + i * xStep;
      const baseY = height * 0.62;
      const noise = Math.sin(i * 0.72) * 16 + Math.cos(i * 1.31) * 12;
      const lift = d.count > 0 ? -Math.min(55, d.count * 4.6) : 0;
      const y = clamp(baseY + noise + lift, 26, height - 26);
      positions.push({ x, y, iso: d.iso, idx: i });
    }
    posRef.current = positions;

    // Streak connections (active consecutive days)
    for (let i = 1; i < days.length; i++) {
      if (days[i].count > 0 && days[i - 1].count > 0) {
        const p1 = positions[i - 1];
        const p2 = positions[i];
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
        ctx.lineWidth = 1.35;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    const hoverIdx = hoverIdxRef.current;
    const todayISO = days[days.length - 1]?.iso;

    // Stars
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      const p = positions[i];
      const r = starRadius(d.count);
      const c = starRGBA(d.lvl);
      const isHover = hoverIdx === i;
      const isSelected = selectedISO === d.iso;
      const isToday = todayISO === d.iso;

      // glow
      if (d.count > 0 || isHover || isSelected) {
        const gR = (isHover || isSelected ? 3.6 : 2.6) * r;
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, gR);
        grd.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${isHover || isSelected ? 0.25 : 0.12})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, gR, 0, Math.PI * 2);
        ctx.fill();
      }

      // body
      const drawR = isHover ? r * 1.35 : isSelected ? r * 1.25 : r;
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${c.a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, drawR, 0, Math.PI * 2);
      ctx.fill();

      // today ring
      if (isToday) {
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 5.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // selected ring
      if (isSelected) {
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 7.2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Hover label
      if (isHover) {
        const label = `${fmtDateShort(d.date)} · ${d.count}`;
        ctx.font = '11px ui-sans-serif, system-ui, -apple-system';
        const m = ctx.measureText(label);
        const bx = clamp(p.x - m.width / 2 - 8, 6, w - (m.width + 16) - 6);
        const by = clamp(p.y - r - 26, 10, height - 26);
        ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
        drawRoundRect(ctx, bx, by, m.width + 16, 20, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'rgba(226, 232, 240, 0.92)';
        ctx.fillText(label, bx + 8, by + 14);
      }
    }
  };

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrap.w, isDark, selectedISO, days]);

  const getHoveredIdx = (mx: number, my: number) => {
    // Old behaviour required the pointer to be very close to a star,
    // which made selection on touchpads / high-DPI screens feel "static".
    // New behaviour snaps to the nearest star if you're reasonably close.
    const arr = posRef.current;
    let bestIdx = -1;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      const dx = mx - p.x;
      const dy = my - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) return -1;
    // Generous threshold so users can reliably hit older days.
    const threshold = starRadius(days[bestIdx]?.count ?? 0) + 18;
    return bestDist <= threshold ? bestIdx : -1;
  };

  const onMove = (mx: number, my: number) => {
    const idx = getHoveredIdx(mx, my);
    if (idx !== hoverIdxRef.current) {
      hoverIdxRef.current = idx;
      onHoverISO(idx >= 0 ? days[idx].iso : null);
      draw();
    }
  };

  return (
    <div ref={wrap.ref} className="w-full">
      <canvas
        ref={canvasRef}
        className="block w-full rounded-2xl border border-white/10 shadow-inner"
        onMouseMove={(e) => {
          const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
          onMove(e.clientX - rect.left, e.clientY - rect.top);
        }}
        onMouseLeave={() => {
          hoverIdxRef.current = -1;
          onHoverISO(null);
          draw();
        }}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
          const idx = getHoveredIdx(e.clientX - rect.left, e.clientY - rect.top);
          if (idx >= 0) onSelectISO(days[idx].iso);
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
          const t = e.touches[0];
          const idx = getHoveredIdx(t.clientX - rect.left, t.clientY - rect.top);
          if (idx >= 0) {
            hoverIdxRef.current = idx;
            onHoverISO(days[idx].iso);
            onSelectISO(days[idx].iso);
            draw();
          }
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
          const t = e.touches[0];
          onMove(t.clientX - rect.left, t.clientY - rect.top);
        }}
      />
    </div>
  );
}

function OrbitCanvas(props: {
  days: DayDatum[];
  isDark: boolean;
  selectedISO: string | null;
  onSelectISO: (iso: string) => void;
  onHoverISO: (iso: string | null) => void;
}) {
  const { days, isDark, selectedISO, onSelectISO, onHoverISO } = props;
  const wrap = useCanvasSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoverIdxRef = useRef(-1);

  const height = 260;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  const draw = () => {
    const canvas = canvasRef.current;
    const w = wrap.w;
    if (!canvas || !w) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bg = ctx.createLinearGradient(0, 0, w, height);
    bg.addColorStop(0, isDark ? 'rgba(2, 6, 23, 0.9)' : 'rgba(2, 6, 23, 0.92)');
    bg.addColorStop(1, isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(15, 23, 42, 0.9)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, height);
    drawStarfield(ctx, w, height, 7);

    const cx = w / 2;
    const cy = height / 2;
    const baseR = Math.min(w, height) * 0.28;
    const maxExtra = Math.min(w, height) * 0.08;
    const maxTh = Math.min(w, height) * 0.08;

    const hoverIdx = hoverIdxRef.current;
    const todayISO = days[days.length - 1]?.iso;

    // faint orbit guide
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
    ctx.stroke();

    // segments
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      const a0 = (-Math.PI / 2) + (i / days.length) * Math.PI * 2;
      const a1 = (-Math.PI / 2) + ((i + 1) / days.length) * Math.PI * 2;
      const t = d.count <= 0 ? 0 : clamp(d.count / 12, 0, 1);
      const r = baseR + t * maxExtra;
      const th = 5 + t * maxTh;
      const c = starRGBA(d.lvl);

      const isHover = hoverIdx === i;
      const isSelected = selectedISO === d.iso;
      const isToday = todayISO === d.iso;

      // glow
      if (d.count > 0 || isHover || isSelected) {
        ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${isHover || isSelected ? 0.25 : 0.14})`;
        ctx.lineWidth = th * 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, r, a0 + 0.01, a1 - 0.01);
        ctx.stroke();
      }

      // arc body
      ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${d.count > 0 ? c.a : 0.18})`;
      ctx.lineWidth = isHover ? th * 1.25 : isSelected ? th * 1.15 : th;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0 + 0.01, a1 - 0.01);
      ctx.stroke();

      // tick dot
      const mid = (a0 + a1) / 2;
      const dx = Math.cos(mid) * (r + th * 0.55);
      const dy = Math.sin(mid) * (r + th * 0.55);
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${d.count > 0 ? 0.85 : 0.25})`;
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, isHover || isSelected ? 2.8 : 2.1, 0, Math.PI * 2);
      ctx.fill();

      // Today marker
      if (isToday) {
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r + th + 8, a0 + 0.02, a1 - 0.02);
        ctx.stroke();
      }

      // Selected marker
      if (isSelected) {
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(cx, cy, r + th + 12, a0 + 0.02, a1 - 0.02);
        ctx.stroke();
      }
    }

    // center label
    const selected = selectedISO ? days.find((d) => d.iso === selectedISO) : null;
    const hover = hoverIdx >= 0 ? days[hoverIdx] : null;
    const d = hover ?? selected ?? days[days.length - 1];
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.92)';
    ctx.font = '600 12px ui-sans-serif, system-ui, -apple-system';
    ctx.fillText('Karma Orbit', cx, cy - 6);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.82)';
    ctx.font = '11px ui-sans-serif, system-ui, -apple-system';
    ctx.fillText(`${fmtDateShort(d.date)} · ${d.count} quests`, cx, cy + 14);
  };

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrap.w, isDark, selectedISO, days]);

  const hitTest = (mx: number, my: number) => {
    const w = wrap.w;
    if (!w) return -1;
    const cx = w / 2;
    const cy = height / 2;
    const dx = mx - cx;
    const dy = my - cy;
    const ang = Math.atan2(dy, dx); // -pi..pi
    // map angle to index (0 at top)
    const a = (ang + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
    const idx = Math.floor((a / (Math.PI * 2)) * days.length);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const baseR = Math.min(w, height) * 0.28;
    // Previously the band was too strict, so Orbit felt "unclickable".
    // Make it more forgiving while still preventing random clicks near the center.
    const minDim = Math.min(w, height);
    const inner = baseR - Math.max(36, minDim * 0.16);
    const outer = baseR + Math.max(92, minDim * 0.30);
    if (dist < inner || dist > outer) return -1;
    return clamp(idx, 0, days.length - 1);
  };

  const onMove = (mx: number, my: number) => {
    const idx = hitTest(mx, my);
    if (idx !== hoverIdxRef.current) {
      hoverIdxRef.current = idx;
      onHoverISO(idx >= 0 ? days[idx].iso : null);
      draw();
    }
  };

  return (
    <div ref={wrap.ref} className="w-full">
      <canvas
        ref={canvasRef}
        className="block w-full rounded-2xl border border-white/10 shadow-inner"
        onMouseMove={(e) => {
          const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
          onMove(e.clientX - rect.left, e.clientY - rect.top);
        }}
        onMouseLeave={() => {
          hoverIdxRef.current = -1;
          onHoverISO(null);
          draw();
        }}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
          const idx = hitTest(e.clientX - rect.left, e.clientY - rect.top);
          if (idx >= 0) onSelectISO(days[idx].iso);
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
          const t = e.touches[0];
          const idx = hitTest(t.clientX - rect.left, t.clientY - rect.top);
          if (idx >= 0) {
            hoverIdxRef.current = idx;
            onHoverISO(days[idx].iso);
            onSelectISO(days[idx].iso);
            draw();
          }
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
          const t = e.touches[0];
          onMove(t.clientX - rect.left, t.clientY - rect.top);
        }}
      />
    </div>
  );
}

export function HabitHeatmap({ quests, days = 30 }: Props) {
  const { isDark, isHinglish } = useTheme();
  const { user } = useAuth();
  const { entries } = useMoodLogUnified();
  const [selectedISO, setSelectedISO] = useState<string | null>(null);
  const [hoveredISO, setHoveredISO] = useState<string | null>(null);
  const [logVersion, setLogVersion] = useState(0);

  // Completion log is stored in localStorage and updated by App.tsx.
  // Listen to an in-app event (same tab) + storage events (other tabs)
  // so the heatmap refreshes immediately without a full reload.
  useEffect(() => {
    const onLocal = () => setLogVersion((v) => v + 1);
    const onStorage = (e: StorageEvent) => {
      const k = e.key || '';
      if (k.startsWith('karmquest_completion_log_v1:')) setLogVersion((v) => v + 1);
    };
    window.addEventListener('kq_completion_log_updated', onLocal as any);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('kq_completion_log_updated', onLocal as any);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  const [mode, setMode] = useState<HeatMode>(() => {
    try {
      const v = localStorage.getItem('kq_heatmap_mode_v1');
      if (v === 'orbit' || v === 'constellation') return v;
      if (v === 'grid' || v === 'chakra') return 'chakra';
    } catch {
      // ignore
    }
    return 'constellation';
  });

  type CompletionEvent = {
    ts: number;
    day: string;
    questId: string;
    title: string;
    category: string;
    difficulty: string;
    xp: number;
    coins: number;
  };

  const completionEvents = useMemo(() => {
    const userId = user?.id ?? null;
    const keys = userId
      ? [`karmquest_completion_log_v1:${userId}`]
      : ['karmquest_completion_log_v1:guest', 'karmquest_completion_log_v1:anon'];

    const out: CompletionEvent[] = [];
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) continue;
        for (const x of parsed as any[]) {
          if (!x) continue;
          const ev: CompletionEvent = {
            ts: typeof x.ts === 'number' ? x.ts : Date.now(),
            day: typeof x.day === 'string' ? x.day : '',
            questId: typeof x.questId === 'string' ? x.questId : '',
            title: typeof x.title === 'string' ? x.title : '',
            category: typeof x.category === 'string' ? x.category : 'Karma',
            difficulty: typeof x.difficulty === 'string' ? x.difficulty : 'easy',
            xp: typeof x.xp === 'number' ? x.xp : 0,
            coins: typeof x.coins === 'number' ? x.coins : 0,
          };
          if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.day) || !ev.questId) continue;
          out.push(ev);
        }
      } catch {
        // ignore
      }
    }
    out.sort((a, b) => a.ts - b.ts);
    return out;
  }, [user?.id, logVersion]);

  const moodByDay = useMemo(() => {
    const map = new Map<string, MoodEntry>();
    for (const e of entries) map.set(e.date, e);
    return map;
  }, [entries]);

  const completionsByDay = useMemo(() => {
    const map = new Map<string, number>();
    const seen = new Set<string>();

    for (const q of quests) {
      const iso = (q.completedAt || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
      map.set(iso, (map.get(iso) ?? 0) + 1);
      seen.add(`${q.id}:${iso}`);
    }

    for (const ev of completionEvents) {
      if (!ev.questId) continue;
      const key = `${ev.questId}:${ev.day}`;
      if (!seen.has(key)) {
        map.set(ev.day, (map.get(ev.day) ?? 0) + 1);
        seen.add(key);
      }
    }

    return map;
  }, [quests, completionEvents]);

  const xpByDay = useMemo(() => {
    const map = new Map<string, number>();
    const seen = new Set<string>();

    for (const q of quests) {
      const iso = (q.completedAt || '').trim();
      if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(iso)) continue;
      const xp = (q.earnedXp ?? q.xpReward ?? 0) as number;
      map.set(iso, (map.get(iso) ?? 0) + xp);
      seen.add(`${q.id}:${iso}`);
    }

    for (const ev of completionEvents) {
      if (!ev.questId) continue;
      const key = `${ev.questId}:${ev.day}`;
      if (!seen.has(key)) {
        map.set(ev.day, (map.get(ev.day) ?? 0) + (ev.xp || 0));
        seen.add(key);
      }
    }

    return map;
  }, [quests, completionEvents]);

  const { startISO, endISO, weeks, cells, monthLabels } = useMemo(() => {
    const today = localMidnight(new Date());
    const endISO = isoFromDate(today);
    const effectiveDays = Math.min(30, Math.max(1, days));
    const start = addDays(today, -(effectiveDays - 1));
    const startISO = isoFromDate(start);

    // Align grid to Monday so columns are full weeks (GitHub-ish).
    // JS getDay(): Sun=0..Sat=6. Convert to Mon=0..Sun=6.
    const dowMon0 = (start.getDay() + 6) % 7;
    const startAligned = addDays(start, -dowMon0);

    // Build date cells from aligned start to today inclusive.
    const all: Array<{ iso: string; inRange: boolean; col: number; row: number; date: Date }> = [];
    const totalDays = Math.floor((today.getTime() - startAligned.getTime()) / 86_400_000) + 1;
    for (let i = 0; i < totalDays; i++) {
      const dt = addDays(startAligned, i);
      const iso = isoFromDate(dt);
      const inRange = iso >= startISO && iso <= endISO;
      const col = Math.floor(i / 7);
      const row = i % 7; // Mon=0..Sun=6 because startAligned is Monday
      all.push({ iso, inRange, col, row, date: dt });
    }

    const weeks = Math.max(1, Math.ceil(totalDays / 7));

    // Month labels above columns (show when the week contains the 1st of the month).
    const monthLabels: Array<{ col: number; label: string }> = [];
    for (let c = 0; c < weeks; c++) {
      const weekStart = addDays(startAligned, c * 7);
      // Find the first in-range day in this week
      let firstInRange: Date | null = null;
      for (let r = 0; r < 7; r++) {
        const d = addDays(weekStart, r);
        const iso = isoFromDate(d);
        if (iso >= startISO && iso <= endISO) {
          firstInRange = d;
          break;
        }
      }
      if (!firstInRange) continue;
      if (firstInRange.getDate() === 1 || c === 0) {
        const label = firstInRange.toLocaleDateString(undefined, { month: 'short' });
        monthLabels.push({ col: c, label });
      }
    }

    return { startISO, endISO, weeks, cells: all, monthLabels };
  }, [days]);

  const effectiveDays = Math.min(30, Math.max(1, days));

  const daysData = useMemo<DayDatum[]>(() => {
    const today = localMidnight(new Date());
    const start = addDays(today, -(effectiveDays - 1));
    const out: DayDatum[] = [];
    for (let i = 0; i < effectiveDays; i++) {
      const dt = addDays(start, i);
      const iso = isoFromDate(dt);
      const count = completionsByDay.get(iso) ?? 0;
      const xp = xpByDay.get(iso) ?? 0;
      const mood = moodByDay.get(iso) ?? null;
      out.push({ iso, date: dt, count, xp, mood, lvl: levelForCount(count) });
    }
    return out;
  }, [effectiveDays, completionsByDay, xpByDay, moodByDay]);

  const stats = useMemo(() => {
    const counts = daysData.map((d) => d.count);
    const total = counts.reduce((a, b) => a + b, 0);
    const activeDays = counts.filter((c) => c > 0).length;
    const totalXP = daysData.reduce((a, b) => a + (b.xp || 0), 0);
    const bestStreak = bestStreakFromCounts(counts);
    const streak = currentStreakFromCounts(counts);
    const consistency = effectiveDays > 0 ? Math.round((activeDays / effectiveDays) * 100) : 0;
    return { total, activeDays, totalXP, bestStreak, streak, consistency };
  }, [daysData, effectiveDays]);

  useEffect(() => {
    try {
      localStorage.setItem('kq_heatmap_mode_v1', mode);
    } catch {
      // ignore
    }
  }, [mode]);

  const selected = useMemo(() => {
    if (!selectedISO) return null;
    const count = completionsByDay.get(selectedISO) ?? 0;
    const mood = moodByDay.get(selectedISO) ?? null;
    const listFromEvents = completionEvents.filter((e) => e.day === selectedISO);
    const listFromQuests = quests.filter((q) => q.completedAt === selectedISO).map((q) => ({
      ts: q.completedAtTs ?? 0,
      day: selectedISO,
      questId: q.id,
      title: q.title,
      category: q.category,
      difficulty: q.difficulty,
      xp: q.earnedXp ?? q.xpReward,
      coins: 0,
    }));
    const list = listFromEvents.length > 0 ? listFromEvents : listFromQuests;
    return { iso: selectedISO, count, mood, list };
  }, [selectedISO, completionsByDay, moodByDay, quests, completionEvents]);

  const hovered = useMemo(() => {
    if (!hoveredISO) return null;
    const count = completionsByDay.get(hoveredISO) ?? 0;
    const xp = xpByDay.get(hoveredISO) ?? 0;
    const mood = moodByDay.get(hoveredISO) ?? null;
    return { iso: hoveredISO, count, xp, mood };
  }, [hoveredISO, completionsByDay, xpByDay, moodByDay]);

  const darkLike = isDark || isHinglish;
  const card = darkLike
    ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] shadow-sm'
    : 'bg-white/80 backdrop-blur-xl border border-slate-200/40 shadow-sm';
  const tp = darkLike ? 'text-slate-200' : 'text-slate-800';
  const ts = darkLike ? 'text-slate-400' : 'text-slate-500';

  const levelClass = (lvl: 0 | 1 | 2 | 3, inRange: boolean) => {
    if (!inRange) return isDark ? 'bg-white/[0.015]' : 'bg-slate-100/30';
    if (lvl === 0) return isDark ? 'bg-white/[0.06]' : 'bg-slate-200/70';

    // Requested GitHub-like palette: yellow -> green -> dark green.
    // Keep it readable in dark mode via opacity.
    if (lvl === 1) return isDark ? 'bg-yellow-400/25' : 'bg-yellow-300/80';
    if (lvl === 2) return isDark ? 'bg-green-400/35' : 'bg-green-400/80';
    return isDark ? 'bg-green-500/60' : 'bg-green-700/85';
  };

  const title = isHinglish ? 'Habit Heatmap (30 din)' : 'Habit Heatmap (Last 30 days)';

  const pill = 'text-[11px] font-semibold px-3 py-1.5 rounded-xl border transition-all select-none';
  const pillOn = isDark
    ? 'bg-white/[0.06] border-white/[0.10] text-slate-100'
    : 'bg-slate-900 text-white border-slate-900/20';
  const pillOff = isDark
    ? 'bg-white/[0.02] border-white/[0.08] text-slate-300 hover:bg-white/[0.04]'
    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';

  return (
    <div
      className={`${card} rounded-2xl p-4 sm:p-5 [--hq-cell:10px] sm:[--hq-cell:12px] md:[--hq-cell:13px] [--hq-gap:5px]`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className={`text-sm font-semibold ${tp} flex items-center gap-2`}>
            <span className="text-base">🗓️</span>
            <span className="truncate">{title}</span>
          </h3>
          <div className={`mt-1 text-[10px] ${ts} flex items-center gap-2`}>
            <span className="whitespace-nowrap">{startISO} → {endISO}</span>
            <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>•</span>
            <span className="whitespace-nowrap">{effectiveDays} days</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('constellation')}
              className={`${pill} ${mode === 'constellation' ? pillOn : pillOff}`}
              title="Constellation"
            >
              ✨ Constellation
            </button>
            <button
              type="button"
              onClick={() => setMode('orbit')}
              className={`${pill} ${mode === 'orbit' ? pillOn : pillOff}`}
              title="Orbit"
            >
              🪐 Orbit
            </button>
            <button
              type="button"
              onClick={() => setMode('chakra')}
              className={`${pill} ${mode === 'chakra' ? pillOn : pillOff}`}
              title="Chakra Rings"
            >
              ☸ Chakra
            </button>
          </div>

          <div className={`text-[10px] font-semibold ${ts} flex items-center gap-2`}>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>0</span>
            <span className={`inline-block w-3 h-3 rounded ${levelClass(0, true)}`} />
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>1–5</span>
            <span className={`inline-block w-3 h-3 rounded ${levelClass(1, true)}`} />
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>6–10</span>
            <span className={`inline-block w-3 h-3 rounded ${levelClass(2, true)}`} />
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>11+</span>
            <span className={`inline-block w-3 h-3 rounded ${levelClass(3, true)}`} />
          </div>
        </div>
      </div>

      {mode === 'chakra' ? (
        <div className="mt-4 flex flex-col md:flex-row items-center justify-center gap-8 py-4 animate-fade-in">
          <div className="relative w-64 h-64 shrink-0">
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-sm">
              {/* Background rings */}
              {Array.from({ length: weeks }).map((_, w) => {
                const rIn = 35 + w * 14;
                const rOut = rIn + 11;
                return (
                  <circle
                    key={`bg-${w}`}
                    cx="100" cy="100"
                    r={(rIn + rOut) / 2}
                    strokeWidth="11"
                    fill="none"
                    stroke={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}
                  />
                );
              })}
              {/* Segmented active days */}
              {cells.map((c) => {
                const count = c.inRange ? (completionsByDay.get(c.iso) ?? 0) : 0;
                const isHover = hoveredISO === c.iso;
                const isSelected = selectedISO === c.iso;
                const rIn = 35 + c.col * 14;
                const rOut = rIn + 11;
                const a0 = -Math.PI / 2 + (c.row / 7) * Math.PI * 2;
                const a1 = -Math.PI / 2 + ((c.row + 1) / 7) * Math.PI * 2;

                const pad = 0.04;
                const start = a0 + pad / 2;
                const end = a1 - pad / 2;
                if (end <= start) return null;

                const x1 = 100 + rIn * Math.cos(start);
                const y1 = 100 + rIn * Math.sin(start);
                const x2 = 100 + rOut * Math.cos(start);
                const y2 = 100 + rOut * Math.sin(start);
                const x3 = 100 + rOut * Math.cos(end);
                const y3 = 100 + rOut * Math.sin(end);
                const x4 = 100 + rIn * Math.cos(end);
                const y4 = 100 + rIn * Math.sin(end);
                const largeArc = end - start > Math.PI ? 1 : 0;
                const d = `M ${x1} ${y1} L ${x2} ${y2} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x3} ${y3} L ${x4} ${y4} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x1} ${y1} Z`;

                let fill = 'transparent';
                if (c.inRange) {
                  const lvl = levelForCount(count);
                  if (lvl === 0) fill = isDark ? 'rgba(251, 146, 60, 0.06)' : 'rgba(251, 146, 60, 0.12)';
                  else if (lvl === 1) fill = isDark ? '#FDE047' : '#FDE047'; // yellow
                  else if (lvl === 2) fill = isDark ? '#FB923C' : '#F97316'; // orange
                  else fill = isDark ? '#EA580C' : '#C2410C'; // dark orange
                }

                return (
                  <path
                    key={c.iso}
                    d={d}
                    fill={fill}
                    className="transition-all duration-300 cursor-pointer outline-none"
                    style={{
                      transformOrigin: '100px 100px',
                      transform: isHover || isSelected ? 'scale(1.04)' : 'scale(1)',
                      filter: (isHover || isSelected) && c.inRange ? 'brightness(1.15) drop-shadow(0 2px 4px rgba(251,146,60,0.3))' : 'none',
                      zIndex: isHover || isSelected ? 10 : 1 // SVG z-index requires DOM order unless using filter hacks
                    }}
                    onMouseEnter={() => {
                      if (c.inRange) setHoveredISO(c.iso);
                    }}
                    onMouseLeave={() => {
                      if (c.inRange && hoveredISO === c.iso) setHoveredISO(null);
                    }}
                    onClick={() => {
                      if (c.inRange) setSelectedISO(cur => cur === c.iso ? null : c.iso);
                    }}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-3xl font-serif font-bold" style={{ color: isDark ? '#FB923C' : '#EA580C' }}>
                {stats.total}
              </div>
              <div className={`text-[10px] font-bold tracking-widest uppercase mt-0.5 ${ts}`}>
                Quests
              </div>
            </div>
          </div>

          <div className="flex sm:hidden w-full px-4 items-center justify-center text-[11px] uppercase tracking-widest text-[#EA580C]">
            <span className="opacity-70">← Tap a ring segment →</span>
          </div>

          <div className="hidden sm:flex flex-col flex-1 w-full max-w-[280px]">
            <div className={`text-[11px] font-bold uppercase tracking-widest mb-4`} style={{ color: isDark ? '#F97316' : '#C2410C', opacity: 0.8 }}>
              Weekly Breakdown
            </div>
            <div className="space-y-3.5">
              {Array.from({ length: weeks }).map((_, w) => {
                const wCells = cells.filter(c => c.col === w && c.inRange);
                const wSum = wCells.reduce((acc, c) => acc + (completionsByDay.get(c.iso) ?? 0), 0);
                const maxW = Math.max(1, ...Array.from({ length: weeks }).map((_, maxWait) =>
                  cells.filter(cx => cx.col === maxWait && cx.inRange).reduce((acc, cx) => acc + (completionsByDay.get(cx.iso) ?? 0), 0)
                ));
                const pct = Math.max(0, Math.min(100, (wSum / maxW) * 100));

                return (
                  <div key={w} className="flex items-center gap-3 text-[11px] font-semibold">
                    <div className="w-8" style={{ color: isDark ? '#FDBA74' : '#9A3412', opacity: 0.7 }}>Wk{w + 1}</div>
                    <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${pct}%`,
                          background: isDark ? 'linear-gradient(to right, #FB923C, #FDE047)' : 'linear-gradient(to right, #EA580C, #F59E0B)'
                        }}
                      />
                    </div>
                    <div className="w-6 text-right font-bold" style={{ color: isDark ? '#FB923C' : '#EA580C' }}>
                      {wSum}
                    </div>
                  </div>
                );
              }).reverse()}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          {mode === 'constellation' ? (
            <ConstellationCanvas
              days={daysData}
              isDark={isDark}
              selectedISO={selectedISO}
              onSelectISO={(iso) => setSelectedISO((cur) => (cur === iso ? null : iso))}
              onHoverISO={(iso) => setHoveredISO(iso)}
            />
          ) : (
            <OrbitCanvas
              days={daysData}
              isDark={isDark}
              selectedISO={selectedISO}
              onSelectISO={(iso) => setSelectedISO((cur) => (cur === iso ? null : iso))}
              onHoverISO={(iso) => setHoveredISO(iso)}
            />
          )}

          {/* Month axis (constellation only) */}
          {mode === 'constellation' ? (
            <div className={`mt-2 px-1.5 flex items-center gap-2 overflow-hidden ${ts} text-[10px] select-none`} aria-hidden>
              {(() => {
                const ticks = monthTicksForDays(daysData);
                return ticks.map((m, idx) => {
                  const end = idx + 1 < ticks.length ? ticks[idx + 1].start : daysData.length;
                  const flex = Math.max(1, end - m.start);
                  return (
                    <div
                      key={`${m.label}-${idx}`}
                      className="text-center uppercase tracking-wider"
                      style={{ flex }}
                    >
                      {m.label}
                    </div>
                  );
                });
              })()}
            </div>
          ) : null}

          {/* Quick detail + summary */}
          <div
            className={`mt-3 rounded-2xl p-3 sm:p-4 border ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-slate-50/60 border-slate-200/50'
              }`}
          >
            {(() => {
              const previewISO = hovered?.iso ?? selected?.iso ?? endISO;
              const previewDate = new Date(previewISO + 'T00:00:00');
              const previewCount = hovered?.count ?? selected?.count ?? (completionsByDay.get(previewISO) ?? 0);
              const previewXP = hovered?.xp ?? (xpByDay.get(previewISO) ?? 0);
              const previewMood = hovered?.mood ?? selected?.mood ?? (moodByDay.get(previewISO) ?? null);

              return (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <div className={`text-[12px] font-semibold ${tp}`}>{fmtDateLong(previewDate)}</div>
                      <div className={`text-[11px] mt-1 ${ts}`}>
                        {previewCount} quest{previewCount === 1 ? '' : 's'} completed
                        {previewMood ? ` · Mood ${moodEmoji(previewMood.mood)} · Productivity ${previewMood.productivity}` : ''}
                        {hovered ? ' · (hover)' : ''}
                      </div>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      <div className="text-center min-w-[90px]">
                        <div className={`text-[18px] font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>{stats.streak}</div>
                        <div className={`text-[10px] ${ts} uppercase tracking-wider`}>streak</div>
                      </div>
                      <div className="text-center min-w-[90px]">
                        <div className={`text-[18px] font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{previewXP}</div>
                        <div className={`text-[10px] ${ts} uppercase tracking-wider`}>xp</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className={`rounded-xl px-3 py-2 text-center border ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200/60 bg-white/70'}`}>
                      <div className={`text-[14px] font-semibold ${tp}`}>{stats.total}</div>
                      <div className={`text-[10px] ${ts} uppercase tracking-wider`}>total quests</div>
                    </div>
                    <div className={`rounded-xl px-3 py-2 text-center border ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200/60 bg-white/70'}`}>
                      <div className={`text-[14px] font-semibold ${tp}`}>{stats.activeDays}</div>
                      <div className={`text-[10px] ${ts} uppercase tracking-wider`}>active days</div>
                    </div>
                    <div className={`rounded-xl px-3 py-2 text-center border ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200/60 bg-white/70'}`}>
                      <div className={`text-[14px] font-semibold ${tp}`}>{stats.consistency}%</div>
                      <div className={`text-[10px] ${ts} uppercase tracking-wider`}>consistency</div>
                    </div>
                    <div className={`rounded-xl px-3 py-2 text-center border ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200/60 bg-white/70'}`}>
                      <div className={`text-[14px] font-semibold ${tp}`}>{stats.bestStreak}</div>
                      <div className={`text-[10px] ${ts} uppercase tracking-wider`}>best streak</div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Selected day detail */}
      {selected ? (
        <div
          className={`mt-4 rounded-2xl p-3 sm:p-4 ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50/60'} border ${isDark ? 'border-white/[0.06]' : 'border-slate-200/50'
            }`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div>
              <div className={`text-[12px] font-semibold ${tp}`}>
                {new Date(selected.iso + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className={`text-[11px] mt-1 ${ts}`}>
                {selected.count} quest{selected.count === 1 ? '' : 's'} completed
                {selected.mood ? ` · Mood ${moodEmoji(selected.mood.mood)} · Productivity ${selected.mood.productivity}` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedISO(null)}
              className={`self-start sm:self-auto text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all border ${isHinglish
                ? 'text-indigo-500 border-indigo-200/40 hover:bg-indigo-50'
                : isDark
                  ? 'text-indigo-300 border-white/[0.08] hover:bg-white/[0.04]'
                  : 'text-indigo-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
              {isHinglish ? 'Band' : 'Close'}
            </button>
          </div>

          <div className="mt-3">
            {selected.list.length === 0 ? (
              <div className={`text-[11px] ${ts}`}>{isHinglish ? 'Koi completion nahi.' : 'No completions logged.'}</div>
            ) : (
              <div className="space-y-1.5">
                {selected.list.slice(0, 10).map((q: any, idx: number) => {
                  return (
                    <div
                      key={(q.questId || q.id || idx) + ':' + idx}
                      className={`text-[12px] ${tp} flex items-start gap-2`}
                    >
                      <span className="text-[12px] mt-0.5">✅</span>
                      <div className="min-w-0">
                        <div className="truncate">{q.title}</div>
                        <div className={`text-[10px] mt-0.5 ${ts} flex flex-wrap items-center gap-1.5`}>
                          <span className={`px-2 py-0.5 rounded-lg border ${isDark ? 'border-white/[0.06]' : 'border-slate-200/60'}`}>
                            {q.category || 'Karma'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg border ${isDark ? 'border-white/[0.06]' : 'border-slate-200/60'}`}>
                            {q.difficulty || 'easy'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {selected.list.length > 10 ? (
                  <div className={`text-[10px] ${ts}`}>+{selected.list.length - 10} more…</div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
