// All sound is synthesised with WebAudio — no audio files, no network.
// Each effect is one small oscillator blip; the pickup pitch climbs with
// the combo so a hot streak sounds like one.
export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g).connect(c.destination);
      o.start();
      o.stop(c.currentTime + dur);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() { return muted; },
    click() { tone(660, 0.07, 'triangle', 0.12); },
    pickup(combo) {
      const base = 520 * Math.pow(1.059, Math.min(combo, 24));
      tone(base, 0.12, 'sine', 0.16, base * 1.5);
    },
    dash() { tone(220, 0.18, 'sawtooth', 0.08, 520); },
    hit() {
      tone(160, 0.3, 'square', 0.16, 55);
      tone(90, 0.35, 'sawtooth', 0.12, 40);
    },
    wispDown() { tone(340, 0.15, 'triangle', 0.12, 120); },
    powerup() {
      tone(523, 0.1, 'sine', 0.14);
      setTimeout(() => tone(784, 0.14, 'sine', 0.14), 90);
    },
    level() {
      [523, 659, 784, 1046].forEach((f, i) =>
        setTimeout(() => tone(f, 0.16, 'triangle', 0.13), i * 80));
    },
    win() {
      [523, 659, 784, 1046, 1318].forEach((f, i) =>
        setTimeout(() => tone(f, 0.22, 'triangle', 0.13), i * 110));
    },
    over() {
      [392, 330, 262, 196].forEach((f, i) =>
        setTimeout(() => tone(f, 0.28, 'sawtooth', 0.1), i * 140));
    },
  };
}
