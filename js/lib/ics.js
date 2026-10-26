// A calendar file for the visit: daily doses as one repeating event each, and the
// dates as single events, so the phone's own calendar can do the reminding.

const pad = (n) => String(n).padStart(2, '0');
const local = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const esc = (s) => String(s).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

export function toIcs(parsed, visitDate, babyName, ongoingDays = 30) {
  const stamp = local(new Date(visitDate));
  const events = [];
  let n = 0;
  const start = new Date(visitDate);
  start.setHours(0, 0, 0, 0);
  for (const m of parsed.medicines) {
    if (m.asNeeded || !m.times.length) continue;
    for (const hhmm of m.times) {
      const [h, mi] = hhmm.split(':').map(Number);
      const first = new Date(start);
      first.setHours(h, mi, 0, 0);
      if (first.getTime() <= visitDate) first.setDate(first.getDate() + 1);
      events.push([
        'BEGIN:VEVENT', `UID:nila-${visitDate}-${n++}@nila.local`, `DTSTAMP:${stamp}`,
        `DTSTART:${local(first)}`, 'DURATION:PT10M',
        `RRULE:FREQ=DAILY;COUNT=${m.days || ongoingDays}`,
        `SUMMARY:${esc(`${babyName}: ${m.name}${m.amount ? ` ${m.amount}` : ''}`)}`,
        `DESCRIPTION:${esc(`The doctor said: ${m.words}`)}`,
        'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(m.name)}`, 'TRIGGER:PT0M', 'END:VALARM',
        'END:VEVENT',
      ].join('\r\n'));
    }
  }
  for (const d of parsed.dates) {
    events.push([
      'BEGIN:VEVENT', `UID:nila-${visitDate}-${n++}@nila.local`, `DTSTAMP:${stamp}`,
      `DTSTART:${local(new Date(d.date))}`, 'DURATION:PT30M',
      `SUMMARY:${esc(`${babyName}: ${d.label}`)}`,
      `DESCRIPTION:${esc(`The doctor said: ${d.words}`)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(d.label)}`, 'TRIGGER:-P1D', 'END:VALARM',
      'END:VEVENT',
    ].join('\r\n'));
  }
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nila//Visit notes//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n');
}
