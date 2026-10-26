import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleWeek } from '../js/lib/sample-week.js';
import { crying7Days, weekStats } from '../js/lib/summaries.js';

test('the sample week is all labelled sample, in the past, and has two days over the colic line', () => {
  const now = new Date(2026, 9, 26, 23, 30).getTime();
  const ev = sampleWeek(now);
  assert.ok(ev.length > 100);
  assert.ok(ev.every((e) => e.sample === true && e.t < now));
  const w = weekStats(crying7Days(ev, now));
  assert.equal(w.over, 2);
  assert.equal(w.cries, 18);
});
