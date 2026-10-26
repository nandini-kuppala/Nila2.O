// Little Signs checks: Nappy colour, Eye flash, Yellow check, Food and reactions.
// Each one helps a parent notice and record, says what to do next, cites its
// source, and never diagnoses.

import * as store from '../store.js';
import {
  SIGN_SOURCES, EMERGENCY, STOOL_SWATCHES, nearestStool, stoolVerdict, eyeVerdict,
  DANGER_SIGNS, yellowVerdict, ALLERGENS, SYMPTOMS, reactionUrgent, foodPatterns,
} from '../lib/little-signs.js';
import { icon } from '../icons.js';
import { html, str, raw, dayOf, timeOf, sheet, shrinkImage, toast, ageInMonths } from '../ui.js';

const I = (n) => raw(icon(n));
const LEVEL = {
  ok: { chip: 'calm', label: 'Fine' },
  watch: { chip: 'blue', label: 'Check again' },
  doctor: { chip: 'attention', label: 'Show a doctor' },
  urgent: { chip: 'urgent', label: 'Doctor today' },
  emergency: { chip: 'urgent', label: 'Get help now' },
};
const DISCLAIMER = html`<p class="small faint" style="margin:14px 4px">Little Signs helps you notice, record and decide when to see a doctor. It does not diagnose, and it never replaces your doctor. If she seems unwell, trust your instinct.</p>`;

function verdictCard(v, sources) {
  const l = LEVEL[v.level];
  const emergency = v.level === 'emergency';
  return html`
    <section class="card" style="${raw(emergency ? 'background:var(--urgent);color:#fff;border-color:transparent' : v.level === 'urgent' ? 'border-color:var(--urgent-line);background:var(--urgent-bg)' : '')}">
      <span class="chip ${l.chip}" style="${raw(emergency ? 'background:rgba(255,255,255,.2);color:#fff' : '')}"><span class="dot"></span>${l.label}</span>
      <h3 style="font-size:20px;margin:10px 0 6px">${v.title}</h3>
      <p style="margin:0">${v.text}</p>
      ${sources ? html`<div style="margin-top:10px">${sources.map((s) => html`<a class="small" style="display:block;${raw(emergency ? 'color:#fff' : '')}" href="${SIGN_SOURCES[s].url}" target="_blank" rel="noopener">${SIGN_SOURCES[s].label}</a>`)}</div>` : ''}
    </section>`;
}

async function history(type) {
  return (await store.list('checks')).filter((c) => c.type === type).slice(0, 10);
}

async function loadImage(blob) {
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
  return img;
}

/** Average colour around (x, y) in image fractions, weighted to the brighter half. */
function sample(img, x, y, radiusFrac = 0.015) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const r = Math.max(2, Math.round(radiusFrac * c.width));
  const cx = Math.round(x * c.width);
  const cy = Math.round(y * c.height);
  const d = g.getImageData(Math.max(0, cx - r), Math.max(0, cy - r), 2 * r, 2 * r).data;
  const px = [];
  for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
  px.sort((a, b) => (b[0] + b[1] + b[2]) - (a[0] + a[1] + a[2]));
  const top = px.slice(0, Math.max(1, Math.floor(px.length / 2)));
  return [0, 1, 2].map((k) => Math.round(top.reduce((s, p) => s + p[k], 0) / top.length));
}

function ageDays(birthDate) {
  return birthDate ? Math.floor((Date.now() - new Date(birthDate).getTime()) / 864e5) : null;
}

export async function render(root, { name }) {
  const urls = [];
  const keep = (b) => { const u = URL.createObjectURL(b); urls.push(u); return u; };
  const views = { nappy, eye, yellow, food };
  const off = await views[name](root, keep);
  return () => {
    off?.();
    urls.forEach(URL.revokeObjectURL);
  };
}

// ---- Nappy colour -----------------------------------------------------------------------

async function nappy(root, keep) {
  const s = await store.settings();
  const days = ageDays(s.birthDate);
  let picked = null;
  let suggested = null;
  let photoBlob = null;
  let photoUrl = null;

  async function draw() {
    const past = await history('nappy');
    const v = picked ? stoolVerdict(picked, days) : null;
    root.innerHTML = str(html`
      <p class="muted" style="margin-top:0">Match the poo in a nappy against a stool colour card, in daylight. In the first months, pale poo needs a doctor the same day.</p>
      ${photoUrl ? html`
        <div class="measure" data-photo style="cursor:crosshair"><img src="${photoUrl}" alt="The nappy"></div>
        <p class="small muted">Tap on the poo. ${suggested ? html`Nila thinks it is closest to <b>${STOOL_SWATCHES.find((x) => x.id === suggested).label.toLowerCase()}</b>; lighting changes colours, so pick the shade that matches best.` : ''}</p>` : html`
        <label class="btn tonal" style="cursor:pointer">${I('camera')} Use a photo of the nappy<input type="file" accept="image/*" capture="environment" data-file hidden></label>`}
      <h2 class="h-section">Which shade is closest?</h2>
      <div class="grid2">
        ${STOOL_SWATCHES.map((sw) => html`
          <button class="tile" data-sw="${sw.id}" style="${raw(picked === sw.id ? 'border-color:var(--primary);box-shadow:0 0 0 2px var(--primary)' : suggested === sw.id ? 'border-color:var(--primary)' : '')}">
            <span style="display:block;width:36px;height:36px;border-radius:50%;background:rgb(${sw.rgb.join(',')});border:1px solid var(--outline)"></span>
            <span class="t">${sw.label}</span>${sw.kind === 'pale' ? html`<span class="s">Card shades 1–3</span>` : ''}
          </button>`)}
      </div>
      <div style="height:14px"></div>
      ${v ? html`${verdictCard(v, ['nappy', 'jaundice'])}<button class="btn primary" data-save>${I('check')} Save, and log a nappy change</button>` : ''}
      ${past.length ? html`
        <h2 class="h-section">History</h2>
        ${past.map((c) => html`<div class="setting-row"><span style="width:28px;height:28px;border-radius:50%;flex:none;background:rgb(${STOOL_SWATCHES.find((x) => x.id === c.swatch).rgb.join(',')})"></span><div class="grow"><div class="t">${STOOL_SWATCHES.find((x) => x.id === c.swatch).label}</div><div class="s">${dayOf(c.t)}, ${timeOf(c.t)}</div></div><span class="chip ${LEVEL[c.level].chip}">${LEVEL[c.level].label}</span></div>`)}` : ''}
      ${DISCLAIMER}`);

    root.querySelector('[data-file]')?.addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      photoBlob = await shrinkImage(f, 1024);
      photoUrl = keep(photoBlob);
      draw();
    });
    const area = root.querySelector('[data-photo]');
    if (area) {
      area.onclick = async (e) => {
        const r = area.getBoundingClientRect();
        const img = await loadImage(photoBlob);
        suggested = nearestStool(sample(img, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, 0.03)).id;
        picked = suggested;
        draw();
      };
    }
    root.querySelectorAll('[data-sw]').forEach((b) => (b.onclick = () => { picked = b.dataset.sw; draw(); }));
    root.querySelector('[data-save]')?.addEventListener('click', async () => {
      const photoId = photoBlob ? await store.putBlob(photoBlob, 'nappy') : null;
      await store.putItem('checks', { type: 'nappy', swatch: picked, level: v.level, photoId });
      await store.addEvent({ type: 'nappy', note: STOOL_SWATCHES.find((x) => x.id === picked).label });
      toast('Saved, and a nappy change was logged');
      picked = null; suggested = null; photoBlob = null; photoUrl = null;
      draw();
    });
  }
  await draw();
}

// ---- Eye flash ----------------------------------------------------------------------------

/** A drawn stand-in face for trying the check without a photo. Not a real baby. */
function sampleFace(kind) {
  const c = document.createElement('canvas');
  c.width = 800;
  c.height = 600;
  const g = c.getContext('2d');
  g.fillStyle = '#2a2a30';
  g.fillRect(0, 0, 800, 600);
  g.fillStyle = '#f2c3a2';
  g.beginPath();
  g.ellipse(400, 320, 250, 270, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#7a4e3a';
  g.beginPath();
  g.ellipse(400, 110, 220, 90, 0, Math.PI, 0);
  g.fill();
  for (const [x, glow] of [[300, '#d2402c'], [500, kind === 'white' ? '#f2efe4' : '#d8482f']]) {
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(x, 300, 52, 34, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4b3a2c';
    g.beginPath(); g.arc(x, 300, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = glow;
    g.beginPath(); g.arc(x, 300, 14, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(x + 9, 291, 4, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = 'rgba(0,0,0,.55)';
  g.fillRect(560, 560, 230, 30);
  g.fillStyle = '#fff';
  g.font = '18px system-ui';
  g.fillText('Sample · drawn, not a photo', 572, 581);
  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/jpeg', 0.92));
}

async function eye(root, keep) {
  let blob = null;
  let url = null;
  let taps = [];
  let sample_ = false;

  async function draw() {
    const past = await history('eye');
    let v = null;
    if (taps.length === 2 && blob) {
      const img = await loadImage(blob);
      const [a, b] = taps.slice().sort((p, q) => p.x - q.x);
      v = eyeVerdict(sample(img, a.x, a.y), sample(img, b.x, b.y));
    }
    const thumbs = {};
    for (const c of past) {
      const b = c.photoId && (await store.getBlob(c.photoId));
      if (b) thumbs[c.id] = keep(b);
    }
    root.innerHTML = str(html`
      <p class="muted" style="margin-top:0">In a flash photo, healthy eyes usually glow red or orange. A <b>white or yellow glow</b> in the pupil needs an eye check.</p>
      ${url ? html`
        <div class="measure" data-photo style="cursor:crosshair"><img src="${url}" alt="Face photo">
          ${raw(taps.map((t) => `<span class="ring" style="left:${t.x * 100}%;top:${t.y * 100}%;width:6%;aspect-ratio:1"></span>`).join(''))}</div>
        <p class="small muted">${taps.length < 2 ? `Tap the centre of ${taps.length ? 'the other pupil' : 'one pupil'}.` : 'Tap again to start over.'}</p>
        ${v ? html`${verdictCard(v, ['retino', 'cataract'])}<p class="small muted">${v.detail} (as seen in the photo)</p>
          <button class="btn primary" data-save>${I('check')} Save to history</button>` : ''}
        <div class="btn-row"><button class="btn outline small" data-reset>Use another photo</button></div>` : html`
        <section class="card">
          <div class="t" style="font-weight:600;margin-bottom:6px">For a good photo</div>
          ${['A dim room, flash on', 'About an arm’s length away, level with her eyes', 'She looks at the camera'].map((t) => html`<div class="setting-row" style="padding:6px 0">${I('check')}<span>${t}</span></div>`)}
        </section>
        <label class="btn primary" style="cursor:pointer">${I('camera')} Take or choose a flash photo<input type="file" accept="image/*" capture="user" data-file hidden></label>
        <div class="btn-row"><button class="btn outline small" data-sample="red">Try a drawn sample</button><button class="btn outline small" data-sample="white">Sample with a white glow</button></div>`}
      ${past.length ? html`
        <h2 class="h-section">History</h2>
        ${past.map((c) => html`<div class="setting-row">${thumbs[c.id] ? html`<img class="thumb" src="${thumbs[c.id]}" alt="">` : ''}<div class="grow"><div class="t">${c.detail}</div><div class="s">${dayOf(c.t)}, ${timeOf(c.t)}${c.sample ? ' · sample' : ''}</div></div><span class="chip ${LEVEL[c.level].chip}">${LEVEL[c.level].label}</span></div>`)}` : ''}
      ${DISCLAIMER}`);

    root.querySelector('[data-file]')?.addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      blob = await shrinkImage(f, 1600);
      url = keep(blob);
      taps = [];
      sample_ = false;
      draw();
    });
    root.querySelectorAll('[data-sample]').forEach((b) => (b.onclick = async () => {
      blob = await sampleFace(b.dataset.sample);
      url = keep(blob);
      taps = [];
      sample_ = true;
      draw();
    }));
    const area = root.querySelector('[data-photo]');
    if (area) area.onclick = (e) => {
      const r = area.getBoundingClientRect();
      if (taps.length >= 2) taps = [];
      taps.push({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
      draw();
    };
    root.querySelector('[data-reset]')?.addEventListener('click', () => { blob = null; url = null; taps = []; draw(); });
    root.querySelector('[data-save]')?.addEventListener('click', async () => {
      const photoId = await store.putBlob(blob, 'eye');
      await store.putItem('checks', { type: 'eye', level: v.level, detail: v.detail, photoId, sample: sample_ });
      toast('Saved');
      blob = null; url = null; taps = [];
      draw();
    });
  }
  await draw();
}

// ---- Yellow check -------------------------------------------------------------------------

async function yellow(root) {
  const s = await store.settings();
  const ageH = s.birthDate ? (Date.now() - new Date(s.birthDate).getTime()) / 3600e3 : 72;
  const a = { yellow: null, premature: false, darkPee: false, palePoo: false, danger: [] };

  async function draw() {
    const past = await history('yellow');
    const v = a.yellow ? yellowVerdict({ ...a, ageHours: ageH }) : null;
    const weeks = Math.floor(ageH / 168);
    root.innerHTML = str(html`
      <p class="muted" style="margin-top:0">For newborn jaundice, in the first weeks. ${s.babyName} is ${weeks >= 1 ? `${weeks} week${weeks === 1 ? '' : 's'}` : `${Math.floor(ageH / 24)} days`} old.</p>
      ${ageInMonths(s.birthDate) >= 2 ? html`<div class="notice slate">${I('info')}<div>This check is written for newborns. At her age, yellow skin or eyes is not expected and needs a doctor.</div></div>` : ''}
      <section class="card">
        <div class="t" style="font-weight:600">How to look</div>
        <p class="muted" style="margin:6px 0 0">In daylight, press gently on the tip of her nose or her forehead and let go: is the skin yellow underneath? Look at the whites of her eyes and her gums too; yellow is easier to see there on brown or black skin.</p>
      </section>
      <div class="t" style="font-weight:600;margin:14px 0 8px">Does her skin, or the whites of her eyes, look yellow?</div>
      <div class="seg" role="group">${[['yes', 'Yes'], ['unsure', 'Not sure'], ['no', 'No']].map(([k, l]) => html`<button data-y="${k}" aria-pressed="${a.yellow === k}">${l}</button>`)}</div>
      <section class="card" style="margin-top:14px">
        ${[['darkPee', 'Her pee is dark yellow or brown'], ['palePoo', 'Her poo is pale or chalky'], ['premature', 'She was born early (before 37 weeks)']].map(([k, l]) => html`
          <label class="setting-row"><div class="grow">${l}</div><span class="switch"><input type="checkbox" data-k="${k}" ${a[k] ? raw('checked') : ''}><span></span></span></label>`)}
      </section>
      <div class="t" style="font-weight:600;margin:4px 0 8px">Any of these right now?</div>
      <section class="card">
        ${DANGER_SIGNS.map((d) => html`<label class="setting-row"><div class="grow">${d.label}</div><span class="switch"><input type="checkbox" data-d="${d.id}" ${a.danger.includes(d.id) ? raw('checked') : ''}><span></span></span></label>`)}
      </section>
      ${v ? html`${verdictCard(v, ['jaundice'])}<button class="btn primary" data-save>${I('check')} Save today’s check</button>` : html`<p class="muted small">Answer the first question to see what to do.</p>`}
      ${past.length ? html`
        <h2 class="h-section">History</h2>
        ${past.map((c) => html`<div class="setting-row"><span class="badge sm tone-peach">${I('sun')}</span><div class="grow"><div class="t">${c.title}</div><div class="s">${dayOf(c.t)}, ${timeOf(c.t)}</div></div><span class="chip ${LEVEL[c.level].chip}">${LEVEL[c.level].label}</span></div>`)}` : ''}
      ${DISCLAIMER}`);

    root.querySelectorAll('[data-y]').forEach((b) => (b.onclick = () => { a.yellow = b.dataset.y; draw(); }));
    root.querySelectorAll('[data-k]').forEach((c) => (c.onchange = () => { a[c.dataset.k] = c.checked; draw(); }));
    root.querySelectorAll('[data-d]').forEach((c) => (c.onchange = () => {
      a.danger = c.checked ? [...a.danger, c.dataset.d] : a.danger.filter((x) => x !== c.dataset.d);
      draw();
    }));
    root.querySelector('[data-save]')?.addEventListener('click', async () => {
      await store.putItem('checks', { type: 'yellow', level: v.level, title: v.title, answers: { ...a } });
      toast('Saved');
      draw();
    });
  }
  await draw();
}

// ---- Food and reactions ------------------------------------------------------------------------

async function food(root) {
  async function draw() {
    const all = await store.list('checks');
    const foods = all.filter((c) => c.type === 'food');
    const reactions = all.filter((c) => c.type === 'reaction');
    const patterns = foodPatterns(foods, reactions);
    const lastSerious = reactions.find((r) => reactionUrgent(r.symptoms) && Date.now() - r.t < 6 * 3600e3);
    const recent = [...foods, ...reactions].sort((x, y) => y.t - x.t).slice(0, 15);
    const hasSamples = all.some((c) => c.sample && (c.type === 'food' || c.type === 'reaction'));

    root.innerHTML = str(html`
      ${lastSerious ? verdictCard({ level: 'emergency', title: 'Swelling or breathing trouble', text: `These can be signs of a serious allergic reaction (anaphylaxis). ${EMERGENCY}` }, ['anaphylaxis']) : ''}
      <p class="muted" style="margin-top:0">Log new foods as she tries them, and anything that happens after. Nila links each reaction to what she ate in the 2 hours before (most reactions), or the 3 days before (some, like cow’s milk).</p>
      <div class="btn-row" style="margin-top:0">
        <button class="btn primary" data-food>${I('fork')} Log a food</button>
        <button class="btn outline" data-reaction>${I('warn')} Log a reaction</button>
      </div>
      <h2 class="h-section">Foods so far</h2>
      ${patterns.length ? patterns.map((p) => html`
        <section class="card" style="${raw(p.flagged ? 'border-color:var(--attention);background:var(--attention-bg)' : '')}">
          <div class="card-row">
            <span class="badge sm tone-${p.flagged ? 'attention' : 'teal'}">${I('fork')}</span>
            <div class="grow"><div style="font-weight:600">${p.name}</div><div class="small muted">First tried ${dayOf(p.first)} · eaten ${p.eaten}×</div></div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
            ${p.allergen ? html`<span class="chip slate">Common allergen</span>` : ''}
            ${p.quick ? html`<span class="chip urgent">Reaction within 2 h ×${p.quick}</span>` : ''}
            ${p.slow ? html`<span class="chip attention">Within 3 days ×${p.slow}</span>` : ''}
            ${!p.quick && !p.slow ? html`<span class="chip calm">No reaction logged</span>` : ''}
          </div>
          ${p.flagged ? html`<p style="margin:10px 0 0;color:var(--on-severity)">Stop giving ${p.name.toLowerCase()} for now and talk to your doctor before trying it again.</p>` : ''}
        </section>`) : html`<section class="card empty">${I('fork')}<p>No foods logged yet. From around 6 months, try the foods that commonly cause allergies one at a time, so a reaction can be traced.</p>
          ${hasSamples ? '' : html`<button class="btn tonal small" data-sample>Add sample entries</button>`}</section>`}
      ${recent.length ? html`
        <h2 class="h-section">Log</h2>
        ${recent.map((c) => c.type === 'food'
          ? html`<div class="setting-row"><span class="badge sm tone-teal">${I('fork')}</span><div class="grow"><div class="t">${c.name}</div><div class="s">${dayOf(c.t)}, ${timeOf(c.t)}${c.sample ? ' · sample' : ''}</div></div><button class="icon-btn" data-del="${c.id}" aria-label="Delete">${I('trash')}</button></div>`
          : html`<div class="setting-row"><span class="badge sm tone-urgent">${I('warn')}</span><div class="grow"><div class="t">${c.symptoms.map((id) => SYMPTOMS.find((x) => x.id === id)?.label).join(', ')}</div><div class="s">${dayOf(c.t)}, ${timeOf(c.t)}${c.note ? ` · ${c.note}` : ''}${c.sample ? ' · sample' : ''}</div></div><button class="icon-btn" data-del="${c.id}" aria-label="Delete">${I('trash')}</button></div>`)}` : ''}
      ${hasSamples ? html`<button class="text-btn" data-unsample>${I('trash')} Remove the sample entries</button>` : ''}
      <p class="small muted" style="margin:14px 4px 0">Most allergic reactions start within minutes of a new food, up to 2 hours. Some, like cow’s milk allergy, can take up to 3 days. <a href="${SIGN_SOURCES.allergy.url}" target="_blank" rel="noopener">${SIGN_SOURCES.allergy.label}</a></p>
      ${DISCLAIMER}`);

    root.querySelector('[data-food]').onclick = logFood;
    root.querySelector('[data-reaction]').onclick = logReaction;
    root.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => store.deleteItem('checks', b.dataset.del)));
    root.querySelector('[data-sample]')?.addEventListener('click', addSamples);
    root.querySelector('[data-unsample]')?.addEventListener('click', async () => {
      for (const c of all.filter((x) => x.sample && (x.type === 'food' || x.type === 'reaction'))) await store.deleteItem('checks', c.id);
    });
  }

  const nowLocal = () => {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
  };

  function logFood() {
    sheet((body, close) => {
      body.innerHTML = str(html`
        <h2>Log a food</h2>
        <form>
          <label class="field"><span>Food</span><input class="input" name="name" list="food-names" required placeholder="e.g. egg, ragi, banana"></label>
          <datalist id="food-names">${[...ALLERGENS, 'ragi', 'rice', 'dal', 'banana', 'apple', 'potato', 'carrot', 'curd', 'idli'].map((f) => html`<option value="${f}">`)}</datalist>
          <label class="setting-row"><div class="grow">One of the foods that commonly cause allergies</div><span class="switch"><input type="checkbox" name="allergen"><span></span></span></label>
          <label class="field"><span>When</span><input class="input" type="datetime-local" name="t" value="${nowLocal()}" required></label>
          <button class="btn primary" type="submit">Save</button>
        </form>`);
      const form = body.querySelector('form');
      form.name.oninput = () => (form.allergen.checked = ALLERGENS.some((x) => form.name.value.toLowerCase().includes(x.split(' ')[0].replace('’s', ''))));
      form.onsubmit = async (e) => {
        e.preventDefault();
        await store.putItem('checks', { type: 'food', name: form.name.value.trim(), allergen: form.allergen.checked, t: new Date(form.t.value).getTime() });
        close();
        toast('Food logged');
      };
    });
  }

  function logReaction() {
    sheet((body, close) => {
      body.innerHTML = str(html`
        <h2>Log a reaction</h2>
        <form>
          ${SYMPTOMS.map((s) => html`<label class="setting-row"><div class="grow">${s.label}${s.serious ? html` <span class="chip urgent">urgent</span>` : ''}</div><input type="checkbox" name="sym" value="${s.id}" style="width:22px;height:22px"></label>`)}
          <label class="field"><span>When it started</span><input class="input" type="datetime-local" name="t" value="${nowLocal()}" required></label>
          <label class="field"><span>Note</span><input class="input" name="note" placeholder="Where the rash was, how long it lasted…"></label>
          <button class="btn primary" type="submit">Save</button>
        </form>`);
      const form = body.querySelector('form');
      form.onsubmit = async (e) => {
        e.preventDefault();
        const symptoms = [...form.querySelectorAll('[name=sym]:checked')].map((c) => c.value);
        if (!symptoms.length) return toast('Tick at least one sign');
        await store.putItem('checks', { type: 'reaction', symptoms, note: form.note.value.trim(), t: new Date(form.t.value).getTime() });
        close();
        toast(reactionUrgent(symptoms) ? 'Saved. Swelling or breathing trouble needs help now.' : 'Reaction logged');
      };
    });
  }

  async function addSamples() {
    const H = 3600e3;
    const now = Date.now();
    const rows = [
      { type: 'food', name: 'Ragi porridge', t: now - 6 * 24 * H },
      { type: 'food', name: 'Banana', t: now - 5 * 24 * H },
      { type: 'food', name: 'Egg', allergen: true, t: now - 4 * 24 * H },
      { type: 'reaction', symptoms: ['hives'], note: 'Around the mouth, gone in an hour', t: now - 4 * 24 * H + 40 * 60000 },
      { type: 'food', name: 'Dal', t: now - 2 * 24 * H },
      { type: 'food', name: 'Curd', allergen: true, t: now - 1 * 24 * H },
    ];
    for (const r of rows) await store.putItem('checks', { ...r, sample: true });
    toast('Sample entries added. They are labelled and can be removed.');
  }

  await draw();
  const off = store.onChange((w) => w === 'checks' && root.isConnected && draw());
  return off;
}
