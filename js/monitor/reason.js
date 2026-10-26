// Why is she crying? Nila does not guess this from the sound: the learner's own
// research found cry-cause models fall to chance on babies they have not heard
// before. It guesses from the quick log instead (time since the last feed, the
// last nappy change and the last sleep), and always says it is a guess.

/** Rough feeding intervals and wake windows by age, in minutes. */
export function feedIntervalMin(ageMonths) {
  if (ageMonths === null || ageMonths === undefined) return 180;
  if (ageMonths < 1) return 120;
  if (ageMonths < 4) return 150;
  if (ageMonths < 6) return 180;
  return 210;
}
export function wakeWindowMin(ageMonths) {
  if (ageMonths === null || ageMonths === undefined) return 120;
  if (ageMonths < 1) return 45;
  if (ageMonths < 3) return 75;
  if (ageMonths < 6) return 105;
  if (ageMonths < 9) return 150;
  if (ageMonths < 12) return 180;
  return 240;
}
const NAPPY_MIN = 180;

function since(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/**
 * log: { lastFeed, lastNappy, sleepStart, sleepEnd } (timestamps or null)
 * → { key, headline, detail } — key is 'hungry' | 'nappy' | 'tired' | 'unclear' | 'unknown'
 */
export function guessReason(log, now, ageMonths) {
  const tail = 'a guess from your quick log, not from the sound.';
  const { lastFeed, lastNappy, sleepStart, sleepEnd } = log;
  if (!lastFeed && !lastNappy && !sleepEnd) {
    return {
      key: 'unknown',
      headline: "Nila can't tell why yet",
      detail: 'Log feeds, nappies and sleep below and Nila can make a better guess. It never guesses from the sound alone.',
    };
  }
  const candidates = [];
  if (lastFeed) candidates.push({ key: 'hungry', ratio: (now - lastFeed) / (feedIntervalMin(ageMonths) * 60000), why: `last feed ${since(now - lastFeed)} ago` });
  if (lastNappy) candidates.push({ key: 'nappy', ratio: (now - lastNappy) / (NAPPY_MIN * 60000), why: `last nappy change ${since(now - lastNappy)} ago` });
  const asleep = sleepStart && (!sleepEnd || sleepEnd < sleepStart);
  if (!asleep && sleepEnd) candidates.push({ key: 'tired', ratio: (now - sleepEnd) / (wakeWindowMin(ageMonths) * 60000), why: `awake for ${since(now - sleepEnd)}` });
  candidates.sort((a, b) => b.ratio - a.ratio);
  const top = candidates[0];
  if (top && top.ratio >= 1) {
    const word = { hungry: 'hungry', nappy: 'in need of a nappy change', tired: 'tired' }[top.key];
    return { key: top.key, headline: `Probably ${word}`, detail: `${cap(top.why)}: ${tail}` };
  }
  return {
    key: 'unclear',
    headline: 'Nothing in the log stands out',
    detail: `${cap(candidates.map((c) => c.why).join(', '))}. It could be wind, discomfort or wanting to be held.`,
  };
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
