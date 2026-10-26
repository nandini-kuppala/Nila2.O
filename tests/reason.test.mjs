import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessReason } from '../js/monitor/reason.js';

const H = 3600e3;
const now = Date.UTC(2026, 9, 26, 22, 0);

test('nothing logged: says it cannot tell, and never guesses from the sound', () => {
  const r = guessReason({}, now, 4);
  assert.equal(r.key, 'unknown');
  assert.match(r.detail, /never guesses from the sound/);
});

test('a feed long overdue for her age reads as probably hungry, labelled a guess', () => {
  const r = guessReason({ lastFeed: now - 3.5 * H, lastNappy: now - 1 * H }, now, 4);
  assert.equal(r.key, 'hungry');
  assert.equal(r.headline, 'Probably hungry');
  assert.match(r.detail, /3h 30m ago/);
  assert.match(r.detail, /a guess/);
});

test('the most overdue need wins', () => {
  const r = guessReason({ lastFeed: now - 1 * H, lastNappy: now - 5 * H }, now, 4);
  assert.equal(r.key, 'nappy');
});

test('awake past her wake window reads as tired; asleep does not', () => {
  assert.equal(guessReason({ lastFeed: now - 0.5 * H, sleepStart: now - 5 * H, sleepEnd: now - 2.5 * H }, now, 4).key, 'tired');
  assert.notEqual(guessReason({ lastFeed: now - 0.5 * H, sleepStart: now - 0.2 * H, sleepEnd: null }, now, 4).key, 'tired');
});

test('nothing overdue: says nothing stands out and lists what it knows', () => {
  const r = guessReason({ lastFeed: now - 0.5 * H, lastNappy: now - 0.5 * H }, now, 4);
  assert.equal(r.key, 'unclear');
  assert.match(r.detail, /Last feed 30m ago/);
});

test('a newborn is hungry sooner than a six-month-old', () => {
  const log = { lastFeed: now - 2.2 * H };
  assert.equal(guessReason(log, now, 0).key, 'hungry');
  assert.equal(guessReason(log, now, 7).key, 'unclear');
});
