// The engine: microphone (or the demo cry) → ear → ladder → sounds, alert, record.
// One per page, so listening carries on while the parent looks at another tab.

import { analyseFrame, NoiseFloor, CryWindow } from './detector.js';
import { createLadder, chooseSound, scaledTimings, TIMINGS } from './ladder.js';
import { playSound, soundName, alarm } from './sounds.js';
import { createDemoCry } from './demo-cry.js';
import { showWake } from './alert.js';
import * as store from '../store.js';

const TICK_MS = 50;
const TRACE_MS = 250;
const TRACE_KEEP_MS = 60000;

const state = {
  mode: 'off',          // 'off' | 'mic' | 'demo'
  scenario: null,       // demo scenario
  reading: { score: 0, level: 0 },
  trace: [],            // [{t, level}] the last minute, for the crying-level line
  live: null,           // the episode in progress, for the screen
  last: null,           // the last finished episode (an event)
  timings: TIMINGS,
  error: null,
  hidden: false,
};

const subs = new Set();
const emit = () => subs.forEach((fn) => fn(state));

let ctx = null;
let analyser = null;
let inputBus = null;
let soundBus = null;
let micStream = null;
let micSource = null;
let demo = null;
let loop = null;
let floor = null;
let win = null;
let ladder = null;
let current = null;      // the playing sound
let alarmNode = null;
let closeWake = null;
let recorder = null;
let chunks = [];
let wakeLock = null;
let lastTrace = 0;
let voiceBuffer = null;
let available = ['white-noise', 'humming'];
let stats = {};
let episodeWall = 0;
let demoFinished = false; // the demo is one cry long

/** Slice 3 plugs the quick-log guess in here. */
let reasonProvider = async () => null;
export function setReasonProvider(fn) {
  reasonProvider = fn;
}

function ensureContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    inputBus = ctx.createGain();
    inputBus.connect(analyser);
    soundBus = ctx.createGain();
    soundBus.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

async function loadSounds() {
  stats = await store.soundStats();
  available = ['white-noise', 'humming'];
  const voiceId = await store.getValue('voiceId');
  if (voiceId) {
    try {
      const blob = await store.getBlob(voiceId);
      voiceBuffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      available.push('voice');
    } catch {
      voiceBuffer = null;
    }
  } else voiceBuffer = null;
}

function begin(timings) {
  floor = new NoiseFloor(-60);
  win = new CryWindow();
  state.timings = timings;
  state.trace = [];
  ladder = createLadder({
    timings,
    pickSound: (tried) => chooseSound(stats, available, tried),
    soundName,
  });
  const buf = new Float32Array(analyser.fftSize);
  clearInterval(loop);
  loop = setInterval(() => {
    const now = performance.now();
    analyser.getFloatTimeDomainData(buf);
    const frame = analyseFrame(buf, ctx.sampleRate, floor.db);
    floor.update(frame);
    win.push(now, frame);
    state.reading = win.full ? { score: win.score(), level: win.level(), hz: frame.hz } : { score: 0, level: 0 };
    if (now - lastTrace >= TRACE_MS) {
      state.trace.push({ t: now, level: state.reading.level });
      while (state.trace.length && state.trace[0].t < now - TRACE_KEEP_MS) state.trace.shift();
      lastTrace = now;
    }
    if (!(state.mode === 'demo' && demoFinished)) handle(ladder.tick(state.reading, now), now);
    if (ladder.episode) state.live = view(ladder.episode, now);
    emit();
  }, TICK_MS);
  requestWakeLock();
}

function view(ep, now) {
  return {
    start: ep.start,
    elapsed: now - ep.start,
    steps: ep.steps,
    tried: ep.tried,
    sound: ep.sound,
    soundAt: ep.sound ? ep.soundStart - ep.start : null,
    helping: ep.helping,
    woke: ep.woke,
    demo: state.mode === 'demo',
  };
}

function handle(actions, now) {
  for (const a of actions) {
    if (a.type === 'start') {
      episodeWall = Date.now();
      startRecording();
    } else if (a.type === 'soothe') {
      current?.stop();
      current = playSound(ctx, a.soundId, soundBus, { voiceBuffer });
      demo?.setSoothing(a.soundId);
    } else if (a.type === 'stopSound') {
      current?.stop();
      current = null;
      demo?.setSoothing(null);
    } else if (a.type === 'verdict') {
      store.recordSoundResult(a.soundId, a.helped).then((s) => { stats = s; });
    } else if (a.type === 'revise') {
      store.reviseSoundResult(a.soundId).then((s) => { stats = s; });
    } else if (a.type === 'wake') {
      wake(now);
    } else if (a.type === 'close') {
      finish(a.episode, a.outcome);
    }
  }
}

async function wake(now) {
  const ep = ladder.episode;
  const s = await store.settings();
  const reason = await reasonProvider().catch(() => null);
  if (ep) ep.reason = reason;
  alarmNode = s.soundOnAlert ? alarm(ctx) : null;
  closeWake = showWake({
    name: store.babyName(),
    elapsedMs: now - (ep?.start ?? now),
    tried: ep?.tried || [],
    reason,
    demo: state.mode === 'demo',
    onAck: () => ackWake(),
  });
}

/** The parent is on their way. In the demo, that is the baby being picked up. */
export function ackWake() {
  alarmNode?.stop();
  alarmNode = null;
  closeWake?.();
  closeWake = null;
  if (demo) {
    demo.pickUp();
    const d = demo;
    if (demoFinished) setTimeout(() => { if (demo === d) stop(); }, 400);
  }
}

function startRecording() {
  chunks = [];
  try {
    const dest = ctx.createMediaStreamDestination();
    inputBus.connect(dest);
    recorder = new MediaRecorder(dest.stream);
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder._dest = dest;
    recorder.start(1000);
  } catch {
    recorder = null;
  }
}

function stopRecording() {
  return new Promise((resolve) => {
    if (!recorder || recorder.state === 'inactive') return resolve(null);
    const r = recorder;
    recorder = null;
    r.onstop = () => {
      try { inputBus.disconnect(r._dest); } catch {}
      resolve(chunks.length ? new Blob(chunks, { type: r.mimeType || 'audio/webm' }) : null);
    };
    r.stop();
  });
}

async function finish(ep, outcome) {
  current?.stop();
  current = null;
  demo?.setSoothing(null);
  // The alarm keeps going until a parent answers it, even past the 3-minute cap.
  const wasDemo = state.mode === 'demo';
  const thisDemo = demo;
  if (wasDemo) {
    demoFinished = true;
    demo?.pickUp();
  }
  const clip = await stopRecording();
  if (outcome === 'stopped' && wasDemo) {
    // a demo stopped half-way is not worth keeping
    state.live = null;
    emit();
    return;
  }
  let clipId = null;
  if (clip && outcome === 'woke') clipId = await store.putBlob(clip, 'clip');
  const reason = ep.reason ?? (await reasonProvider().catch(() => null));
  const settledWith = ep.tried.find((t) => t.helped)?.soundId || null;
  const event = await store.addEvent({
    type: 'cry',
    t: episodeWall,
    durationMs: ep.end - ep.start,
    outcome,
    settledWith,
    steps: ep.steps,
    tried: ep.tried,
    reason,
    clipId,
    demo: wasDemo,
    trace: downsample(ep.samples, 40),
  });
  state.last = event;
  state.live = null;
  emit();
  // the demo is one cry long; stop it unless a new demo has already started
  // (if the wake alert is still up, answering it ends the demo instead)
  if (wasDemo && thisDemo && !closeWake) setTimeout(() => { if (demo === thisDemo) stop(); }, 400);
}

function downsample(samples, n) {
  if (samples.length <= n) return samples.map((s) => +s.level.toFixed(3));
  const out = [];
  const step = samples.length / n;
  for (let i = 0; i < n; i++) {
    const slice = samples.slice(Math.floor(i * step), Math.floor((i + 1) * step));
    out.push(+(slice.reduce((a, s) => a + s.level, 0) / slice.length).toFixed(3));
  }
  return out;
}

async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch {
    wakeLock = null;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    state.hidden = document.hidden;
    if (!document.hidden && state.mode !== 'off') requestWakeLock();
    emit();
  });
}

// ---- public -------------------------------------------------------------------

export function subscribe(fn) {
  subs.add(fn);
  fn(state);
  return () => subs.delete(fn);
}
export const engineState = state;

export async function startListening() {
  ensureContext();
  stop(true);
  state.error = null;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  } catch (e) {
    state.error = e?.name === 'NotAllowedError'
      ? 'The microphone is blocked. Allow it in the browser’s address bar, then try again.'
      : 'Nila could not open a microphone on this device.';
    emit();
    return false;
  }
  try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch {}
  await loadSounds();
  micSource = ctx.createMediaStreamSource(micStream);
  micSource.connect(inputBus);
  state.mode = 'mic';
  begin(TIMINGS);
  emit();
  return true;
}

export async function startDemo(scenario) {
  ensureContext();
  stop(true);
  state.error = null;
  await loadSounds();
  const s = await store.settings();
  const speed = Number(s.demoSpeed) || 1;
  demo = createDemoCry(ctx, { scenario, speed });
  demoFinished = false;
  // the cry goes to the speakers so the viewer hears it, and into the ear
  const toSpeakers = ctx.createGain();
  toSpeakers.gain.value = 0.22;
  demo.output.connect(toSpeakers).connect(ctx.destination);
  const toEar = ctx.createGain();
  toEar.gain.value = 0.5;
  demo.output.connect(toEar).connect(inputBus);
  demo._nodes = [toSpeakers, toEar];
  // and the ear hears Nila's own sounds the way a microphone by the cot would:
  // a phone speaker at bedside volume, well under a crying baby (about -18 dB)
  const soundToEar = ctx.createGain();
  soundToEar.gain.value = 0.12;
  soundBus.connect(soundToEar).connect(inputBus);
  demo._nodes.push(soundToEar);
  state.mode = 'demo';
  state.scenario = scenario;
  begin(scaledTimings(speed));
  emit();
}

/** Stop listening (or the demo). An episode in progress is closed and saved. */
export function stop(silent = false) {
  if (ladder?.active) handle(ladder.stop(performance.now(), 'stopped'), performance.now());
  clearInterval(loop);
  loop = null;
  current?.stop();
  current = null;
  alarmNode?.stop();
  alarmNode = null;
  closeWake?.();
  closeWake = null;
  if (demo) {
    demo.stop();
    demo._nodes.forEach((n) => { try { n.disconnect(); } catch {} });
    try { soundBus.disconnect(demo._nodes[2]); } catch {}
    demo = null;
  }
  if (micSource) {
    micSource.disconnect();
    micSource = null;
  }
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null;
  wakeLock?.release?.();
  wakeLock = null;
  state.mode = 'off';
  state.scenario = null;
  state.timings = TIMINGS;
  state.live = null;
  state.reading = { score: 0, level: 0 };
  if (!silent) emit();
}

export function dismissLast() {
  state.last = null;
  emit();
}

/** For Settings: play a sound for a few seconds so the parent can hear it. */
export function preview(id, seconds = 4) {
  ensureContext();
  return loadSounds().then(() => {
    const s = playSound(ctx, id, ctx.destination, { voiceBuffer });
    setTimeout(() => s.stop(), seconds * 1000);
  });
}

export function audioContext() {
  return ensureContext();
}
