// The ladder: Heard → Soothe → Check → Wake you.
//
// A small state machine with a clock. It never touches audio or the screen: it is
// fed what the ear heard and the time, and answers with what should happen next.
// That keeps the part of Nila that decides whether to wake a parent testable.

export const TIMINGS = {
  startScore: 0.45,   // share of the last 3 s that must be crying to call it a cry
  quietScore: 0.15,   // below this, the room counts as quiet
  settleMs: 10000,    // quiet this long and the episode is over
  sootheAtMs: 20000,  // first sound at 0:20
  perSoundMs: 35000,  // each sound gets 35 s before it is judged
  wakeAtMs: 90000,    // wake a parent at 1:30 if nothing helped
  capMs: 180000,      // close the episode at 3:00 whatever happens
  beforeMs: 10000,    // crying level just before a sound...
  judgeMs: 15000,     // ...against the last 15 s of that sound
  helpedDrop: 0.6,    // a 60% drop counts as "helped"
};

/** The demo can run faster so a recording stays short. Detection itself is not sped up. */
export function scaledTimings(speed = 1) {
  const t = { ...TIMINGS };
  for (const k of ['settleMs', 'sootheAtMs', 'perSoundMs', 'wakeAtMs', 'capMs', 'beforeMs', 'judgeMs']) {
    t[k] = Math.round(TIMINGS[k] / speed);
  }
  return t;
}

function mean(samples, from, to) {
  let s = 0;
  let n = 0;
  for (const x of samples) {
    if (x.t >= from && x.t <= to) {
      s += x.level;
      n++;
    }
  }
  return n ? s / n : 0;
}

/**
 * Did the sound help? Compares the crying level in the seconds before it started
 * with the last stretch of it playing.
 */
export function judgeSound(samples, soundStart, soundEnd, timings = TIMINGS) {
  const before = mean(samples, soundStart - timings.beforeMs, soundStart);
  const during = mean(samples, Math.max(soundStart, soundEnd - timings.judgeMs), soundEnd);
  const drop = before > 0 ? 1 - during / before : 0;
  const dropPct = Math.round(drop * 100);
  const helped = drop >= timings.helpedDrop;
  let text;
  if (helped) text = `crying dropped ${dropPct}%`;
  else if (dropPct < -10) text = 'crying got louder';
  else if (dropPct < 15) text = 'crying stayed as loud';
  else text = `crying only dropped ${dropPct}%`;
  return { helped, dropPct, before, during, text };
}

/**
 * Which sound to try next: the one with the best record first, then ones never
 * tried, then ones that have only ever failed (least tried first).
 */
export function chooseSound(stats, available, triedThisEpisode = []) {
  const candidates = available.filter((id) => !triedThisEpisode.includes(id));
  if (!candidates.length) return null;
  const rank = (id, i) => {
    const s = stats[id];
    if (s && s.helped > 0) return [0, -(s.helped / s.tried), i];
    if (!s || !s.tried) return [1, 0, i];
    return [2, s.tried, i];
  };
  return candidates
    .map((id, i) => ({ id, k: rank(id, i) }))
    .sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.k[2] - b.k[2])[0].id;
}

/**
 * createLadder({ timings, pickSound, soundName })
 *  - pickSound(triedIds) → soundId | null
 *  - tick({ score, level }, nowMs) → array of actions:
 *      { type: 'start' } | { type: 'soothe', soundId } | { type: 'verdict', soundId, helped, dropPct, text }
 *      { type: 'wake' } | { type: 'close', outcome: 'self' | 'settled' | 'woke' }
 */
export function createLadder({ timings = TIMINGS, pickSound = () => null, soundName = (id) => id } = {}) {
  let ep = null;

  const step = (now, kind, text) => ep.steps.push({ at: now - ep.start, kind, text });

  function startSound(now, id) {
    ep.sound = id;
    ep.soundStart = now;
    step(now, 'soothe', `Played ${soundName(id).toLowerCase()}`);
    return { type: 'soothe', soundId: id };
  }

  function judge(now, stoppedCrying) {
    const id = ep.sound;
    let v = judgeSound(ep.samples, ep.soundStart, now, timings);
    if (stoppedCrying) v = { ...v, helped: true, text: 'crying stopped' };
    ep.tried.push({ soundId: id, from: ep.soundStart - ep.start, to: now - ep.start, helped: v.helped, dropPct: v.dropPct, text: v.text });
    step(now, 'check', `${soundName(id)} ${v.helped ? 'helped' : "didn't help"}: ${v.text}`);
    return { type: 'verdict', soundId: id, helped: v.helped, dropPct: v.dropPct, text: v.text };
  }

  function close(now, outcome) {
    const helped = ep.tried.find((t) => t.helped);
    const text = outcome === 'stopped' ? 'Listening was stopped'
      : outcome === 'self' ? 'Settled on her own'
      : outcome === 'settled' ? `Settled${helped ? ` with ${soundName(helped.soundId).toLowerCase()}` : ''}`
      : 'Quiet again; episode closed';
    step(now, 'close', text);
    ep.outcome = outcome;
    ep.end = now;
    const done = ep;
    ep = null;
    return { type: 'close', outcome, episode: done };
  }

  return {
    get active() {
      return !!ep;
    },
    get episode() {
      return ep;
    },
    timings,

    tick({ score, level }, now) {
      const out = [];
      if (!ep) {
        if (score >= timings.startScore) {
          ep = { start: now, lastCry: now, steps: [], tried: [], samples: [], sound: null, soundStart: 0, helping: null, woke: false, outcome: null };
          step(now, 'heard', 'Heard a cry');
          out.push({ type: 'start' });
        }
        return out;
      }

      ep.samples.push({ t: now, level, score });
      if (ep.samples.length > 4000) ep.samples.shift();
      if (score >= timings.quietScore) ep.lastCry = now;
      const elapsed = now - ep.start;

      // 1. Quiet long enough: it's over.
      if (now - ep.lastCry >= timings.settleMs) {
        if (ep.sound && !ep.helping) out.push(judge(now, true));
        const soothed = ep.tried.some((t) => t.helped);
        out.push(close(now, ep.woke ? 'woke' : soothed ? 'settled' : 'self'));
        return out;
      }

      if (ep.woke) {
        if (elapsed >= timings.capMs) out.push(close(now, 'woke'));
        return out;
      }

      // 2. A sound has had its turn: judge it.
      if (ep.sound && !ep.helping && now - ep.soundStart >= timings.perSoundMs) {
        const v = judge(now, false);
        out.push(v);
        if (v.helped) {
          ep.helping = ep.sound; // keep it playing; she is settling
        } else {
          out.push({ type: 'stopSound', soundId: ep.sound });
          ep.sound = null;
          if (elapsed < timings.wakeAtMs - 1000) {
            const next = pickSound(ep.tried.map((t) => t.soundId));
            if (next) out.push(startSound(now, next));
          }
        }
      }

      // 3. 1:30 and still crying: wake someone.
      if (elapsed >= timings.wakeAtMs) {
        const stillCrying = ep.helping ? score >= timings.startScore : true;
        if (stillCrying) {
          if (ep.helping) {
            // it seemed to help, but she is crying hard again: that was not a settle
            const last = ep.tried[ep.tried.length - 1];
            last.helped = false;
            last.text = `${last.text}, then crying came back`;
            step(now, 'check', `${soundName(last.soundId)} stopped helping: crying came back`);
            out.push({ type: 'revise', soundId: last.soundId });
          }
          if (ep.sound && !ep.helping) out.push(judge(now, false)); // its turn ends with the wake
          if (ep.sound) out.push({ type: 'stopSound', soundId: ep.sound });
          ep.sound = null;
          ep.helping = null;
          ep.woke = true;
          step(now, 'wake', 'Woke you');
          out.push({ type: 'wake' });
          return out;
        }
      }

      // 4. 0:20 and still crying: play the first sound.
      if (!ep.sound && !ep.helping && !ep.tried.length && elapsed >= timings.sootheAtMs) {
        const first = pickSound([]);
        if (first) out.push(startSound(now, first));
      }

      if (elapsed >= timings.capMs) out.push(close(now, ep.tried.some((t) => t.helped) ? 'settled' : 'self'));
      return out;
    },

    /** The parent has gone to the baby (or stopped the demo). */
    stop(now, outcome) {
      if (!ep) return [];
      const out = [];
      if (ep.sound) out.push({ type: 'stopSound', soundId: ep.sound });
      out.push(close(now, outcome || (ep.woke ? 'woke' : 'self')));
      return out;
    },
  };
}
