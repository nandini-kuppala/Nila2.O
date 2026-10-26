---
doc: prd
status: approved
---

# Nila — Product Requirements

A baby monitor for a tired new parent that runs in the browser of the phone or laptop
they already own. It settles a crying baby before it wakes anyone, checks that the
settling worked, and keeps the night's record. Around that, the learner's other
Nila screens each do one honest thing.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

> Approved under the learner's instruction to proceed without a live interview.
> Screen-level answers come from the learner's own 23 Nila screens; behaviour comes
> from their written Nila material. Assumptions the agent made are marked
> **(assumption)**.

## The Core Journey
1. **First open.** The parent sees a short welcome, types the baby's name and date of
   birth, and lands on **Monitor**. Nothing is listening yet.
2. **Start listening.** They press **Start listening**, allow the microphone, and see
   "Listening" with a live crying-level line. In a quiet room nothing happens.
3. **A cry.** When a sustained, baby-pitched cry is heard for about 3 seconds, the card
   turns to **Crying** with a running clock and the ladder **Heard → Soothe → Check →
   Wake you**, each rung with its time (0:00, 0:20, 0:55, 1:30). A "Next:" card counts
   down to the next rung.
4. **Settled on her own.** If the crying stops before 0:20, the episode closes as
   "Settled on her own". No sound is played.
5. **Soothe.** At 0:20 Nila plays a sound: the one that has settled this baby most
   often, or the next untried one (white noise, humming, the parent's recorded voice).
6. **Check.** Nila compares the crying level while the sound played with the level
   before it. It shows **Helped** or **Didn't help** under **What Nila tried —
   measured, not assumed**, and remembers the result for that sound.
7. **Helped → no wake.** If the sound helped, the episode closes as "Settled with
   [sound]". Nobody is woken.
8. **Didn't help → try another.** Nila tries the next-best sound until 1:30.
9. **Wake you.** At 1:30, if she is still crying, a full-screen alert sounds: "[Name]
   needs you", with what was tried and a best guess at why ("probably hungry — last
   feed 3h 10m ago, a guess from your quick log").
10. **Morning.** The parent opens **Timeline** and sees each cry as one entry with its
    steps a tap away, and **Insights** for the week against the 3-hour colic line.
11. **Demo path.** **Try a demo cry** feeds a synthesized cry through the same
    detector, so the whole journey can be shown without a baby. Running it twice
    shows Nila choosing the sound that worked last time.

## Screens and Layout
Phone-shaped, one column, matching the learner's screens. A top bar with the screen
title and four icons (night mode, timeline, insights, settings). A bottom bar with
five tabs: **Monitor · Ask · Watch · Health · Doctor**.
- **Monitor** (tab): status card with ladder, crying-level card, demo notice,
  "What Nila tried", reason card, Quick log tiles, "[Name] today".
- **Timeline** (top bar): Today / Yesterday / 7 days / 30 days, summary tiles, a
  vertical time line of entries.
- **Insights** (top bar): crying this week, daily crying chart with 3h colic line,
  what settles her, hours of the day.
- **Settings** (top bar): baby details, record your voice, demo speed, sample data,
  clear everything.
- **Ask** (tab): question box, "Try one of these" cards, answer page with sources,
  **Check a medicine** page.
- **Watch** (tab): Safety watch card, live camera with a safe zone you draw, alert
  list, lights and sound on alerts, **Babyproof a room** entry.
- **Babyproof a room**: take or upload a photo, numbered pins on what was found,
  "Fix these" cards with what to do and a source, Mark done.
- **Health** (tab): Baby / Mother toggle, records grouped by type, add a record, and a
  **Little Signs** card leading to the skin diary.
- **Little Signs → Skin diary**: tracked spots, add today's photo, size trend.
- **Doctor** (tab): "At the doctor's", record or type the visit, sample visits,
  Calendar, visit notes with medicines, dates and reminders.

## Look and Feel
Carried from `scope.md > Inspiration & Identity`; the learner's screens are the
reference, so no new design questions were needed.
- Pale mint-white page (#F7FAF8), white rounded cards (16–24px radius) with a hairline
  border, generous padding.
- Brand teal #0F6B60 for primary buttons, selected tabs (pill behind the icon) and
  links. Plum #7B4B86 for crying. Amber #A96A12 and red #B3261E only for "attention"
  and "urgent". Tinted tone tiles (teal, peach, blue, plum, pink, slate) behind icons.
- Bold, large page titles ("Safety watch", "Ask anything"); Roboto-like sans serif.
- Small hand-drawn baby / cot / clipboard illustrations at the top right of hub screens.
- A dark night mode with deep, desaturated cards: no bright slabs at 3 a.m.
- Honest, short copy: "measured, not assumed", "a best guess, not a diagnosis",
  "Everything stays on this phone".

## Features and Behavior

### Cry ladder
Source: `scope.md > The Unique Kernel`, `scope.md > What "Working" Looks Like`.
- [ ] With listening on, a quiet room or white noise does not start an episode.
- [ ] A sustained cry for ~3s shows **Crying**, a running clock and "x% sure it is a cry".
- [ ] Rungs light up at 0:20 (Soothe), 0:55 (Check), 1:30 (Wake you); the Next card counts down.
- [ ] A cry that stops before 0:20 closes as "Settled on her own".
- [ ] At Soothe a sound is audible; at Check the sound gets **Helped** or **Didn't help**,
      decided from the measured level, and the line under it says why
      ("crying dropped 80%" / "crying stayed as loud").
- [ ] If nothing helped by 1:30, a full-screen alert with sound appears, listing what was tried.
- [ ] Episodes close at 3:00 at the latest; the clip of a cry that woke you is kept.

### Learning which sound works
- [ ] Each sound keeps a helped / tried count.
- [ ] The next episode starts with the sound with the best record, untried sounds before
      known failures.
- [ ] Settings → **Record your voice** adds "Your voice" as a sound.

### Demo cry
- [ ] **Try a demo cry** offers "A cry that settles" and "A cry that needs you".
- [ ] The demo cry is audible and goes through the same detector; a banner says it is a demo.
- [ ] The scripted demo baby settles only to humming or a voice, so the first run shows
      white noise failing and humming helping, and the second run starts with humming.
- [ ] **Demo speed** in Settings can run the ladder 3× faster for recording.

### Quick log and reason guess
- [ ] Feed, Nappy and Sleep tiles log an event in one tap and show "18m ago".
- [ ] The reason card names the most likely reason from the log (hungry, nappy, tired)
      or says it can't tell, always labelled as a guess, never as fact.

### Timeline
- [ ] Today / Yesterday / 7 days / 30 days filters; tiles for cries, sleep, feeds, nappies.
- [ ] One entry per cry episode; urgent ones (woke you) are red; tapping shows the steps
      and plays the kept recording.
- [ ] Watch alerts and quick-log events appear in the same line.

### Insights
- [ ] Total crying and days over 3h this week, a 7-day bar chart with the 3h colic line,
      each figure written out in words below it.
- [ ] "What settles her": helped rate per sound.
- [ ] Empty state explains what will appear; **Add a sample week** fills it with
      clearly labelled sample data that can be removed.

### Safety watch
- [ ] **Start safety watch** asks for the camera and shows the live view.
- [ ] The parent drags a safe-zone rectangle on the view.
- [ ] Movement (or a detected person) outside the zone raises **Left the safe zone**
      (urgent); a sudden whole-frame change raises **The phone was moved**.
- [ ] With **Lights and sound on alerts** on, the screen flashes white and a lullaby plays.
- [ ] **Play demo footage** runs an animated stand-in scene through the same tracker,
      labelled as a demo.

### Babyproof a room
- [ ] Take or upload a photo; objects are detected in the browser.
- [ ] Each hazardous object becomes a numbered pin and a "Fix these" card with severity,
      what to do and a source; **Mark done** moves it to done.
- [ ] If nothing is recognised, the screen says so and shows a general room checklist.

### Ask
- [ ] Typing a question shows the best-matching answer from a curated, sourced set,
      with a "Worth knowing" note and **Sources**.
- [ ] No match → "Nila doesn't have a sourced answer for that yet" and a doctor nudge.
- [ ] "When did she last feed?" answers from the quick log.

### Medicine check (for the breastfeeding mother)
- [ ] Type a medicine name; get **Likely safe for you**, **Check with your doctor** or
      **Best avoided**, with the reason and source. Recent checks are listed.

### Doctor visit notes
- [ ] **Record the visit** transcribes speech where the browser supports it (labelled as
      using the browser's speech service); **Type or paste** works everywhere.
- [ ] Sample visits fill the transcript.
- [ ] Nila writes down **Medicines** (name, amount, when), **Dates** (next visit,
      vaccines) and **Advice** in the doctor's words.
- [ ] **Set N reminders** saves them to the Calendar and offers an .ics download.

### Health records
- [ ] Baby / Mother toggle; add a record (vaccination, check-up, prescription, growth,
      other) with date, notes and an optional photo; grouped by type.

### Little Signs: skin diary
- [ ] Track a new spot with a name and body area; add a photo each day and drag a
      circle around the spot.
- [ ] A trend shows the spot's size over time; growing by half within a few days shows
      "Doctor this week".

## States and Boundaries
- **First use** — welcome asks for the baby's name and birth date; everything else is empty
  with a line saying what will appear.
- **Microphone or camera refused** — the card explains how to allow it; demo paths still work.
- **Persistence** — everything (events, sound records, photos, recordings, visits,
  records) stays in this browser on this device and survives reloads. Settings can
  clear it all.
- **Screen locked / tab hidden** — browsers may pause the microphone; the Monitor
  card warns to keep the screen on and Nila asks the browser to keep it awake.
- **Not medical advice** — every health surface says it helps a parent notice and
  record, not diagnose.

## Product Decisions
- Match every screen to the learner's earlier design — their explicit request.
- Five tabs Monitor · Ask · Watch · Health · Doctor — the layout of most of their screens.
- Cause is guessed from the quick log, not the sound — their own finding that cry cause
  from sound is near chance on new infants.
- Nothing leaves the device — from their pitch ("All the AI runs on the phone. No cloud").
- Runs in a browser **(assumption, agent recommendation)** so judges can try it from a link.

## What We're Building
Everything under **Features and Behavior**, in one browser app, with the cry ladder
working end to end first.

## Deferred From the POC
- Family CCTV streams: browsers cannot open RTSP cameras directly.
- Eye flash, nappy colour, yellow check, food diary in Little Signs.
- Photographing a medicine strip (OCR).
- Background listening with the screen locked (needs a native wrapper).

## Possible Later Enhancements
A trained audio-event cry detector; an Android wrapper with a foreground service;
sharing a night summary with a partner's phone over the local network.

## Non-Goals
- Diagnosing anything or naming a cry's cause from sound.
- Medicine doses for the baby.
- Breathing or SIDS monitoring ("Not a breathing monitor").
- Accounts, cloud storage, analytics.

## Open Questions
- None blocking. Whether in-browser object detection recognises enough hazards in a real
  room is checked during the build (see `spec.md > Decisions and Open Issues`).
