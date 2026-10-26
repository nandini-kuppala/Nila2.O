// Little Signs: the rules behind the four checks. Plain functions, so they are
// tested. Each one answers with a level a parent can act on and the reason, and
// never with a diagnosis.
//   level: 'ok' (nothing to do now) | 'watch' (check again) | 'doctor' (see a doctor
//   soon) | 'urgent' (same day) | 'emergency' (now)

export const SIGN_SOURCES = {
  jaundice: { label: 'NHS: Newborn jaundice', url: 'https://www.nhs.uk/conditions/jaundice-newborn/' },
  nappy: { label: 'NHS: How to change your baby’s nappy (what’s normal)', url: 'https://www.nhs.uk/baby/caring-for-a-newborn/how-to-change-your-babys-nappy/' },
  retino: { label: 'NHS: Retinoblastoma symptoms', url: 'https://www.nhs.uk/conditions/retinoblastoma/symptoms/' },
  cataract: { label: 'NHS: Childhood cataracts', url: 'https://www.nhs.uk/conditions/childhood-cataracts/' },
  chect: { label: 'Childhood Eye Cancer Trust', url: 'https://chect.org.uk/' },
  allergy: { label: 'NHS: Food allergies in babies and young children', url: 'https://www.nhs.uk/baby/weaning-and-feeding/food-allergies-in-babies-and-young-children/' },
  anaphylaxis: { label: 'NHS: Anaphylaxis', url: 'https://www.nhs.uk/conditions/anaphylaxis/' },
};

export const EMERGENCY = 'Call your local emergency number now (112 in India, 999 in the UK) or go to the nearest emergency department.';

// ---- colour helpers ----------------------------------------------------------------

function toLab([r, g, b]) {
  const lin = (c) => {
    c /= 255;
    return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const luminance = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;

// ---- nappy colour (a stool colour card) -------------------------------------------

// The pale shades are the ones a stool colour card exists for: in the first months
// they can be a sign of a liver problem and need a doctor the same day.
export const STOOL_SWATCHES = [
  { id: 'white', label: 'White or chalky', rgb: [238, 235, 222], kind: 'pale' },
  { id: 'clay', label: 'Pale grey or clay', rgb: [200, 196, 176], kind: 'pale' },
  { id: 'cream', label: 'Pale, creamy yellow', rgb: [236, 222, 168], kind: 'pale' },
  { id: 'yellow', label: 'Yellow or mustard', rgb: [212, 165, 38], kind: 'normal' },
  { id: 'green', label: 'Green', rgb: [104, 124, 44], kind: 'normal' },
  { id: 'brown', label: 'Brown', rgb: [128, 82, 38], kind: 'normal' },
  { id: 'black', label: 'Black or very dark', rgb: [38, 32, 26], kind: 'black' },
  { id: 'red', label: 'Red, or red streaks', rgb: [168, 38, 34], kind: 'red' },
];

/** The card shade closest to a sampled colour. */
export function nearestStool(rgb) {
  const lab = toLab(rgb);
  return STOOL_SWATCHES.map((s) => ({ s, d: dist(lab, toLab(s.rgb)) })).sort((a, b) => a.d - b.d)[0].s;
}

export function stoolVerdict(swatchId, ageDays) {
  const s = STOOL_SWATCHES.find((x) => x.id === swatchId);
  if (!s) return null;
  if (s.kind === 'pale') {
    return { level: 'urgent', title: 'Pale poo: call a doctor today', text: 'In a young baby, pale, chalky or creamy poo can be a sign of a liver problem that needs checking quickly. Keep this nappy (or a photo) to show the doctor.' };
  }
  if (s.kind === 'black') {
    if (ageDays !== null && ageDays <= 4) return { level: 'ok', title: 'Normal for the first days', text: 'The first poos (meconium) are sticky and greenish-black. They usually turn yellow after a few days.' };
    return { level: 'doctor', title: 'Black poo after the first days: talk to a doctor', text: 'Black poo after the first few days is not usual for a baby, unless she is taking iron. Mention it to your doctor.' };
  }
  if (s.kind === 'red') {
    return { level: 'doctor', title: 'Red in the nappy: talk to a doctor', text: 'Blood in poo should be checked by a doctor, even if she seems well. Keep the nappy or a photo to show them.' };
  }
  return { level: 'ok', title: 'A normal colour', text: 'Yellow, mustard, green and brown are all normal. Breastfed poo is runny and yellow; formula can make it firmer and darker.' };
}

// ---- eye flash (the red reflex in a flash photo) ------------------------------------

/**
 * One pupil's sampled colour → 'red' (a red or orange reflex: usual), 'white' (a
 * white or yellow glow), or 'dark' (no reflex caught: retake).
 */
export function pupilKind(rgb) {
  const [r, g, b] = rgb;
  const lum = luminance(rgb);
  const redness = r / (r + g + b || 1);
  if (lum < 55 && r < 110) return 'dark';
  if (redness >= 0.45 && r > 90) return 'red';
  if (lum >= 140 && redness < 0.45) return 'white';
  return 'dark';
}

export function eyeVerdict(left, right) {
  const L = pupilKind(left);
  const R = pupilKind(right);
  const name = { red: 'Red glow', white: 'White or yellow glow', dark: 'Dark pupil' };
  const detail = `Left: ${name[L]} · Right: ${name[R]}`;
  if (L === 'white' || R === 'white') {
    return { level: 'doctor', left: L, right: R, detail, title: 'A white glow: show a doctor', text: 'A white or yellow glow in the pupil in a flash photo needs an eye check. It is often harmless (the angle of the flash can cause it), but the doctor should look. Take this photo with you.' };
  }
  if (L === 'dark' || R === 'dark') {
    return { level: 'watch', left: L, right: R, detail, title: 'Check again tomorrow', text: 'The flash did not light up the back of the eye. Retake in a dim room, flash on, about an arm’s length away, with her looking at the camera.' };
  }
  return { level: 'ok', left: L, right: R, detail, title: 'Both eyes glow red', text: 'Both pupils show the usual red reflex in this photo. A photo is not an eye test; mention any worry at her next check-up.' };
}

// ---- yellow check (newborn jaundice) --------------------------------------------------

export const DANGER_SIGNS = [
  { id: 'sleepy', label: 'Sleepier than normal or hard to wake' },
  { id: 'notFeeding', label: 'Not feeding' },
  { id: 'floppy', label: 'Floppy or stiff, or jerking or twitching' },
  { id: 'temp', label: 'Temperature 38°C or more, or 36°C or less' },
  { id: 'noWet', label: 'No wet nappies' },
];

/**
 * a = { ageHours, premature, yellow: 'yes'|'no'|'unsure', darkPee, palePoo, danger: [ids] }
 */
export function yellowVerdict(a) {
  const yellow = a.yellow === 'yes' || a.yellow === 'unsure';
  const danger = (a.danger || []).length > 0;
  if (danger) {
    return { level: 'emergency', title: `${yellow ? 'Jaundice with danger signs' : 'Danger signs'}: get help now`, text: `${yellow ? 'Jaundice with any of these signs' : 'These signs in a newborn'} need urgent help. ${EMERGENCY}` };
  }
  if (yellow && a.ageHours < 24) {
    return { level: 'emergency', title: 'Yellow in the first 24 hours: get help now', text: `Jaundice that appears in the first day needs checking straight away. ${EMERGENCY}` };
  }
  if (yellow && (a.darkPee || a.palePoo)) {
    return { level: 'urgent', title: 'See a doctor today', text: 'Yellow skin with dark yellow or brown pee, or pale poo, needs an urgent same-day check. Keep a nappy to show them.' };
  }
  const longDays = a.premature ? 21 : 14;
  if (yellow && a.ageHours > longDays * 24) {
    return { level: 'urgent', title: `Still yellow after ${longDays === 21 ? '3' : '2'} weeks: see a doctor`, text: 'Jaundice that lasts longer than this needs a blood test to find the cause. Book an appointment in the next day or two.' };
  }
  if (yellow) {
    return { level: 'urgent', title: 'Ask your midwife or doctor to check her today', text: 'Most newborn jaundice is harmless and fades within about 2 weeks, but it should be checked. Feed her often, 8 to 12 times a day, and wake her for feeds if she is sleepy.' };
  }
  return { level: 'ok', title: 'No yellow seen today', text: 'Check in daylight each day in the first 2 weeks: press gently on the tip of her nose or forehead, and look at the whites of her eyes and her gums.' };
}

// ---- food and reactions ----------------------------------------------------------------

export const ALLERGENS = ['egg', 'peanut', 'tree nuts', 'cow’s milk', 'wheat', 'soya', 'fish', 'shellfish', 'sesame'];
export const SYMPTOMS = [
  { id: 'swelling', label: 'Swelling of the lips, face or eyes', serious: true },
  { id: 'breathing', label: 'Wheezing, coughing or trouble breathing', serious: true },
  { id: 'hives', label: 'Raised, itchy rash (hives)' },
  { id: 'rash', label: 'Red rash or eczema flare' },
  { id: 'vomit', label: 'Vomiting' },
  { id: 'diarrhoea', label: 'Diarrhoea' },
  { id: 'tummy', label: 'Tummy pain or unusual crying' },
  { id: 'runny', label: 'Runny or blocked nose' },
];

export function reactionUrgent(symptomIds) {
  return symptomIds.some((id) => SYMPTOMS.find((s) => s.id === id)?.serious);
}

const QUICK_MS = 2 * 3600e3;   // most reactions show within minutes, up to 2 hours
const SLOW_MS = 3 * 864e5;     // some (cow's milk) can take up to 3 days

/**
 * For each food: how many times it was eaten, and how many reactions followed it
 * within 2 hours (quick) or within 3 days (slow). A food is flagged after one quick
 * reaction, or two slow ones.
 */
export function foodPatterns(foods, reactions) {
  const byName = new Map();
  for (const f of foods) {
    const k = f.name.trim().toLowerCase();
    if (!byName.has(k)) byName.set(k, { name: f.name.trim(), eaten: 0, quick: 0, slow: 0, allergen: !!f.allergen, first: f.t });
    const e = byName.get(k);
    e.eaten++;
    e.first = Math.min(e.first, f.t);
    e.allergen ||= !!f.allergen;
  }
  for (const r of reactions) {
    // for each food, the most recent time it was eaten before this reaction
    const latest = new Map();
    for (const f of foods) {
      const k = f.name.trim().toLowerCase();
      const gap = r.t - f.t;
      if (gap >= 0 && (!latest.has(k) || gap < latest.get(k))) latest.set(k, gap);
    }
    for (const [k, gap] of latest) {
      if (gap <= QUICK_MS) byName.get(k).quick++;
      else if (gap <= SLOW_MS) byName.get(k).slow++;
    }
  }
  return [...byName.values()]
    .map((e) => ({ ...e, flagged: e.quick >= 1 || e.slow >= 2 }))
    .sort((a, b) => b.flagged - a.flagged || b.quick - a.quick || b.allergen - a.allergen || b.slow - a.slow || b.first - a.first);
}
