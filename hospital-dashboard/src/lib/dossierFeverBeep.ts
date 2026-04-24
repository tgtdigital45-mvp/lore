const FEVER_BEEP_TOTAL_S = 5;
const PULSE_S = 0.18;
const GAP_S = 0.12;
const CYCLE = PULSE_S + GAP_S;

/**
 * Série de bips (880 Hz) no total de ~5 s. Requer `AudioContext` resumido.
 */
export function playFeverBeepOnContext(ctx: AudioContext): void {
  const base = ctx.currentTime;
  let t = 0;
  while (t + PULSE_S <= FEVER_BEEP_TOTAL_S + 1e-6) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, base + t);
    g.gain.setValueAtTime(0.12, base + t);
    g.gain.exponentialRampToValueAtTime(0.01, base + t + PULSE_S);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(base + t);
    o.stop(base + t + PULSE_S);
    t += CYCLE;
  }
}

export function getOrCreateAudioContext(): AudioContext {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new AC();
}
