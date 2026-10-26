// Health: the baby's and the mother's records in one place (vaccinations,
// check-ups, prescriptions, growth), plus Little Signs and Insights.

import * as store from '../store.js';
import { icon } from '../icons.js';
import { ill } from '../illustrations.js';
import { html, str, raw, dayOf, dateInput, sheet, shrinkImage, toast, ageLabel } from '../ui.js';

const I = (n) => raw(icon(n));
const KINDS = [
  { id: 'vaccination', label: 'Vaccination', icon: 'syringe', tone: 'blue' },
  { id: 'checkup', label: 'Check-up', icon: 'doctor', tone: 'teal' },
  { id: 'prescription', label: 'Prescription', icon: 'med', tone: 'peach' },
  { id: 'growth', label: 'Growth', icon: 'ruler', tone: 'plum' },
  { id: 'other', label: 'Other', icon: 'health', tone: 'slate' },
];
let who = 'baby';

export async function render(root) {
  let urls = [];

  async function draw() {
    urls.forEach(URL.revokeObjectURL);
    urls = [];
    const s = await store.settings();
    const records = (await store.list('records')).filter((r) => r.who === who).sort((a, b) => b.date - a.date);
    const thumbs = {};
    for (const r of records) {
      if (r.photoId) {
        const b = await store.getBlob(r.photoId);
        if (b) urls.push((thumbs[r.id] = URL.createObjectURL(b)));
      }
    }
    const name = s.babyName;
    root.innerHTML = str(html`
      <div class="seg" role="group" aria-label="Whose records" style="margin-bottom:14px">
        <button data-who="baby" aria-pressed="${who === 'baby'}">${I('baby')} ${name}</button>
        <button data-who="mother" aria-pressed="${who === 'mother'}">${I('person')} Mother</button>
      </div>
      <section class="card tinted">
        <div class="hero" style="margin:0;grid-template-columns:1fr 96px">
          <div>
            <h3 style="font-size:20px">${who === 'baby' ? `Keep ${name}’s health records in one place` : 'Your own records, after the birth'}</h3>
            <p class="muted" style="margin:6px 0 0">${who === 'baby' ? `Vaccinations, check-ups, growth and prescriptions. ${ageLabel(s.birthDate)}.` : 'Postnatal check-ups, prescriptions and tests.'}</p>
          </div>
          <div style="width:96px;height:96px">${raw(ill.records())}</div>
        </div>
        <div style="height:12px"></div>
        <button class="btn primary" data-add>${I('plus')} Add a ${who === 'baby' ? 'baby' : ''} record</button>
      </section>

      ${who === 'baby' ? html`
        <a class="link-row" href="#/signs">
          <span class="badge sm tone-pink">${I('skin')}</span>
          <span class="grow"><div class="t">Little Signs</div><div class="s">Notice small changes early: a skin diary, with photos</div></span>
          ${raw(icon('chevron', 'chev'))}
        </a>
        <a class="link-row" href="#/insights">
          <span class="badge sm tone-plum">${I('chart')}</span>
          <span class="grow"><div class="t">Insights</div><div class="s">Crying, sleep and what settles her this week</div></span>
          ${raw(icon('chevron', 'chev'))}
        </a>` : ''}

      ${!records.length ? html`<section class="card empty">${I('health')}<p>No records yet. Add the first one: the last vaccination card or check-up is a good start.</p></section>` : ''}
      ${KINDS.map((k) => {
        const rs = records.filter((r) => r.kind === k.id);
        if (!rs.length) return '';
        return html`
          <h2 class="h-section">${k.label} <span class="muted" style="font-weight:500">(${rs.length})</span></h2>
          ${rs.map((r) => html`
            <details class="card">
              <summary class="card-row" style="cursor:pointer;list-style:none">
                ${thumbs[r.id] ? html`<img class="thumb" src="${thumbs[r.id]}" alt="">` : html`<span class="badge tone-${k.tone}">${I(k.icon)}</span>`}
                <span class="grow"><div style="font-weight:600">${r.title}</div><div class="small muted">${dayOf(r.date)}</div>
                  ${r.notes ? html`<div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.notes}</div>` : ''}</span>
                ${raw(icon('chevronDown', 'chev'))}
              </summary>
              ${r.notes ? html`<p style="white-space:pre-wrap">${r.notes}</p>` : ''}
              ${thumbs[r.id] ? html`<img src="${thumbs[r.id]}" alt="${r.title}" style="border-radius:14px;margin:8px 0">` : ''}
              <button class="text-btn" data-del="${r.id}">${I('trash')} Delete</button>
            </details>`)}`;
      })}
      <p class="small faint" style="margin:14px 4px">Stored on this device only. Keep the paper records too.</p>`);

    root.querySelectorAll('[data-who]').forEach((b) => (b.onclick = () => { who = b.dataset.who; draw(); }));
    root.querySelector('[data-add]').onclick = addRecord;
    root.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      const r = records.find((x) => x.id === b.dataset.del);
      if (r?.photoId) await store.deleteBlob(r.photoId);
      await store.deleteItem('records', b.dataset.del);
    }));
  }

  function addRecord() {
    sheet((body, close) => {
      body.innerHTML = str(html`
        <h2>Add a record</h2>
        <form>
          <label class="field"><span>Kind</span>
            <select class="input" name="kind">${KINDS.map((k) => html`<option value="${k.id}">${k.label}</option>`)}</select></label>
          <label class="field"><span>What</span><input class="input" name="title" required placeholder="e.g. Pentavalent dose 2, 4-month review"></label>
          <label class="field"><span>Date</span><input class="input" type="date" name="date" value="${dateInput(Date.now())}" required></label>
          <label class="field"><span>Notes</span><textarea class="input" name="notes" rows="3" placeholder="Weight, batch number, what the doctor said…"></textarea></label>
          <label class="field"><span>Photo of the card or prescription (optional)</span><input class="input" type="file" name="photo" accept="image/*"></label>
          <button class="btn primary" type="submit">Save</button>
        </form>`);
      body.querySelector('form').onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const file = f.get('photo');
        let photoId = null;
        if (file && file.size) photoId = await store.putBlob(await shrinkImage(file), 'record');
        await store.putItem('records', {
          who, kind: f.get('kind'), title: String(f.get('title')).trim(),
          date: new Date(`${f.get('date')}T12:00:00`).getTime(), notes: String(f.get('notes')).trim(), photoId,
        });
        close();
        toast('Record saved');
      };
    });
  }

  await draw();
  const off = store.onChange((w) => (w === 'records' || w === 'settings') && draw());
  return () => {
    off();
    urls.forEach(URL.revokeObjectURL);
  };
}
