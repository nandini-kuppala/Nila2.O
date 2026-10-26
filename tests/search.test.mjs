import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestAnswer, tokens } from '../js/lib/search.js';
import { ANSWERS } from '../js/data/answers.js';
import { findMedicine } from '../js/data/medicines.js';

const ask = (q) => bestAnswer(q, ANSWERS)?.id ?? null;

test('questions find the answer a parent would expect', () => {
  assert.equal(ask('Which position should my baby sleep in?'), 'sleep-position');
  assert.equal(ask('how much crying is normal'), 'crying-normal');
  assert.equal(ask('She feels hot, is it a fever?'), 'fever');
  assert.equal(ask('what should I eat while nursing'), 'eat-breastfeeding');
  assert.equal(ask('is my milk enough'), 'milk-enough');
  assert.equal(ask('her eyes look yellow'), 'jaundice');
  assert.equal(ask('red bottom diaper rash'), 'nappy-rash');
  assert.equal(ask('when to start solids'), 'solids');
  assert.equal(ask('can I have coffee'), 'coffee');
});

test('a question with nothing behind it gets no answer rather than a wrong one', () => {
  assert.equal(ask('how do I renew my passport'), null);
  assert.equal(ask(''), null);
});

test('every answer has at least one source with a link', () => {
  for (const a of ANSWERS) {
    assert.ok(a.sources.length, a.id);
    for (const s of a.sources) assert.match(s.url, /^https:\/\//, a.id);
  }
});

test('tokens fold spellings and drop filler words', () => {
  assert.deepEqual(tokens('Why is my baby crying so much at night?'), ['why', 'cry', 'so', 'night']);
});

test('medicines are found by generic name or Indian brand', () => {
  assert.equal(findMedicine('Crocin').name, 'Paracetamol');
  assert.equal(findMedicine('dolo 650').name, 'Paracetamol');
  assert.equal(findMedicine('ibuprofen').verdict, 'safe');
  assert.equal(findMedicine('Combiflam').name, 'Ibuprofen + paracetamol');
  assert.equal(findMedicine('sudafed').verdict, 'avoid');
  assert.equal(findMedicine('codeine').verdict, 'avoid');
  assert.equal(findMedicine('zz'), null);
  assert.equal(findMedicine('unobtainium'), null);
});
