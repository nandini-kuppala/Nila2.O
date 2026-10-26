// Watch: the safety watch. A camera (this device's, or the demo footage), a safe
// zone the parent draws, and an urgent alert when she moves outside it.

import * as store from '../store.js';
import * as engine from '../monitor/audio-engine.js';
import { playSound } from '../monitor/sounds.js';
import { Tracker, createAlerter, toGray, DEFAULT_ZONE, GRID_W, GRID_H } from '../watch/tracker.js';
import { createDemoScene } from '../watch/demo-scene.js';
import { loadDetector, detect } from '../watch/vision.js';
import { icon } from '../icons.js';
import { ill } from '../illustrations.js';
import { html, str, raw, timeOf, toast, $ } from '../ui.js';

const I = (n) => raw(icon(n));
const TICK_MS = 150;

// The watch keeps running while the parent looks at other tabs.
export const session = {
  mode: 'off',       // 'off' | 'camera' | 'demo'
  stream: null,
  video: null,
  scene: null,
  timer: null,
  tracker: null,
  alerter: null,
  zone: DEFAULT_ZONE,
  reading: null,
  persons: [],
  usePerson: false,
  lastMove: 0,
  flashUntil: 0,
  error: null,
};
const grid = typeof document !== 'undefined' ? Object.assign(document.createElement('canvas'), { width: GRID_W, height: GRID_H }) : null;
let redraw = () => {};

function source() {
  return session.mode === 'demo' ? session.scene?.canvas : session.video;
}

async function start(mode) {
  stop();
  session.error = null;
  session.zone = (await store.getValue('zone')) || DEFAULT_ZONE;
  if (mode === 'camera') {
    try {
      session.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 640 } }, audio: false });
    } catch (e) {
      session.error = e?.name === 'NotAllowedError'
        ? 'The camera is blocked. Allow it in the browser’s address bar, then try again.'
        : 'Nila could not open a camera on this device.';
      redraw();
      return;
    }
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.srcObject = session.stream;
    await v.play().catch(() => {});
    session.video = v;
  } else {
    session.scene = createDemoScene(document.createElement('canvas'));
  }
  session.mode = mode;
  session.tracker = new Tracker();
  session.alerter = createAlerter();
  let lastPerson = 0;
  const g = grid.getContext('2d', { willReadFrequently: true });
  session.timer = setInterval(async () => {
    session.scene?.render();
    const src = source();
    if (!src || (src.videoWidth === 0 && session.mode === 'camera')) return;
    g.drawImage(src, 0, 0, GRID_W, GRID_H);
    const r = session.tracker.update(toGray(g.getImageData(0, 0, GRID_W, GRID_H).data));
    const now = performance.now();
    if (r.fg > 0.004) session.lastMove = Date.now();
    if (session.usePerson && now - lastPerson > 1000) {
      lastPerson = now;
      detect(src, { minScore: 0.5 }).then((found) => {
        const sw = src.videoWidth || src.width;
        const sh = src.videoHeight || src.height;
        session.persons = found.filter((f) => f.class === 'person').map((f) => ({
          x: f.bbox[0] / sw, y: f.bbox[1] / sh, w: f.bbox[2] / sw, h: f.bbox[3] / sh, score: f.score,
        }));
      }).catch(() => {});
    }
    const p = session.persons[0];
    session.reading = { ...r, person: p ? { x: p.x + p.w / 2, y: p.y + p.h / 2 } : null };
    for (const a of session.alerter.check(session.reading, session.zone, now)) fire(a);
    redraw('tick');
  }, TICK_MS);
  redraw();
}

function stop() {
  clearInterval(session.timer);
  session.timer = null;
  session.stream?.getTracks().forEach((t) => t.stop());
  session.stream = null;
  session.video = null;
  session.scene?.stop();
  session.scene = null;
  session.mode = 'off';
  session.reading = null;
  session.persons = [];
}

async function fire(a) {
  const s = await store.settings();
  await store.addEvent({ type: 'watch', alert: a.alert, severity: a.severity, text: a.text, demo: session.mode === 'demo' });
  session.flashUntil = Date.now() + 4000;
  redraw('alert');
  toast(a.alert === 'zone' ? `${store.babyName()} left the safe zone` : 'The phone was moved');
  try { navigator.vibrate?.([300, 150, 300]); } catch {}
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(a.alert === 'zone' ? 'Left the safe zone' : 'The phone was moved', { body: a.text, tag: `nila-${a.alert}` });
  } catch {}
  if (a.severity === 'urgent' && s.lightsOnAlert) ringLight(4000);
  if (a.severity === 'urgent' && s.soundOnAlert) lullaby(8000);
}

function ringLight(ms) {
  const el = document.createElement('div');
  el.className = 'ringlight';
  document.body.append(el);
  setTimeout(() => el.remove(), ms);
}

function lullaby(ms) {
  const ctx = engine.audioContext();
  const s = playSound(ctx, 'humming', ctx.destination);
  setTimeout(() => s.stop(), ms);
}

// ---- the screen -----------------------------------------------------------------

export async function render(root) {

  async function draw() {
    const s = await store.settings();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const alerts = (await store.events({ type: 'watch' })).filter((e) => e.t >= today.getTime() - 864e5).slice(0, 5);
    const running = session.mode !== 'off';

    root.innerHTML = str(html`
      <div class="hero">
        <div><h2>Safety watch</h2><p>Point the camera at the cot. Frames are analysed on this device and never leave it.</p></div>
        ${raw(ill.cot())}
      </div>
      ${session.error ? html`<div class="notice attention">${I('warn')}<div>${session.error}</div></div>` : ''}
      <section class="card">
        ${running ? html`
          <div class="cam" id="cam">
            <canvas class="view" id="view"></canvas>
            <canvas class="overlay" id="overlay"></canvas>
            <span class="cam-label chip ${session.mode === 'demo' ? 'plum' : 'calm'}"><span class="dot"></span>${session.mode === 'demo' ? 'Demo footage' : 'Watching'}</span>
          </div>
          <div class="setting-row">
            <div class="grow"><div class="t" id="watch-status">Watching</div><div class="s">Drag on the view to draw the safe zone.</div></div>
          </div>
          <button class="btn outline" data-stop>${I('stop')} Stop the watch</button>`
        : html`
          <div class="card-row" style="margin-bottom:14px">
            <span class="badge tone-slate">${I('eyeOff')}</span>
            <div class="grow"><h3>Not watching</h3><div class="muted">Start the watch to see her movement and keep her inside a safe zone.</div></div>
          </div>
          <button class="btn primary" data-start>${I('play')} Start safety watch</button>
          <p class="small muted" style="text-align:center;margin:10px 0 14px">Not a breathing monitor. Best with a night light.</p>
          <button class="link-row tinted" data-demo>
            <span class="badge sm tone-teal">${I('video')}</span>
            <span class="grow"><div class="t">Play demo footage</div><div class="s">An animated stand-in, through the same tracker</div></span>
            ${raw(icon('chevron', 'chev'))}
          </button>`}
      </section>

      ${alerts.length ? html`
        <h2 class="h-section">Alerts</h2>
        ${alerts.map((e) => html`
          <div class="alert-row ${e.severity === 'urgent' ? 'urgent' : ''}">
            <span class="badge sm ${e.severity === 'urgent' ? 'tone-urgent' : 'tone-slate'}">${I(e.alert === 'moved' ? 'phone' : 'eye')}</span>
            <div class="grow"><div class="t">${e.alert === 'zone' ? 'Left the safe zone' : 'The phone was moved'} ${e.severity === 'urgent' ? html`<span class="chip urgent" style="margin-left:4px"><span class="dot"></span>URGENT</span>` : ''}</div>
              <div class="s">${timeOf(e.t)} · ${e.text}${e.demo ? ' (demo)' : ''}${e.sample ? ' (sample)' : ''}</div></div>
          </div>`)}` : ''}

      <h2 class="h-section">Safe zone</h2>
      <p class="muted" style="margin-top:-4px">The part of the camera view she should stay inside. Movement outside it is an urgent alert.</p>
      <div class="btn-row" style="margin-top:0"><button class="btn outline small" data-reset-zone>Reset the zone to the middle</button></div>
      <section class="card" style="margin-top:14px">
        <label class="setting-row">
          <span class="badge sm tone-blue">${I('person')}</span>
          <div class="grow"><div class="t">Also look for a person</div><div class="s">Downloads a small vision model once, then runs on this device</div></div>
          <span class="switch"><input type="checkbox" data-person ${session.usePerson ? raw('checked') : ''}><span></span></span>
        </label>
        <label class="setting-row">
          <span class="badge sm tone-pink">${I('light')}</span>
          <div class="grow"><div class="t">Lights and sound on alerts</div><div class="s">The screen flashes like a ring light and a lullaby plays. A notification is always sent.</div></div>
          <span class="switch"><input type="checkbox" data-lights ${s.lightsOnAlert ? raw('checked') : ''}><span></span></span>
        </label>
        <div class="btn-row"><button class="btn tonal small" data-test-lullaby>${I('lullaby')} Lullaby</button><button class="btn tonal small" data-test-flash>${I('light')} Flash</button></div>
      </section>

      <h2 class="h-section">Where to put the phone</h2>
      <section class="card">
        ${['At the side of the cot, at the head or the foot.', 'So she lies across the picture, not up and down it.', 'Steady, and a little above the rail. Plugged in.'].map((t, i) => html`
          <div class="setting-row"><span class="badge sm tone-teal" style="font-weight:700">${i + 1}</span><div class="grow">${t}</div></div>`)}
      </section>

      <button class="link-row" data-babyproof>
        <span class="badge sm tone-peach">${I('shield')}</span>
        <span class="grow"><div class="t">Babyproof a room</div><div class="s">One photo; Nila points out what to fix first</div></span>
        ${raw(icon('chevron', 'chev'))}
      </button>
      <p class="small faint" style="margin:14px 4px">Family CCTV cameras on the Wi-Fi are not supported in the browser yet.</p>`);

    root.querySelector('[data-start]')?.addEventListener('click', () => start('camera'));
    root.querySelector('[data-demo]')?.addEventListener('click', () => start('demo'));
    root.querySelector('[data-stop]')?.addEventListener('click', () => { stop(); draw(); });
    root.querySelector('[data-babyproof]').onclick = () => (location.hash = '#/babyproof');
    root.querySelector('[data-reset-zone]').onclick = async () => {
      session.zone = DEFAULT_ZONE;
      await store.setValue('zone', DEFAULT_ZONE);
      toast('Safe zone reset');
    };
    root.querySelector('[data-person]').onchange = async (e) => {
      session.usePerson = e.target.checked;
      if (session.usePerson) {
        toast('Loading the vision model…');
        try {
          await loadDetector();
          toast('Person detection is on');
        } catch {
          session.usePerson = false;
          e.target.checked = false;
          toast('The model could not be downloaded. Movement still works.');
        }
      } else session.persons = [];
    };
    root.querySelector('[data-lights]').onchange = (e) => store.saveSettings({ lightsOnAlert: e.target.checked });
    root.querySelector('[data-test-lullaby]').onclick = () => lullaby(5000);
    root.querySelector('[data-test-flash]').onclick = () => ringLight(2000);
    if (running) bindZone();
  }

  function bindZone() {
    const cam = $('#cam', root);
    let startPt = null;
    const pt = (e) => {
      const r = cam.getBoundingClientRect();
      return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
    };
    cam.onpointerdown = (e) => {
      startPt = pt(e);
      cam.setPointerCapture(e.pointerId);
    };
    cam.onpointermove = (e) => {
      if (!startPt) return;
      const p = pt(e);
      session.zone = { x: Math.min(startPt.x, p.x), y: Math.min(startPt.y, p.y), w: Math.abs(p.x - startPt.x), h: Math.abs(p.y - startPt.y) };
      paint();
    };
    cam.onpointerup = async () => {
      if (!startPt) return;
      startPt = null;
      if (session.zone.w < 0.08 || session.zone.h < 0.08) session.zone = DEFAULT_ZONE;
      await store.setValue('zone', session.zone);
      toast('Safe zone saved');
    };
  }

  function paint() {
    const view = $('#view', root);
    const overlay = $('#overlay', root);
    const src = source();
    if (!view || !overlay || !src) return;
    const w = view.clientWidth;
    const h = view.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    for (const c of [view, overlay]) {
      if (c.width !== Math.round(w * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
    }
    const v = view.getContext('2d');
    v.drawImage(src, 0, 0, view.width, view.height);
    const o = overlay.getContext('2d');
    o.setTransform(dpr, 0, 0, dpr, 0, 0);
    o.clearRect(0, 0, w, h);
    const z = session.zone;
    const flashing = Date.now() < session.flashUntil;
    o.strokeStyle = flashing ? '#ff5b4f' : getComputedStyle(document.documentElement).getPropertyValue('--zone');
    o.lineWidth = 3;
    o.strokeRect(z.x * w, z.y * h, z.w * w, z.h * h);
    o.fillStyle = o.strokeStyle;
    for (const [x, y] of [[z.x, z.y], [z.x + z.w, z.y], [z.x, z.y + z.h], [z.x + z.w, z.y + z.h]]) {
      o.beginPath();
      o.arc(x * w, y * h, 6, 0, Math.PI * 2);
      o.fill();
    }
    o.font = '600 13px Roboto, system-ui, sans-serif';
    const label = 'Safe zone';
    const lw = o.measureText(label).width + 16;
    o.fillStyle = 'rgba(0,0,0,.55)';
    o.fillRect(z.x * w + (z.w * w - lw) / 2, (z.y + z.h) * h - 26, lw, 22);
    o.fillStyle = '#fff';
    o.fillText(label, z.x * w + (z.w * w - lw) / 2 + 8, (z.y + z.h) * h - 10);
    const r = session.reading;
    if (r?.centroid && r.fg > 0.004) {
      o.fillStyle = 'rgba(255,255,255,.9)';
      o.beginPath();
      o.arc(r.centroid.x * w, r.centroid.y * h, 7, 0, Math.PI * 2);
      o.fill();
    }
    o.strokeStyle = '#A8C8E8';
    o.lineWidth = 2;
    for (const p of session.persons) o.strokeRect(p.x * w, p.y * h, p.w * w, p.h * h);
    const st = $('#watch-status', root);
    if (st) {
      const secs = session.lastMove ? Math.round((Date.now() - session.lastMove) / 1000) : null;
      st.textContent = secs === null ? 'Watching · no movement yet' : secs < 2 ? 'Watching · moving now' : `Watching · last movement ${secs}s ago`;
    }
  }

  redraw = (why) => {
    if (!root.isConnected) return;
    if (why === 'tick') paint();
    else draw();
  };
  await draw();
  // keep the live view moving between tracker ticks
  let raf = 0;
  const loop = () => {
    if (session.mode !== 'off') paint();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    redraw = () => {};
  };
}
