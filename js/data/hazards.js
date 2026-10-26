// What Babyproof looks for. Each entry maps an object the in-browser detector can
// name (COCO-SSD classes) to the hazard it brings into a room with a crawling
// baby, what to do about it, and where that advice comes from.

export const SOURCES = {
  nhs: { label: 'NHS: Baby and toddler safety', url: 'https://www.nhs.uk/baby/first-aid-and-safety/safety/baby-and-toddler-safety/' },
  anchor: { label: 'CPSC: Anchor It!', url: 'https://www.anchorit.gov/' },
  aapSleep: { label: 'AAP: A parent’s guide to safe sleep', url: 'https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/A-Parents-Guide-to-Safe-Sleep.aspx' },
  nhsSids: { label: 'NHS: Reduce the risk of SIDS', url: 'https://www.nhs.uk/baby/caring-for-a-newborn/reduce-the-risk-of-sudden-infant-death-syndrome/' },
};

// severity: 'high' | 'medium' | 'low'
export const HAZARDS = {
  tv: { name: 'TV', category: 'Tip-over', severity: 'high', fix: 'Mount the TV on the wall or anchor it to a low, stable stand, and tuck the cables away.', source: 'anchor' },
  oven: { name: 'Stove or oven', category: 'Burns', severity: 'high', fix: 'Cook on the back burners, turn pan handles inwards, and keep her out of the kitchen while you cook.', source: 'nhs' },
  bed: { name: 'Adult bed', category: 'Falls · safe sleep', severity: 'high', fix: 'Never leave her alone on an adult bed. For sleep, use a cot with a firm, flat mattress and nothing else in it.', source: 'aapSleep' },
  toilet: { name: 'Toilet', category: 'Drowning', severity: 'high', fix: 'Keep the lid down and the bathroom door shut. A baby can drown in a few centimetres of water.', source: 'nhs' },
  knife: { name: 'Knife', category: 'Cuts', severity: 'high', fix: 'Keep knives in a high or locked drawer, never at the edge of a counter or table.', source: 'nhs' },
  scissors: { name: 'Scissors', category: 'Cuts', severity: 'high', fix: 'Keep scissors and razors out of reach, in a high or locked drawer.', source: 'nhs' },
  'hair drier': { name: 'Hair dryer', category: 'Cords · burns', severity: 'high', fix: 'Unplug it after use and put it away; a dangling cord can pull a hot appliance down.', source: 'nhs' },
  microwave: { name: 'Microwave', category: 'Burns', severity: 'medium', fix: 'Keep hot food and drinks out of reach, and stir and test anything microwaved before it goes near her.', source: 'nhs' },
  toaster: { name: 'Toaster', category: 'Burns · cords', severity: 'medium', fix: 'Unplug it after use and push it to the back of the counter with the cord out of reach.', source: 'nhs' },
  sink: { name: 'Sink or basin', category: 'Drowning · scalds', severity: 'medium', fix: 'Empty basins and buckets straight after use, and never leave her near water.', source: 'nhs' },
  cup: { name: 'Hot drink', category: 'Scalds', severity: 'medium', fix: 'Put hot drinks well out of reach, and never hold one while holding her.', source: 'nhs' },
  bottle: { name: 'Bottle', category: 'Poisoning', severity: 'medium', fix: 'Keep medicines, cleaning products and alcohol high up or locked away, with lids closed.', source: 'nhs' },
  'wine glass': { name: 'Glass', category: 'Cuts · alcohol', severity: 'medium', fix: 'Move glasses to the middle of the table or out of reach; broken glass and alcohol are both dangers.', source: 'nhs' },
  remote: { name: 'Remote control', category: 'Button batteries', severity: 'medium', fix: 'Remotes can hold small batteries. Tape the battery cover shut and keep spare batteries locked away.', source: 'nhs' },
  'cell phone': { name: 'Phone and charger', category: 'Cords · batteries', severity: 'medium', fix: 'Unplug chargers when not in use and keep them out of reach; she can chew a live cable.', source: 'nhs' },
  laptop: { name: 'Laptop', category: 'Cords', severity: 'low', fix: 'Keep the charger cable out of reach so she cannot pull the laptop down or chew the cord.', source: 'nhs' },
  'dining table': { name: 'Table', category: 'Corners · pull-downs', severity: 'medium', fix: 'Fit corner protectors, skip tablecloths she can pull, and keep hot drinks in the middle.', source: 'nhs' },
  chair: { name: 'Chair', category: 'Climbing · falls', severity: 'medium', fix: 'Push chairs in so she cannot climb onto tables, and keep low furniture away from windows.', source: 'nhs' },
  couch: { name: 'Sofa', category: 'Falls', severity: 'low', fix: 'Do not leave her alone on the sofa, and keep it away from windows and blind cords.', source: 'nhs' },
  'potted plant': { name: 'House plant', category: 'Poisoning · choking', severity: 'medium', fix: 'Move plants out of reach. Some house plants are harmful if chewed, and soil is easy to swallow.', source: 'nhs' },
  vase: { name: 'Vase', category: 'Breakage · water', severity: 'low', fix: 'Move vases off low tables; they break, and the water is a drowning risk for a crawler.', source: 'nhs' },
  'teddy bear': { name: 'Soft toy', category: 'Safe sleep', severity: 'medium', fix: 'Keep soft toys, pillows and bumpers out of the cot while she sleeps in her first year.', source: 'nhsSids' },
  handbag: { name: 'Handbag', category: 'Medicines · small things', severity: 'medium', fix: 'Bags hold medicines, coins and button batteries. Keep them up high.', source: 'nhs' },
  backpack: { name: 'Bag', category: 'Medicines · small things', severity: 'medium', fix: 'Bags hold medicines, coins and button batteries. Keep them up high.', source: 'nhs' },
  suitcase: { name: 'Suitcase', category: 'Tip-over · small things', severity: 'low', fix: 'Lay suitcases flat and keep them closed; she can pull a standing one over.', source: 'nhs' },
  clock: { name: 'Clock', category: 'Button batteries', severity: 'low', fix: 'Small clocks run on button batteries. Keep them high, with the battery cover secured.', source: 'nhs' },
  cat: { name: 'Cat', category: 'Pets', severity: 'medium', fix: 'Never leave her alone with a pet, even a gentle one, and keep pets out of the room where she sleeps.', source: 'nhs' },
  dog: { name: 'Dog', category: 'Pets', severity: 'medium', fix: 'Never leave her alone with a dog, even a gentle one.', source: 'nhs' },
};

export const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

/** Things no camera can be sure of, for every room. */
export const GENERAL_CHECKS = [
  { name: 'Sockets and cables', fix: 'Unplug what you are not using and keep cables and chargers out of reach.', source: 'nhs' },
  { name: 'Blind and curtain cords', fix: 'Tie cords up out of reach and fix them to a surface so they stay tight.', source: 'nhs' },
  { name: 'Small objects on the floor', fix: 'Coins, buttons, button batteries and small toy parts are choking risks. Check at her eye level.', source: 'nhs' },
  { name: 'Medicines and cleaning products', fix: 'Keep them locked away or high up, out of reach and sight.', source: 'nhs' },
  { name: 'Windows', fix: 'Keep low furniture away from windows and fit catches that limit how far they open.', source: 'nhs' },
];

/** Detector output → numbered fix list, most serious first, one card per kind of object. */
export function hazardsFrom(detections, imgW, imgH) {
  const byClass = new Map();
  for (const d of detections) {
    const h = HAZARDS[d.class];
    if (!h) continue;
    const box = { x: d.bbox[0] / imgW, y: d.bbox[1] / imgH, w: d.bbox[2] / imgW, h: d.bbox[3] / imgH, score: d.score };
    if (!byClass.has(d.class)) byClass.set(d.class, { cls: d.class, ...h, boxes: [] });
    byClass.get(d.class).boxes.push(box);
  }
  return [...byClass.values()]
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.boxes.length - a.boxes.length)
    .map((h, i) => ({ ...h, n: i + 1 }));
}
