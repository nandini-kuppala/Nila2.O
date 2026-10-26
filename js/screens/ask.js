// Ask: sourced answers about the baby and about the mother, from a curated set
// kept on this device. When nothing matches, it says so instead of guessing.

import * as store from '../store.js';
import { ANSWERS } from '../data/answers.js';
import { bestAnswer, search } from '../lib/search.js';
import { logState } from '../lib/summaries.js';
import { icon } from '../icons.js';
import { ill } from '../illustrations.js';
import { html, str, raw, ago, timeOf } from '../ui.js';

const I = (n) => raw(icon(n));
const SUGGEST = ['crying-normal', 'eat-breastfeeding', 'last-feed', 'milk-enough', 'sleep-position', 'fever'];
const LAST_FEED = /\b(last|latest)\b.*\b(feed|fed|feeding|ate|milk)\b|\bwhen did she (eat|feed)\b/i;

export async function render(root, { name, params }) {
  if (name === 'answer') return answerView(root, params.join('/'));
  homeView(root);
}

function homeView(root) {
  const chips = SUGGEST.map((id) => (id === 'last-feed'
    ? { q: 'When did she last feed?', tone: 'blue', icon: 'clock' }
    : ANSWERS.find((a) => a.id === id)));
  root.innerHTML = str(html`
    <div class="hero">
      <div><h2>Ask anything</h2><p>Sourced answers about your baby or about you. Everything stays on this device.</p></div>
      ${raw(ill.asking())}
    </div>
    <form id="ask-form">
      <textarea class="input" name="q" rows="3" placeholder="Ask a question about your baby or you…" aria-label="Your question"></textarea>
      <div style="height:12px"></div>
      <button class="btn primary" type="submit" disabled>${I('send')} Ask</button>
    </form>
    <h2 class="h-section">Try one of these</h2>
    <a class="link-row tinted" href="#/medicine">
      <span class="badge sm tone-teal">${I('pill')}</span>
      <span class="grow"><div class="t">Check a medicine</div><div class="s">Is it safe with breastfeeding? Type the name on the strip</div></span>
      ${raw(icon('chevron', 'chev'))}
    </a>
    <div class="suggest">
      ${chips.map((c) => html`
        <button type="button" data-q="${c.q}" style="background:var(--${c.tone}-bg)">
          <span class="badge sm tone-${c.tone}">${I(c.icon)}</span><span>${c.q}</span>
        </button>`)}
    </div>
    <h2 class="h-section">Everything Nila can answer</h2>
    <section class="card">
      ${ANSWERS.map((a) => html`<button class="text-btn" style="display:block;text-align:left;font-weight:500" data-q="${a.q}">${a.q}</button>`)}
    </section>
    <p class="small faint" style="margin:14px 4px">Answers are short summaries of the NHS, the American Academy of Pediatrics and the NIH, with links. They are not medical advice for your baby; your doctor knows her.</p>`);

  const form = root.querySelector('#ask-form');
  const btn = form.querySelector('button');
  form.q.oninput = () => (btn.disabled = !form.q.value.trim());
  form.onsubmit = (e) => {
    e.preventDefault();
    location.hash = `#/answer/${encodeURIComponent(form.q.value.trim())}`;
  };
  root.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => (location.hash = `#/answer/${encodeURIComponent(b.dataset.q)}`)));
}

async function answerView(root, question) {
  const q = decodeURIComponent(question || '');
  const name = store.babyName();
  let body;

  if (LAST_FEED.test(q)) {
    const log = logState(await store.events());
    body = html`
      <div class="answer">
        <p>${log.lastFeed ? `${name} last fed at ${timeOf(log.lastFeed)}, ${ago(log.lastFeed)}.` : `No feeds are logged yet.`}</p>
        <p>${log.lastFeed ? 'From your quick log on the Monitor screen.' : 'Tap Feed in the quick log on the Monitor screen each time she feeds, and Nila can answer this.'}</p>
      </div>
      <div class="btn-row"><a class="btn tonal small" href="#/monitor">Open the quick log</a></div>`;
  } else {
    const a = bestAnswer(q, ANSWERS);
    const related = search(q, ANSWERS).map((r) => r.answer).filter((x) => x !== a).slice(0, 3);
    body = a ? html`
      <div class="answer">${a.answer.map((p) => html`<p>${p}</p>`)}</div>
      ${a.link ? html`<div class="btn-row"><a class="btn tonal small" href="${a.link.href}">${a.link.label}</a></div>` : ''}
      ${a.worth ? html`<div class="worth"><b>${I('warn')} Worth knowing</b>${a.worth}</div>` : ''}
      <details class="card sources" open>
        <summary style="font-weight:600;cursor:pointer">${I('shield')} Sources (${a.sources.length})</summary>
        ${a.sources.map((s) => html`<a href="${s.url}" target="_blank" rel="noopener">• ${s.label}</a>`)}
      </details>
      ${a.q.toLowerCase() !== q.toLowerCase() ? html`<p class="small muted">Answered as: “${a.q}”</p>` : ''}`
      : html`
      <section class="card">
        <h3>Nila doesn’t have a sourced answer for that yet</h3>
        <p class="muted" style="margin:0">Rather than guess, it only answers from pages it can cite. If you are worried about her, call your doctor or health visitor.</p>
      </section>`;
    if (related.length) {
      body = html`${body}
        <h2 class="h-section">Also asked</h2>
        ${related.map((r) => html`<button class="link-row" data-q="${r.q}"><span class="badge sm tone-${r.tone}">${I(r.icon)}</span><span class="grow t">${r.q}</span>${raw(icon('chevron', 'chev'))}</button>`)}`;
    }
  }

  root.innerHTML = str(html`
    <div class="q-bubble">
      <span class="grow" style="font-size:16px">${q}</span>
      <a class="icon-btn" href="#/ask" aria-label="Ask something else" style="width:32px;height:32px">${I('edit')}</a>
    </div>
    ${body}
    <p class="small faint" style="margin:14px 4px">Not medical advice. If she seems unwell, trust your instinct and call your doctor.</p>`);
  root.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => (location.hash = `#/answer/${encodeURIComponent(b.dataset.q)}`)));
}
