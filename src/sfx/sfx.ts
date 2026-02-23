// Lightweight, asset-free SFX using the Web Audio API.
// Designed to be subtle and “Habitica-like” without bundling audio files.

export type SfxName = 'coin' | 'levelUp' | 'achievement';

type Note = {
  freq: number;        // Hz
  startMs: number;     // relative
  durMs: number;
  type?: OscillatorType;
  gain?: number;       // 0..1
};

class SfxManager {
  private ctx: AudioContext | null = null;
  private cooldown: Record<SfxName, number> = {
    coin: 0,
    levelUp: 0,
    achievement: 0,
  };

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!this.ctx) this.ctx = new AC();
    return this.ctx;
  }

  private async ensureRunning(ctx: AudioContext) {
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Ignore — some browsers block resume without user gesture.
      }
    }
  }

  private playNotes(notes: Note[], masterGain = 0.18) {
    const ctx = this.getContext();
    if (!ctx) return;

    // Don't play when tab is hidden.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    // Fire & forget.
    void this.ensureRunning(ctx);

    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = masterGain;
    out.connect(ctx.destination);

    for (const n of notes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      osc.type = n.type ?? 'sine';
      osc.frequency.value = n.freq;

      const t0 = now + n.startMs / 1000;
      const t1 = t0 + n.durMs / 1000;

      const peak = Math.max(0, Math.min(1, n.gain ?? 0.9));
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t1);

      osc.connect(g);
      g.connect(out);

      osc.start(t0);
      osc.stop(t1 + 0.02);
    }

    // Cleanup
    out.gain.setValueAtTime(masterGain, now);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    setTimeout(() => {
      try {
        out.disconnect();
      } catch {
        /* noop */
      }
    }, 1400);
  }

  play(name: SfxName, enabled: boolean) {
    if (!enabled) return;

    const now = Date.now();
    // Small cooldown to avoid spam when multiple state updates happen together.
    const minGap = name === 'coin' ? 120 : 250;
    if (now - this.cooldown[name] < minGap) return;
    this.cooldown[name] = now;

    if (name === 'coin') {
      // Coin jingle: quick upward blips
      this.playNotes(
        [
          { freq: 880, startMs: 0, durMs: 70, type: 'triangle', gain: 0.55 },
          { freq: 988, startMs: 60, durMs: 70, type: 'triangle', gain: 0.55 },
          { freq: 1175, startMs: 120, durMs: 95, type: 'sine', gain: 0.45 },
        ],
        0.16
      );
      return;
    }

    if (name === 'levelUp') {
      // Chime: arpeggio + gentle tail
      this.playNotes(
        [
          { freq: 523.25, startMs: 0, durMs: 120, type: 'sine', gain: 0.55 }, // C5
          { freq: 659.25, startMs: 110, durMs: 150, type: 'sine', gain: 0.5 }, // E5
          { freq: 783.99, startMs: 240, durMs: 220, type: 'sine', gain: 0.45 }, // G5
          { freq: 1046.5, startMs: 420, durMs: 320, type: 'triangle', gain: 0.35 }, // C6
        ],
        0.17
      );
      return;
    }

    // Temple bell: longer decay, lower pitch + shimmer
    this.playNotes(
      [
        { freq: 392.0, startMs: 0, durMs: 650, type: 'triangle', gain: 0.35 },
        { freq: 784.0, startMs: 0, durMs: 420, type: 'sine', gain: 0.12 },
        { freq: 1176.0, startMs: 40, durMs: 380, type: 'sine', gain: 0.08 },
      ],
      0.15
    );
  }
}

export const sfx = new SfxManager();
