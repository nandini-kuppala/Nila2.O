import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, crying7Days, weekStats, logState, soundRecord, startOfDay, DAY, COLIC_MS } from '../js/lib/summaries.js';

const H = 3600e3;
const now = new Date(2026, 9, 26, 21, 0).getTime();
const today = startOfDay(now);

const events = [
  { type: 'cry', t: today + 9 * H, durationMs: 120e3, outcome: 'settled', tried: [{ soundId: 'humming', helped: true }] },
  { type: 'cry', t: today + 11 * H, durationMs: 60e3, outcome: 'woke', tried: [{ soundId: 'white-noise', helped: false }, { soundId: 'humming', helped: false }] },
  { type: 'cry', t: today - DAY + 20 * H, durationMs: 3.2 * H, outcome: 'self' },
  { type: 'feed', t: today + 8 * H },
  { type: 'feed', t: today + 12 * H },
  { type: 'nappy', t: today + 10 * H },
  // a night's sleep that started yesterday evening and ended this morning
  { type: 'sleep', t: today - 3 * H, start: today - 3 * H, end: today + 6 * H },
  { type: 'sleep', t: today + 13 * H, start: today + 13 * H, end: today + 14.5 * H },
];

test('today counts cries, crying time, feeds, nappies and sleep clipped to the day', () => {
  const s = summarize(events, today, today + DAY, now);
  assert.equal(s.cries, 2);
  assert.equal(s.cryMs, 180e3);
  assert.equal(s.woke, 1);
  assert.equal(s.feeds, 2);
  assert.equal(s.nappies, 1);
  assert.equal(s.sleepMs, 6 * H + 1.5 * H);
  assert.equal(s.sleepStretches, 2);
});

test('the week has seven days, oldest first, and counts days over the 3h colic line', () => {
  const days = crying7Days(events, now);
  assert.equal(days.length, 7);
  assert.equal(days[6].from, today);
  assert.equal(days[5].cryMs, 3.2 * H);
  const w = weekStats(days);
  assert.equal(w.over, 1);
  assert.equal(w.worst.cryMs, 3.2 * H);
  assert.ok(w.total > COLIC_MS);
});

test('log state reads the latest feed and an open sleep', () => {
  const open = [...events, { type: 'sleep', id: 's9', t: now - H, start: now - H, end: null }];
  const l = logState(open);
  assert.equal(l.lastFeed, today + 12 * H);
  assert.equal(l.sleepId, 's9');
});

test('sound record counts helped and tried across cries', () => {
  const r = soundRecord(events);
  assert.deepEqual(r.humming, { tried: 2, helped: 1 });
  assert.deepEqual(r['white-noise'], { tried: 1, helped: 0 });
});
