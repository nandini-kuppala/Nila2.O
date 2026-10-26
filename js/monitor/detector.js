// The ear. Twenty times a second it is handed ~40 ms of sound and asks two
// questions: is it loud compared with the room, and does it have a steady pitch
// in a baby's range? A frame that is both counts as crying.
//
// This is a rule, not a trained model, and it says so in the UI. It is enough to
// tell a cry from white noise (no pitch), humming and adult talk (pitch below
// 300 Hz) and a quiet room (not loud).

export const DETECTOR = {
  searchMinHz: 70,     // pitch search range: wide, so a hum is found at its real pitch
  searchMaxHz: 1000,
  cryMinHz: 300,       // infant cry fundamentals sit around 350-600 Hz
  cryMaxHz: 750,
  minClarity: 0.45,    // how periodic the frame must be to count as voiced
  loudAboveFloorDb: 12,
  absMinDb: -58,
  windowMs: 3000,
};

export function rmsDb(x) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  const r = Math.sqrt(s / x.length);
  return r > 0 ? 20 * Math.log10(r) : -120;
}

/**
 * Pitch by normalised autocorrelation. Returns the first strong peak (within 90%
 * of the best) so a cry is read at its fundamental rather than an octave below.
 */
export function pitch(input, sampleRate, minHz = DETECTOR.searchMinHz, maxHz = DETECTOR.searchMaxHz) {
  let x = input;
  let sr = sampleRate;
  if (sr > 30000) {
    // Halve the work: average pairs. Everything we care about is under 5 kHz.
    const n = x.length >> 1;
    const d = new Float32Array(n);
    for (let i = 0; i < n; i++) d[i] = (x[2 * i] + x[2 * i + 1]) * 0.5;
    x = d;
    sr /= 2;
  }
  const N = x.length;
  const minLag = Math.max(2, Math.floor(sr / maxHz));
  const maxLag = Math.min(Math.floor(N / 2), Math.ceil(sr / minHz));
  const W = N - maxLag;
  if (W < 32 || maxLag <= minLag + 2) return { hz: 0, clarity: 0 };

  let e0 = 0;
  for (let i = 0; i < W; i++) e0 += x[i] * x[i];
  let eLag = 0;
  for (let i = 0; i < W; i++) eLag += x[i + minLag] * x[i + minLag];

  const r = new Float32Array(maxLag + 2);
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0;
    for (let i = 0; i < W; i++) c += x[i] * x[i + lag];
    const v = c / Math.sqrt(e0 * eLag + 1e-12);
    r[lag] = v;
    if (v > best) best = v;
    // slide the energy window one sample to the right for the next lag
    const out = x[lag];
    const inn = x[W + lag] ?? 0;
    eLag += inn * inn - out * out;
  }
  if (best <= 0) return { hz: 0, clarity: 0 };

  let chosen = -1;
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (r[lag] >= 0.9 * best && r[lag] >= r[lag - 1] && r[lag] >= r[lag + 1]) {
      chosen = lag;
      break;
    }
  }
  if (chosen < 0) return { hz: 0, clarity: 0 };

  // parabolic interpolation around the peak for a finer pitch
  const a = r[chosen - 1], b = r[chosen], c = r[chosen + 1];
  const denom = a - 2 * b + c;
  const shift = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
  return { hz: sr / (chosen + shift), clarity: b };
}

/** One frame → what the ear makes of it. */
export function analyseFrame(timeDomain, sampleRate, floorDb) {
  const db = rmsDb(timeDomain);
  const loud = db > floorDb + DETECTOR.loudAboveFloorDb && db > DETECTOR.absMinDb;
  let hz = 0;
  let clarity = 0;
  if (loud) ({ hz, clarity } = pitch(timeDomain, sampleRate));
  const voiced = clarity >= DETECTOR.minClarity;
  const cry = loud && voiced && hz >= DETECTOR.cryMinHz && hz <= DETECTOR.cryMaxHz;
  const ref = Math.max(floorDb + DETECTOR.loudAboveFloorDb, DETECTOR.absMinDb);
  const level = cry ? Math.min(1, Math.max(0, (db - ref) / 45)) : 0;
  return { db, hz, clarity, loud, voiced, cry, level };
}

/** The quiet-room level. Falls quickly, rises slowly, and never rises on a cry. */
export class NoiseFloor {
  constructor(initialDb = -60) {
    this.db = initialDb;
  }
  update(frame) {
    if (frame.db < this.db) this.db = this.db * 0.7 + frame.db * 0.3;
    else if (!frame.voiced) this.db += Math.min(0.05, (frame.db - this.db) * 0.01);
    this.db = Math.min(-25, Math.max(-75, this.db));
    return this.db;
  }
}

/** The last few seconds of frames: what share was crying, and how loud. */
export class CryWindow {
  constructor(ms = DETECTOR.windowMs) {
    this.ms = ms;
    this.frames = [];
  }
  push(t, frame) {
    this.frames.push({ t, cry: frame.cry, level: frame.level });
    while (this.frames.length && this.frames[0].t < t - this.ms) this.frames.shift();
  }
  get full() {
    const f = this.frames;
    return f.length > 1 && f[f.length - 1].t - f[0].t >= this.ms * 0.9;
  }
  score() {
    if (!this.frames.length) return 0;
    let n = 0;
    for (const f of this.frames) if (f.cry) n++;
    return n / this.frames.length;
  }
  level() {
    if (!this.frames.length) return 0;
    let s = 0;
    for (const f of this.frames) s += f.level;
    return s / this.frames.length;
  }
  reset() {
    this.frames = [];
  }
}
