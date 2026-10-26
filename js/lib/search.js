// Matching a typed question to the curated answers: words, not a language model.
// Each answer lists its keywords; a question scores by the words it shares with
// them (and with the answer's own question), with a few spellings folded together.

const STOP = new Set('a an the is are am was be my me i she he her his it its of to in on for and or what which when how do does did can could should will would with at by from this that there any much many our your you baby babys newborn'.split(' '));

const FOLD = {
  crying: 'cry', cries: 'cry', cried: 'cry', fussing: 'fussy',
  sleeping: 'sleep', sleeps: 'sleep', asleep: 'sleep', slept: 'sleep', naps: 'nap',
  feeding: 'feed', feeds: 'feed', fed: 'feed', nursing: 'breastfeeding', breastfeed: 'breastfeeding',
  diaper: 'nappy', diapers: 'nappy', nappies: 'nappy',
  temp: 'temperature', feverish: 'fever',
  medicines: 'medicine', medication: 'medicine', tablets: 'tablet', drugs: 'medicine',
  vitamins: 'vitamin', teeth: 'tooth',
  eating: 'eat', foods: 'food',
};

export function tokens(text) {
  return String(text)
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP.has(w))
    .map((w) => FOLD[w] || w);
}

/** → [{ answer, score }] best first, only answers that share at least one word. */
export function search(question, answers) {
  const qt = new Set(tokens(question));
  if (!qt.size) return [];
  return answers
    .map((a) => {
      const kw = new Set([...a.keywords.flatMap(tokens), ...tokens(a.q)]);
      let score = 0;
      for (const w of qt) if (kw.has(w)) score += tokens(a.q).includes(w) ? 2 : 1;
      return { answer: a, score: score / Math.sqrt(qt.size) };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** The single answer to show, or null when nothing matches well enough. */
export function bestAnswer(question, answers, min = 0.9) {
  const r = search(question, answers)[0];
  return r && r.score >= min ? r.answer : null;
}
