// Counting what happened: the Timeline tiles, "today" on the Monitor screen, and
// the week in Insights. Pure functions over the event list, so they are tested.

export const DAY = 864e5;

export function startOfDay(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Sleep time inside [from, to), clipping stretches that cross the edges. */
function sleepWithin(e, from, to, now) {
  const start = e.start ?? e.t;
  const end = e.end ?? now;
  return Math.max(0, Math.min(end, to) - Math.max(start, from));
}

export function summarize(events, from, to, now = Date.now()) {
  const inRange = (t) => t >= from && t < to;
  const cries = events.filter((e) => e.type === 'cry' && inRange(e.t));
  const sleeps = events.filter((e) => e.type === 'sleep' && sleepWithin(e, from, to, now) > 0);
  const feeds = events.filter((e) => e.type === 'feed' && inRange(e.t));
  const nappies = events.filter((e) => e.type === 'nappy' && inRange(e.t));
  const watch = events.filter((e) => e.type === 'watch' && inRange(e.t));
  return {
    cries: cries.length,
    cryMs: cries.reduce((a, e) => a + (e.durationMs || 0), 0),
    woke: cries.filter((e) => e.outcome === 'woke').length,
    soothed: cries.filter((e) => e.outcome === 'settled').length,
    selfSettled: cries.filter((e) => e.outcome === 'self').length,
    sleepMs: sleeps.reduce((a, e) => a + sleepWithin(e, from, to, now), 0),
    sleepStretches: sleeps.length,
    feeds: feeds.length,
    nappies: nappies.length,
    alerts: watch.length,
    lastFeed: feeds[0]?.t ?? null,
    lastNappy: nappies[0]?.t ?? null,
  };
}

/** Crying per day for the 7 days ending today (oldest first). */
export function crying7Days(events, now = Date.now()) {
  const today = startOfDay(now);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const from = today - i * DAY;
    const s = summarize(events, from, from + DAY, now);
    days.push({ from, cryMs: s.cryMs, cries: s.cries });
  }
  return days;
}

export const COLIC_MS = 3 * 3600e3;

/** The week in words, the way Insights writes it under the chart. */
export function weekStats(days) {
  const total = days.reduce((a, d) => a + d.cryMs, 0);
  const cries = days.reduce((a, d) => a + d.cries, 0);
  const over = days.filter((d) => d.cryMs >= COLIC_MS).length;
  const worst = days.reduce((m, d) => (d.cryMs > m.cryMs ? d : m), days[0] || { cryMs: 0 });
  return { total, cries, over, avg: total / (days.length || 1), worst };
}

/** Which hours of the day the crying falls in (24 buckets of milliseconds). */
export function cryByHour(events, from, to) {
  const hours = new Array(24).fill(0);
  for (const e of events) {
    if (e.type !== 'cry' || e.t < from || e.t >= to) continue;
    hours[new Date(e.t).getHours()] += e.durationMs || 0;
  }
  return hours;
}

/** How each sound has done, from the cry events themselves. */
export function soundRecord(events) {
  const rec = {};
  for (const e of events) {
    if (e.type !== 'cry') continue;
    for (const t of e.tried || []) {
      const r = (rec[t.soundId] ||= { tried: 0, helped: 0 });
      r.tried++;
      if (t.helped) r.helped++;
    }
  }
  return rec;
}

/** The latest feed / nappy / sleep state for the reason guess. */
export function logState(events) {
  const last = (type) => events.filter((e) => e.type === type).sort((a, b) => b.t - a.t)[0] || null;
  const sleep = last('sleep');
  return {
    lastFeed: last('feed')?.t ?? null,
    lastNappy: last('nappy')?.t ?? null,
    sleepStart: sleep?.start ?? null,
    sleepEnd: sleep?.end ?? null,
    sleepId: sleep && !sleep.end ? sleep.id : null,
  };
}
