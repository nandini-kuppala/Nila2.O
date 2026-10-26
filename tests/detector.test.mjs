import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyseFrame, pitch, CryWindow, NoiseFloor } from '../js/monitor/detector.js';

const SR = 48000;
const N = 2048;

// A cry-like frame: a buzzy source at f0 with a boosted 2nd and 3rd harmonic,
// like the formants of a newborn's cry.
function cryFrame(f0, amp = 0.2, phase = 0) {
  const x = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR + phase;
    let v = 0;
    for (let k = 1; k <= 8; k++) v += (k === 2 ? 1.2 : k === 3 ? 0.8 : 1 / k) * Math.sin(2 * Math.PI * f0 * k * t);
    x[i] = amp * v * 0.4;
  }
  return x;
}
function hum(f0, amp = 0.2) {
  const x = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    x[i] = amp * (Math.sin(2 * Math.PI * f0 * t) + 0.15 * Math.sin(4 * Math.PI * f0 * t) + 0.05 * Math.sin(6 * Math.PI * f0 * t));
  }
  return x;
}
function noise(amp = 0.2, seed = 1) {
  let s = seed;
  const x = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    s = (s * 16807) % 2147483647;
    x[i] = amp * ((s / 2147483647) * 2 - 1);
  }
  return x;
}
const FLOOR = -60;

test('pitch finds the fundamental of a cry, not an octave away', () => {
  for (const f0 of [380, 450, 520, 600]) {
    const { hz, clarity } = pitch(cryFrame(f0), SR);
    assert.ok(Math.abs(hz - f0) < f0 * 0.04, `expected ~${f0}, got ${hz.toFixed(1)}`);
    assert.ok(clarity > 0.8);
  }
});

test('a loud cry-pitched frame counts as crying', () => {
  for (const f0 of [400, 500, 580]) {
    const f = analyseFrame(cryFrame(f0), SR, FLOOR);
    assert.equal(f.cry, true, `f0 ${f0}: ${JSON.stringify(f)}`);
    assert.ok(f.level > 0);
  }
});

test('white noise is loud but not a cry', () => {
  const f = analyseFrame(noise(0.3), SR, FLOOR);
  assert.equal(f.loud, true);
  assert.equal(f.cry, false);
});

test('humming at 130-260 Hz is read at its own pitch and is not a cry', () => {
  for (const f0 of [131, 175, 220, 262]) {
    const f = analyseFrame(hum(f0), SR, FLOOR);
    assert.equal(f.cry, false, `hum ${f0}: hz ${f.hz.toFixed(1)}`);
    assert.ok(Math.abs(f.hz - f0) < f0 * 0.05, `hum ${f0} read as ${f.hz.toFixed(1)}`);
  }
});

test('a quiet room is not loud', () => {
  const f = analyseFrame(cryFrame(500, 0.0005), SR, FLOOR);
  assert.equal(f.loud, false);
  assert.equal(f.cry, false);
});

test('the noise floor follows a quiet room down and does not chase a cry up', () => {
  const nf = new NoiseFloor(-40);
  for (let i = 0; i < 50; i++) nf.update(analyseFrame(noise(0.001), SR, nf.db));
  assert.ok(nf.db < -50, `floor ${nf.db}`);
  const before = nf.db;
  for (let i = 0; i < 400; i++) nf.update(analyseFrame(cryFrame(500), SR, nf.db));
  assert.ok(nf.db - before < 1, 'floor must not climb during a cry');
});

test('the window reports the share of crying frames', () => {
  const w = new CryWindow(3000);
  for (let t = 0; t <= 3000; t += 50) w.push(t, { cry: t % 100 === 0, level: t % 100 === 0 ? 0.8 : 0 });
  assert.ok(w.full);
  assert.ok(Math.abs(w.score() - 0.5) < 0.05);
  assert.ok(Math.abs(w.level() - 0.4) < 0.05);
});

test('a cry still counts with a bedside lullaby playing under it', () => {
  const c = cryFrame(500, 0.2);
  const h = hum(196, 0.2 * 0.12);
  const mix = c.map((v, i) => v + h[i]);
  assert.equal(analyseFrame(mix, SR, FLOOR).cry, true);
});
