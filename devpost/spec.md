---
doc: spec
status: approved
---

# Nila — Technical Spec

> Approved under the learner's instruction to proceed without a live interview. The
> stack is the agent's recommendation (marked below); the learner can change it.

## How This Works, In Plain Language
Nila is one web page that behaves like a phone app. Everything happens inside the
browser on the device; there is no server of ours and no account.

- **The ear** (`js/monitor/detector.js`) takes the microphone (or the demo cry) and, 20
  times a second, asks two questions of the sound: *is it loud compared with the room?*
  and *does it have a steady pitch in a baby's range (300–750 Hz)?* A frame that is
  both counts as crying. The share of crying frames over the last 3 seconds is the
  "x% sure it is a cry", and their loudness is the crying-level line.
- **The ladder** (`js/monitor/ladder.js`) is a small state machine with a clock:
  heard → soothe → check → wake → closed. It does not touch audio or the screen; it is
  fed the ear's readings and the time, and says what should happen next. That is what
  the unit tests exercise.
- **The verdict** compares the crying level in the 10 seconds before a sound with the
  last 15 seconds of that sound. A drop of 60% or more is "Helped".
- **The memory** (`js/store.js`) keeps every event, each sound's record, photos and
  recordings in the browser's own database (IndexedDB), so it all survives a reload
  and never leaves the device.
- **The screens** (`js/screens/*.js`) each draw one part of the learner's design from
  that memory.
- **The eyes** (Watch, Babyproof) use a small object-detection model (COCO-SSD) that the
  browser downloads once and then runs locally; the Watch also compares video frames
  to see movement without any model.

Why this shape: a single static page can be opened from a link by any judge, recorded
on a laptop, and tested with plain Node, with no build step to break.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.
1. First open → `app.js` finds no baby in `store` → welcome sheet → name and birth date
   saved to `settings`.
2. **Start listening** → `audio-engine.js` asks for the microphone → stream →
   `AnalyserNode` → `detector.js` every 50 ms → a reading `{cry, level, score}`.
3. Reading → `ladder.js.tick(reading, now)` → state `heard` once 60% of the last 3 s
   are crying → Monitor redraws the ladder card.
4. At 20 s `ladder` returns action `soothe(soundId)`; `sounds.js` picks it with
   `chooseSound(stats)` and plays it through the speakers.
5. At soothe + 35 s `ladder` computes the verdict from its own level history →
   `store.recordSoundResult(soundId, helped)` → the "What Nila tried" row.
6. Helped → `ladder` closes as `settled`; not helped → next sound; at 90 s → action
   `wake` → `alert.js` shows the full-screen alert, plays the alarm, vibrates, and
   posts a local notification.
7. Close → the episode with its steps, level trace and (if woken) the recorded clip
   goes to `store.addEvent`. Timeline and Insights read it back.
8. Demo → `demo-cry.js` synthesizes a cry into the same analyser (and the speakers);
   its scripted baby stops crying a few seconds after humming or a voice starts.

## Stack
- **HTML, CSS and JavaScript ES modules, no framework, no build step.** (Agent
  recommendation.) Reason: a static page runs from GitHub Pages and from any folder;
  tradeoff: screens are written as template strings rather than components.
- **Web Audio API** (AnalyserNode, OscillatorNode, AudioBuffer) for listening and for
  generating white noise, humming, the alarm and the demo cry —
  https://developer.mozilla.org/docs/Web/API/Web_Audio_API
- **MediaRecorder** for the parent's voice and kept cry clips —
  https://developer.mozilla.org/docs/Web/API/MediaRecorder
- **getUserMedia** for microphone and camera —
  https://developer.mozilla.org/docs/Web/API/MediaDevices/getUserMedia
- **IndexedDB** for storage — https://developer.mozilla.org/docs/Web/API/IndexedDB_API
- **TensorFlow.js 4.22.0 + COCO-SSD 2.2.3** from jsDelivr, model weights from Google's
  `tfjs-models` bucket (checked reachable on 2026-10-26) —
  https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd
- **Web Speech API** (where available) for dictating a doctor's visit —
  https://developer.mozilla.org/docs/Web/API/Web_Speech_API
- **Node 18+ built-in test runner** for logic tests — https://nodejs.org/api/test.html
- Roboto from Google Fonts with a system-font fallback.

## Where It Runs and How Someone Tries It
- Any modern Chrome, Edge or Safari, desktop or phone. Microphone and camera need a
  secure origin: `http://localhost` or HTTPS.
- Local: `npm start` (runs `scripts/serve.mjs`, a dependency-free static server), then
  open http://localhost:5173. Tests: `npm test`.
- Live: GitHub Pages from the `main` branch root, at
  `https://nandini-kuppala.github.io/Nila2.O/`.
- For the demo video: open the live or local URL in a phone-sized window (or on a
  phone), Monitor → **Try a demo cry** → "A cry that settles", twice; then "A cry that
  needs you"; then Timeline, Insights and the other tabs.

## Look and Feel
Implements `prd.md > Look and Feel` as CSS custom properties in `css/tokens.css`,
taken from the learner's own Nila palette:
- Light: page `#F7FAF8`, card `#FFFFFF`, outline `#DCE5E1`, text `#191C1B`, muted
  `#5C6B67`; primary `#0F6B60` (on-primary white), primary container `#E3F2EE`.
- Tones (bg / ink): teal `#E3F2EE/#0F6B60`, peach `#FDEEE2/#B85C1E`, blue
  `#E8EEFB/#3F5FB8`, plum `#F3E9F6/#7B4B86`, pink `#FCE9EE/#C0405F`, slate `#EEF2F4/#4F5F69`.
- Severity only: attention `#A96A12` on `#FBEEDA`, urgent `#B3261E` on `#FBE9E7`,
  calm `#2E6B4F` on `#E1F0E8`. Chart: cry plum `#7B4B86`, sleep `#3A63A0`, feed teal.
- Dark (night mode): page `#101413`, card `#1A201E`, deep tone grounds from the same
  palette, buttons `#1B7A6C`.
- Type: Roboto; page titles 30–34px bold; card titles 18–20px semibold; body 15–16px.
- Radius 20px cards, 999px pills; 16px gutters; bottom bar 72px with a pill behind the
  active icon. Illustrations are inline SVG in `js/illustrations.js`.

## Components

### App shell and router
`index.html`, `js/app.js`. Hash routes (`#/monitor`, `#/timeline`, …), top bar, bottom
tabs, night mode, first-run welcome, toast. PRD ref: `prd.md > Screens and Layout`.

### Store
`js/store.js`. One IndexedDB database `nila` with object stores `events`, `kv`
(settings, sound stats), `blobs` (photos, recordings), `visits`, `records`, `spots`.
Small promise wrapper; a pure in-memory fallback is used by tests.
PRD ref: `prd.md > States and Boundaries`.

### Cry detector
`js/monitor/detector.js`. Pure functions `analyseFrame(timeDomain, freqDomain,
sampleRate, noiseFloor)` → `{rmsDb, pitchHz, clarity, cry}` (autocorrelation pitch) and
a rolling `CryWindow` that yields `score` (share of crying frames, 3 s) and `level`
(0–1). PRD ref: `prd.md > Cry ladder`.

### Ladder
`js/monitor/ladder.js`. Pure state machine `createLadder({timings, sounds, stats})`
with `tick(reading, tMs)` returning actions (`start`, `soothe`, `verdict`, `wake`,
`close`). Timings default 3 s confirm, 20 s soothe, 35 s per sound, 90 s wake, 180 s
cap, 10 s quiet to settle; a `speed` divisor for the demo. Verdict function
`judgeSound(before, during)`. `chooseSound(stats, available)`.
PRD ref: `prd.md > Cry ladder`, `prd.md > Learning which sound works`.

### Audio engine, sounds, alert
`js/monitor/audio-engine.js` (one AudioContext; mic or demo source → analyser →
detector loop; MediaRecorder for the clip), `js/monitor/sounds.js` (white noise,
humming melody, recorded voice), `js/monitor/alert.js` (full-screen wake alert, alarm
tone, vibration, Notification). PRD ref: `prd.md > Cry ladder`.

### Demo cry
`js/monitor/demo-cry.js`. Sawtooth source with a wavering 420–560 Hz contour through two
formant band-pass filters, 1.1 s bursts and 0.4 s breaths; a scripted baby that
stops after hearing humming or a voice for 6 s (scenario "settles") or never
(scenario "needs you"). PRD ref: `prd.md > Demo cry`.

### Reason guess
`js/monitor/reason.js`. Pure `guessReason(log, now, ageMonths)`: hungry if last feed is
past the age-based interval, nappy if last change > 3 h, tired if awake longer than
the age-based wake window, otherwise "can't tell". PRD ref: `prd.md > Quick log and reason guess`.

### Monitor screen
`js/screens/monitor.js`. Status/ladder card, crying-level sparkline (canvas), demo
notice, What Nila tried, reason card, Quick log, "[Name] today".

### Timeline and Insights
`js/screens/timeline.js`, `js/screens/insights.js`, aggregations in
`js/lib/summaries.js` (pure, tested). Sample week generator in `js/lib/sample-week.js`,
every sample row flagged `sample: true`. PRD ref: `prd.md > Timeline`, `prd.md > Insights`.

### Safety watch
`js/screens/watch.js`, `js/watch/tracker.js` (frame differencing on a 64×48 grid →
motion centroid, global-change ratio; optional COCO-SSD person boxes),
`js/watch/demo-scene.js` (animated stand-in cot scene drawn on a canvas and captured as
a stream). PRD ref: `prd.md > Safety watch`.

### Babyproof
`js/screens/babyproof.js`, `js/data/hazards.js` (COCO class → hazard, severity, fix,
source). PRD ref: `prd.md > Babyproof a room`.

### Ask and medicine check
`js/screens/ask.js`, `js/screens/medicine.js`, `js/lib/search.js` (token overlap +
synonyms, tested), `js/data/answers.js` (curated answers with sources: AAP, NHS, WHO,
CDC), `js/data/medicines.js` (breastfeeding verdicts summarised from NIH LactMed).
PRD ref: `prd.md > Ask`, `prd.md > Medicine check (for the breastfeeding mother)`.

### Doctor
`js/screens/doctor.js`, `js/screens/visit.js`, `js/lib/visit-parser.js` (pure, tested:
medicines with amount/frequency/condition, dated items, advice), `js/data/sample-visits.js`,
`js/lib/ics.js`. PRD ref: `prd.md > Doctor visit notes`.

### Health and Little Signs
`js/screens/health.js`, `js/screens/signs.js`. PRD ref: `prd.md > Health records`,
`prd.md > Little Signs: skin diary`.

### Little Signs checks
`js/screens/checks.js` (routes `#/nappy`, `#/eye`, `#/yellow`, `#/food`) and
`js/lib/little-signs.js` (pure, tested): `nearestStool` (CIE Lab distance to the card
shades) and `stoolVerdict`; `pupilKind` (redness and brightness of the brighter half of
a small disc around each tap) and `eyeVerdict`; `yellowVerdict` (NHS order of urgency);
`foodPatterns` (most recent eating of each food before a reaction: ≤ 2 h quick,
≤ 3 days slow). Records go to the `checks` store.
PRD ref: `prd.md > Little Signs: four more checks`.

### Settings
`js/screens/settings.js`. Baby details, record your voice, demo speed, sample data,
clear all.

## Data Model
All in IndexedDB on this device; survives reloads; removed only by **Clear everything**.
- `kv.settings` — `{babyName, birthDate, night, demoSpeed, lightsOnAlert, soundOnAlert}`.
- `kv.soundStats` — `{[soundId]: {tried, helped, lastUsed}}`, updated at each verdict.
- `events` — `{id, t, type, sample?, ...}` where type is `cry` (`{durationMs, outcome:
  'self'|'settled'|'woke', steps:[{t, kind, text}], tried:[{soundId, from, to, helped,
  dropPct}], reason, clipId?, trace:[levels]}`), `feed`, `nappy`, `sleep` (`{start,
  end}`), `watch` (`{alert, severity, text}`).
- `blobs` — `{id, blob, kind}` for voice, clips, photos.
- `visits` — `{id, title, date, transcript, parsed, reminders}`.
- `records` — `{id, who:'baby'|'mother', kind, date, title, notes, photoId?}`.
- `spots` — `{id, name, area, entries:[{t, photoId, circle:{x,y,r}, sizePct}]}`.
- `rooms` — `{id, title, photoId, hazards:[{cls, name, severity, fix, source, boxes}], seen, done}`.
- `checks` — `{id, t, type:'nappy'|'eye'|'yellow'|'food'|'reaction', level?, …, sample?}`.

## File Structure
```
Nila2.O/
├── index.html              # the app page: shell, top bar, bottom tabs
├── manifest.webmanifest    # installable on a phone home screen
├── css/
│   ├── tokens.css          # palette, light + night mode
│   └── nila.css            # layout and components
├── js/
│   ├── app.js              # router, shell, welcome, night mode
│   ├── store.js            # IndexedDB wrapper
│   ├── ui.js               # html helpers, formatting, toast, sheet
│   ├── icons.js            # inline SVG icons
│   ├── illustrations.js    # hand-drawn spot illustrations
│   ├── monitor/            # detector, ladder, audio engine, sounds, alert, demo cry, reason
│   ├── watch/              # tracker, demo scene, vision model loader
│   ├── lib/                # summaries, sample week, search, visit parser, ics
│   ├── data/               # answers, medicines, hazards, sample visits
│   └── screens/            # one file per screen
├── assets/                 # logo, icons
├── scripts/serve.mjs       # dependency-free local server
├── tests/                  # node --test for the pure logic
├── devpost/                # Devpost Learn planning workspace
├── .agents/ .claude/ agent/ skills-lock.json   # the installed skill pack
├── package.json
├── LICENSE                 # MIT
└── README.md
```

## External Services and Dependencies
- **jsDelivr** — `GET https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js`
  and `.../@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js`. Free, no key. Loaded
  only when Watch or Babyproof needs the model.
- **Google Cloud Storage (tfjs-models)** — COCO-SSD lite weights
  `https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/model.json`.
  Free, no key. Images never leave the browser; only the model is downloaded.
- **Browser speech service** — Chrome's Web Speech API sends audio to the browser
  vendor. Optional, labelled in the UI; typing/pasting needs nothing.
- **Google Fonts** — Roboto stylesheet. Optional; system fonts otherwise.
- **GitHub Pages** — static hosting, free.

## Important Failure Modes
- **Microphone/camera blocked or no secure origin** → the card explains how to allow it;
  demo cry and demo footage still work.
- **Vision model fails to download (offline)** → Watch falls back to movement only;
  Babyproof shows the general room checklist.
- **Tab hidden or screen locked** → a warning on the Monitor card; Wake Lock requested.
- **Autoplay blocked** → audio starts from the user's tap on Start/Try demo, which
  unlocks the AudioContext.

## What Was Simplified and Why
- **Pitch + loudness rule** instead of a trained cry model — enough to tell a cry from
  white noise, humming and talk in a demo; a model would need training data and
  evaluation the POC cannot do honestly.
- **Reason from the quick log** instead of from the sound — the learner's own finding.
- **Animated stand-in scene** instead of real cot footage for the Watch demo — no
  licensed baby footage; the same tracker runs on the live camera.
- **Circle drawn by the parent** instead of automatic spot segmentation in the skin diary.
- **Typed or dictated transcript** instead of an on-device speech model.

## Decisions and Open Issues
- Browser app instead of Android (agent recommendation; learner may change): judges can
  open a link, and the demo can be recorded on a laptop. Tradeoff: no background
  listening with the screen locked.
- **Genuine uncertainty:** will in-browser COCO-SSD find enough hazards in a real room
  photo? Investigated during the build on two of the learner's own room photos: in a
  living room it found the TV (only 36% sure), the sofa and two chairs; in an Indian
  kitchen it missed the gas stove entirely and saw only the people. So Babyproof
  keeps a 0.3 threshold, says plainly what the model can and cannot see, and always
  shows the general room checklist (sockets, cords, small objects, medicines, windows).
- Detector thresholds (noise floor + 12 dB, pitch 300–750 Hz, clarity ≥ 0.45) are
  starting values, tuned against the demo cry, humming and white noise in tests.
- Nothing open from `prd.md > Open Questions`.
