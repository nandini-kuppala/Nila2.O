// A synthesized cry, so the whole ladder can be shown without a baby.
//
// It is not a recording. A buzzy source with a wavering 430-580 Hz pitch goes
// through two resonances, in bursts of about a second with a breath between, and
// is fed into the same ear as the microphone. The "baby" is scripted: in the
// settling scenario she calms a few seconds after hearing humming or a voice, and
// ignores white noise; in the other she keeps crying until someone comes.

export function createDemoCry(ctx, { scenario = 'settles', speed = 1 } = {}) {
  const out = ctx.createGain();
  out.gain.value = 1;

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 480;
  const vib = ctx.createOscillator();
  vib.frequency.value = 6.5;
  const vibAmt = ctx.createGain();
  vibAmt.gain.value = 10;
  vib.connect(vibAmt).connect(osc.frequency);

  const env = ctx.createGain();
  env.gain.value = 0;
  osc.connect(env);

  const tame = ctx.createBiquadFilter();
  tame.type = 'lowpass';
  tame.frequency.value = 4200;
  const f1 = ctx.createBiquadFilter();
  f1.type = 'peaking';
  f1.frequency.value = 1150;
  f1.Q.value = 1.4;
  f1.gain.value = 9;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'peaking';
  f2.frequency.value = 3100;
  f2.Q.value = 2;
  f2.gain.value = 6;
  env.connect(tame).connect(f1).connect(f2).connect(out);

  osc.start();
  vib.start();

  let crying = true;
  let next = ctx.currentTime + 0.15;
  let settleTimer = null;
  let soothing = null;

  function burst(start) {
    const dur = 0.95 + Math.random() * 0.4;
    const base = 440 + Math.random() * 40;
    const peak = 540 + Math.random() * 50;
    osc.frequency.setValueAtTime(base, start);
    osc.frequency.linearRampToValueAtTime(peak, start + dur * 0.35);
    osc.frequency.linearRampToValueAtTime(base - 15, start + dur);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(0.32, start + 0.07);
    env.gain.linearRampToValueAtTime(0.26, start + dur - 0.12);
    env.gain.linearRampToValueAtTime(0.0001, start + dur);
    return dur + 0.32 + Math.random() * 0.18; // the breath in
  }

  const timer = setInterval(() => {
    if (!crying) return;
    while (next < ctx.currentTime + 1.2) next += burst(next);
  }, 120);

  function settle() {
    crying = false;
    clearTimeout(settleTimer);
    const t = Math.max(ctx.currentTime, next - 0.4);
    env.gain.cancelScheduledValues(t);
    env.gain.setValueAtTime(0.0001, t);
  }

  return {
    output: out,
    scenario,
    get crying() {
      return crying;
    },
    /** Nila tells the demo baby what it is playing; the script decides if she calms. */
    setSoothing(soundId) {
      soothing = soundId;
      clearTimeout(settleTimer);
      if (!crying || scenario !== 'settles') return;
      if (soundId === 'humming' || soundId === 'voice') {
        settleTimer = setTimeout(() => {
          if (soothing === soundId) settle();
        }, 6000 / speed);
      }
    },
    /** A parent picked her up. */
    pickUp: settle,
    stop() {
      settle();
      clearInterval(timer);
      setTimeout(() => {
        try { osc.stop(); vib.stop(); } catch {}
        out.disconnect();
      }, 500);
    },
  };
}
