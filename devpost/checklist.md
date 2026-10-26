---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast (the learner asked the agent to build end to end; hands-on checkpoints are recorded for the learner to do before submitting)

## Slices

- [x] **1. A demo cry climbs the ladder and gets judged**
  Becomes usable: Open the app, press Try a demo cry, and watch Heard → Soothe → Check → Wake you fill in live, with a sound playing, a measured Helped/Didn't help, and a full-screen wake alert when nothing helped.
  Why now: This is the kernel. Everything else is around it, so it has to work first; scaffold, tokens, store and shell are bootstrapped inside it.
  PRD ref: `prd.md > The Core Journey` (steps 1, 3–9, 11), `prd.md > Cry ladder`, `prd.md > Demo cry`
  Spec ref: `spec.md > App shell and router`, `spec.md > Store`, `spec.md > Cry detector`, `spec.md > Ladder`, `spec.md > Audio engine, sounds, alert`, `spec.md > Demo cry`, `spec.md > Monitor screen`, `spec.md > Look and Feel`
  Build: Static shell with top bar and five tabs; tokens.css from the learner's palette; IndexedDB store; detector and ladder as pure modules; audio engine with demo source, white noise and humming; wake alert; the Monitor card, crying-level line, demo notice and What Nila tried.
  Verify (mechanical): `npm test` passes ladder, verdict and detector tests (synth cry counts as crying, white noise and a 200 Hz hum do not); in the browser the demo "needs you" run reaches Wake you and "settles" closes as Settled with no console errors.
  Learner check: Open Monitor, press Try a demo cry → A cry that settles, and watch the ladder; then try A cry that needs you and see the alert.
  Commit: `Cry ladder: hear, soothe, check, wake — with a demo cry`

- [x] **2. It listens for real and learns which sound works**
  Becomes usable: Start listening with the microphone; a real cry runs the same ladder; the second demo run starts with the sound that helped last time; Settings can record the parent's voice as a sound.
  Why now: Learning per sound is the second half of the kernel and the "oh, that's cool" moment.
  PRD ref: `prd.md > Learning which sound works`, `prd.md > The Core Journey` (step 2)
  Spec ref: `spec.md > Ladder`, `spec.md > Audio engine, sounds, alert`, `spec.md > Settings`, `spec.md > Data Model`
  Build: Mic source, adaptive noise floor, Wake Lock and hidden-tab warning; sound stats in the store and chooseSound; Settings with voice recording, demo speed and baby details; cry episodes saved as events with kept clip.
  Verify (mechanical): `npm test` covers chooseSound ordering; in the browser two consecutive "settles" demo runs show white noise then humming first, then humming first.
  Learner check: Run the settling demo twice and see that the second run plays humming first.
  Commit: `Listen on the microphone and remember which sound settles her`

- [x] **3. Quick log and a best guess at why**
  Becomes usable: Feed, Nappy and Sleep tiles log in one tap; the reason card says "probably hungry" (or can't tell) from the log, labelled as a guess; the wake alert carries it.
  Why now: It completes the Monitor screen and feeds the alert.
  PRD ref: `prd.md > Quick log and reason guess`
  Spec ref: `spec.md > Reason guess`, `spec.md > Monitor screen`
  Build: Quick-log tiles, sleep start/stop, "[Name] today" strip, reason.js with tests.
  Verify (mechanical): `npm test` reason tests; log a feed in the browser and see "0m ago".
  Learner check: Tap Feed, then run the "needs you" demo and read the reason on the alert.
  Commit: `Quick log, and a guess at the reason that says it is a guess`

- [x] **4. Timeline and Insights in the morning**
  Becomes usable: Timeline with filters, tiles and one entry per cry; Insights with the week, colic line and what settles her; a removable sample week.
  Why now: Closes the core loop (the morning review).
  PRD ref: `prd.md > Timeline`, `prd.md > Insights`
  Spec ref: `spec.md > Timeline and Insights`
  Build: summaries.js and sample-week.js with tests; both screens; chart drawn in SVG.
  Verify (mechanical): `npm test` summaries; in the browser the demo cry appears in Timeline and the sample week renders the chart with bars over the line.
  Learner check: Open Timeline after a demo cry, expand it, and play the recording; open Insights and add the sample week.
  Commit: `Timeline and Insights from what was actually recorded`

- [x] **5. Safety watch with a safe zone**
  Becomes usable: Start the camera, drag a safe zone, move outside it and get an urgent alert with lights and sound; demo footage runs the same tracker.
  Why now: Second pillar of the learner's design ("watches her").
  PRD ref: `prd.md > Safety watch`
  Spec ref: `spec.md > Safety watch`
  Build: tracker.js (tested on synthetic frames), demo-scene.js, watch screen, alerts to the timeline.
  Verify (mechanical): `npm test` tracker tests; demo footage raises Left the safe zone in the browser.
  Learner check: Start the watch, draw a zone, wave a hand outside it.
  Commit: `Safety watch: a safe zone you draw, on this device`

- [x] **6. Babyproof a room from one photo**
  Becomes usable: Take or upload a room photo, get numbered pins and Fix these cards with sources; Mark done.
  Why now: Uses the same vision loader as Watch.
  PRD ref: `prd.md > Babyproof a room`
  Spec ref: `spec.md > Babyproof`
  Build: hazards.js mapping, model loader shared with Watch, the screen.
  Verify (mechanical): run COCO-SSD on a test room image in the browser and record what it found.
  Learner check: Photograph a room at home and read the cards.
  Commit: `Babyproof a room from one photo`

- [x] **7. Ask, with sources, and a medicine check**
  Becomes usable: Ask a question and get a sourced answer; check a medicine for breastfeeding.
  Why now: Independent of the rest; content-heavy.
  PRD ref: `prd.md > Ask`, `prd.md > Medicine check (for the breastfeeding mother)`
  Spec ref: `spec.md > Ask and medicine check`
  Build: search.js with tests, answers and medicines data, both screens.
  Verify (mechanical): `npm test` search returns the safe-sleep answer for "which position should my baby sleep in".
  Learner check: Ask "how much crying is normal" and check "ibuprofen".
  Commit: `Ask: sourced answers and a medicine check`

- [x] **8. The doctor's visit, written down**
  Becomes usable: Dictate, type or load a sample visit; see medicines, dates and advice; set reminders and download a calendar file.
  Why now: Independent; parser is testable.
  PRD ref: `prd.md > Doctor visit notes`
  Spec ref: `spec.md > Doctor`
  Build: visit-parser.js and ics.js with tests, sample visits, doctor and visit screens, calendar.
  Verify (mechanical): `npm test` parser extracts Vitamin D 1 ml every morning and the next-visit date from the sample.
  Learner check: Open the sample 4-month check-up and press Set reminders.
  Commit: `Doctor: the visit written down, with reminders`

- [x] **9. Health records and the skin diary**
  Becomes usable: Add baby/mother records; track a skin spot with daily photos and a size trend.
  Why now: Last screens of the learner's design.
  PRD ref: `prd.md > Health records`, `prd.md > Little Signs: skin diary`
  Spec ref: `spec.md > Health and Little Signs`
  Build: health and signs screens, photo storage, circle measuring, trend.
  Verify (mechanical): add a record and a spot entry in the browser, reload, both remain.
  Learner check: Add a vaccination record and a spot photo.
  Commit: `Health records and a skin diary`

- [x] **10. Ready to share**
  Becomes usable: Night mode everywhere, installable manifest, README with run steps and disclosure, MIT licence, live on GitHub Pages.
  Why now: Submission needs the repo and a link.
  PRD ref: `prd.md > Look and Feel`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`
  Build: manifest, icons, README, LICENSE, Pages.
  Verify (mechanical): `npm test`; every route renders without console errors in light and night mode; the Pages URL loads.
  Learner check: Open the live link on your phone.
  Commit: `README, licence and install manifest`

- [x] **11. The rest of Little Signs: nappy colour, eye flash, yellow check, food and reactions**
  Becomes usable: The four tiles that said "coming later" open working checks with sourced next steps and a history.
  Why now: The learner asked for them after the first build.
  PRD ref: `prd.md > Little Signs: four more checks`
  Spec ref: `spec.md > Little Signs checks`, `spec.md > Data Model`
  Build: little-signs.js rules with tests; checks.js screens; `checks` store; tiles become links.
  Verify (mechanical): `npm test` (58 pass); in the browser the white-glow sample reads "show a doctor" and the red one "both eyes glow red"; a tapped yellow patch suggests "yellow or mustard"; "clay" reads "doctor today"; a 4-month-old with yellow skin reads "still yellow after 2 weeks", and a danger sign "get help now"; sample foods flag egg after hives within 2 hours; logging swelling shows the emergency card; no console errors in day or night mode.
  Learner check: Open Health → Little Signs and try each tile; use the drawn eye samples and the food sample entries.
  Commit: `Little Signs: nappy colour, eye flash, yellow check, food and reactions`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2 (the learner runs the demo twice). Not done live: the learner asked the agent to build without pausing; the agent ran the demo twice in the build browser instead (white noise then humming, then humming first).
- [ ] Final kick-the-tires exploration and feedback completed — for the learner, before submitting: run both demo cries, a real cry near the microphone (e.g. a cry video played from another phone), the Watch on the laptop camera, a sample doctor's visit.

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship (waiting on the learner's own run-through above)

## Code Tour and App Map

- [x] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: brief recap, not hands-on — the learner asked the agent to work end to end. The recap points at the ladder as a pure, tested state machine and the two bugs its tests caught (`tests/ladder.test.mjs`, Revisions above).
Route and stops: reference route only (not toured) — `js/screens/monitor.js` chooseDemo → `js/monitor/audio-engine.js` startDemo/begin → `js/monitor/ladder.js` createLadder.tick/judgeSound/chooseSound → `audio-engine.js` handle/finish → `js/store.js` addEvent.
Edit outcome: not offered yet (learner not present).
Reflection: not offered yet.
Activity mode: recap; `devpost/app-map.html` is the take-home map.

## Revisions

- The ear hears Nila's own sounds in the demo at about -18 dB under the cry, not at full level — at equal level the humming masked the cry and a sound that had not helped was judged "helped" (60% drop). A phone speaker at bedside volume is far quieter than a crying baby at the cot, so this is also the realistic mix.
- A sound that seemed to help but is followed by hard crying at the wake rung is revised to "didn't help, then crying came back" and its record corrected — the first browser run woke a parent while still listing humming as "helped".
- A sound still playing at the wake rung is judged before the wake — at 3× demo speed its turn ended a few milliseconds after the rung and it was never judged.
- The 3-minute cap no longer silences an unanswered wake alarm, and the demo stops after one cry — a still-crying demo baby started a second, bogus episode after the cap.
- The microphone path is exercised by the unit-tested detector and by the same analyser the demo uses; a live microphone run in the build browser was not done, because the permission prompt belongs to the learner. It is in the learner's final checkpoint instead.
- Quick log gained "Log an earlier time" — with only one-tap "now" logging, the reason guess could never say "probably hungry" in a demo, because the last feed would always be minutes old.
- The safety watch tracks frame-to-frame movement instead of a learned empty-scene background — with a background, the spot she had just left pulled the "where is she" point back toward the middle.
- Zone alerts remember where she was last seen through still frames, and need two sightings outside — movement is intermittent, and every still frame was resetting the timer so the demo never alerted.
- The demo footage is drawn on each tracker tick rather than on animation frames — browsers pause animation frames for a hidden tab, which froze the scene.
- Babyproof waits for the photo's load event instead of `img.decode()` — Chrome defers decoding in a hidden tab and the check hung on "Looking at the room…".
- COCO-SSD on the learner's own test photos found a living room's TV, sofa and chairs but missed a gas stove; the threshold moved from 0.35 to 0.3 (the TV scored 0.36) and the screen now states what the model cannot see. Recorded in `spec.md > Decisions and Open Issues`.
- Every Ask source link and the facts behind each answer were checked against the live NHS, AAP and NIH pages before writing (several guessed NHS addresses were 404s and were replaced with the real ones). The medicine list recognises common Indian brand names (Crocin, Dolo 650, Combiflam, Cetzine…) because the learner's users are in India.
- The visit parser treats any sentence with "do not / don't / never / avoid / stop" as advice, never as a medicine — the first run turned "Do not give any cough syrup at this age" into a medicine to give. A regression test pins it.
- Medicine reminders start from the next dose still ahead, so a 30-day course gets 30 reminders even when the visit ends after the morning dose; "Set reminders" also downloads an .ics file, because a browser cannot ring an alarm while it is closed. (The download itself was not clicked in the build browser; the .ics content is unit-tested.)
- Scope change at the learner's request: the four Little Signs checks deferred in the PRD were built (slice 11), and scope, PRD and spec were updated to match.
- Food patterns use the most recent time each food was eaten before a reaction — the first version counted an older meal and missed egg eaten 30 minutes before hives.
