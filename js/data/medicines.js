// Check a medicine, for the breastfeeding mother. Short summaries of what the NIH's
// LactMed database and the NHS say about common medicines while breastfeeding.
// This is a first look, not a prescription: the verdict always tells her to
// mention breastfeeding to whoever prescribes or sells the medicine.
//
// verdict: 'safe' (likely fine at usual doses) | 'check' (ask a doctor or
// pharmacist first) | 'avoid' (usually not recommended while breastfeeding)

export const MED_SOURCES = {
  lactmed: { label: 'NIH LactMed (Drugs and Lactation Database)', url: 'https://www.ncbi.nlm.nih.gov/books/NBK501922/' },
  nhs: { label: 'NHS: Breastfeeding and medicines', url: 'https://www.nhs.uk/baby/breastfeeding-and-bottle-feeding/breastfeeding-and-lifestyle/medicines/' },
};

export const MEDICINES = [
  { name: 'Paracetamol', aka: ['acetaminophen', 'crocin', 'dolo', 'dolo 650', 'calpol', 'panadol', 'tylenol', 'metacin'], verdict: 'safe', why: 'Usual doses pass into milk in very small amounts. It is the first choice for pain or fever while breastfeeding. Check first if it is combined with other medicines.' },
  { name: 'Ibuprofen', aka: ['brufen', 'advil', 'nurofen', 'ibugesic'], verdict: 'safe', why: 'Very little passes into milk; it is a preferred painkiller for swelling or fever while breastfeeding.' },
  { name: 'Ibuprofen + paracetamol', aka: ['combiflam'], verdict: 'safe', why: 'Both are usually fine at normal doses. Do not take extra paracetamol or ibuprofen on top of it.' },
  { name: 'Amoxicillin', aka: ['mox', 'novamox', 'amoxil'], verdict: 'safe', why: 'Commonly used while breastfeeding. Watch her for loose stools, a rash or thrush, and tell your doctor if they appear.' },
  { name: 'Amoxicillin + clavulanate', aka: ['augmentin', 'co-amoxiclav', 'clavam', 'moxclav'], verdict: 'safe', why: 'Usually fine while breastfeeding. It can upset a baby’s tummy; watch for loose stools or a rash.' },
  { name: 'Azithromycin', aka: ['azithral', 'zithromax', 'azee'], verdict: 'check', why: 'Small amounts reach the milk and it is often used, but it has been linked to a stomach problem in very young babies. Ask your doctor, especially if she is under a month old.' },
  { name: 'Cetirizine', aka: ['cetzine', 'zyrtec', 'okacet', 'alerid'], verdict: 'check', why: 'An occasional small dose is usually fine. Regular or larger doses can make a baby drowsy or lower your supply; ask about loratadine instead.' },
  { name: 'Loratadine', aka: ['claritin', 'lorfast'], verdict: 'safe', why: 'A preferred antihistamine while breastfeeding at usual doses; it is less likely to make a baby sleepy.' },
  { name: 'Fexofenadine', aka: ['allegra'], verdict: 'safe', why: 'Very little passes into milk; usually fine at normal doses.' },
  { name: 'Chlorphenamine', aka: ['chlorpheniramine', 'piriton', 'avil'], verdict: 'check', why: 'An older, sedating antihistamine. It can make a baby drowsy and may lower your supply; ask about a non-drowsy one.' },
  { name: 'Diphenhydramine', aka: ['benadryl'], verdict: 'check', why: 'Sedating; it may make her drowsy or irritable and can reduce milk supply with regular use.' },
  { name: 'Pseudoephedrine', aka: ['sudafed', 'decongestant'], verdict: 'avoid', why: 'It can sharply reduce milk supply. Ask a pharmacist about other ways to ease a blocked nose.' },
  { name: 'Phenylephrine cold remedy', aka: ['sinarest', 'd cold', 'vicks action 500', 'cold and flu'], verdict: 'check', why: 'Combined cold remedies often mix a decongestant, a sedating antihistamine and paracetamol. Ask a pharmacist for a single-ingredient option.' },
  { name: 'Codeine', aka: ['codeine phosphate', 'co-codamol', 'corex'], verdict: 'avoid', why: 'Some mothers turn codeine into morphine very quickly, and breastfed babies have been seriously harmed. Not recommended while breastfeeding.' },
  { name: 'Tramadol', aka: ['ultram', 'contramal', 'ultracet'], verdict: 'avoid', why: 'Regulators advise against it while breastfeeding because of a risk of breathing problems in the baby.' },
  { name: 'Aspirin', aka: ['disprin', 'ecosprin'], verdict: 'avoid', why: 'Not recommended for pain while breastfeeding; paracetamol or ibuprofen are preferred. Low-dose aspirin prescribed by a doctor is a different matter; ask them.' },
  { name: 'Diclofenac', aka: ['voveran', 'voltaren', 'voltarol'], verdict: 'check', why: 'Small amounts pass into milk and it is used after birth, but ibuprofen is usually preferred. Ask your doctor.' },
  { name: 'Omeprazole', aka: ['omez', 'prilosec', 'losec'], verdict: 'safe', why: 'Little passes into milk and it is broken down in a baby’s stomach; usually fine.' },
  { name: 'Pantoprazole', aka: ['pan 40', 'pan', 'pantocid', 'protonix'], verdict: 'safe', why: 'Little passes into milk; usually fine at normal doses.' },
  { name: 'Metformin', aka: ['glycomet', 'glucophage'], verdict: 'safe', why: 'Only small amounts reach the milk; widely used while breastfeeding.' },
  { name: 'Levothyroxine', aka: ['thyronorm', 'eltroxin', 'synthroid'], verdict: 'safe', why: 'Replaces a hormone your body makes anyway; keep taking it as prescribed.' },
  { name: 'Fluconazole', aka: ['forcan', 'diflucan', 'zocon'], verdict: 'safe', why: 'Also given to babies directly; usually fine at normal doses.' },
  { name: 'Sertraline', aka: ['zoloft', 'serta', 'daxid'], verdict: 'check', why: 'Often a preferred antidepressant while breastfeeding, but it should be chosen and watched by your doctor. Do not stop it suddenly.' },
  { name: 'Domperidone', aka: ['domstal', 'motilium'], verdict: 'check', why: 'Sometimes prescribed to boost supply, but it can affect the heart rhythm. Only take it under a doctor’s care.' },
  { name: 'Combined contraceptive pill', aka: ['oral contraceptive', 'birth control pill', 'mala d', 'ovral'], verdict: 'check', why: 'Estrogen can lower milk supply, especially in the first weeks. A progestogen-only method is usually suggested; ask your doctor.' },
];

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9+ ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Find a medicine by name or brand. Exact or starts-with on any name wins. */
export function findMedicine(query) {
  const q = norm(query);
  if (!q) return null;
  let best = null;
  for (const m of MEDICINES) {
    for (const n of [m.name, ...m.aka].map(norm)) {
      let score = 0;
      if (n === q) score = 3;
      else if (n.startsWith(q) || q.startsWith(n)) score = 2;
      else if (n.includes(q) || q.split(' ').includes(n)) score = 1;
      if (score && (!best || score > best.score)) best = { m, score };
    }
  }
  return best && (best.score > 1 || q.length >= 4) ? best.m : null;
}
