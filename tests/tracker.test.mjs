import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tracker, createAlerter, inZone, GRID_W, GRID_H, DEFAULT_ZONE } from '../js/watch/tracker.js';

// A plain cot (grey 120) with a darker blob for the baby at (cx, cy) in grid cells.
function frame(cx, cy, { shift = 0, r = 4 } = {}) {
  const g = new Float32Array(GRID_W * GRID_H);
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const stripe = ((x + shift) % 8 < 2) ? 60 : 120; // cot bars, so a shifted view really looks different
      g[y * GRID_W + x] = (x - cx) ** 2 + (y - cy) ** 2 <= r * r ? 230 : stripe;
    }
  }
  return g;
}

test('the tracker finds where the baby moved to', () => {
  const t = new Tracker();
  t.update(frame(-20, -20)); // empty cot
  const r = t.update(frame(32, 24));
  assert.ok(r.fg > 0.01);
  assert.ok(Math.abs(r.centroid.x - 32.5 / GRID_W) < 0.03);
  assert.ok(Math.abs(r.centroid.y - 24.5 / GRID_H) < 0.03);
});

test('a jumped view reads as the phone being moved', () => {
  const t = new Tracker();
  t.update(frame(32, 24));
  const r = t.update(frame(32, 24, { shift: 4 }));
  assert.ok(r.change > 0.45, `change ${r.change}`);
});

test('zone alert only after the baby has been outside for a moment, then cools down', () => {
  const a = createAlerter({ debounceMs: 900, cooldownMs: 20000 });
  const outside = { fg: 0.02, centroid: { x: 0.95, y: 0.5 }, change: 0.01 };
  const inside = { fg: 0.02, centroid: { x: 0.5, y: 0.5 }, change: 0.01 };
  assert.deepEqual(a.check(inside, DEFAULT_ZONE, 0), []);
  assert.deepEqual(a.check(outside, DEFAULT_ZONE, 100), []);
  const fired = a.check(outside, DEFAULT_ZONE, 1100);
  assert.equal(fired[0].alert, 'zone');
  assert.equal(fired[0].severity, 'urgent');
  assert.deepEqual(a.check(outside, DEFAULT_ZONE, 5000), [], 'cooldown');
});

test('a single stray frame outside does not alert', () => {
  const a = createAlerter();
  a.check({ fg: 0.02, centroid: { x: 0.95, y: 0.5 }, change: 0 }, DEFAULT_ZONE, 0);
  a.check({ fg: 0.02, centroid: { x: 0.5, y: 0.5 }, change: 0 }, DEFAULT_ZONE, 300);
  assert.deepEqual(a.check({ fg: 0.02, centroid: { x: 0.95, y: 0.5 }, change: 0 }, DEFAULT_ZONE, 1200), []);
});

test('a detected person outranks motion', () => {
  const a = createAlerter({ debounceMs: 0 });
  const reading = { fg: 0.02, centroid: { x: 0.5, y: 0.5 }, change: 0, person: { x: 0.05, y: 0.5 } };
  a.check(reading, DEFAULT_ZONE, 0);
  const r = a.check(reading, DEFAULT_ZONE, 150);
  assert.equal(r[0].alert, 'zone');
  assert.match(r[0].text, /person/);
});

test('inZone', () => {
  assert.ok(inZone({ x: 0.5, y: 0.5 }, DEFAULT_ZONE));
  assert.ok(!inZone({ x: 0.1, y: 0.5 }, DEFAULT_ZONE));
});

test('still frames between movements do not reset the time she has been outside', () => {
  const a = createAlerter({ debounceMs: 900 });
  const outside = { fg: 0.01, centroid: { x: 0.92, y: 0.5 }, change: 0.01 };
  const still = { fg: 0, centroid: null, change: 0 };
  a.check(outside, DEFAULT_ZONE, 0);
  a.check(still, DEFAULT_ZONE, 400);
  a.check(still, DEFAULT_ZONE, 800);
  assert.equal(a.check(outside, DEFAULT_ZONE, 1200)[0]?.alert, 'zone');
});
