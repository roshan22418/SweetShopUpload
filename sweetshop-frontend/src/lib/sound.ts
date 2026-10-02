let audioCtx: AudioContext | null = null;

export function playPopSound() {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx ??= new AudioContextClass();
    const ctx = audioCtx;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
  } catch {
    // Audio can be blocked (autoplay policy, unsupported browser) — sound is non-critical, fail silently.
  }
}
