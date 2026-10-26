// Monitor: the ladder, live. Heard → Soothe → Check → Wake you.

import * as engine from '../monitor/audio-engine.js';
import { SOUNDS, soundName } from '../monitor/sounds.js';
import * as store from '../store.js';
import { icon } from '../icons.js';
import { html, str, raw, clock, timeOf, sheet, $ } from '../ui.js';
import { renderQuickLog } from './quicklog.js';

const I = (n) => raw(icon(n));

export async function render(root) {
  root.innerHTML = `
    <div id="m-error"></div>
    <section class="card status-card" id="m-status" aria-live="polite"></section>
    <div id="m-result"></div>
    <div id="m-tried"></div>
    <section class="card level-card">
      <div class="card-head"><h3>Crying level</h3><span class="legend">loud ↑ &nbsp;calm ↓</span></div>
      <canvas id="m-level" height="140" aria-label="Crying level over the last minute"></canvas>
    </section>
    <div id="m-notice"></div>
    <div id="m-quick"></div>`;

  let key = '';
  let triedKey = '';
  let resultKey = '';
  const canvas = $('#m-level', root);

  const unsub = engine.subscribe((s) => {
    const live = s.live;
    const k = [s.mode, s.scenario, live ? live.steps.length : '-', live?.woke, live?.sound, live?.helping, s.error, s.hidden].join('|');
    if (k !== key) {
      key = k;
      renderStatus(s);
      renderNotice(s);
    } else if (live) {
      updateLive(s);
    }
    const tk = JSON.stringify([live?.tried, live?.sound, s.last?.id]);
    if (tk !== triedKey) {
      triedKey = tk;
      renderTried(s);
    }
    const rk = live ? `live:${live.reason?.headline || ''}` : s.last ? s.last.id : '';
    if (rk !== resultKey) {
      resultKey = rk;
      renderResult(s);
    }
    drawLevel(canvas, s);
  });

  const stopQuick = await renderQuickLog($('#m-quick', root));

  return () => {
    unsub();
    stopQuick?.();
  };
}

// ---- the status card -------------------------------------------------------------

function rungs(s) {
  const t = s.timings;
  const live = s.live;
  const e = live?.elapsed ?? -1;
  const played = live?.steps.some((x) => x.kind === 'soothe');
  const checked = (live?.tried.length ?? 0) > 0;
  const state = (done, now) => (done ? 'done' : now ? 'now' : '');
  return [
    { label: 'Heard', at: 0, icon: 'check', cls: state(!!live, false) },
    { label: 'Soothe', at: t.sootheAtMs, icon: 'note', cls: state(played, live && !played) },
    { label: 'Check', at: t.sootheAtMs + t.perSoundMs, icon: 'question', cls: state(checked, played && !checked) },
    { label: 'Wake you', at: t.wakeAtMs, icon: 'bang', cls: live?.woke ? 'alarm' : state(false, checked && e < t.wakeAtMs) },
  ];
}

function ladderHtml(s) {
  const t = s.timings;
  const frac = s.live ? Math.min(1, s.live.elapsed / t.wakeAtMs) : 0;
  return html`
    <div class="ladder" aria-label="The ladder">
      <div class="track"></div>
      <div class="fill" data-fill style="width:${(frac * 75).toFixed(2)}%"></div>
      ${rungs(s).map((r) => html`
        <div class="rung ${r.cls}">
          <span class="knob">${I(r.cls === 'done' ? 'check' : r.icon)}</span>
          <b>${r.label}</b><small>${clock(r.at)}</small>
        </div>`)}
    </div>`;
}

function phaseText(live) {
  if (live.woke) return 'you were woken';
  if (live.helping) return `settling to ${soundName(live.helping).toLowerCase()}`;
  if (live.sound) return `crying, playing ${soundName(live.sound).toLowerCase()}`;
  return 'crying';
}

function nextStep(s) {
  const t = s.timings;
  const l = s.live;
  const e = l.elapsed;
  if (l.woke) return { t: 'You were woken', s: 'Nila stops trying once you are on your way.', at: null };
  if (l.helping) return { t: `Settling to ${soundName(l.helping).toLowerCase()}`, s: 'It helped, so it keeps playing until she is quiet.', at: e < t.wakeAtMs ? t.wakeAtMs : null };
  if (!l.sound && !l.tried.length) return { t: 'Next: play a sound', s: 'To settle her before waking anyone', at: t.sootheAtMs };
  if (l.sound) return { t: `Next: check if ${soundName(l.sound).toLowerCase()} helped`, s: 'By measuring the crying, not assuming', at: l.soundAt + t.perSoundMs };
  return { t: 'Next: wake you', s: 'Nothing has settled her yet', at: t.wakeAtMs };
}

function renderStatus(s) {
  const el = $('#m-status');
  if (!el) return;
  const live = s.live;
  const demoChip = s.mode === 'demo' ? html`<span class="chip plum"><span class="dot"></span>Demo</span>` : '';

  if (s.mode === 'off') {
    el.innerHTML = str(html`
      <div class="status-line"><span class="dot off"></span><h3>Not listening</h3></div>
      <p class="muted" style="margin:10px 0 0">Leave this phone near the cot. When she cries, Nila tries a sound first, checks whether it helped, and only then wakes you.</p>
      ${ladderHtml(s)}
      <button class="btn primary" data-listen>${I('mic')} Start listening</button>
      <div style="height:10px"></div>
      <button class="btn outline" data-demo>${I('play')} Try a demo cry</button>`);
    el.querySelector('[data-listen]').onclick = () => engine.startListening();
    el.querySelector('[data-demo]').onclick = chooseDemo;
    return;
  }

  if (!live) {
    el.innerHTML = str(html`
      <div class="status-line"><span class="dot live"></span><h3>Listening</h3>${demoChip}</div>
      <p class="muted" style="margin:10px 0 0">${s.mode === 'demo' ? 'The demo cry is starting…' : 'Quiet. Nila is listening for a cry.'}</p>
      ${ladderHtml(s)}
      <button class="btn outline" data-stop>${I('stop')} ${s.mode === 'demo' ? 'Stop the demo' : 'Stop listening'}</button>`);
    el.querySelector('[data-stop]').onclick = () => engine.stop();
    return;
  }

  const n = nextStep(s);
  el.innerHTML = str(html`
    <div class="status-line"><span class="dot cry"></span><h3>Crying</h3>${demoChip}</div>
    <div class="clock-row">
      <span class="clock" data-clock>${clock(live.elapsed)}</span>
      <div><div class="what">${phaseText(live)}</div><div class="sure" data-sure>${sureText(s)}</div></div>
    </div>
    ${ladderHtml(s)}
    <div class="next-card">
      <span class="badge sm tone-teal">${I(live.woke ? 'bell' : 'clock')}</span>
      <div class="grow"><div class="t">${n.t}</div><div class="s">${n.s}</div></div>
      ${n.at !== null ? html`<span class="count" data-count>in ${clock(n.at - live.elapsed)}</span>` : ''}
    </div>
    <div style="height:14px"></div>
    <button class="btn outline" data-stop>${I('stop')} ${s.mode === 'demo' ? 'Stop the demo' : 'Stop listening'}</button>`);
  el.querySelector('[data-stop]').onclick = () => engine.stop();
}

function sureText(s) {
  return `${Math.round(s.reading.score * 100)}% of the last 3 s sounded like a cry`;
}

function updateLive(s) {
  const el = $('#m-status');
  if (!el) return;
  const live = s.live;
  const c = el.querySelector('[data-clock]');
  if (c) c.textContent = clock(live.elapsed);
  const sure = el.querySelector('[data-sure]');
  if (sure) sure.textContent = sureText(s);
  const fill = el.querySelector('[data-fill]');
  if (fill) fill.style.width = `${(Math.min(1, live.elapsed / s.timings.wakeAtMs) * 75).toFixed(2)}%`;
  const count = el.querySelector('[data-count]');
  const n = nextStep(s);
  if (count && n.at !== null) count.textContent = `in ${clock(n.at - live.elapsed)}`;
}

function chooseDemo() {
  sheet((body, close) => {
    body.innerHTML = str(html`
      <h2>Try a demo cry</h2>
      <p class="muted">A synthesized cry plays through your speakers and goes through the same detector the microphone uses. The demo baby is scripted.</p>
      <button class="option" data-s="settles">
        <span class="badge tone-teal">${I('sleep')}</span>
        <span class="grow"><div class="t">A cry that settles</div><div class="s">She calms to humming or a voice, not to white noise. Run it twice to see Nila learn.</div></span>
      </button>
      <button class="option" data-s="needs-you">
        <span class="badge tone-urgent">${I('bell')}</span>
        <span class="grow"><div class="t">A cry that needs you</div><div class="s">Nothing settles her, so Nila wakes you at the last rung.</div></span>
      </button>`);
    body.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => {
      close();
      engine.startDemo(b.dataset.s);
    }));
  });
}

// ---- notices -----------------------------------------------------------------

function renderNotice(s) {
  const el = $('#m-notice');
  const err = $('#m-error');
  if (!el) return;
  const parts = [];
  if (s.mode === 'demo') {
    const speed = s.timings.wakeAtMs < 90000 ? `, with the ladder at ${Math.round(90000 / s.timings.wakeAtMs)}× speed` : ', in real time';
    parts.push(html`<div class="notice plum">${I('info')}<div>Demo: a synthesized cry through the real detector${speed}. Nothing is wrong. ${s.scenario === 'needs-you' ? `You are woken at ${clock(s.timings.wakeAtMs)}.` : 'She calms to humming, not to white noise.'}</div></div>`);
  }
  if (s.mode === 'mic' && s.hidden) {
    parts.push(html`<div class="notice attention">${I('warn')}<div>Nila is in the background. Some browsers pause the microphone here, so keep Nila on screen while she sleeps.</div></div>`);
  }
  if (s.mode === 'mic' && !s.hidden) {
    parts.push(html`<div class="notice teal">${I('info')}<div>Keep this screen on and the phone plugged in. Sound is analysed on this device; nothing is uploaded.</div></div>`);
  }
  el.innerHTML = parts.map(str).join('');
  err.innerHTML = s.error ? str(html`<div class="notice attention">${I('warn')}<div>${s.error}</div></div>`) : '';
}

// ---- what Nila tried -------------------------------------------------------------

function renderTried(s) {
  const el = $('#m-tried');
  if (!el) return;
  const src = s.live || (s.last ? { tried: s.last.tried, sound: null } : null);
  if (!src || (!src.tried.length && !src.sound)) {
    el.innerHTML = '';
    return;
  }
  const rows = src.tried.map((t) => html`
    <div class="tried-row">
      <span class="badge sm tone-${SOUNDS[t.soundId]?.tone || 'slate'}">${I(SOUNDS[t.soundId]?.icon || 'note')}</span>
      <div class="grow"><div class="t">${soundName(t.soundId)}</div><div class="s">${clock(t.from)} – ${clock(t.to)} · ${t.text}</div></div>
      <span class="chip ${t.helped ? 'calm' : 'attention'}">${t.helped ? 'Helped' : "Didn't help"}</span>
    </div>`);
  if (src.sound && !src.helping) {
    rows.push(html`
      <div class="tried-row">
        <span class="badge sm tone-${SOUNDS[src.sound]?.tone}">${I(SOUNDS[src.sound]?.icon || 'note')}</span>
        <div class="grow"><div class="t">${soundName(src.sound)}</div><div class="s">playing since ${clock(src.soundAt)}</div></div>
        <span class="chip teal">Playing</span>
      </div>`);
  }
  el.innerHTML = str(html`
    <section class="card">
      <div class="card-head"><h3>What Nila tried</h3><span class="muted small">measured, not assumed</span></div>
      ${rows}
    </section>`);
}

// ---- the last cry, once it is over ---------------------------------------------------

function outcomeText(e) {
  const name = store.babyName();
  if (e.outcome === 'stopped') return `Listening was stopped ${clock(e.durationMs)} into a cry.`;
  if (e.outcome === 'self') return `${name} settled on her own after ${clock(e.durationMs)}. No sound was needed.`;
  if (e.outcome === 'settled') return `${soundName(e.settledWith)} settled ${name} at ${clock(e.durationMs)}. Nobody was woken.`;
  const woke = e.steps.find((st) => st.kind === 'wake');
  return `Nila woke you at ${clock(woke?.at ?? 0)}. ${name} cried for ${clock(e.durationMs)} in all.`;
}

function renderResult(s) {
  const el = $('#m-result');
  if (!el) return;
  if (s.live) {
    const r = s.live.reason;
    el.innerHTML = r ? str(html`
      <section class="card result-card">
        <div class="overline">Best guess</div>
        <div class="big">${r.headline}.</div>
        <p class="muted" style="margin:0">${r.detail}</p>
      </section>`) : '';
    return;
  }
  const e = s.last;
  if (!e) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = str(html`
    <section class="card result-card">
      <div class="overline">${e.demo ? 'Demo cry' : 'Last cry'} · ${timeOf(e.t)}</div>
      <div class="big">${outcomeText(e)}</div>
      ${e.reason ? html`<p style="margin:0 0 6px"><b>${e.reason.headline}</b> <span class="muted">${e.reason.detail}</span></p>` : ''}
      <details>
        <summary class="text-btn">Show the ${e.steps.length} steps Nila took</summary>
        <ol class="steps">${e.steps.map((st) => html`<li><time>${clock(st.at)}</time><span>${st.text}</span></li>`)}</ol>
      </details>
      <div class="btn-row"><button class="btn outline" data-dismiss>Dismiss</button></div>
    </section>`);
  el.querySelector('[data-dismiss]').onclick = () => engine.dismissLast();
}

// ---- crying level line ---------------------------------------------------------------

function drawLevel(canvas, s) {
  if (!canvas || !canvas.isConnected) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = 140;
  if (canvas.width !== Math.round(w * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const css = getComputedStyle(document.documentElement);
  const base = h - 34;
  g.strokeStyle = css.getPropertyValue('--chart-grid');
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, base + 0.5);
  g.lineTo(w, base + 0.5);
  g.stroke();
  g.fillStyle = css.getPropertyValue('--muted');
  g.font = '12.5px Roboto, system-ui, sans-serif';
  g.textAlign = 'right';
  g.fillText('now', w - 2, h - 10);
  const pts = s.trace;
  if (s.mode === 'off' && !pts.length) {
    g.textAlign = 'left';
    g.fillText('Start listening to see the crying level', 0, base - 40);
    return;
  }
  if (pts.length < 2) return;
  const now = pts[pts.length - 1].t;
  const span = 60000;
  const x = (t) => w - 8 - ((now - t) / span) * (w - 16);
  const y = (l) => base - l * (base - 10);
  g.strokeStyle = css.getPropertyValue('--chart-cry');
  g.lineWidth = 2.5;
  g.lineJoin = 'round';
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(x(p.t), y(p.level)) : g.moveTo(x(p.t), y(p.level))));
  g.stroke();
  const last = pts[pts.length - 1];
  g.fillStyle = css.getPropertyValue('--chart-cry');
  g.beginPath();
  g.arc(x(last.t), y(last.level), 4.5, 0, Math.PI * 2);
  g.fill();
}
