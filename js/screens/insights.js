// Insights: the week, the next morning. Every figure is written out in words under
// its chart, and every one is counted from rows you can read in the Timeline.

import * as store from '../store.js';
import { SOUNDS, soundName } from '../monitor/sounds.js';
import { icon } from '../icons.js';
import { ill } from '../illustrations.js';
import { html, str, raw, duration, toast, sheet } from '../ui.js';
import { crying7Days, weekStats, cryByHour, soundRecord, summarize, startOfDay, DAY, COLIC_MS } from '../lib/summaries.js';
import { sampleWeek } from '../lib/sample-week.js';

const I = (n) => raw(icon(n));
const H = 3600e3;

function dayChart(days) {
  const W = 340, Hh = 220, left = 34, right = 8, top = 16, bottom = 28;
  const maxH = Math.max(4, Math.ceil(Math.max(...days.map((d) => d.cryMs)) / H));
  const y = (ms) => top + (Hh - top - bottom) * (1 - ms / (maxH * H));
  const bw = (W - left - right) / days.length;
  const grid = [];
  for (let h = 0; h <= maxH; h++) {
    grid.push(`<line x1="${left}" x2="${W - right}" y1="${y(h * H)}" y2="${y(h * H)}" stroke="var(--chart-grid)" stroke-dasharray="${h ? '2 4' : ''}"/>`);
    grid.push(`<text x="${left - 8}" y="${y(h * H) + 4}" text-anchor="end">${h}h</text>`);
  }
  const bars = days.map((d, i) => {
    const x = left + i * bw + bw * 0.22;
    const w = bw * 0.56;
    const over = d.cryMs >= COLIC_MS;
    const h = Math.max(d.cryMs ? 2 : 0, y(0) - y(d.cryMs));
    const label = new Date(d.from).toLocaleDateString([], { weekday: 'short' });
    return `<rect x="${x}" y="${y(0) - h}" width="${w}" height="${h}" rx="4" fill="${over ? 'var(--chart-cry)' : 'var(--chart-cry-soft)'}"><title>${label}: ${duration(d.cryMs)}</title></rect>
            <text x="${x + w / 2}" y="${Hh - 8}" text-anchor="middle">${label}</text>`;
  });
  const colic = `<line x1="${left}" x2="${W - right}" y1="${y(COLIC_MS)}" y2="${y(COLIC_MS)}" stroke="var(--chart-cry)" stroke-width="1.5" stroke-dasharray="5 4"/>
                 <text x="${W - right}" y="${y(COLIC_MS) - 6}" text-anchor="end" style="fill:var(--text)">3h colic line</text>`;
  return `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Crying per day this week">${grid.join('')}${bars.join('')}${colic}</svg>`;
}

function hourChart(hours) {
  const W = 340, Hh = 110, left = 6, right = 6, top = 8, bottom = 22;
  const max = Math.max(...hours, 1);
  const bw = (W - left - right) / 24;
  const bars = hours.map((ms, h) => {
    const bh = ((Hh - top - bottom) * ms) / max;
    return `<rect x="${left + h * bw + 1}" y="${Hh - bottom - bh}" width="${bw - 2}" height="${bh}" rx="2" fill="var(--chart-cry)" opacity="${ms ? 0.85 : 0}"><title>${h}:00 · ${duration(ms)}</title></rect>`;
  });
  const labels = [0, 6, 12, 18, 23].map((h) => `<text x="${left + h * bw + bw / 2}" y="${Hh - 6}" text-anchor="middle">${String(h).padStart(2, '0')}:00</text>`);
  return `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Crying by hour of the day"><line x1="${left}" x2="${W - right}" y1="${Hh - bottom}" y2="${Hh - bottom}" stroke="var(--chart-grid)"/>${bars.join('')}${labels.join('')}</svg>`;
}

function busiestHours(hours) {
  let best = 0, at = 0;
  for (let h = 0; h < 24; h++) {
    const w = hours[h] + hours[(h + 1) % 24] + hours[(h + 2) % 24];
    if (w > best) { best = w; at = h; }
  }
  return best ? `${String(at).padStart(2, '0')}:00 and ${String((at + 3) % 24).padStart(2, '0')}:00` : null;
}

export async function render(root) {
  async function draw() {
    const now = Date.now();
    const events = await store.events();
    const days = crying7Days(events, now);
    const w = weekStats(days);
    const weekFrom = startOfDay(now) - 6 * DAY;
    const week = summarize(events, weekFrom, now + 1, now);
    const name = store.babyName();
    const rec = soundRecord(events.filter((e) => e.t >= weekFrom));
    const hours = cryByHour(events, weekFrom, now + 1);
    const busy = busiestHours(hours);
    const hasSamples = events.some((e) => e.sample);
    const worstDay = new Date(w.worst.from).toLocaleDateString([], { weekday: 'long' });

    root.innerHTML = str(html`
      <div class="hero">
        <div><h2>Insights</h2><p>The patterns in what Nila heard and what you logged this week, and how far each of them can be trusted.</p></div>
        ${raw(ill.sleeping())}
      </div>
      ${hasSamples ? html`<div class="notice slate">${I('info')}<div>This week includes <b>sample</b> entries so the charts have something to show. <button class="text-btn" data-remove>Remove the samples</button></div></div>` : ''}
      ${!w.cries ? html`
        <section class="card empty">
          ${I('chart')}
          <p>No crying recorded this week yet. When Nila hears cries, or you run the demo, the week fills in here.</p>
          <button class="btn tonal small" data-sample>Add a sample week</button>
        </section>` : html`
        <h2 class="h-section">Crying this week <button class="icon-btn" data-why aria-label="About these numbers" style="width:32px;height:32px">${I('info')}</button></h2>
        <div class="stat-pair">
          <div class="card"><span class="badge sm tone-plum">${I('clock')}</span><div><span class="l">Total crying</span><b>${duration(w.total)}</b><span class="l">${w.cries} cries</span></div></div>
          <div class="card"><span class="badge sm tone-blue">${I('calendar')}</span><div><span class="l">Days over 3h</span><b>${w.over} / 7</b><span class="l">${w.over >= 3 ? 'Worth showing your doctor' : 'Below the rule of threes'}</span></div></div>
        </div>
        <section class="card chart">
          <h3 style="margin-bottom:10px">Daily crying duration</h3>
          ${raw(dayChart(days))}
          <p class="muted" style="margin:10px 0 0">Averaging ${duration(w.avg)} a day, with a worst day of ${duration(w.worst.cryMs)} on ${worstDay}. ${w.over ? `${w.over} day${w.over === 1 ? '' : 's'} crossed the 3-hour line.` : 'No day crossed the 3-hour line.'}</p>
        </section>

        <h2 class="h-section">What settles ${name}</h2>
        <section class="card">
          ${Object.keys(rec).length ? Object.entries(rec).sort((a, b) => b[1].helped / b[1].tried - a[1].helped / a[1].tried).map(([id, r]) => html`
            <div class="bar-row">
              <span>${soundName(id)}</span>
              <span class="bar"><i style="width:${Math.round((100 * r.helped) / r.tried)}%;background:var(--${SOUNDS[id]?.tone || 'teal'}-ink)"></i></span>
              <span class="muted">${r.helped}/${r.tried}</span>
            </div>`) : html`<p class="muted" style="margin:0">No sound has been tried yet this week.</p>`}
          <p class="muted small" style="margin:8px 0 0">Each try is measured: the crying level in the seconds before a sound against the last 15 seconds of it. Nila plays the best one first.</p>
        </section>

        <h2 class="h-section">How Nila handled them</h2>
        <section class="card">
          <div class="bar-row"><span>On her own</span><span class="bar"><i style="width:${Math.round((100 * week.selfSettled) / (week.cries || 1))}%;background:var(--calm)"></i></span><span class="muted">${week.selfSettled}</span></div>
          <div class="bar-row"><span>By a sound</span><span class="bar"><i style="width:${Math.round((100 * week.soothed) / (week.cries || 1))}%"></i></span><span class="muted">${week.soothed}</span></div>
          <div class="bar-row"><span>Woke you</span><span class="bar"><i style="width:${Math.round((100 * week.woke) / (week.cries || 1))}%;background:var(--urgent)"></i></span><span class="muted">${week.woke}</span></div>
          <p class="muted small" style="margin:8px 0 0">Of ${week.cries} cries, ${week.cries - week.woke} ended without anyone being woken.</p>
        </section>

        <h2 class="h-section">When ${name} cries</h2>
        <section class="card chart">
          ${raw(hourChart(hours))}
          <p class="muted" style="margin:10px 0 0">${busy ? `Most crying this week fell between ${busy}.` : ''} Evening clusters are common in the first months.</p>
        </section>`}
      ${w.cries && !hasSamples ? html`<button class="text-btn" data-sample>${I('plus')} Add a sample week to see a fuller picture</button>` : ''}
      <p class="small faint" style="margin:18px 4px">Counts come only from what Nila heard and what you logged. They help a conversation with your doctor; they are not a diagnosis.</p>`);

    root.querySelector('[data-sample]')?.addEventListener('click', async () => {
      await store.addEvents(sampleWeek());
      toast('A sample week was added. It is labelled and can be removed.');
    });
    root.querySelector('[data-remove]')?.addEventListener('click', async () => {
      await store.removeSamples();
      toast('Sample entries removed');
    });
    root.querySelector('[data-why]')?.addEventListener('click', () => sheet((b) => {
      b.innerHTML = str(html`
        <h2>About the 3-hour line</h2>
        <p class="muted">Doctors often describe colic with the "rule of threes": crying for more than 3 hours a day, on more than 3 days a week, for more than 3 weeks, in a baby who is otherwise well.</p>
        <p class="muted">Nila only counts the crying it heard while listening, so a day can read lower than it felt. If a week looks hard, or she seems unwell, talk to your doctor.</p>
        <p class="small"><a href="https://www.nhs.uk/conditions/colic/" target="_blank" rel="noopener">NHS: Colic</a></p>`);
    }));
  }

  await draw();
  const off = store.onChange((w) => w === 'events' && draw());
  return off;
}
