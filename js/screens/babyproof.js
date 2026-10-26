// Babyproof a room: one photo, objects found in the browser, a numbered list of
// what to fix first, each with what to do and where the advice comes from.

import * as store from '../store.js';
import { detect, loadDetector } from '../watch/vision.js';
import { hazardsFrom, SOURCES, GENERAL_CHECKS } from '../data/hazards.js';
import { icon } from '../icons.js';
import { ill } from '../illustrations.js';
import { html, str, raw, shrinkImage, toast, dayOf } from '../ui.js';

const I = (n) => raw(icon(n));

export async function render(root, { params }) {
  let urls = [];
  const keep = (blob) => {
    const u = URL.createObjectURL(blob);
    urls.push(u);
    return u;
  };

  async function home() {
    const rooms = await store.list('rooms');
    root.innerHTML = str(html`
      <div class="hero">
        <div><h2>Is this room baby-safe?</h2><p>Take a photo of a room your baby will crawl in. Nila points out what to cover, lock, anchor or move. The photo stays on this device.</p></div>
        ${raw(ill.room())}
      </div>
      <div class="grid2">
        <label class="tile" style="cursor:pointer">
          <span class="badge sm tone-teal">${I('camera')}</span>
          <span class="t">Take a photo</span><span class="s">Of the whole room</span>
          <input type="file" accept="image/*" capture="environment" data-pick hidden>
        </label>
        <label class="tile" style="cursor:pointer">
          <span class="badge sm tone-blue">${I('image')}</span>
          <span class="t">Upload a picture</span><span class="s">From your gallery</span>
          <input type="file" accept="image/*" data-pick hidden>
        </label>
      </div>
      <section class="card flat" style="margin-top:14px;background:var(--card-2)">
        <div class="t" style="font-weight:600;margin-bottom:6px">For a good photo</div>
        ${['Stand in a corner so the whole room fits', 'Daylight or the lights on', 'Then take one low down, at a crawling baby’s height'].map((t) => html`<div class="setting-row" style="padding:6px 0">${I('check')}<span>${t}</span></div>`)}
      </section>
      ${rooms.length ? html`
        <h2 class="h-section">Rooms you checked</h2>
        ${rooms.map((r) => html`
          <button class="link-row" data-room="${r.id}">
            <span class="badge sm tone-peach">${I('shield')}</span>
            <span class="grow"><div class="t">${r.title}</div><div class="s">${dayOf(r.t)} · ${r.hazards.filter((h) => !r.done.includes(h.cls)).length} to fix, ${r.done.length} done</div></span>
            ${raw(icon('chevron', 'chev'))}
          </button>`)}` : ''}
      <p class="small faint" style="margin:16px 4px">The first check downloads a small vision model (about 5 MB) once. After that, photos are analysed on this device.</p>`);
    root.querySelectorAll('[data-pick]').forEach((inp) => (inp.onchange = () => inp.files[0] && analyse(inp.files[0])));
    root.querySelectorAll('[data-room]').forEach((b) => (b.onclick = () => (location.hash = `#/babyproof/${b.dataset.room}`)));
  }

  async function analyse(file) {
    root.innerHTML = str(html`<section class="card empty">${I('sparkle')}<p>Looking at the room… The first time, the vision model downloads; this takes a few seconds.</p></section>`);
    const blob = await shrinkImage(file, 1024);
    const img = new Image();
    // wait for load rather than img.decode(), which Chrome defers in a hidden tab
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = keep(blob);
    });
    let found = [];
    try {
      await loadDetector();
      found = await detect(img, { minScore: 0.3, max: 30 });
    } catch {
      toast('The vision model could not be downloaded. Showing the general checklist.');
    }
    const hazards = hazardsFrom(found, img.naturalWidth, img.naturalHeight);
    const photoId = await store.putBlob(blob, 'room');
    const rooms = await store.list('rooms');
    const room = await store.putItem('rooms', {
      title: `Room ${rooms.length + 1}`,
      photoId,
      hazards,
      seen: [...new Set(found.map((f) => f.class))],
      done: [],
    });
    location.hash = `#/babyproof/${room.id}`;
  }

  async function show(id) {
    const room = await store.getItem('rooms', id);
    if (!room) return home();
    const blob = await store.getBlob(room.photoId);
    const src = blob ? keep(blob) : '';
    const todo = room.hazards.filter((h) => !room.done.includes(h.cls));
    const done = room.hazards.filter((h) => room.done.includes(h.cls));
    const high = todo.filter((h) => h.severity === 'high').length;

    const card = (h, isDone) => html`
      <article class="fix ${isDone ? 'done' : ''}">
        <div class="card-row">
          <span class="num ${h.severity === 'high' ? 'high' : ''}" style="${isDone ? raw('background:var(--calm)') : ''}">${h.n}</span>
          <div class="grow"><h3 style="margin:0">${h.name}</h3><div class="muted small">Seen: ${h.cls} · ${h.boxes.length} place${h.boxes.length === 1 ? '' : 's'}</div></div>
        </div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          <span class="chip ${h.severity === 'high' ? 'urgent' : h.severity === 'medium' ? 'attention' : 'slate'}"><span class="dot"></span>${h.severity === 'high' ? 'High' : h.severity === 'medium' ? 'Medium' : 'Low'}</span>
          <span class="chip slate">${h.category}</span>
        </div>
        <div class="what"><b>What to do</b>${h.fix}</div>
        <div class="card-row" style="margin-top:12px">
          <a class="grow small" href="${SOURCES[h.source].url}" target="_blank" rel="noopener">${SOURCES[h.source].label}</a>
          <button class="btn outline small" data-done="${h.cls}">${I(isDone ? 'close' : 'check')} ${isDone ? 'Undo' : 'Mark done'}</button>
        </div>
      </article>`;

    root.innerHTML = str(html`
      <div class="photo-pins">
        <img src="${src}" alt="The room photo">
        ${todo.flatMap((h) => h.boxes.map((b) => html`
          <span class="box" style="left:${(b.x * 100).toFixed(1)}%;top:${(b.y * 100).toFixed(1)}%;width:${(b.w * 100).toFixed(1)}%;height:${(b.h * 100).toFixed(1)}%"></span>
          <span class="pin-n ${h.severity === 'high' ? 'high' : ''}" style="left:${(b.x * 100).toFixed(1)}%;top:${(b.y * 100).toFixed(1)}%">${h.n}</span>`))}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 4px">
        ${todo.length ? html`<span class="chip attention"><span class="dot"></span>${todo.length} to fix</span>` : html`<span class="chip calm"><span class="dot"></span>Nothing left to fix</span>`}
        ${high ? html`<span class="chip urgent"><span class="dot"></span>${high} high</span>` : ''}
        ${done.length ? html`<span class="chip calm">${I('check')} ${done.length} done</span>` : ''}
      </div>
      ${room.hazards.length ? html`
        <h2 class="h-section">Fix these (${todo.length})</h2>
        ${todo.map((h) => card(h, false))}
        ${done.length ? html`<h2 class="h-section">Done (${done.length})</h2>${done.map((h) => card(h, true))}` : ''}` : html`
        <section class="card">
          <h3>Nila did not recognise anything risky</h3>
          <p class="muted" style="margin:0">That does not make the room safe: the model knows about 80 kinds of everyday object, and not sockets, cords or small things on the floor. Check those below.</p>
        </section>`}
      <h2 class="h-section">Check these in every room</h2>
      <section class="card">
        ${GENERAL_CHECKS.map((c) => html`<div class="setting-row"><span class="badge sm tone-slate">${I('shield')}</span><div class="grow"><div class="t">${c.name}</div><div class="s">${c.fix}</div></div></div>`)}
        <a class="small" href="${SOURCES.nhs.url}" target="_blank" rel="noopener">${SOURCES.nhs.label}</a>
      </section>
      <p class="small faint" style="margin:14px 4px">Objects found by COCO-SSD, a general-purpose model running in this browser. It can miss things and mislabel them; you know the room better.${room.seen.length ? ` It saw: ${room.seen.join(', ')}.` : ''}</p>
      <div class="btn-row"><button class="btn outline small" data-new>${I('camera')} Check another room</button><button class="btn outline small" data-delete>${I('trash')} Delete</button></div>`);

    root.querySelectorAll('[data-done]').forEach((b) => (b.onclick = async () => {
      const cls = b.dataset.done;
      const next = room.done.includes(cls) ? room.done.filter((c) => c !== cls) : [...room.done, cls];
      await store.putItem('rooms', { ...room, done: next });
      show(id);
    }));
    root.querySelector('[data-new]').onclick = () => (location.hash = '#/babyproof');
    root.querySelector('[data-delete]').onclick = async () => {
      await store.deleteBlob(room.photoId);
      await store.deleteItem('rooms', room.id);
      location.hash = '#/babyproof';
    };
  }

  if (params[0]) await show(params[0]);
  else await home();
  return () => urls.forEach(URL.revokeObjectURL);
}
