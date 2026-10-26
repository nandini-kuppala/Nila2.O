// The sounds Nila can try. All generated in the browser except the parent's own
// recorded voice. Every one starts gently, because a sound that startles a baby
// defeats the point.

export const SOUNDS = {
  'white-noise': { name: 'White noise', tone: 'blue', icon: 'note' },
  humming: { name: 'Humming', tone: 'teal', icon: 'lullaby' },
  voice: { name: 'Your voice', tone: 'pink', icon: 'mic' },
};
export const soundName = (id) => SOUNDS[id]?.name || id;

// Brahms' Lullaby (public domain), an octave down so the hum stays under 300 Hz,
// well below a baby's cry. [midi note, beats]
const LULLABY = [
  [52, 0.5], [52, 0.5], [55, 2], [52, 0.5], [52, 0.5], [55, 2],
  [52, 0.5], [55, 0.5], [60, 1], [59, 1.5], [57, 0.5], [57, 1], [55, 2],
  [50, 0.5], [52, 0.5], [53, 1], [50, 1], [50, 0.5], [52, 0.5], [53, 2],
  [50, 0.5], [53, 0.5], [59, 0.5], [57, 0.5], [55, 1], [59, 1], [60, 2.5],
];
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function fadeIn(ctx, gain, target, seconds) {
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(target, ctx.currentTime + seconds);
}
function fadeOutAndStop(ctx, gain, nodes) {
  const t = ctx.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  setTimeout(() => nodes.forEach((n) => { try { n.stop?.(); n.disconnect(); } catch {} }), 900);
}

function whiteNoise(ctx, out) {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const soft = ctx.createBiquadFilter();
  soft.type = 'lowpass';
  soft.frequency.value = 2400;
  const g = ctx.createGain();
  fadeIn(ctx, g, 0.35, 1.5);
  src.connect(soft).connect(g).connect(out);
  src.start();
  return { stop: () => fadeOutAndStop(ctx, g, [src, soft, g]) };
}

function humming(ctx, out) {
  const g = ctx.createGain();
  fadeIn(ctx, g, 0.5, 1);
  g.connect(out);
  const beat = 0.62;
  let next = ctx.currentTime + 0.1;
  let i = 0;
  let stopped = false;
  const voices = [];

  function note(midi, start, dur) {
    const f = hz(midi);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(0.5, start + 0.12);
    env.gain.setValueAtTime(0.5, start + dur * 0.7);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    env.connect(g);
    const vib = ctx.createOscillator();
    vib.frequency.value = 5;
    const vibAmt = ctx.createGain();
    vibAmt.gain.value = f * 0.006;
    vib.connect(vibAmt);
    [[1, 1], [2, 0.15], [3, 0.05]].forEach(([k, a]) => {
      const o = ctx.createOscillator();
      o.frequency.value = f * k;
      vibAmt.connect(o.frequency);
      const ga = ctx.createGain();
      ga.gain.value = a;
      o.connect(ga).connect(env);
      o.start(start);
      o.stop(start + dur + 0.05);
      voices.push(o);
    });
    vib.start(start);
    vib.stop(start + dur + 0.05);
  }

  const timer = setInterval(() => {
    if (stopped) return;
    while (next < ctx.currentTime + 1.5) {
      const [m, beats] = LULLABY[i % LULLABY.length];
      const dur = beats * beat;
      note(m, next, dur * 0.98);
      next += dur;
      i++;
      if (i % LULLABY.length === 0) next += 1.2; // a breath before it starts again
    }
  }, 200);

  return {
    stop() {
      stopped = true;
      clearInterval(timer);
      fadeOutAndStop(ctx, g, [g]);
      setTimeout(() => voices.forEach((o) => { try { o.stop(); } catch {} }), 900);
    },
  };
}

function voice(ctx, out, buffer) {
  const g = ctx.createGain();
  fadeIn(ctx, g, 0.9, 0.6);
  g.connect(out);
  let src = null;
  let stopped = false;
  const play = () => {
    if (stopped) return;
    src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(g);
    src.onended = () => setTimeout(play, 1500);
    src.start();
  };
  play();
  return {
    stop() {
      stopped = true;
      fadeOutAndStop(ctx, g, [g]);
      try { src?.stop(); } catch {}
    },
  };
}

/** Start a soothing sound into `out`. Returns { stop() }. */
export function playSound(ctx, id, out, { voiceBuffer } = {}) {
  if (id === 'white-noise') return whiteNoise(ctx, out);
  if (id === 'humming') return humming(ctx, out);
  if (id === 'voice' && voiceBuffer) return voice(ctx, out, voiceBuffer);
  return { stop() {} };
}

/** A short two-tone alarm, high enough (988/1319 Hz) that the ear never mistakes it for a cry. */
export function alarm(ctx) {
  const g = ctx.createGain();
  g.gain.value = 0.25;
  g.connect(ctx.destination);
  let stopped = false;
  let next = ctx.currentTime + 0.05;
  const timer = setInterval(() => {
    if (stopped) return;
    while (next < ctx.currentTime + 1) {
      [988, 1319].forEach((f, k) => {
        const o = ctx.createOscillator();
        o.frequency.value = f;
        const e = ctx.createGain();
        const s = next + k * 0.22;
        e.gain.setValueAtTime(0.0001, s);
        e.gain.exponentialRampToValueAtTime(1, s + 0.02);
        e.gain.exponentialRampToValueAtTime(0.0001, s + 0.2);
        o.connect(e).connect(g);
        o.start(s);
        o.stop(s + 0.22);
      });
      next += 0.9;
    }
  }, 150);
  return {
    stop() {
      stopped = true;
      clearInterval(timer);
      g.gain.setValueAtTime(0, ctx.currentTime);
      setTimeout(() => g.disconnect(), 300);
    },
  };
}
