// Little Signs: notice small changes early. In this version, a skin diary: a photo
// every few days of a mark, with a circle the parent draws around it, so "is it
// spreading?" has an answer to show the doctor.

import * as store from '../store.js';
import { spotStatus } from '../lib/spots.js';
import { icon } from '../icons.js';
import { html, str, raw, dayOf, timeOf, sheet, shrinkImage, toast, ageLabel } from '../ui.js';

const I = (n) => raw(icon(n));
const AREAS = ['Face', 'Scalp', 'Neck', 'Chest or tummy', 'Back', 'Arms or hands', 'Legs or feet', 'Nappy area'];
const KINDS = ['Rash or spots', 'Birthmark or red mark', 'Dry or flaky patch', 'Bump or swelling', 'Other'];
const STATUS_CHIP = { doctor: 'attention', again: 'blue', watch: 'slate', settling: 'calm' };

export async function render(root, { name, params }) {
  const urls = [];
  const keep = (b) => { const u = URL.createObjectURL(b); urls.push(u); return u; };
  if (name === 'spot' && params[0]) await spotView(root, params[0], keep);
  else await home(root, keep);
  return () => urls.forEach(URL.revokeObjectURL);
}

async function home(root, keep) {
  const s = await store.settings();
  const spots = await store.list('spots');
  const thumbs = {};
  for (const sp of spots) {
    const last = sp.entries[sp.entries.length - 1];
    const b = last && (await store.getBlob(last.photoId));
    if (b) thumbs[sp.id] = keep(b);
  }
  root.innerHTML = str(html`
    <p class="muted" style="margin:0 0 14px">Notice early. Stay calm. Show your doctor.</p>
    <section class="card card-row">
      <span class="badge tone-pink">${I('baby')}</span>
      <div class="grow"><div style="font-weight:600">${s.babyName}</div><div class="small muted">${ageLabel(s.birthDate)}</div></div>
    </section>
    <h2 class="h-section">Checks</h2>
    <div class="grid2">
      <button class="tile" data-diary><span class="badge sm tone-teal">${I('skin')}</span><span class="t">Skin diary</span><span class="s">Track a mark</span></button>
      ${[['Nappy colour', 'Stool card', 'nappy', 'peach'], ['Eye flash', 'Red or white glow', 'eye', 'blue'], ['Yellow check', 'Newborn jaundice', 'sun', 'peach'], ['Food and reactions', 'Spot a pattern', 'fork', 'pink']].map(([t, sub, ic, tone]) => html`
        <div class="tile soon" aria-disabled="true"><span class="badge sm tone-${tone}">${I(ic)}</span><span class="t">${t}</span><span class="s">${sub} · coming later</span></div>`)}
    </div>
    <h2 class="h-section" id="diary">Skin diary</h2>
    <p class="muted" style="margin-top:-4px">A photo every few days shows if a mark is spreading or settling.</p>
    <button class="btn primary" data-new>${I('plus')} Track a new spot</button>
    <div style="height:14px"></div>
    ${spots.map((sp) => {
      const st = spotStatus(sp.entries);
      return html`
        <a class="link-row" href="#/spot/${sp.id}">
          ${thumbs[sp.id] ? html`<img class="thumb" src="${thumbs[sp.id]}" alt="">` : html`<span class="badge tone-pink">${I('skin')}</span>`}
          <span class="grow"><div class="t">${sp.name}</div><div class="s">${sp.kind} · ${sp.area} · ${sp.entries.length} photo${sp.entries.length === 1 ? '' : 's'}</div>
            <span class="chip ${STATUS_CHIP[st.key]}" style="margin-top:6px">${st.label}</span></span>
          ${raw(icon('chevron', 'chev'))}
        </a>`;
    })}
    <p class="small faint" style="margin:14px 4px">Little Signs helps you notice, record and decide when to see a doctor. It does not diagnose, and it never replaces your doctor.</p>`);
  root.querySelector('[data-new]').onclick = () => newSpot();
  root.querySelector('[data-diary]').onclick = () => (spots.length ? root.querySelector('#diary').scrollIntoView({ behavior: 'smooth' }) : newSpot());
}

function newSpot() {
  sheet((body, close) => {
    body.innerHTML = str(html`
      <h2>Track a new spot</h2>
      <form>
        <label class="field"><span>Name it</span><input class="input" name="name" required placeholder="e.g. Tummy spots"></label>
        <label class="field"><span>What it looks like</span><select class="input" name="kind">${KINDS.map((k) => html`<option>${k}</option>`)}</select></label>
        <label class="field"><span>Where</span><select class="input" name="area">${AREAS.map((a) => html`<option>${a}</option>`)}</select></label>
        <button class="btn primary" type="submit">Next: the first photo</button>
      </form>`);
    body.querySelector('form').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const sp = await store.putItem('spots', { name: String(f.get('name')).trim(), kind: f.get('kind'), area: f.get('area'), entries: [] });
      close();
      location.hash = `#/spot/${sp.id}`;
    };
  });
}

async function spotView(root, id, keep) {
  const sp = await store.getItem('spots', id);
  if (!sp) return home(root, keep);
  const st = spotStatus(sp.entries);
  const last = sp.entries[sp.entries.length - 1];
  const lastUrl = last ? keep(await store.getBlob(last.photoId)) : null;
  const pts = sp.entries.map((e) => ({ t: e.t, v: e.sizePct }));

  root.innerHTML = str(html`
    <h2 style="font-size:26px;margin:4px 0 2px">${sp.name}</h2>
    <p class="muted" style="margin:0 0 14px">${sp.kind} · ${sp.area}${sp.entries.length ? ` · tracked since ${dayOf(sp.entries[0].t)}` : ''}</p>
    ${last ? html`
      <section class="card">
        <div class="card-head"><span class="small muted">Latest check · ${dayOf(last.t)}, ${timeOf(last.t)}</span><span class="chip ${STATUS_CHIP[st.key]}">${st.label}</span></div>
        <div class="measure"><img src="${lastUrl}" alt="Latest photo">${raw(ring(last.circle))}</div>
        <p style="margin:12px 0 0">${st.text}</p>
      </section>` : html`<section class="card empty">${I('camera')}<p>Add the first photo. Take it in daylight, straight on, from about 20 cm.</p></section>`}
    <label class="btn primary" style="cursor:pointer">${I('camera')} Add today’s photo<input type="file" accept="image/*" capture="environment" data-photo hidden></label>
    ${pts.length > 1 ? html`
      <h2 class="h-section">How it’s changing</h2>
      <section class="card chart">
        <div class="card-head"><span class="small muted">Size (% of photo)</span><b>${pts[pts.length - 1].v.toFixed(1)}</b></div>
        ${raw(trend(pts))}
        <p class="small muted" style="margin:8px 0 0">Size is the circle you drew, as a share of the photo, so take each photo from about the same distance.</p>
      </section>` : ''}
    ${sp.entries.length ? html`
      <h2 class="h-section">History</h2>
      ${sp.entries.slice().reverse().map((e) => html`<div class="setting-row"><span class="badge sm tone-pink">${I('image')}</span><div class="grow"><div class="t">${dayOf(e.t)}, ${timeOf(e.t)}</div><div class="s">${e.sizePct.toFixed(1)}% of the photo</div></div></div>`)}` : ''}
    <button class="text-btn" data-delete>${I('trash')} Stop tracking this spot</button>
    <div class="notice slate" style="margin-top:12px">${I('info')}<div>Nila helps you notice, record and decide when to see a doctor. It does not diagnose. See a doctor quickly for a rash with a fever, a rash that does not fade when you press a glass on it, or if she seems unwell.</div></div>`);

  root.querySelector('[data-photo]').onchange = async (e) => {
    const file = e.target.files[0];
    if (file) measure(file, sp);
  };
  root.querySelector('[data-delete]').onclick = async () => {
    for (const en of sp.entries) await store.deleteBlob(en.photoId);
    await store.deleteItem('spots', sp.id);
    location.hash = '#/signs';
  };
}

function ring(c) {
  if (!c) return '';
  return `<span class="ring" style="left:${(c.x * 100).toFixed(2)}%;top:${(c.y * 100).toFixed(2)}%;width:${(c.r * 200).toFixed(2)}%;aspect-ratio:1"></span>`;
}

function trend(pts) {
  const W = 320, H = 120, l = 30, r = 10, t = 10, b = 22;
  const max = Math.max(...pts.map((p) => p.v)) * 1.2 || 1;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t || t0 + 1;
  const x = (tt) => l + ((tt - t0) / (t1 - t0 || 1)) * (W - l - r);
  const y = (v) => t + (1 - v / max) * (H - t - b);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Size over time">
    <line x1="${l}" x2="${W - r}" y1="${H - b}" y2="${H - b}" stroke="var(--chart-grid)"/>
    <text x="${l - 6}" y="${y(max / 1.2) + 4}" text-anchor="end">${(max / 1.2).toFixed(1)}</text>
    <path d="${path}" fill="none" stroke="var(--primary)" stroke-width="2.5"/>
    ${pts.map((p) => `<circle cx="${x(p.t)}" cy="${y(p.v)}" r="4" fill="var(--primary)"/>`).join('')}
    <text x="${l}" y="${H - 6}">${dayOf(t0)}</text><text x="${W - r}" y="${H - 6}" text-anchor="end">${dayOf(t1)}</text>
  </svg>`;
}

/** Draw a circle around the spot: press on its centre and drag out to its edge. */
async function measure(file, sp) {
  const blob = await shrinkImage(file, 1280);
  const url = URL.createObjectURL(blob);
  let circle = { x: 0.5, y: 0.5, r: 0.12 };
  sheet((body, close) => {
    body.innerHTML = str(html`
      <h2>Circle the spot</h2>
      <p class="muted">Press on the middle of the spot and drag out to its edge.</p>
      <div class="measure" data-area><img src="${url}" alt="Today’s photo" draggable="false"><span class="ring"></span></div>
      <p class="small muted" data-size></p>
      <button class="btn primary" data-save>${I('check')} Save today’s photo</button>`);
    const area = body.querySelector('[data-area]');
    const ringEl = area.querySelector('.ring');
    const img = area.querySelector('img');
    const paint = () => {
      ringEl.style.left = `${circle.x * 100}%`;
      ringEl.style.top = `${circle.y * 100}%`;
      ringEl.style.width = `${circle.r * 200}%`;
      ringEl.style.aspectRatio = '1';
      body.querySelector('[data-size]').textContent = `${sizePct(circle, img).toFixed(1)}% of the photo`;
    };
    img.onload = paint;
    let down = null;
    const pos = (e) => {
      const r = area.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, w: r.width, h: r.height };
    };
    area.onpointerdown = (e) => {
      down = pos(e);
      circle = { x: down.x, y: down.y, r: 0.02 };
      area.setPointerCapture(e.pointerId);
      paint();
    };
    area.onpointermove = (e) => {
      if (!down) return;
      const p = pos(e);
      // radius as a share of the photo's width, measured in on-screen pixels
      circle.r = Math.max(0.01, Math.hypot((p.x - down.x) * p.w, (p.y - down.y) * p.h) / p.w);
      paint();
    };
    area.onpointerup = () => (down = null);
    body.querySelector('[data-save]').onclick = async () => {
      const photoId = await store.putBlob(blob, 'skin');
      const entry = { t: Date.now(), photoId, circle, sizePct: sizePct(circle, img) };
      await store.putItem('spots', { ...sp, entries: [...sp.entries, entry] });
      close();
      URL.revokeObjectURL(url);
      toast('Today’s photo is saved');
      const target = `#/spot/${sp.id}`;
      if (location.hash === target) window.dispatchEvent(new HashChangeEvent('hashchange'));
      else location.hash = target;
    };
  });
}

function sizePct(c, img) {
  const w = img.naturalWidth || 1;
  const h = img.naturalHeight || 1;
  const rPx = c.r * w;
  return Math.min(100, ((Math.PI * rPx * rPx) / (w * h)) * 100);
}
