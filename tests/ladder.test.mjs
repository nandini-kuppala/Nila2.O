import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLadder, judgeSound, chooseSound, TIMINGS, scaledTimings } from '../js/monitor/ladder.js';

const names = { 'white-noise': 'White noise', humming: 'Humming', voice: 'Your voice' };

/**
 * Run a scripted night. `baby(t, playing)` says whether the baby is crying at
 * time t given the sound playing. Returns every action in order.
 */
function run({ baby, sounds = ['white-noise', 'humming'], stats = {}, until = 200000, timings = TIMINGS }) {
  const actions = [];
  let playing = null;
  const ladder = createLadder({
    timings,
    pickSound: (tried) => chooseSound(stats, sounds, tried),
    soundName: (id) => names[id],
  });
  for (let t = 0; t <= until; t += 50) {
    const c = baby(t, playing); // true/false, or a crying level 0..1
    const level = c === true ? 0.6 : c === false ? 0 : c;
    const out = ladder.tick({ score: level > 0 ? 0.7 : 0, level }, t);
    for (const a of out) {
      actions.push({ ...a, t });
      if (a.type === 'soothe') playing = a.soundId;
      if (a.type === 'stopSound') playing = null;
      if (a.type === 'close') playing = null;
    }
    if (out.some((a) => a.type === 'close')) break;
  }
  return actions;
}

test('a cry that stops before 0:20 settles on its own, no sound played', () => {
  const a = run({ baby: (t) => t >= 1000 && t < 9000 });
  assert.equal(a[0].type, 'start');
  assert.ok(!a.some((x) => x.type === 'soothe'));
  const close = a.find((x) => x.type === 'close');
  assert.equal(close.outcome, 'self');
});

test('a sound plays at 0:20, and a sound that works means nobody is woken', () => {
  let humStart = null;
  const a = run({
    baby: (t, playing) => {
      if (playing === 'humming' && humStart === null) humStart = t;
      return t >= 1000 && !(humStart !== null && t > humStart + 6000);
    },
  });
  const start = a.find((x) => x.type === 'start').t;
  const soothes = a.filter((x) => x.type === 'soothe');
  assert.equal(soothes[0].soundId, 'white-noise');
  assert.equal(soothes[0].t - start, 20000);
  const verdicts = a.filter((x) => x.type === 'verdict');
  assert.equal(verdicts[0].soundId, 'white-noise');
  assert.equal(verdicts[0].helped, false);
  assert.equal(verdicts[0].text, 'crying stayed as loud');
  assert.equal(soothes[1].soundId, 'humming');
  assert.equal(soothes[1].t - start, 55000);
  assert.equal(verdicts[1].soundId, 'humming');
  assert.equal(verdicts[1].helped, true);
  assert.ok(!a.some((x) => x.type === 'wake'));
  assert.equal(a.at(-1).outcome, 'settled');
});

test('a cry nothing settles wakes a parent at 1:30', () => {
  const a = run({ baby: (t) => t >= 1000 });
  const start = a.find((x) => x.type === 'start').t;
  const wake = a.find((x) => x.type === 'wake');
  assert.ok(wake, 'should wake');
  assert.equal(wake.t - start, 90000);
  assert.equal(a.filter((x) => x.type === 'verdict' && !x.helped).length, 2);
  assert.equal(a.at(-1).outcome, 'woke');
  assert.equal(a.at(-1).t - start, 180000, 'closes at the 3-minute cap');
});

test('the sound that helped last time is tried first', () => {
  const stats = { 'white-noise': { tried: 1, helped: 0 }, humming: { tried: 1, helped: 1 } };
  assert.equal(chooseSound(stats, ['white-noise', 'humming']), 'humming');
  assert.equal(chooseSound({}, ['white-noise', 'humming']), 'white-noise');
  // untried before known failures
  assert.equal(chooseSound({ 'white-noise': { tried: 2, helped: 0 } }, ['white-noise', 'humming', 'voice']), 'humming');
  // nothing left to try
  assert.equal(chooseSound({}, ['white-noise'], ['white-noise']), null);
});

test('judging compares before the sound with its last 15 seconds', () => {
  const samples = [];
  for (let t = 0; t < 60000; t += 100) samples.push({ t, level: t < 30000 ? 0.8 : 0.1 });
  const v = judgeSound(samples, 20000, 55000);
  assert.equal(v.helped, true);
  assert.ok(v.dropPct >= 85);
  const flat = judgeSound(samples.map((s) => ({ ...s, level: 0.8 })), 20000, 55000);
  assert.equal(flat.helped, false);
  assert.equal(flat.text, 'crying stayed as loud');
});

test('demo speed shortens the ladder but keeps its shape', () => {
  const t3 = scaledTimings(3);
  const a = run({ baby: (t) => t >= 1000, timings: t3, until: 80000 });
  const start = a.find((x) => x.type === 'start').t;
  const soothedAt = a.find((x) => x.type === 'soothe').t - start;
  assert.ok(soothedAt >= 20000 / 3 && soothedAt < 20000 / 3 + 50, `soothed at ${soothedAt}`);
  assert.equal(a.find((x) => x.type === 'wake').t - start, 30000);
});

test('a sound that helped and then stopped helping is revised, and she is still woken for', () => {
  const a = run({
    // she quietens a lot under white noise (still whimpering), then cries hard again before 1:30
    baby: (t, playing) => (t < 1000 ? false : playing === 'white-noise' && t > 30000 && t < 62000 ? 0.1 : 0.6),
    sounds: ['white-noise'],
  });
  const v = a.find((x) => x.type === 'verdict');
  assert.equal(v.helped, true);
  assert.ok(a.some((x) => x.type === 'revise' && x.soundId === 'white-noise'));
  assert.ok(a.some((x) => x.type === 'wake'));
  const close = a.at(-1);
  assert.equal(close.episode.tried[0].helped, false);
  assert.match(close.episode.tried[0].text, /came back/);
});

test('a sound still playing at the wake rung is judged before waking', () => {
  // at 3x speed the second sound's turn ends a hair after the wake rung
  const a = run({ baby: (t) => t >= 1000, timings: scaledTimings(3), until: 80000 });
  const wakeIdx = a.findIndex((x) => x.type === 'wake');
  const verdicts = a.slice(0, wakeIdx).filter((x) => x.type === 'verdict');
  assert.deepEqual(verdicts.map((v) => v.soundId), ['white-noise', 'humming']);
});
