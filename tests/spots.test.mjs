import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spotStatus } from '../js/lib/spots.js';

const D = 864e5;
const t0 = Date.UTC(2026, 9, 9, 8);

test('one photo asks for another', () => {
  assert.equal(spotStatus([{ t: t0, sizePct: 2 }], t0).key, 'again');
});

test('half as big again within a few days means doctor this week', () => {
  const s = spotStatus([{ t: t0, sizePct: 2 }, { t: t0 + 2 * D, sizePct: 3.2 }], t0 + 2 * D);
  assert.equal(s.key, 'doctor');
  assert.match(s.text, /1\.6 times/);
});

test('shrinking reads as settling, steady as keep an eye on it', () => {
  assert.equal(spotStatus([{ t: t0, sizePct: 4 }, { t: t0 + D, sizePct: 2.5 }], t0 + D).key, 'settling');
  assert.equal(spotStatus([{ t: t0, sizePct: 4 }, { t: t0 + D, sizePct: 4.2 }], t0 + D).key, 'watch');
});
