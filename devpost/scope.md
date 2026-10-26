---
doc: scope
status: approved
---

# Nila

A baby monitor that runs in the browser of a phone or laptop the family already owns:
it hears a cry, tries to settle the baby first, checks whether that worked, and only
then wakes a parent.

> How this was scoped: the learner asked the agent to run the skill pack without a
> live interview. The answers below come from the learner's chat instructions
> (2026-10-26) and their own earlier Nila design material. Approved under the
> learner's instruction to proceed; the learner reviews it before submitting.

## The Unique Kernel
Every baby monitor ends at *notify*. Nila adds two rungs before that: when a cry goes
on, it plays a soothing sound, then **measures whether the sound actually helped**
by re-reading how loud the crying is. Only if it did not help does it wake someone,
and the alert says what it already tried. It remembers which sound settles *this*
baby and tries that one first next time.

## Who It's For
A new parent in a small home, often in India, with a baby under a year old. At night
they are asleep in the next room, or awake but exhausted. Today they use a phone
propped up on a video call, a dedicated monitor that beeps at every whimper, or
nothing at all.

## The Core Loop
The parent leaves the phone near the cot with Nila on the Monitor screen and goes to
sleep. When the baby cries, Nila draws the ladder live: **Heard → Soothe → Check →
Wake you**. In the morning the parent opens the Timeline and Insights to see every cry
as one entry, which sound worked, and how the week compares with the 3-hour colic
line. They come back because each night it wakes them less.

## Inspiration & Identity
The learner's own Nila screens are the reference for every screen (23 screens in
their earlier prototype). Calm, clinical-but-warm: desaturated teal brand, warm
stone neutrals, plum for crying, amber and red reserved strictly for severity,
rounded white cards on a pale mint page, small hand-drawn baby illustrations.
Copy is plain, honest and short ("measured, not assumed"; "a best guess, not a
diagnosis").

## Why This Matters to the Learner
From their pitch: babies in Bengaluru, Karnataka and Chennai hurt in "one unwatched
minute"; 23 million new babies a year in India watched in snatches by tired parents.
They want "one baby companion, one stop, not ten apps", with nothing leaving the
phone.

## What "Working" Looks Like
Open the app, press **Try a demo cry** (or let a real cry reach the microphone). The
ladder fills in live. A soothing sound plays at 0:20. At the Check step Nila shows
"Helped" or "Didn't help" from the measured crying level. If it did not help, a
full-screen "wake you" alert at 1:30 lists what was tried. The cry lands in the
Timeline as one entry with its steps underneath.
**The "oh, that's cool" beat:** run the demo twice. The second time, Nila skips the
sound that failed and plays the one that worked first, and the baby settles before
anyone is woken.

## The POC Boundary
- The cry ladder end to end, with real audio analysis in the browser, a scripted
  demo cry fed through the same detector, and per-sound learning.
- Quick log (feed, nappy, sleep), used for a context-based "probably hungry/tired"
  guess.
- Timeline and Insights built from what was actually recorded.
- The rest of the learner's screens (Watch, Ask, Doctor, Health, Little Signs,
  Babyproof), each doing one honest thing in the browser, so the demo matches
  their design.
- Everything stored on the device. No account, no server.

## Later
- A trained cry detector (e.g. an audio-event model) in place of the pitch-and-loudness rule.
- Family CCTV (RTSP) streams on the Watch screen.
- Eye-flash, nappy-colour, yellow-skin and food checks in Little Signs.
- Scanning a medicine strip with the camera (OCR).
- An Android wrapper with a foreground service so it survives the screen locking.

## Explicitly Cut
- **Cry cause from sound alone**: the learner's own research found cause
  classification is near chance when tested on new infants. Nila guesses from the
  quick log instead and says it is a guess.
- **Accounts, cloud sync and push servers**: they break "nothing leaves the phone"
  and add nothing to the proof.
- **Medicine doses for the baby**: unsafe to automate; Ask points to the doctor.
