// Timeline: one entry per cry (its steps a tap away), the quick log, and Watch
// alerts, on one line through the day.

import * as store from '../store.js';
import { soundName } from '../monitor/sounds.js';
import { icon } from '../icons.js';
import { html, str, raw, duration, timeOf, clock, ago, toast } from '../ui.js';
import { summarize, startOfDay, DAY } from '../lib/summaries.js';
import { sampleWeek } from '../lib/sample-week.js';

const I = (n) => raw(icon(n));
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
const RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
];

let range = 'today';

function bounds(id, now) {
  const today = startOfDay(now);
  if (id === 'today') return [today, today + DAY];
  if (id === 'yesterday') return [today - DAY, today];
  return [today - (Number(id) - 1) * DAY, today + DAY];
}

function dayTitle(from, now) {
  const today = startOfDay(now);
  if (from === today) return 'Today';
  if (from === today - DAY) return 'Yesterday';
  return new Date(from).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });
}

function cryCard(e) {
  const name = store.babyName();
  const len = duration(e.durationMs);
  if (e.outcome === 'woke') {
    return {
      cls: 'urgent', pin: 'var(--urgent)', badge: 'tone-urgent', icon: 'sad',
      title: html`<span>Cry – you were woken</span><span class="chip urgent"><span class="dot"></span>URGENT</span>`,
      text: `${len}. ${e.reason ? `${e.reason.headline} — a guess from the log.` : ''} Nila tried ${e.tried.map((t) => soundName(t.soundId).toLowerCase()).join(' and ') || 'nothing'} first, then woke you.`,
    };
  }
  if (e.outcome === 'settled') {
    return {
      cls: '', pin: 'var(--plum-ink)', badge: 'tone-plum', icon: 'sad',
      title: html`<span>Cry – settled by ${soundName(e.settledWith).toLowerCase()}</span>`,
      text: (() => {
        const failed = e.tried.filter((t) => !t.helped).map((t) => soundName(t.soundId).toLowerCase());
        const by = soundName(e.settledWith);
        return failed.length
          ? `${len}. ${cap(failed.join(' and '))} didn't help; ${by.toLowerCase()} did. Nobody was woken.`
          : `${len}. ${by} settled her. Nobody was woken.`;
      })(),
    };
  }
  if (e.outcome === 'stopped') {
    return { cls: '', pin: 'var(--slate-ink)', badge: 'tone-slate', icon: 'sad', title: html`<span>Cry</span>`, text: `${len}. Listening was stopped during it.` };
  }
  return { cls: '', pin: 'var(--plum-ink)', badge: 'tone-plum', icon: 'sad', title: html`<span>Cry</span>`, text: `${len}. ${name} settled on her own.` };
}

function entry(e, now) {
  let c;
  if (e.type === 'cry') c = cryCard(e);
  else if (e.type === 'feed') c = { pin: 'var(--teal-ink)', badge: 'tone-teal', icon: 'bottle', title: html`<span>Feed</span>`, text: ago(e.t, now) };
  else if (e.type === 'nappy') c = { pin: 'var(--peach-ink)', badge: 'tone-peach', icon: 'nappy', title: html`<span>Nappy change</span>`, text: ago(e.t, now) };
  else if (e.type === 'sleep') c = { pin: 'var(--blue-ink)', badge: 'tone-blue', icon: 'sleep', title: html`<span>Sleep</span>`, text: e.end ? `${duration(e.end - e.start)}, until ${timeOf(e.end)}` : `Asleep now, for ${duration(now - e.start)}` };
  else if (e.type === 'watch') {
    const urgent = e.severity === 'urgent';
    const titles = { zone: 'Left the safe zone', moved: 'The phone was moved', still: 'Out of view of the camera', hazard: 'Hazard seen' };
    c = {
      cls: urgent ? 'urgent' : '', pin: urgent ? 'var(--urgent)' : 'var(--slate-ink)', badge: urgent ? 'tone-urgent' : 'tone-slate', icon: e.alert === 'moved' ? 'phone' : 'eye',
      title: html`<span>${titles[e.alert] || 'Safety watch'}</span>${urgent ? html`<span class="chip urgent"><span class="dot"></span>URGENT</span>` : ''}`,
      text: e.text,
    };
  } else return '';
  return html`
    <div class="tl-item">
      <time>${timeOf(e.t)}</time><span class="pin" style="background:${raw(c.pin)}"></span>
      <div class="tl-card ${c.cls || ''}" ${e.type === 'cry' ? raw(`data-open="${e.id}" role="button" tabindex="0"`) : ''}>
        <span class="badge sm ${c.badge}">${I(c.icon)}</span>
        <div class="grow">
          <div class="t">${c.title}</div>
          <div class="s">${c.text}</div>
          ${e.sample ? html`<span class="chip slate" style="margin-top:6px">Sample</span>` : ''}
          ${e.demo ? html`<span class="chip plum" style="margin-top:6px">Demo</span>` : ''}
          ${e.clipId ? html`<div class="kept">${I('wave')} Recording kept</div>` : ''}
          <div class="tl-detail" data-detail="${e.id}" hidden></div>
        </div>
        ${e.type === 'cry' ? raw(icon('chevron', 'chev')) : ''}
      </div>
    </div>`;
}

export async function render(root) {
  let urls = [];

  async function draw() {
    urls.forEach(URL.revokeObjectURL);
    urls = [];
    const now = Date.now();
    const all = await store.events();
    const [from, to] = bounds(range, now);
    const list = all.filter((e) => (e.type === 'sleep' ? (e.end ?? now) > from && e.start < to : e.t >= from && e.t < to));
    const s = summarize(all, from, Math.min(to, now + 1), now);
    const hasSamples = all.some((e) => e.sample);

    // group by day, newest first
    const days = new Map();
    for (const e of list) {
      const d = startOfDay(e.type === 'sleep' ? Math.max(e.start, from) : e.t);
      if (!days.has(d)) days.set(d, []);
      days.get(d).push(e);
    }

    root.innerHTML = str(html`
      <div class="seg" role="group" aria-label="Range" style="margin-bottom:14px">
        ${RANGES.map((r) => html`<button data-range="${r.id}" aria-pressed="${r.id === range}">${r.label}</button>`)}
      </div>
      <section class="card flat" style="padding:4px 0">
        <div class="tiles">
          <div><span class="badge sm tone-plum">${I('sad')}</span><b>${s.cries}</b><span>cries</span><small>${duration(s.cryMs)} total</small></div>
          <div><span class="badge sm tone-blue">${I('sleep')}</span><b>${duration(s.sleepMs)}</b><span>sleep</span><small>${s.sleepStretches} stretch${s.sleepStretches === 1 ? '' : 'es'}</small></div>
          <div><span class="badge sm tone-teal">${I('bottle')}</span><b>${s.feeds}</b><span>feeds</span><small>${s.lastFeed ? `last ${ago(s.lastFeed, now).replace(' ago', '')}` : 'none'}</small></div>
          <div><span class="badge sm tone-peach">${I('nappy')}</span><b>${s.nappies}</b><span>nappies</span><small>${s.lastNappy ? `last ${ago(s.lastNappy, now).replace(' ago', '')}` : 'none'}</small></div>
        </div>
      </section>
      ${!list.length ? html`
        <div class="card empty">
          ${I('history')}
          <p>Nothing here yet. Cries Nila hears, what you log on the Monitor screen and Watch alerts all land on this line.</p>
          ${hasSamples ? '' : html`<button class="btn tonal small" data-sample>Add a sample week</button>`}
        </div>` : ''}
      ${[...days.entries()].sort((a, b) => b[0] - a[0]).map(([d, evs]) => html`
        <div class="day-head">${I('sun')}<b>${dayTitle(d, now)}</b><span class="muted small">${evs.length} event${evs.length === 1 ? '' : 's'}</span></div>
        <div class="tl">${evs.sort((a, b) => b.t - a.t).map((e) => entry(e, now))}</div>`)}
      ${hasSamples ? html`<button class="text-btn" data-remove>${I('trash')} Remove the samples</button>` : ''}`);

    root.querySelectorAll('[data-range]').forEach((b) => (b.onclick = () => { range = b.dataset.range; draw(); }));
    root.querySelector('[data-sample]')?.addEventListener('click', addSamples);
    root.querySelector('[data-remove]')?.addEventListener('click', async () => {
      await store.removeSamples();
      toast('Sample entries removed');
    });
    root.querySelectorAll('[data-open]').forEach((card) => {
      const open = () => toggle(card, all.find((e) => e.id === card.dataset.open));
      card.onclick = (ev) => { if (!ev.target.closest('audio, button')) open(); };
      card.onkeydown = (ev) => { if (ev.key === 'Enter') open(); };
    });
  }

  async function toggle(card, e) {
    const d = card.querySelector('[data-detail]');
    if (!d.hidden) return void (d.hidden = true);
    let audio = '';
    if (e.clipId) {
      const blob = await store.getBlob(e.clipId);
      if (blob) {
        const u = URL.createObjectURL(blob);
        urls.push(u);
        audio = html`<audio controls preload="metadata" src="${u}"></audio><div class="small muted">Kept because it woke you. On this device only.</div>`;
      }
    }
    d.innerHTML = str(html`
      <div class="small muted" style="margin-bottom:4px">The ${e.steps.length} steps Nila took</div>
      <ol class="steps">${e.steps.map((s) => html`<li><time>${clock(s.at)}</time><span>${s.text}</span></li>`)}</ol>
      ${audio}
      <button class="text-btn" data-del>${I('trash')} Delete this entry</button>`);
    d.querySelector('[data-del]').onclick = async (ev) => {
      ev.stopPropagation();
      if (e.clipId) await store.deleteBlob(e.clipId);
      await store.deleteEvent(e.id);
    };
    d.hidden = false;
  }

  async function addSamples() {
    range = '7';
    await store.addEvents(sampleWeek());
    toast('A sample week was added. It is labelled and can be removed.');
  }

  await draw();
  const off = store.onChange((w) => w === 'events' && draw());
  return () => {
    off();
    urls.forEach(URL.revokeObjectURL);
  };
}
