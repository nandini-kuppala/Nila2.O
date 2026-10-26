// Is a spot spreading or settling? From the sizes the parent measured, with plain
// rules a doctor can check: half as big again within a few days means "show the
// doctor this week".

const DAY = 864e5;

export function spotStatus(entries, now = Date.now()) {
  if (!entries.length) return { key: 'again', label: 'Add a photo', text: 'Add the first photo to start the diary.' };
  if (entries.length === 1) return { key: 'again', label: 'Check again tomorrow', text: 'One photo so far. Another in a day or two shows which way it is going.' };
  const last = entries[entries.length - 1];
  const recent = entries.filter((e) => e !== last && last.t - e.t <= 4 * DAY);
  const ref = recent.length ? recent[0] : entries[entries.length - 2];
  const ratio = ref.sizePct > 0 ? last.sizePct / ref.sizePct : 1;
  const gap = last.t - ref.t;
  const days = Math.max(1, Math.round(gap / DAY));
  const since = gap < 20 * 3600e3 ? 'at the last photo' : `${days} day${days === 1 ? '' : 's'} ago`;
  if (ratio >= 1.5 && last.t - ref.t <= 4 * DAY) {
    return { key: 'doctor', label: 'Doctor this week', text: `About ${ratio.toFixed(1)} times the size it was ${since}. Show these photos to your doctor this week.` };
  }
  if (ratio <= 0.75) {
    return { key: 'settling', label: 'Settling', text: `Smaller than ${since} (${Math.round((1 - ratio) * 100)}% less). Keep an eye on it.` };
  }
  if (now - last.t > 3 * DAY) return { key: 'again', label: 'Check again', text: 'It has been a few days since the last photo.' };
  return { key: 'watch', label: 'Keep an eye on it', text: `About the same as ${since}.` };
}
