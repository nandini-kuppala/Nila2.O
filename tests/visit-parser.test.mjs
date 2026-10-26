import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVisit, remindersFor, dateIn, timesFor } from '../js/lib/visit-parser.js';
import { SAMPLE_VISITS } from '../js/data/sample-visits.js';
import { toIcs } from '../js/lib/ics.js';

const visitDay = new Date(2026, 9, 10, 11, 0).getTime(); // Sat 10 Oct 2026
const fourMonth = SAMPLE_VISITS.find((v) => v.id === 'four-month').text.replaceAll('{name}', 'Meera');

test('the 4-month check-up: two medicines, in the doctor’s amounts and times', () => {
  const p = parseVisit(fourMonth, visitDay);
  const para = p.medicines.find((m) => /Paracetamol/.test(m.name));
  const vitd = p.medicines.find((m) => /Vitamin D/.test(m.name));
  assert.ok(para && vitd, JSON.stringify(p.medicines.map((m) => m.name)));
  assert.equal(para.amount, '0.6 ml');
  assert.match(para.asNeeded, /only if there is fever/i);
  assert.deepEqual(para.times, []);
  assert.equal(vitd.amount, '1 ml');
  assert.deepEqual(vitd.times, ['08:00']);
  assert.match(vitd.words, /every morning/);
});

test('the 4-month check-up: next visit and vaccination on 8 December, and what was given', () => {
  const p = parseVisit(fourMonth, visitDay);
  const labels = p.dates.map((d) => d.label);
  assert.ok(labels.includes('Next visit'));
  assert.ok(labels.includes('Next vaccination'));
  for (const d of p.dates) {
    const dt = new Date(d.date);
    assert.equal(dt.getDate(), 8);
    assert.equal(dt.getMonth(), 11);
  }
  assert.match(p.given[0].what, /Pentavalent/);
  assert.match(p.given[0].what, /Rotavirus/);
  assert.ok(p.advice.some((a) => /breast milk till six months/.test(a.text)));
});

test('reminders: a daily morning dose for 30 days plus the dates, none for as-needed', () => {
  const p = parseVisit(fourMonth, visitDay);
  const r = remindersFor(p, visitDay);
  const doses = r.filter((x) => x.kind === 'medicine');
  assert.equal(doses.length, 30);
  assert.ok(doses.every((x) => /Vitamin D/.test(x.title)));
  assert.equal(r.filter((x) => x.kind === 'date').length, 2);
});

test('a course with a length: three times a day for five days', () => {
  const p = parseVisit(SAMPLE_VISITS.find((v) => v.id === 'cold').text.replaceAll('{name}', 'Meera'), visitDay);
  const saline = p.medicines.find((m) => /Saline/.test(m.name));
  assert.ok(saline);
  assert.equal(saline.amount, '2 drops');
  assert.equal(saline.days, 5);
  assert.deepEqual(saline.times, ['08:00', '14:00', '20:00']);
  assert.equal(remindersFor(p, visitDay).filter((x) => x.kind === 'medicine').length, 15);
  assert.ok(p.dates.some((d) => d.label === 'Next visit'));
});

test('relative dates', () => {
  assert.equal(new Date(dateIn('The next vaccination is in four weeks.', visitDay)).getDate(), 7);
  assert.equal(new Date(dateIn('come back on December 8th', visitDay)).getMonth(), 11);
  assert.equal(dateIn('nothing here', visitDay), null);
});

test('frequencies', () => {
  assert.deepEqual(timesFor('twice a day'), ['08:00', '20:00']);
  assert.deepEqual(timesFor('at night'), ['20:00']);
  assert.deepEqual(timesFor('once a day'), ['08:00']);
});

test('the calendar file has one repeating event per dose time, and the dates', () => {
  const p = parseVisit(fourMonth, visitDay);
  const ics = toIcs(p, visitDay, 'Meera');
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /RRULE:FREQ=DAILY;COUNT=30/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3);
  assert.match(ics, /SUMMARY:Meera: Next visit/);
});

test('"do not give" is advice, never a medicine to give', () => {
  const p = parseVisit('Do not give any cough syrup at this age. Never give honey before one year.', visitDay);
  assert.equal(p.medicines.length, 0);
  assert.equal(p.advice.length, 2);
});

test('as-needed labels read cleanly and vaccine names are not doubled', () => {
  const p = parseVisit('If she has fever you can give paracetamol drops 0.4 ml when needed. Today we have given the oral polio drops and rotavirus.', visitDay);
  assert.equal(p.medicines[0].asNeeded, 'If there is fever');
  assert.equal(p.given[0].what, 'Oral Polio, Rotavirus');
});
