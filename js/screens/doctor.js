// Doctor: record (or type) the visit, and Nila writes down the medicines, the
// dates and the advice in the doctor's own words.

import * as store from '../store.js';
import { parseVisit } from '../lib/visit-parser.js';
import { SAMPLE_VISITS } from '../data/sample-visits.js';
import { icon } from '../icons.js';
import { ill } from '../illustrations.js';
import { html, str, raw, dayOf, sheet, toast } from '../ui.js';

const I = (n) => raw(icon(n));
const LANGS = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'ta-IN', label: 'தமிழ்' },
  { code: 'te-IN', label: 'తెలుగు' },
];
const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
let lang = 'en-IN';

export async function saveVisit({ title, text, how, langLabel, sample = false }) {
  const t = Date.now();
  const parsed = parseVisit(text, t);
  return store.putItem('visits', { title, t, transcript: text, parsed, how, lang: langLabel, sample, remindersSet: false });
}

export async function render(root) {
  let rec = null;

  async function draw() {
    const visits = await store.list('visits');
    root.innerHTML = str(html`
      <div class="hero">
        <div><h2>At the doctor’s</h2><p>Record the visit. Nila writes down the medicines, dates and advice in the doctor’s own words.</p></div>
        ${raw(ill.clipboard())}
      </div>
      <section class="card tinted">
        <div class="t" style="font-weight:600;margin-bottom:10px">The doctor will speak</div>
        <div class="seg" role="group" aria-label="Language">
          ${LANGS.map((l) => html`<button data-lang="${l.code}" aria-pressed="${l.code === lang}">${l.label}</button>`)}
        </div>
        <div style="height:14px"></div>
        <button class="btn primary" data-record ${Recognition ? '' : raw('disabled')}>${I('mic')} Record the visit</button>
        <p class="small muted" style="margin:10px 0 0">${Recognition
          ? 'Keep the phone near the doctor and stop when the visit is over. Your browser’s speech service turns the speech into text; the notes are kept on this device.'
          : 'This browser cannot turn speech into text. Type or paste the notes instead.'}
          ${lang !== 'en-IN' ? ' Medicines and dates are picked out of English; other languages are kept as the transcript.' : ''}</p>
        <button class="text-btn" data-type>${I('edit')} Type or paste the notes instead</button>
      </section>

      <a class="link-row" href="#/calendar">
        <span class="badge sm tone-blue">${I('calendar')}</span>
        <span class="grow"><div class="t">Calendar</div><div class="s">Next visits, vaccines and medicine courses</div></span>
        ${raw(icon('chevron', 'chev'))}
      </a>

      ${visits.length ? html`
        <h2 class="h-section">Your visits</h2>
        ${visits.map((v) => html`
          <a class="link-row" href="#/visit/${v.id}">
            <span class="badge sm tone-peach">${I('doctor')}</span>
            <span class="grow"><div class="t">${v.title}</div><div class="s">${dayOf(v.t)} · ${v.parsed.medicines.length} medicine${v.parsed.medicines.length === 1 ? '' : 's'}, ${v.parsed.dates.length} date${v.parsed.dates.length === 1 ? '' : 's'}${v.sample ? ' · sample' : ''}</div></span>
            ${raw(icon('chevron', 'chev'))}
          </a>`)}` : ''}

      <h2 class="h-section">Try a sample visit</h2>
      <p class="muted" style="margin-top:-4px">What a doctor might say, to see what Nila writes down.</p>
      ${SAMPLE_VISITS.map((s) => html`
        <button class="link-row" data-sample="${s.id}">
          <span class="badge sm tone-plum">${I('flask')}</span>
          <span class="grow"><div class="t">${s.title}</div><div class="s">${s.lang} · ${s.text.replaceAll('{name}', store.babyName()).slice(0, 48)}…</div></span>
          ${raw(icon('chevron', 'chev'))}
        </button>`)}
      <p class="small faint" style="margin:14px 4px">Nila writes down what was said; it does not check doses. Always follow the written prescription.</p>`);

    root.querySelectorAll('[data-lang]').forEach((b) => (b.onclick = () => { lang = b.dataset.lang; draw(); }));
    root.querySelector('[data-record]').onclick = record;
    root.querySelector('[data-type]').onclick = typeNotes;
    root.querySelectorAll('[data-sample]').forEach((b) => (b.onclick = async () => {
      const s = SAMPLE_VISITS.find((x) => x.id === b.dataset.sample);
      const v = await saveVisit({ title: s.title, text: s.text.replaceAll('{name}', store.babyName()), how: 'sample', langLabel: s.lang, sample: true });
      location.hash = `#/visit/${v.id}`;
    }));
  }

  function typeNotes() {
    sheet((body, close) => {
      body.innerHTML = str(html`
        <h2>Type or paste the visit</h2>
        <p class="muted">What the doctor said, in their words. Full sentences work best: “Give vitamin D drops, 1 ml every morning.”</p>
        <form>
          <label class="field"><span>Visit</span><input class="input" name="title" value="Visit on ${dayOf(Date.now())}"></label>
          <textarea class="input" name="text" rows="8" required placeholder="The doctor said…"></textarea>
          <div style="height:12px"></div>
          <button class="btn primary" type="submit">Write it down</button>
        </form>`);
      body.querySelector('form').onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const v = await saveVisit({ title: String(f.get('title')).trim() || 'Visit', text: String(f.get('text')), how: 'typed', langLabel: 'typed' });
        close();
        location.hash = `#/visit/${v.id}`;
      };
    });
  }

  function record() {
    if (!Recognition) return;
    const label = LANGS.find((l) => l.code === lang).label;
    let finalText = '';
    let started = Date.now();
    let timer = null;
    const close = sheet((body) => {
      body.innerHTML = str(html`
        <h2>Listening to the visit</h2>
        <div class="setting-row"><span class="badge sm tone-urgent">${I('mic')}</span><div class="grow"><div class="t">Recording · ${label}</div><div class="s" data-time>0:00</div></div></div>
        <div class="card" style="min-height:140px;max-height:40vh;overflow:auto" data-live><span class="muted">The words appear here as the doctor speaks…</span></div>
        <button class="btn primary" data-stop>${I('stop')} Stop and write it down</button>
        <div style="height:8px"></div>
        <button class="btn outline" data-cancel>Cancel</button>`);
      body.querySelector('[data-stop]').onclick = () => rec?.stop();
      body.querySelector('[data-cancel]').onclick = () => { finalText = ''; rec?.abort(); closeSheet(); };
    });
    const closeSheet = () => { clearInterval(timer); close(); };
    const live = () => document.querySelector('[data-live]');
    rec = new Recognition();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += `${e.results[i][0].transcript.trim()}. `;
        else interim += e.results[i][0].transcript;
      }
      const el = live();
      if (el) el.textContent = `${finalText}${interim}`;
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') toast('The microphone is blocked. Allow it in the address bar.');
      else if (e.error !== 'aborted' && e.error !== 'no-speech') toast(`Speech stopped: ${e.error}`);
    };
    rec.onend = async () => {
      // Chrome ends recognition after a pause; keep going until the parent stops it
      if (document.querySelector('[data-stop]') && rec && !rec._stopping && Date.now() - started < 30 * 60000) {
        try { rec.start(); return; } catch {}
      }
      closeSheet();
      if (!finalText.trim()) return;
      const v = await saveVisit({ title: `Visit on ${dayOf(Date.now())}`, text: finalText.trim(), how: 'heard', langLabel: label });
      location.hash = `#/visit/${v.id}`;
    };
    const stop = rec.stop.bind(rec);
    rec.stop = () => { rec._stopping = true; stop(); };
    rec.start();
    started = Date.now();
    timer = setInterval(() => {
      const el = document.querySelector('[data-time]');
      const s = Math.floor((Date.now() - started) / 1000);
      if (el) el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }, 1000);
  }

  await draw();
  const off = store.onChange((w) => w === 'visits' && draw());
  return () => {
    off();
    try { rec?.abort(); } catch {}
  };
}
