// Ask: a small, curated set of sourced answers. Written in plain words from the
// pages they cite (checked October 2026); when one of these pages changes, the
// page wins. Nothing here replaces a doctor, midwife or health visitor.

const NHS = (path, label) => ({ label: `NHS: ${label}`, url: `https://www.nhs.uk/${path}` });

export const ANSWERS = [
  {
    id: 'crying-normal',
    q: 'How much crying is normal?',
    tone: 'plum', icon: 'sad',
    keywords: ['crying', 'cry', 'normal', 'much', 'colic', 'evening', 'fussy', 'inconsolable', 'hours'],
    answer: [
      'Crying usually builds from about 2 weeks old and eases off by around 3 months. Some babies cry for hours, often in the evening, and are otherwise well.',
      'Feeding, winding, a nappy change, holding her close, gentle rocking or a steady sound can help. Sometimes nothing works and the crying simply has to pass.',
      'Keeping a record of when she cries (Nila’s Timeline does this) helps a doctor or health visitor look for a pattern.',
    ],
    worth: 'Call your doctor if the cry sounds different from her usual cry, she will not feed, she has a temperature, or has not had a wet nappy in 8 hours. If you feel overwhelmed, put her down somewhere safe and step away for a few minutes. Never shake a baby.',
    sources: [NHS('baby/caring-for-a-newborn/soothing-a-crying-baby/', 'Soothing a crying baby'), { label: 'AAP: Crying and colic', url: 'https://www.healthychildren.org/English/ages-stages/baby/crying-colic/Pages/default.aspx' }],
  },
  {
    id: 'sleep-position',
    q: 'Which position should my baby sleep in?',
    tone: 'blue', icon: 'sleep',
    keywords: ['sleep', 'position', 'back', 'tummy', 'side', 'cot', 'crib', 'sids', 'safe', 'pillow', 'bed', 'sharing', 'co-sleeping', 'blanket'],
    answer: [
      'Put her on her back for every sleep, day and night, on a firm, flat mattress, with her feet at the foot of the cot.',
      'Keep the cot clear: no pillows, duvets, bumpers, soft toys or sleep pods. For the first 6 months, a cot or basket in the same room as you is safest.',
    ],
    worth: 'Never sleep with her on a sofa or armchair. Do not share a bed with her if you or your partner smoke, have drunk alcohol, or have taken anything that makes you drowsy.',
    sources: [NHS('baby/caring-for-a-newborn/reduce-the-risk-of-sudden-infant-death-syndrome/', 'Reduce the risk of SIDS'), { label: 'AAP: A parent’s guide to safe sleep', url: 'https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/A-Parents-Guide-to-Safe-Sleep.aspx' }],
  },
  {
    id: 'eat-breastfeeding',
    q: 'What can I eat while breastfeeding?',
    tone: 'teal', icon: 'fork',
    keywords: ['eat', 'food', 'diet', 'breastfeeding', 'mother', 'fish', 'spicy', 'avoid', 'nutrition', 'drink'],
    answer: [
      'There is no special diet. Eat a varied, balanced diet: plenty of fruit and vegetables, starchy foods, protein such as beans, pulses, eggs, fish or meat, and calcium-rich foods.',
      'Two portions of fish a week is good, but no more than two of oily fish. Drink enough to stay comfortable; a glass of water by you when you feed is a good habit.',
      'Most foods, including spicy ones, are fine. If you think something you eat upsets her, talk to your health visitor before cutting out whole food groups.',
    ],
    worth: 'Caffeine passes into breast milk and can make a baby restless; cut down, especially while she is under 6 months.',
    sources: [NHS('baby/breastfeeding-and-bottle-feeding/breastfeeding-and-lifestyle/diet/', 'Breastfeeding and diet')],
  },
  {
    id: 'coffee',
    q: 'Can I drink coffee or tea while breastfeeding?',
    tone: 'peach', icon: 'drop',
    keywords: ['coffee', 'tea', 'caffeine', 'chai', 'cola', 'energy', 'drink'],
    answer: [
      'Caffeine reaches your baby through your milk. A lot of it can make her restless and keep her awake.',
      'Nobody knows exactly how much is too much, and babies differ, so it is sensible to have less coffee, tea, cola and energy drinks while she is under 6 months.',
    ],
    sources: [NHS('baby/breastfeeding-and-bottle-feeding/breastfeeding-and-lifestyle/diet/', 'Breastfeeding and diet')],
  },
  {
    id: 'milk-enough',
    q: 'Is my milk supply enough?',
    tone: 'blue', icon: 'drop',
    keywords: ['milk', 'supply', 'enough', 'low', 'getting', 'weight', 'wet', 'nappies', 'hungry', 'breast'],
    answer: [
      'The best signs come from her, not from how full you feel. She feeds with long, rhythmic sucks and you can hear her swallow; she seems content after most feeds; she gains weight steadily after the first few days.',
      'From about day 5, expect at least 6 heavy, wet nappies in 24 hours, and in the early weeks at least 2 soft yellow poos a day.',
      'Feeding often, whenever she wants, is what keeps your supply up.',
    ],
    worth: 'Speak to a midwife or health visitor if wet nappies drop off, she seems sleepy and hard to wake for feeds, or you are worried about her weight.',
    sources: [NHS('baby/breastfeeding-and-bottle-feeding/breastfeeding-problems/enough-milk/', 'Is my baby getting enough milk?')],
  },
  {
    id: 'feed-often',
    q: 'How often should my baby feed?',
    tone: 'teal', icon: 'bottle',
    keywords: ['how', 'often', 'feed', 'feeding', 'frequency', 'times', 'demand', 'schedule', 'newborn', 'night'],
    answer: [
      'In the first weeks, at least 8 feeds in 24 hours is a rough guide, and many babies feed more.',
      'Feed her whenever she shows she is hungry. You cannot overfeed a breastfed baby, and feeding for comfort is normal too.',
    ],
    sources: [NHS('baby/breastfeeding-and-bottle-feeding/breastfeeding/your-questions-answered/', 'Breastfeeding questions answered')],
  },
  {
    id: 'fever',
    q: 'My baby feels hot. When is it a fever?',
    tone: 'pink', icon: 'warn',
    keywords: ['fever', 'temperature', 'hot', 'high', 'thermometer', '38', 'warm', 'sick', 'ill', 'unwell'],
    answer: [
      'A high temperature is 38°C or more.',
      'Under 3 months old, 38°C or higher needs a doctor straight away, even if she seems well. From 3 to 6 months, 39°C or higher needs a doctor straight away.',
      'Keep her in light clothing and keep offering feeds.',
    ],
    worth: 'Get emergency help if she is floppy, hard to wake, has a rash that does not fade when you press a glass on it, is struggling to breathe, or has a fit. Do not give ibuprofen to a baby under 3 months or under 5 kg.',
    sources: [NHS('conditions/fever-in-children/', 'High temperature (fever) in children')],
  },
  {
    id: 'solids',
    q: 'When can my baby start solid food?',
    tone: 'peach', icon: 'fork',
    keywords: ['solid', 'solids', 'food', 'weaning', 'start', 'cereal', 'rice', 'puree', 'complementary', 'eat'],
    answer: [
      'Around 6 months. By then most babies can sit up with support, hold their head steady, and pick up food and bring it to their mouth.',
      'Start alongside breast or formula milk, which stays her main food for a while.',
    ],
    sources: [NHS('baby/weaning-and-feeding/babys-first-solid-foods/', 'Your baby’s first solid foods')],
  },
  {
    id: 'vitamin-d',
    q: 'Does my baby need vitamin D drops?',
    tone: 'peach', icon: 'sun',
    keywords: ['vitamin', 'd', 'drops', 'supplement', 'vitamins'],
    answer: [
      'A breastfed baby should have a daily vitamin D supplement from birth (8.5 to 10 micrograms in UK guidance), whether or not you take one yourself.',
      'A baby having more than about 500 ml of infant formula a day does not need one, because formula already has vitamin D added.',
    ],
    worth: 'Use the amount your doctor or the product label gives. Doctors in different countries may advise slightly different doses.',
    sources: [NHS('baby/weaning-and-feeding/vitamins-for-children/', 'Vitamins for children')],
  },
  {
    id: 'sleep-amount',
    q: 'How much should a newborn sleep?',
    tone: 'blue', icon: 'sleep',
    keywords: ['how', 'much', 'sleep', 'hours', 'newborn', 'night', 'wake', 'waking', 'nap'],
    answer: [
      'Newborns sleep more than they are awake, often around 18 hours a day in short stretches, waking at night because they need feeding.',
      'Every baby is different. Long stretches through the night usually come later.',
    ],
    sources: [NHS('baby/caring-for-a-newborn/helping-your-baby-to-sleep/', 'Helping your baby to sleep')],
  },
  {
    id: 'jaundice',
    q: 'Her skin or eyes look yellow. Is that jaundice?',
    tone: 'peach', icon: 'eye',
    keywords: ['yellow', 'jaundice', 'skin', 'eyes', 'newborn', 'pale', 'poo'],
    answer: [
      'Yellow skin or eyes in a newborn is usually jaundice. It is common, is most noticeable around day 3, and usually fades within about 2 weeks.',
      'Pressing gently on the tip of her nose or forehead can make the yellow easier to see, and it is harder to see on brown or black skin.',
    ],
    worth: 'See a doctor urgently if the yellow appears in the first 24 hours, or if her pee is dark yellow or brown or her poo is pale and chalky.',
    sources: [NHS('conditions/jaundice-newborn/', 'Newborn jaundice')],
  },
  {
    id: 'nappy-rash',
    q: 'How do I treat nappy rash?',
    tone: 'pink', icon: 'nappy',
    keywords: ['nappy', 'diaper', 'rash', 'red', 'bottom', 'cream', 'sore'],
    answer: [
      'Change wet or dirty nappies as soon as you can, clean her with water or fragrance-free, alcohol-free wipes, and let her skin dry before a fresh nappy.',
      'A pharmacist can suggest a thin barrier cream for each change.',
    ],
    worth: 'See a doctor if it does not get better, she seems very uncomfortable, or it looks infected.',
    sources: [NHS('baby/caring-for-a-newborn/nappy-rash/', 'Nappy rash')],
  },
  {
    id: 'teething',
    q: 'Is she teething?',
    tone: 'pink', icon: 'baby',
    keywords: ['teething', 'teeth', 'tooth', 'gums', 'dribbling', 'drool', 'chewing'],
    answer: [
      'Most babies start teething around 6 months, though some start before 4 months and some after a year.',
      'Signs include a sore, red gum where a tooth is coming, more dribbling, chewing everything, and a slightly raised temperature that stays under 38°C.',
    ],
    worth: 'Teething does not cause a high temperature. A temperature of 38°C or more is a fever and needs its own attention.',
    sources: [NHS('baby/babys-development/teething/baby-teething-symptoms/', 'Baby teething symptoms')],
  },
  {
    id: 'choking',
    q: 'What do I do if my baby is choking?',
    tone: 'pink', icon: 'warn',
    keywords: ['choking', 'choke', 'swallowed', 'stuck', 'breathing', 'cough'],
    answer: [
      'If she is coughing, let her cough; it is the best way to clear it. If she cannot cough, cry or breathe, shout for help and call for an ambulance.',
      'For a baby under 1: lay her face down along your thigh with her head supported and lower than her bottom, and give up to 5 firm back blows between the shoulder blades. Then follow the steps on the NHS page while you wait for help.',
    ],
    worth: 'Learn this before you need it: the NHS page has pictures, and a baby first-aid class is worth an evening.',
    sources: [NHS('baby/first-aid-and-safety/first-aid/how-to-stop-a-child-from-choking/', 'How to stop a child from choking')],
  },
  {
    id: 'mother-low',
    q: 'I feel low and tearful since the birth. Is that normal?',
    tone: 'plum', icon: 'person',
    keywords: ['low', 'sad', 'tearful', 'depressed', 'depression', 'anxious', 'mother', 'me', 'blues', 'postnatal', 'postpartum', 'mood', 'cry'],
    answer: [
      'Feeling tearful and low in the first couple of weeks after a birth is very common and usually passes on its own.',
      'If it lasts longer than two weeks, or starts later, it may be postnatal depression. It is common, it is not your fault, and it can be treated.',
    ],
    worth: 'Talk to your doctor or health visitor. If you ever think about harming yourself or your baby, get urgent help straight away.',
    sources: [NHS('mental-health/conditions/post-natal-depression/overview/', 'Postnatal depression')],
  },
  {
    id: 'medicine-breastfeeding',
    q: 'Can I take medicine while breastfeeding?',
    tone: 'teal', icon: 'pill',
    keywords: ['medicine', 'tablet', 'painkiller', 'paracetamol', 'ibuprofen', 'antibiotic', 'cold', 'safe', 'breastfeeding', 'pill'],
    answer: [
      'Many common medicines are fine while breastfeeding, but not all. Paracetamol and ibuprofen are usually fine at normal doses; some cold remedies, codeine and aspirin are not recommended.',
      'Always tell the doctor or pharmacist that you are breastfeeding. Use “Check a medicine” for a quick look at a specific one.',
    ],
    sources: [NHS('baby/breastfeeding-and-bottle-feeding/breastfeeding-and-lifestyle/medicines/', 'Breastfeeding and medicines')],
    link: { href: '#/medicine', label: 'Check a medicine' },
  },
];
