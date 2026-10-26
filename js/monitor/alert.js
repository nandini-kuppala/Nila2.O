// "Wake you": the full-screen alert. It says what Nila already tried, so the parent
// walks in knowing that white noise did not work, rather than starting from zero.

import { html, str, clock } from '../ui.js';
import { icon } from '../icons.js';
import { soundName } from './sounds.js';

export function showWake({ name, elapsedMs, tried, reason, demo, onAck }) {
  const el = document.createElement('div');
  el.className = 'wake flash';
  el.setAttribute('role', 'alertdialog');
  el.setAttribute('aria-live', 'assertive');
  el.innerHTML = str(html`
    <div class="inner">
      <span class="chip"><span class="dot"></span>${demo ? 'DEMO · ' : ''}URGENT</span>
      <h2>${name} needs you</h2>
      <p>Crying for ${clock(elapsedMs)}. Nila tried before waking you:</p>
      <ul>
        ${tried.length
          ? tried.map((t) => html`<li>${soundName(t.soundId)}: ${t.helped ? 'helped' : "didn't help"} (${t.text})</li>`)
          : html`<li>No sound was available to try</li>`}
      </ul>
      ${reason ? html`<p><b>${reason.headline}</b><br><span style="opacity:.85">${reason.detail}</span></p>` : ''}
      <button class="btn" data-ack>${{ __raw: icon('check') }} I'm going to her</button>
    </div>`);
  document.body.append(el);
  setTimeout(() => el.classList.remove('flash'), 6000);
  el.querySelector('[data-ack]').addEventListener('click', () => {
    el.remove();
    onAck?.();
  });

  try { navigator.vibrate?.([400, 200, 400, 200, 800]); } catch {}
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${name} needs you`, {
        body: tried.length ? `Tried ${tried.map((t) => soundName(t.soundId).toLowerCase()).join(' and ')} first.` : 'Crying for over a minute.',
        tag: 'nila-wake',
        requireInteraction: true,
      });
    }
  } catch {}

  return () => el.remove();
}
