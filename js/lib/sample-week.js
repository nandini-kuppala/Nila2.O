// A sample week so Timeline and Insights can be shown before a real week exists.
// Every row is marked `sample: true`, labelled "Sample" on screen, and removable
// in one tap. Deterministic, so a demo looks the same each time.

import { startOfDay, DAY } from './summaries.js';

const MIN = 60000;
const H = 60 * MIN;

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** The cry plan per day, oldest first: [hour, minutes of crying, outcome]. Two hard days. */
const CRIES = [
  [[9.5, 4, 'self'], [19, 22, 'settled']],
  [[7.2, 3, 'self'], [18.5, 25, 'settled'], [22, 2, 'self']],
  [[10, 6, 'settled'], [17, 75, 'woke'], [19, 60, 'woke'], [21.5, 50, 'settled']],
  [[8, 5, 'self'], [16.5, 70, 'woke'], [18.4, 65, 'woke'], [20.6, 55, 'settled']],
  [[9, 3, 'self'], [19.2, 18, 'settled']],
  [[11, 2, 'self'], [18.8, 9, 'settled']],
  [[8.4, 1.5, 'self']],
];

export function sampleWeek(now = Date.now()) {
  const r = rng(42);
  const events = [];
  const today = startOfDay(now);
  const push = (e) => e.t < now && events.push({ ...e, sample: true, id: `sample-${events.length}` });

  for (let d = 0; d < 7; d++) {
    const day = today - (6 - d) * DAY;
    // night sleep from the evening before, and three naps
    push({ type: 'sleep', t: day - 3.5 * H, start: day - 3.5 * H, end: day + 1.5 * H });
    push({ type: 'sleep', t: day + 2 * H, start: day + 2 * H, end: day + 6.5 * H });
    for (const [h, len] of [[9.2, 1.1], [12.6, 1.6], [16, 0.8]]) {
      const start = day + h * H + r() * 20 * MIN;
      push({ type: 'sleep', t: start, start, end: Math.min(start + len * H, now) });
    }
    for (let h = 1; h < 24; h += 3) push({ type: 'feed', t: day + h * H + r() * 30 * MIN });
    for (const h of [6.8, 10.5, 13.4, 17.2, 20.3]) push({ type: 'nappy', t: day + h * H + r() * 20 * MIN });

    for (const [h, mins, outcome] of CRIES[d]) {
      const t = day + h * H;
      const durationMs = mins * MIN;
      const tried = [];
      const steps = [{ at: 0, kind: 'heard', text: 'Heard a cry' }];
      if (outcome !== 'self') {
        tried.push({ soundId: 'white-noise', from: 20000, to: 55000, helped: false, dropPct: 6, text: 'crying stayed as loud' });
        steps.push({ at: 20000, kind: 'soothe', text: 'Played white noise' }, { at: 55000, kind: 'check', text: "White noise didn't help: crying stayed as loud" });
        if (outcome === 'settled') {
          tried.push({ soundId: 'humming', from: 55000, to: 70000, helped: true, dropPct: 88, text: 'crying stopped' });
          steps.push({ at: 55000, kind: 'soothe', text: 'Played humming' }, { at: 70000, kind: 'check', text: 'Humming helped: crying stopped' }, { at: durationMs, kind: 'close', text: 'Settled with humming' });
        } else {
          tried.push({ soundId: 'humming', from: 55000, to: 90000, helped: false, dropPct: 12, text: 'crying stayed as loud' });
          steps.push({ at: 55000, kind: 'soothe', text: 'Played humming' }, { at: 90000, kind: 'check', text: "Humming didn't help: crying stayed as loud" }, { at: 90000, kind: 'wake', text: 'Woke you' });
        }
      } else steps.push({ at: durationMs, kind: 'close', text: 'Settled on her own' });
      push({
        type: 'cry',
        t,
        durationMs,
        outcome,
        settledWith: outcome === 'settled' ? 'humming' : null,
        steps,
        tried,
        reason: outcome === 'woke' ? { key: 'hungry', headline: 'Probably hungry', detail: 'Last feed 3h 5m ago: a guess from your quick log, not from the sound.' } : null,
        trace: Array.from({ length: 40 }, (_, i) => +(0.5 + 0.2 * Math.sin(i / 2) * r()).toFixed(3)),
      });
    }
  }
  // two safety alerts on the busy day, so the timeline shows them too
  push({ type: 'watch', t: today - 3 * DAY + 14.2 * H, alert: 'zone', severity: 'urgent', text: 'Outside the safe zone.' });
  push({ type: 'watch', t: today - 3 * DAY + 14.1 * H, alert: 'moved', severity: 'attention', text: 'The phone was moved, so the view may no longer show the cot.' });
  return events;
}
