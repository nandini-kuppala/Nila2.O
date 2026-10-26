// Settings: the baby, the parent's own voice as a sound, what settles her so far,
// alerts, the demo speed and the data on this device.

import * as store from '../store.js';
import * as engine from '../monitor/audio-engine.js';
import { SOUNDS } from '../monitor/sounds.js';
import { icon } from '../icons.js';
import { html, str, raw, toast, ageLabel } from '../ui.js';

const I = (n) => raw(icon(n));
const MAX_VOICE_S = 20;

export async function render(root) {
  let recorder = null;
  let recTimer = null;

  async function draw() {
    const s = await store.settings();
    const stats = await store.soundStats();
    const voiceId = await store.getValue('voiceId');
    const samples = (await store.events()).filter((e) => e.sample).length;

    root.innerHTML = str(html`
      <section class="card">
        <h3>${s.babyName}</h3>
        <p class="muted" style="margin:0 0 12px">${ageLabel(s.birthDate)}</p>
        <form id="baby">
          <label class="field"><span>Name</span><input class="input" name="name" value="${s.babyName}" required></label>
          <label class="field"><span>Date of birth</span><input class="input" type="date" name="birth" value="${s.birthDate}" required></label>
          <button class="btn tonal small" type="submit">Save</button>
        </form>
      </section>

      <h2 class="h-section">Your voice</h2>
      <section class="card">
        <p class="muted" style="margin-top:0">Record yourself humming, shushing or singing for up to ${MAX_VOICE_S} seconds. Nila can play it as a sound, and learns whether it settles her.</p>
        <div id="voice-area">
          ${voiceId
            ? html`<div class="setting-row"><span class="badge sm tone-pink">${I('mic')}</span><div class="grow"><div class="t">Your voice is saved</div><div class="s">On this device only</div></div></div>
                   <div class="btn-row"><button class="btn tonal small" data-play-voice>${I('play')} Play</button><button class="btn outline small" data-record>${I('mic')} Record again</button><button class="btn outline small" data-delete-voice>${I('trash')} Delete</button></div>`
            : html`<button class="btn primary" data-record>${I('mic')} Record your voice</button>`}
        </div>
      </section>

      <h2 class="h-section">What settles ${s.babyName}</h2>
      <section class="card">
        ${Object.entries(SOUNDS).filter(([id]) => id !== 'voice' || voiceId).map(([id, snd]) => {
          const st = stats[id];
          return html`
            <div class="setting-row">
              <span class="badge sm tone-${snd.tone}">${I(snd.icon)}</span>
              <div class="grow"><div class="t">${snd.name}</div>
                <div class="s">${st?.tried ? `Helped ${st.helped} of ${st.tried} time${st.tried === 1 ? '' : 's'}` : 'Not tried yet'}</div></div>
              <button class="icon-btn" data-preview="${id}" aria-label="Play ${snd.name}">${I('play')}</button>
            </div>`;
        })}
        <p class="small muted" style="margin:8px 0 0">The sound with the best record is tried first. Untried sounds come before ones that have never helped.</p>
        <button class="text-btn" data-reset-sounds>Forget what Nila has learned</button>
      </section>

      <h2 class="h-section">Alerts</h2>
      <section class="card">
        <label class="setting-row">
          <div class="grow"><div class="t">Alarm sound when Nila wakes you</div><div class="s">A two-tone alarm until you answer it</div></div>
          <span class="switch"><input type="checkbox" data-set="soundOnAlert" ${s.soundOnAlert ? raw('checked') : ''}><span></span></span>
        </label>
        <label class="setting-row">
          <div class="grow"><div class="t">Lights on safety alerts</div><div class="s">The Watch screen flashes white, like a ring light</div></div>
          <span class="switch"><input type="checkbox" data-set="lightsOnAlert" ${s.lightsOnAlert ? raw('checked') : ''}><span></span></span>
        </label>
        <button class="btn outline small" data-notify>${I('bell')} Allow notifications</button>
      </section>

      <h2 class="h-section">Demo</h2>
      <section class="card">
        <div class="t" style="font-weight:600">Demo speed</div>
        <p class="small muted" style="margin:4px 0 10px">Runs the ladder faster during a demo so a recording stays short. Real listening always runs in real time.</p>
        <div class="seg" role="group" aria-label="Demo speed">
          ${[1, 2, 3].map((n) => html`<button data-speed="${n}" aria-pressed="${Number(s.demoSpeed) === n}">${n === 1 ? 'Real time' : `${n}× faster`}</button>`)}
        </div>
      </section>

      <h2 class="h-section">On this device</h2>
      <section class="card">
        <p class="muted" style="margin-top:0">Everything Nila keeps (cries, recordings, photos, visits, records) is stored in this browser on this device. Nothing is uploaded.</p>
        ${samples ? html`<button class="btn outline small" data-remove-samples>Remove ${samples} sample entries</button><div style="height:10px"></div>` : ''}
        <button class="btn danger small" data-clear>${I('trash')} Clear everything</button>
      </section>
      <p class="small faint" style="text-align:center;margin:20px 0">Nila helps you notice and record. It does not diagnose, and it is not a breathing monitor.</p>`);

    root.querySelector('#baby').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      await store.saveSettings({ babyName: String(f.get('name')).trim(), birthDate: f.get('birth') });
      toast('Saved');
      draw();
    };
    root.querySelectorAll('[data-record]').forEach((b) => (b.onclick = recordVoice));
    const play = root.querySelector('[data-play-voice]');
    if (play) play.onclick = () => engine.preview('voice', MAX_VOICE_S);
    const del = root.querySelector('[data-delete-voice]');
    if (del) del.onclick = async () => {
      await store.deleteBlob(voiceId);
      await store.setValue('voiceId', null);
      toast('Your voice was deleted');
      draw();
    };
    root.querySelectorAll('[data-preview]').forEach((b) => (b.onclick = () => engine.preview(b.dataset.preview, 5)));
    root.querySelector('[data-reset-sounds]').onclick = async () => {
      await store.setValue('soundStats', {});
      toast('Nila will start learning again');
      draw();
    };
    root.querySelectorAll('[data-set]').forEach((c) => (c.onchange = () => store.saveSettings({ [c.dataset.set]: c.checked })));
    root.querySelector('[data-notify]').onclick = async () => {
      if (!('Notification' in window)) return toast('This browser has no notifications');
      const p = await Notification.requestPermission();
      toast(p === 'granted' ? 'Notifications are on' : 'Notifications are off');
    };
    root.querySelectorAll('[data-speed]').forEach((b) => (b.onclick = async () => {
      await store.saveSettings({ demoSpeed: Number(b.dataset.speed) });
      draw();
    }));
    const rm = root.querySelector('[data-remove-samples]');
    if (rm) rm.onclick = async () => {
      await store.removeSamples();
      toast('Sample entries removed');
      draw();
    };
    root.querySelector('[data-clear]').onclick = async () => {
      if (!confirm('Delete everything Nila has kept on this device? This cannot be undone.')) return;
      engine.stop();
      await store.clearEverything();
    };
  }

  async function recordVoice() {
    const area = root.querySelector('#voice-area');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast('The microphone is blocked. Allow it in the address bar.');
      return;
    }
    const chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = async () => {
      clearInterval(recTimer);
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const old = await store.getValue('voiceId');
      if (old) await store.deleteBlob(old);
      await store.setValue('voiceId', await store.putBlob(blob, 'voice'));
      toast('Your voice is saved');
      draw();
    };
    recorder.start();
    let left = MAX_VOICE_S;
    area.innerHTML = str(html`
      <div class="setting-row"><span class="badge sm tone-urgent">${I('mic')}</span>
        <div class="grow"><div class="t">Recording…</div><div class="s" data-left>${left}s left</div></div></div>
      <button class="btn primary" data-stop>${I('stop')} Stop and save</button>`);
    area.querySelector('[data-stop]').onclick = () => recorder.state !== 'inactive' && recorder.stop();
    recTimer = setInterval(() => {
      left--;
      const l = area.querySelector('[data-left]');
      if (l) l.textContent = `${left}s left`;
      if (left <= 0 && recorder.state !== 'inactive') recorder.stop();
    }, 1000);
  }

  await draw();
  return () => {
    clearInterval(recTimer);
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  };
}
