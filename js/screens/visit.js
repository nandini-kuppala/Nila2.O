// Visit notes (#/visit/<id>) and the Calendar (#/calendar).

import * as store from '../store.js';
import { remindersFor } from '../lib/visit-parser.js';
import { toIcs } from '../lib/ics.js';
import { icon } from '../icons.js';
import { html, str, raw, dayOf, timeOf, toast } from '../ui.js';

const I = (n) => raw(icon(n));
const longDay = (t) => new Date(t).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
  a.download = name;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export async function render(root, { name, params }) {
  if (name === 'calendar') return calendar(root);
  const v = await store.getItem('visits', params[0]);
  if (!v) {
    root.innerHTML = '<div class="empty">This visit is no longer on this device.</div>';
    return;
  }
  const p = v.parsed;
  const reminders = remindersFor(p, v.t);
  const how = v.how === 'heard' ? `heard in ${v.lang}` : v.how === 'sample' ? 'sample visit' : 'typed';

  root.innerHTML = str(html`
    <h2 style="font-size:26px;margin:4px 0 2px">${v.title}</h2>
    <p class="muted" style="margin:0 0 6px">${dayOf(v.t)} · ${how}</p>

    <div class="sec-title"><span class="badge sm tone-peach">${I('med')}</span>Medicines</div>
    ${p.medicines.length ? p.medicines.map((m) => html`
      <div class="med">
        <div class="top"><span>${m.name}</span>${m.amount ? html`<span class="amt">${m.amount}</span>` : ''}</div>
        <div>${m.asNeeded || m.schedule || 'As the doctor said'}</div>
        ${m.times.map((t) => html`<span class="tag">${t}</span>`)}
        ${m.asNeeded ? html`<span class="tag">Only when needed</span>` : ''}
        ${m.days ? html`<span class="tag">${m.days} days</span>` : m.ongoing || (!m.asNeeded && m.times.length) ? html`<span class="tag">Ongoing</span>` : ''}
        <details><summary>Doctor’s words ›</summary><p style="margin:6px 0 0">“${m.words}”</p></details>
      </div>`) : html`<p class="muted">No medicines were mentioned.</p>`}
    ${reminders.length ? html`
      <button class="btn primary" data-remind>${I('alarm')} ${v.remindersSet ? `Reminders set · download for your phone` : `Set ${reminders.length} reminder${reminders.length === 1 ? '' : 's'}`}</button>` : ''}
    <p class="small muted" style="margin:10px 2px 0">Amounts are written as the doctor said them. Check them against the prescription.</p>

    ${p.dates.length || p.given.length ? html`
      <div class="sec-title"><span class="badge sm tone-blue">${I('calendar')}</span>Dates</div>
      ${p.dates.map((d) => html`<div class="date-row"><span>${d.label}</span><b>${longDay(d.date)}</b></div>`)}
      ${p.given.map((g) => html`<div class="date-row"><span>${I('syringe')} Given today: ${g.what}</span></div>`)}` : ''}

    ${p.advice.length ? html`
      <div class="sec-title"><span class="badge sm tone-teal">${I('ask')}</span>Advice</div>
      <section class="card">${p.advice.map((a) => html`<p style="margin:0 0 10px">“${a.text}”</p>`)}</section>` : ''}

    <details class="card">
      <summary style="font-weight:600;cursor:pointer">The full transcript</summary>
      <p class="muted" style="margin:10px 0 0;white-space:pre-wrap">${v.transcript}</p>
    </details>
    <button class="text-btn" data-delete>${I('trash')} Delete this visit</button>`);

  root.querySelector('[data-remind]')?.addEventListener('click', async () => {
    const all = ((await store.getValue('reminders')) || []).filter((r) => r.visitId !== v.id);
    await store.setValue('reminders', [...all, ...reminders.map((r) => ({ ...r, visitId: v.id }))]);
    if (!v.remindersSet) {
      await store.putItem('visits', { ...v, remindersSet: true });
      toast(`${reminders.length} reminders are in Nila’s calendar`);
    }
    download(`${store.babyName()}-${v.title.replace(/\W+/g, '-')}.ics`, toIcs(p, v.t, store.babyName()));
    render(root, { name, params });
  });
  root.querySelector('[data-delete]').onclick = async () => {
    await store.deleteItem('visits', v.id);
    const all = (await store.getValue('reminders')) || [];
    await store.setValue('reminders', all.filter((r) => r.visitId !== v.id));
    location.hash = '#/doctor';
  };
}

async function calendar(root) {
  const now = Date.now();
  const all = ((await store.getValue('reminders')) || []).filter((r) => r.t >= now - 3600e3).sort((a, b) => a.t - b.t);
  const dates = all.filter((r) => r.kind === 'date');
  const soon = all.filter((r) => r.kind === 'medicine' && r.t < now + 7 * 864e5);
  const byDay = new Map();
  for (const r of soon) {
    const k = new Date(r.t).toDateString();
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(r);
  }
  root.innerHTML = str(html`
    ${!all.length ? html`
      <section class="card empty">${I('calendar')}<p>Nothing here yet. Open a visit and press “Set reminders”, and its medicines and dates appear here.</p>
        <a class="btn tonal small" href="#/doctor">Go to the doctor’s visits</a></section>` : ''}
    ${dates.length ? html`
      <h2 class="h-section">Coming up</h2>
      ${dates.map((d) => html`<div class="date-row"><span>${d.title}</span><b>${longDay(d.t)}</b></div>`)}` : ''}
    ${byDay.size ? html`
      <h2 class="h-section">Medicines this week</h2>
      ${[...byDay.entries()].map(([k, rs]) => html`
        <section class="card">
          <div class="overline" style="margin-bottom:6px">${longDay(new Date(k).getTime())}</div>
          ${rs.map((r) => html`<div class="setting-row" style="padding:6px 0"><span class="badge sm tone-peach">${I('pill')}</span><div class="grow">${r.title}</div><span class="muted">${timeOf(r.t)}</span></div>`)}
        </section>`)}` : ''}
    ${all.length ? html`<p class="small muted">To be reminded on time, add the visit’s calendar file to your phone’s calendar from the visit page. Nila cannot ring an alarm while the browser is closed.</p>` : ''}`);
}
