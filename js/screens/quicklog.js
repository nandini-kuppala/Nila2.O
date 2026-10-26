// Quick log on the Monitor screen: Feed, Nappy, Sleep in one tap, and "[Name] today".

import * as store from '../store.js';
import { icon } from '../icons.js';
import { html, str, raw, ago, duration, toast, sheet } from '../ui.js';
import { summarize, logState, startOfDay } from '../lib/summaries.js';

const I = (n) => raw(icon(n));

export async function renderQuickLog(el) {
  async function draw() {
    const events = await store.events();
    const log = logState(events);
    const now = Date.now();
    const today = summarize(events, startOfDay(now), now + 1, now);
    const sleeping = !!log.sleepId;
    el.innerHTML = str(html`
      <h2 class="h-section">Quick log</h2>
      <div class="quick">
        <button class="q-teal" data-log="feed">
          <span class="badge sm tone-teal">${I('bottle')}</span>${raw(icon('plus', 'plus'))}
          <b>Feed</b><small>${log.lastFeed ? ago(log.lastFeed, now) : 'Tap to log'}</small>
        </button>
        <button class="q-peach" data-log="nappy">
          <span class="badge sm tone-peach">${I('nappy')}</span>${raw(icon('plus', 'plus'))}
          <b>Nappy</b><small>${log.lastNappy ? ago(log.lastNappy, now) : 'Tap to log'}</small>
        </button>
        <button class="q-blue" data-log="sleep" aria-pressed="${sleeping}">
          <span class="badge sm tone-blue">${I('sleep')}</span>${raw(icon(sleeping ? 'stop' : 'play', 'plus'))}
          <b>${sleeping ? 'Asleep' : 'Sleep'}</b>
          <small>${sleeping ? `for ${duration(now - log.sleepStart)} · tap to end` : log.sleepEnd ? `woke ${ago(log.sleepEnd, now)}` : 'Tap when she sleeps'}</small>
        </button>
      </div>
      <button class="text-btn" data-earlier style="margin-top:6px">${I('clock')} Log an earlier time</button>
      <h2 class="h-section">${store.babyName()} today <a class="right" href="#/timeline">See all ${I('chevron')}</a></h2>
      <section class="card flat">
        <div class="tiles" style="padding:0">
          <div><span class="badge sm tone-plum">${I('sad')}</span><b>${today.cries}</b><span>cries</span><small>${duration(today.cryMs)}</small></div>
          <div><span class="badge sm tone-blue">${I('sleep')}</span><b>${duration(today.sleepMs)}</b><span>sleep</span><small>${today.sleepStretches} stretch${today.sleepStretches === 1 ? '' : 'es'}</small></div>
          <div><span class="badge sm tone-teal">${I('bottle')}</span><b>${today.feeds}</b><span>feeds</span><small>${today.lastFeed ? ago(today.lastFeed, now) : 'none'}</small></div>
          <div><span class="badge sm tone-peach">${I('nappy')}</span><b>${today.nappies}</b><span>nappies</span><small>${today.lastNappy ? ago(today.lastNappy, now) : 'none'}</small></div>
        </div>
      </section>`);

    el.querySelectorAll('[data-log]').forEach((b) => (b.onclick = async () => {
      const type = b.dataset.log;
      if (type === 'sleep') {
        if (log.sleepId) {
          await store.updateEvent(log.sleepId, { end: Date.now() });
          toast(`${store.babyName()} is awake. Sleep logged.`);
        } else {
          await store.addEvent({ type: 'sleep', start: Date.now(), end: null });
          toast('Sleep started');
        }
      } else {
        await store.addEvent({ type });
        toast(type === 'feed' ? 'Feed logged' : 'Nappy change logged');
      }
    }));
  }

  function logEarlier() {
    sheet((body, close) => {
      const d = new Date(Date.now() - 30 * 60000);
      const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      body.innerHTML = str(html`
        <h2>Log an earlier time</h2>
        <p class="muted">For a feed, nappy or sleep you did not log when it happened.</p>
        <form>
          <div class="seg" role="group" aria-label="What" style="margin-bottom:14px">
            <button type="button" data-k="feed" aria-pressed="true">Feed</button>
            <button type="button" data-k="nappy" aria-pressed="false">Nappy</button>
            <button type="button" data-k="sleep" aria-pressed="false">Sleep</button>
          </div>
          <label class="field"><span data-when>At</span><input class="input" type="time" name="at" value="${hhmm}" required></label>
          <label class="field" data-until hidden><span>Woke at</span><input class="input" type="time" name="until"></label>
          <button class="btn primary" type="submit">Save</button>
        </form>`);
      let kind = 'feed';
      body.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => {
        kind = b.dataset.k;
        body.querySelectorAll('[data-k]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        body.querySelector('[data-until]').hidden = kind !== 'sleep';
        body.querySelector('[data-when]').textContent = kind === 'sleep' ? 'Fell asleep at' : 'At';
      }));
      const toTime = (v) => {
        const [h, m] = v.split(':').map(Number);
        const t = new Date();
        t.setHours(h, m, 0, 0);
        if (t.getTime() > Date.now()) t.setDate(t.getDate() - 1); // a time later than now was yesterday
        return t.getTime();
      };
      body.querySelector('form').onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const at = toTime(f.get('at'));
        if (kind === 'sleep') {
          let end = f.get('until') ? toTime(f.get('until')) : null;
          if (end && end < at) end += 864e5;
          await store.addEvent({ type: 'sleep', t: at, start: at, end: end && end <= Date.now() ? end : null });
        } else await store.addEvent({ type: kind, t: at });
        close();
        toast('Logged');
      };
    });
  }

  await draw();
  el.addEventListener('click', (e) => { if (e.target.closest('[data-earlier]')) logEarlier(); });
  const off = store.onChange((what) => what === 'events' && draw());
  const tick = setInterval(draw, 60000);
  return () => {
    off();
    clearInterval(tick);
  };
}
