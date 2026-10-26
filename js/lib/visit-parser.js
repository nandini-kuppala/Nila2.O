// The doctor's visit, written down. Takes what the doctor said (dictated or typed)
// and pulls out the medicines with their amounts and times, the dates to come
// back, what was given today, and the advice, keeping the doctor's own words
// beside each one. Rules, not a language model: English only, and it shows its
// source sentence so a parent can check it against the prescription.

const NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, half: 0.5 };
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MON_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

// medicines a baby or a mother is commonly given; the form word (drops, syrup…) catches others
const KNOWN = ['paracetamol', 'ibuprofen', 'vitamin d', 'vitamin d3', 'iron', 'calcium', 'zinc', 'ors', 'saline', 'amoxicillin', 'cetirizine', 'multivitamin', 'simethicone', 'domperidone', 'folic acid', 'antibiotic', 'colic drops', 'nasal drops'];
const FORMS = ['drops', 'syrup', 'suspension', 'tablet', 'tablets', 'cream', 'ointment', 'sachet', 'spray', 'powder'];
const VACCINES = ['pentavalent', 'dtp', 'dtap', 'opv', 'oral polio', 'ipv', 'polio', 'rotavirus', 'pcv', 'pneumococcal', 'bcg', 'hepatitis b', 'hep b', 'mmr', 'measles', 'typhoid', 'hib', 'influenza', 'flu'];

const cap = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export function sentences(text) {
  return String(text)
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function num(word) {
  const w = word.toLowerCase();
  return NUM[w] ?? Number(w);
}

/** Times of day for a frequency phrase, as "HH:MM" strings. */
export function timesFor(s) {
  const t = s.toLowerCase();
  if (/(three|3) times (a|per|each) day|thrice/.test(t)) return ['08:00', '14:00', '20:00'];
  if (/(twice|two times|2 times) (a|per|each) day|morning and (evening|night)/.test(t)) return ['08:00', '20:00'];
  if (/four times (a|per) day|every six hours|every 6 hours/.test(t)) return ['06:00', '12:00', '18:00', '00:00'];
  if (/every morning|in the morning|once (a|per|each) day|once daily|daily|every day/.test(t)) return ['08:00'];
  if (/at night|bedtime|before sleep|every night|every evening/.test(t)) return ['20:00'];
  return [];
}

function scheduleText(s) {
  const t = s.toLowerCase();
  const m = t.match(/(three times a day|thrice a day|twice a day|two times a day|four times a day|every six hours|every 6 hours|every morning|once a day|once daily|every day|daily|at night|at bedtime|every night|every evening)/);
  return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : null;
}

function asNeeded(s) {
  const t = s.toLowerCase();
  const m = t.match(/\b(only )?(?:if|when) (?:there is |there's |she has |he has |the baby has )?(?:a |any )?(fever|pain|needed|required|necessary)\b/) || t.match(/\bas (?:and when )?(needed)\b/);
  if (!m) return null;
  const only = m[1] ? 'Only ' : '';
  if (m[2] === 'fever' || m[1] === undefined && m[2] === 'fever') return `${only ? 'Only if' : 'If'} there is fever`;
  if (m[2] === 'pain') return `${only ? 'Only if' : 'If'} there is pain`;
  return `${only}${only ? 'when' : 'When'} needed`;
}

function durationDays(s) {
  const m = s.toLowerCase().match(/for (\w+|\d+) (day|days|week|weeks|month|months)/);
  if (!m) return null;
  const n = num(m[1]);
  if (!n) return null;
  return m[2].startsWith('day') ? n : m[2].startsWith('week') ? n * 7 : n * 30;
}

function amount(s) {
  const m = s.match(/(\d+(?:\.\d+)?|half|one|two|three|four|five)\s?(ml|millilitres?|mg|mcg|micrograms?|drops?|tablets?|sachets?|teaspoons?|iu)\b/i);
  if (!m) return null;
  const unit = m[2].toLowerCase().replace(/millilitres?/, 'ml').replace(/micrograms?/, 'mcg').replace(/teaspoons?/, 'tsp');
  const n = m[1].match(/\d/) ? m[1] : String(num(m[1]));
  return `${n} ${unit}`;
}

function medicineName(s) {
  const t = s.toLowerCase();
  // the earliest known name in the sentence (longest on a tie), plus a form word just after it
  let best = null;
  for (const k of KNOWN) {
    const i = t.search(new RegExp(`\\b${k}\\b`));
    if (i >= 0 && (!best || i < best.i || (i === best.i && k.length > best.k.length))) best = { i, k };
  }
  if (best) {
    const rest = t.slice(best.i + best.k.length);
    const form = rest.match(new RegExp(`^((?:\\s+[a-z]+)?)\\s+(${FORMS.join('|')})\\b`));
    const name = best.k === 'ors' ? 'ORS' : cap(best.k);
    return form ? `${name}${cap(form[1])} ${form[2]}` : name;
  }
  const f = t.match(new RegExp(`\\b([a-z][a-z-]{2,})\\s+(${FORMS.join('|')})\\b`));
  if (f && !['the', 'some', 'these', 'those', 'any', 'two', 'three', 'few', 'oral'].includes(f[1])) return cap(`${f[1]} ${f[2]}`);
  return null;
}

/** A date phrase in a sentence → a Date (local), relative to the visit day. */
export function dateIn(s, visitDate) {
  const t = s.toLowerCase();
  const base = new Date(visitDate);
  base.setHours(10, 0, 0, 0);
  let m = t.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?(?: of)? ${MON_RE}\\b`)) ;
  let day, mon;
  if (m) { day = Number(m[1]); mon = m[2]; }
  else if ((m = t.match(new RegExp(`\\b${MON_RE} (\\d{1,2})(?:st|nd|rd|th)?\\b`)))) { mon = m[1]; day = Number(m[2]); }
  if (mon) {
    const mi = MONTHS.findIndex((x) => x.startsWith(mon.slice(0, 3)));
    const d = new Date(base.getFullYear(), mi, day, 10, 0, 0, 0);
    if (d < base) d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  if ((m = t.match(/\b(?:in|after) (\w+|\d+) (day|days|week|weeks|month|months)\b/))) {
    const n = num(m[1]);
    if (n) {
      const d = new Date(base);
      if (m[2].startsWith('day')) d.setDate(d.getDate() + n);
      else if (m[2].startsWith('week')) d.setDate(d.getDate() + 7 * n);
      else d.setMonth(d.getMonth() + n);
      return d;
    }
  }
  if (/\bnext week\b/.test(t)) return new Date(base.getTime() + 7 * 864e5);
  if (/\bnext month\b/.test(t)) {
    const d = new Date(base);
    d.setMonth(d.getMonth() + 1);
    return d;
  }
  return null;
}

/**
 * parseVisit(transcript, visitDate) →
 *  { medicines: [{ name, amount, schedule, times, asNeeded, days, words }],
 *    dates: [{ label, date, words }], given: [{ what, words }], advice: [{ text }] }
 */
export function parseVisit(text, visitDate = Date.now()) {
  const out = { medicines: [], dates: [], given: [], advice: [] };
  const used = new Set();

  for (const s of sentences(text)) {
    const low = s.toLowerCase();

    // given today
    if (/\b(given|gave|received|administered|had)\b.*\b(today|now)\b|\btoday we('ve| have) given\b/.test(low)) {
      const hits = VACCINES.filter((x) => new RegExp(`\\b${x}\\b`).test(low));
      const v = hits.filter((x) => !hits.some((y) => y !== x && y.includes(x)));
      if (v.length) {
        out.given.push({ what: [...new Set(v)].map((x) => (x.length <= 4 ? x.toUpperCase() : cap(x))).join(', '), words: s });
        used.add(s);
        continue;
      }
    }

    // dates to come back / next vaccines
    const d = dateIn(s, visitDate);
    if (d && /(come back|next visit|follow[- ]?up|review|see (her|him|you)|next (vaccin|dose|injection|shot)|vaccin|due|appointment|check-?up)/.test(low)) {
      const isVacc = /vaccin|injection|dose|shot/.test(low);
      const isVisit = /come back|next visit|follow[- ]?up|review|see (her|him|you)|appointment|check-?up/.test(low);
      if (isVisit) out.dates.push({ label: 'Next visit', date: d.getTime(), words: s });
      if (isVacc) out.dates.push({ label: 'Next vaccination', date: d.getTime(), words: s });
      used.add(s);
      continue;
    }

    // medicines (but "do not give any cough syrup" is advice, not a medicine)
    const negated = /\b(do not|don't|dont|never|avoid|no need for|stop)\b/.test(low);
    const name = negated ? null : medicineName(s);
    const amt = amount(s);
    if (name && (amt || timesFor(s).length || asNeeded(s) || /\b(give|continue|start|take|apply|use)\b/.test(low))) {
      const need = asNeeded(s);
      out.medicines.push({
        name,
        amount: amt,
        schedule: need ? null : scheduleText(s),
        times: need ? [] : timesFor(s),
        asNeeded: need,
        days: /\bcontinue\b|\bongoing\b|every (morning|day|night)|daily/.test(low) && !durationDays(s) ? null : durationDays(s),
        ongoing: /\bcontinue\b|\bongoing\b|till|until/.test(low) && !durationDays(s),
        words: s,
      });
      used.add(s);
      continue;
    }

    // advice: instructions in the doctor's words
    if (/\b(should|make sure|keep|do not|don't|never|stop|avoid|continue|only|try|give her|give him|come earlier|bring her|bring him|call|watch for)\b/.test(low) && s.length > 12) {
      out.advice.push({ text: s });
    }
  }
  return out;
}

/** The reminders a parsed visit implies: one per dose time per day, plus one per date. */
export function remindersFor(parsed, visitDate = Date.now(), ongoingDays = 30) {
  const list = [];
  const start = new Date(visitDate);
  start.setHours(0, 0, 0, 0);
  for (const m of parsed.medicines) {
    if (m.asNeeded || !m.times.length) continue;
    const days = m.days || ongoingDays;
    for (const hhmm of m.times) {
      // the first dose at this time that is still ahead, then one a day
      const [h, mi] = hhmm.split(':').map(Number);
      const first = new Date(start);
      first.setHours(h, mi, 0, 0);
      if (first.getTime() <= visitDate) first.setDate(first.getDate() + 1);
      for (let d = 0; d < days; d++) {
        const t = new Date(first);
        t.setDate(t.getDate() + d);
        list.push({ t: t.getTime(), title: `${m.name}${m.amount ? ` · ${m.amount}` : ''}`, kind: 'medicine' });
      }
    }
  }
  for (const d of parsed.dates) list.push({ t: d.date, title: d.label, kind: 'date' });
  return list.sort((a, b) => a.t - b.t);
}
