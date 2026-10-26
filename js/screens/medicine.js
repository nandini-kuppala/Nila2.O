// Check a medicine: is it safe with breastfeeding? Type the name from the strip
// (a generic or an Indian brand). Recent checks are kept on this device.

import * as store from '../store.js';
import { MEDICINES, MED_SOURCES, findMedicine } from '../data/medicines.js';
import { icon } from '../icons.js';
import { html, str, raw, dayOf } from '../ui.js';

const I = (n) => raw(icon(n));
const VERDICT = {
  safe: { text: 'Likely safe for you', cls: 'v-safe', tone: 'calm' },
  check: { text: 'Check with your doctor', cls: 'v-check', tone: 'attention' },
  avoid: { text: 'Best avoided', cls: 'v-avoid', tone: 'urgent' },
};

export async function render(root) {
  async function draw(result, typed) {
    const recent = (await store.getValue('medChecks')) || [];
    root.innerHTML = str(html`
      <p class="muted" style="margin-top:0">For a breastfeeding mother. Type the name on the strip or the box: a generic name or a brand.</p>
      <form id="med-form" class="card-row" style="gap:10px">
        <input class="input grow" name="q" placeholder="e.g. Crocin, ibuprofen, Allegra" autocomplete="off" list="med-names" aria-label="Medicine name" value="${typed || ''}">
        <button class="btn primary small" type="submit">Check</button>
      </form>
      <datalist id="med-names">${MEDICINES.flatMap((m) => [m.name, ...m.aka.filter((a) => /[a-z]/.test(a))]).map((n) => html`<option value="${n}">`)}</datalist>
      <div style="height:14px"></div>
      ${result === null ? html`
        <section class="card">
          <h3>Not in Nila’s list</h3>
          <p class="muted" style="margin:0">Nila only knows ${MEDICINES.length} common medicines. Ask a pharmacist, and tell them you are breastfeeding.</p>
        </section>` : ''}
      ${result ? card(result, Date.now(), true) : ''}
      ${recent.length ? html`
        <h2 class="h-section">Recent checks</h2>
        ${recent.map((r) => { const m = MEDICINES.find((x) => x.name === r.name); return m ? card(m, r.t, false) : ''; })}` : ''}
      <div class="notice teal" style="margin-top:14px">${I('shield')}<div>All checks are saved on this device only.</div></div>
      <p class="small faint" style="margin:6px 4px">Summaries of ${raw(`<a href="${MED_SOURCES.lactmed.url}" target="_blank" rel="noopener">NIH LactMed</a>`)} and ${raw(`<a href="${MED_SOURCES.nhs.url}" target="_blank" rel="noopener">NHS guidance</a>`)}. Not for dosing your baby: ask her doctor for that.</p>`);

    const form = root.querySelector('#med-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const q = form.q.value.trim();
      if (!q) return;
      const m = findMedicine(q);
      if (m) {
        const list = [{ name: m.name, t: Date.now() }, ...recent.filter((r) => r.name !== m.name)].slice(0, 8);
        await store.setValue('medChecks', list);
      }
      draw(m, q);
    };
  }

  function card(m, t, open) {
    const v = VERDICT[m.verdict];
    return html`
      <details class="card" ${open ? raw('open') : ''} style="${open ? raw(`border-color:var(--${v.tone})`) : ''}">
        <summary class="card-row" style="cursor:pointer;list-style:none">
          <span class="badge sm tone-${v.tone}">${I('pill')}</span>
          <span class="grow"><div style="font-weight:600;font-size:16px">${m.name}</div>
            <div class="verdict ${v.cls}"><span class="dot"></span>${v.text}</div>
            <div class="small muted">Checked ${dayOf(t)} · typed</div></span>
          ${raw(icon('chevronDown', 'chev'))}
        </summary>
        <p style="margin:12px 0 6px">${m.why}</p>
        ${m.aka.length ? html`<p class="small muted" style="margin:0 0 8px">Also sold as: ${m.aka.join(', ')}</p>` : ''}
        <p class="small muted" style="margin:0">Tell your doctor or pharmacist you are breastfeeding before taking any medicine.</p>
      </details>`;
  }

  await draw(undefined, '');
}
