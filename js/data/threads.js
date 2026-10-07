// The Strand: twelve Threads shared by Hummers, Groves and Flitters.
// Each allele: { id, name, dom (dominant?), v (value), desc }

export const THREADS = [
  'lineage', 'vigor', 'span', 'brood', 'warmth', 'damp',
  'rhythm', 'hardiness', 'bloom', 'reach', 'stature', 'gift',
];

export const THREAD_INFO = {
  lineage: { name: 'Lineage', h: 'Species', g: 'Species', f: 'Species' },
  vigor: { name: 'Vigor', h: 'Work speed', g: 'Fruit and sap yield', f: 'Pollen carried' },
  span: { name: 'Span', h: 'Lifespan', g: 'Time to mature', f: 'Colony lifespan' },
  brood: { name: 'Brood', h: 'Couriers left at death', g: 'Scion drop chance', f: 'Chrysals laid' },
  warmth: { name: 'Warmth', h: 'Heat and cold tolerance', g: 'Heat and cold tolerance', f: 'Heat and cold tolerance' },
  damp: { name: 'Damp', h: 'Humidity tolerance', g: 'Humidity tolerance', f: 'Humidity tolerance' },
  rhythm: { name: 'Rhythm', h: 'Works by day or night', g: 'Blooms by day or night', f: 'Flies by day or night' },
  hardiness: { name: 'Hardiness', h: 'Rain and darkness', g: 'Rain and darkness', f: 'Rain and darkness' },
  bloom: { name: 'Bloom', h: 'Blossom it forages', g: 'Blossom it makes', f: 'Blossom it hosts on' },
  reach: { name: 'Reach', h: 'Forage radius', g: 'Pollen spread', f: 'Roaming radius' },
  stature: { name: 'Stature', h: 'Comb size', g: 'Tree size, timber', f: 'Silk per cocoon' },
  gift: { name: 'Gift', h: 'Aura', g: 'Leaf aura', f: 'Trail aura' },
};

const A = (id, name, dom, v, desc = '') => ({ id, name, dom, v, desc });

export const ALLELES = {
  vigor: [
    A('drowsy', 'Drowsy', true, 0.3), A('idle', 'Idle', true, 0.6), A('easy', 'Easy', true, 0.8),
    A('steady', 'Steady', false, 1.0), A('brisk', 'Brisk', true, 1.2), A('quick', 'Quick', false, 1.4),
    A('swift', 'Swift', false, 1.7), A('blazing', 'Blazing', false, 2.0), A('frenzied', 'Frenzied', false, 2.5),
  ],
  span: [
    A('fleeting', 'Fleeting', true, 4), A('brief', 'Brief', false, 8), A('short', 'Short', true, 12),
    A('modest', 'Modest', false, 16), A('even', 'Even', false, 20), A('long', 'Long', true, 26),
    A('enduring', 'Enduring', false, 34), A('ageless', 'Ageless', false, 45), A('undying', 'Undying', false, 60),
  ],
  brood: [
    A('scant', 'Scant', false, 1), A('fair', 'Fair', true, 2), A('ample', 'Ample', false, 3), A('teeming', 'Teeming', false, 4),
  ],
  warmth: [
    A('rigid', 'Rigid', true, [0, 0]), A('heat1', 'Heat +1', true, [0, 1]), A('heat2', 'Heat +2', false, [0, 2]),
    A('chill1', 'Chill +1', true, [1, 0]), A('chill2', 'Chill +2', false, [2, 0]),
    A('hardy1', 'Hardy ±1', true, [1, 1]), A('hardy2', 'Hardy ±2', false, [2, 2]), A('hardy3', 'Hardy ±3', false, [3, 3]),
  ],
  damp: [
    A('rigid', 'Rigid', true, [0, 0]), A('wet1', 'Wet +1', true, [0, 1]), A('wet2', 'Wet +2', false, [0, 2]),
    A('dry1', 'Dry +1', true, [1, 0]), A('dry2', 'Dry +2', false, [2, 0]),
    A('hardy1', 'Hardy ±1', true, [1, 1]), A('hardy2', 'Hardy ±2', false, [2, 2]),
  ],
  rhythm: [
    A('day', 'Daywork', true, 'day'), A('night', 'Nightwork', false, 'night'), A('ceaseless', 'Ceaseless', false, 'any'),
  ],
  hardiness: [
    A('fair', 'Fair-weather', true, { rain: false, cave: false }),
    A('rainproof', 'Rainproof', false, { rain: true, cave: false }),
    A('cavern', 'Cavern', false, { rain: false, cave: true }),
    A('stalwart', 'Stalwart', false, { rain: true, cave: true }),
  ],
  bloom: [
    A('wild', 'Wildflower', true, 'wild'), A('orchard', 'Orchard', true, 'orchard'), A('needle', 'Needlebloom', true, 'needle'),
    A('fen', 'Reedbloom', true, 'fen'), A('desert', 'Cactus Bloom', true, 'desert'), A('frost', 'Frostbell', true, 'frost'),
    A('ember', 'Ash Lily', true, 'ember'), A('moon', 'Moonbloom', false, 'moon'), A('prism', 'Prismbloom', false, 'prism'),
    A('heart', 'Heartbloom', false, 'heart'),
  ],
  reach: [
    A('close', 'Close', true, 2), A('near', 'Near', true, 3), A('wide', 'Wide', false, 5),
    A('vast', 'Vast', false, 7), A('boundless', 'Boundless', false, 10),
  ],
  stature: [
    A('small', 'Small', true, 1), A('medium', 'Medium', true, 1.25), A('large', 'Large', false, 1.5), A('grand', 'Grand', false, 2),
  ],
  gift: [
    A('none', 'None', true, null, 'No aura.'),
    A('fertile', 'Fertile', false, 'fertile', 'Groves and beds in reach grow 50% faster.'),
    A('bounty', 'Bounty', false, 'bounty', 'Groves in reach yield 30% more.'),
    A('lumen', 'Lumen', false, 'lumen', 'Lights the reach: day workers keep working at night.'),
    A('hum', 'Hum', true, 'hum', 'Other hives in reach work 15% faster.'),
    A('wonder', 'Wonder', false, 'wonder', 'Earns a little Renown while it works.'),
    A('mending', 'Mending', false, 'mending', 'Worn lines in reach never fail.'),
    A('quickening', 'Quickening', false, 'quickening', 'Mutation chance +25% for hives in reach.'),
    A('chill', 'Chill', true, 'chill', 'Cools hives and groves in reach by one step.'),
    A('kindle', 'Kindle', true, 'kindle', 'Warms hives and groves in reach by one step.'),
    A('gilding', 'Gilding', false, 'gilding', 'Now and then leaves a Crown in the output.'),
    A('shelter', 'Shelter', false, 'shelter', 'Everything in reach works through rain.'),
  ],
};

export const ALLELE_INDEX = {};
for (const [t, list] of Object.entries(ALLELES)) {
  ALLELE_INDEX[t] = {};
  for (const a of list) ALLELE_INDEX[t][a.id] = a;
}

export const TEMPS = ['Frigid', 'Cold', 'Mild', 'Warm', 'Hot', 'Searing'];
export const HUMS = ['Arid', 'Normal', 'Damp'];

export const BLOOM_NAMES = Object.fromEntries(ALLELES.bloom.map((a) => [a.v, a.name]));
