import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearestStool, stoolVerdict, pupilKind, eyeVerdict, yellowVerdict, foodPatterns, reactionUrgent } from '../js/lib/little-signs.js';

test('stool colours land on the right card shade', () => {
  assert.equal(nearestStool([215, 168, 45]).id, 'yellow');
  assert.equal(nearestStool([235, 230, 215]).id, 'white');
  assert.equal(nearestStool([110, 128, 50]).id, 'green');
  assert.equal(nearestStool([40, 35, 30]).id, 'black');
});

test('pale poo is a same-day doctor; yellow is normal; black depends on age', () => {
  assert.equal(stoolVerdict('clay', 20).level, 'urgent');
  assert.equal(stoolVerdict('cream', 20).level, 'urgent');
  assert.equal(stoolVerdict('yellow', 20).level, 'ok');
  assert.equal(stoolVerdict('black', 2).level, 'ok');
  assert.equal(stoolVerdict('black', 30).level, 'doctor');
  assert.equal(stoolVerdict('red', 30).level, 'doctor');
});

test('pupils: red reflex, white glow, and no reflex', () => {
  assert.equal(pupilKind([200, 60, 40]), 'red');
  assert.equal(pupilKind([230, 140, 70]), 'red');
  assert.equal(pupilKind([235, 230, 210]), 'white');
  assert.equal(pupilKind([240, 225, 150]), 'white');
  assert.equal(pupilKind([25, 20, 22]), 'dark');
});

test('a white glow in either eye means show a doctor; two red reflexes are fine', () => {
  assert.equal(eyeVerdict([200, 60, 40], [235, 230, 210]).level, 'doctor');
  assert.equal(eyeVerdict([200, 60, 40], [190, 70, 45]).level, 'ok');
  assert.equal(eyeVerdict([200, 60, 40], [20, 20, 20]).level, 'watch');
});

test('yellow check follows the NHS order: danger signs, first day, pale poo, long jaundice', () => {
  assert.equal(yellowVerdict({ ageHours: 72, yellow: 'yes', danger: ['sleepy'] }).level, 'emergency');
  assert.equal(yellowVerdict({ ageHours: 12, yellow: 'yes', danger: [] }).level, 'emergency');
  assert.equal(yellowVerdict({ ageHours: 72, yellow: 'yes', palePoo: true, danger: [] }).level, 'urgent');
  assert.match(yellowVerdict({ ageHours: 20 * 24, yellow: 'yes', danger: [] }).title, /2 weeks/);
  assert.equal(yellowVerdict({ ageHours: 20 * 24, yellow: 'yes', premature: true, danger: [] }).title, 'Ask your midwife or doctor to check her today');
  assert.equal(yellowVerdict({ ageHours: 72, yellow: 'no', danger: [] }).level, 'ok');
  assert.equal(yellowVerdict({ ageHours: 72, yellow: 'unsure', danger: [] }).level, 'urgent');
});

test('food patterns: a quick reaction flags a food; one slow one does not', () => {
  const H = 3600e3;
  const foods = [
    { name: 'Egg', t: 0, allergen: true },
    { name: 'Banana', t: 0 },
    { name: 'Egg', t: 48 * H, allergen: true },
    { name: 'Rice', t: 47 * H },
  ];
  const reactions = [{ t: 48.5 * H, symptoms: ['hives'] }];
  const p = foodPatterns(foods, reactions);
  const egg = p.find((x) => x.name === 'Egg');
  assert.equal(egg.eaten, 2);
  assert.equal(egg.quick, 1);
  assert.ok(egg.flagged);
  assert.equal(p[0].name, 'Egg', 'flagged foods first, a common allergen ahead of a tie');
  assert.ok(p.find((x) => x.name === 'Rice').flagged, 'rice was also eaten within 2 hours');
  const rice = p.find((x) => x.name === 'Rice');
  assert.equal(rice.quick, 1, 'rice was 1.5h before');
  const banana = p.find((x) => x.name === 'Banana');
  assert.equal(banana.slow, 1);
  assert.equal(banana.flagged, false);
});

test('swelling or breathing trouble is an emergency', () => {
  assert.ok(reactionUrgent(['swelling']));
  assert.ok(reactionUrgent(['rash', 'breathing']));
  assert.ok(!reactionUrgent(['rash', 'vomit']));
});
