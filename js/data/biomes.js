// The eight regions of Hollowmere Valley, plus the lake and the isle.
// angle: degrees around the lake (0 = east, 90 = south, screen coordinates).

export const BIOMES = {
  meadowfold: { name: 'Meadowfold', temp: 2, hum: 1, angle: 90, ground: 'grass', alt: 'meadow',
    flowers: 'wild', act: 1, music: 0, desc: 'Rolling meadow, the old estate and the village of Thistlewick.' },
  thicket: { name: 'Old Thicket', temp: 1, hum: 2, angle: 140, ground: 'forest', alt: 'moss',
    flowers: 'needle', act: 1, music: 1, desc: 'Dark pinewood, cool and damp. Barkbuzz nest in the old trunks.' },
  rimeback: { name: 'Rimeback Peaks', temp: 0, hum: 1, angle: 190, ground: 'snow', alt: 'ice',
    flowers: 'frost', act: 3, music: 3, desc: 'High snowfields where only the hardy live.' },
  hollow: { name: 'The Hollow', temp: 1, hum: 1, angle: 238, ground: 'cave', alt: 'cavemoss',
    flowers: 'moon', act: 4, dark: true, music: 4, desc: 'A great sunken cavern, lit only by glowcaps and moths.' },
  ashvent: { name: 'Ashvent Caldera', temp: 5, hum: 0, angle: 285, ground: 'ash', alt: 'basalt',
    flowers: 'ember', act: 4, music: 5, desc: 'A smoking crater ringed with black glass.' },
  canopy: { name: 'Canopy Deep', temp: 3, hum: 2, angle: 330, ground: 'jungle', alt: 'jungle2',
    flowers: 'wild', act: 3, music: 2, desc: 'Warm, wet, green and loud.' },
  sunscar: { name: 'Sunscar Dunes', temp: 4, hum: 0, angle: 15, ground: 'sand', alt: 'redsand',
    flowers: 'desert', act: 2, music: 5, desc: 'Red dunes under a white sun.' },
  saltfen: { name: 'Saltfen', temp: 2, hum: 2, angle: 55, ground: 'mud', alt: 'marsh',
    flowers: 'fen', act: 2, music: 1, desc: 'Reed beds, peat pools and endless drizzle.' },
};

export const REGION_ORDER = ['meadowfold', 'thicket', 'rimeback', 'hollow', 'ashvent', 'canopy', 'sunscar', 'saltfen'];

// Gates between neighbouring regions. Each lists what it takes to open.
export const GATES = [
  { id: 'g_thicket', a: 'meadowfold', b: 'thicket', name: 'Bramble Snarl', obstacle: 'bramble',
    need: { items: { brush_hook: 1 }, keep: true }, text: 'A wall of thorny bramble. A Brush Hook would cut through it.' },
  { id: 'g_saltfen', a: 'meadowfold', b: 'saltfen', name: 'Broken Footbridge', obstacle: 'bridge',
    need: { items: { waxed_timber: 10 } }, text: 'The old footbridge has rotted through. Ten Waxed Timber would rebuild it.' },
  { id: 'g_sunscar', a: 'saltfen', b: 'sunscar', name: 'Sandstone Rockfall', obstacle: 'rocks',
    need: { crowns: 300, rank: 1 }, text: 'A rockfall blocks the dune road. Thistlewick\'s quarrymen will clear it for 300 Crowns, once the Guild names you a Tender.' },
  { id: 'g_rimeback', a: 'thicket', b: 'rimeback', name: 'Snowdrift Pass', obstacle: 'snow',
    need: { items: { amberglass: 6 }, rank: 2 }, text: 'Packed snow fills the pass. A Sun Mirror of six Amberglass panes would melt it, but only a Grower may climb the pass.' },
  { id: 'g_canopy', a: 'sunscar', b: 'canopy', name: 'Canopy Ravine', obstacle: 'ravine',
    need: { items: { silkwax_cloth: 4, waxed_timber: 6 }, rank: 2 }, text: 'A deep ravine. Four Silkwax Cloth and six Waxed Timber would make a rope bridge.' },
  { id: 'g_ashvent', a: 'canopy', b: 'ashvent', name: 'Scalding Vents', obstacle: 'vents',
    need: { items: { frost_ward: 1 }, rank: 3, keep: true }, text: 'Scalding steam bursts from the rock. Without a Frost Ward you would cook. Wardens only.' },
  { id: 'g_hollow', a: 'rimeback', b: 'hollow', name: 'Sealed Barrow', obstacle: 'barrow',
    need: { items: { ember_lantern: 1 }, rank: 3, keep: true }, text: 'A dark barrow mouth. Without an Ember Lantern you would never find your way back.' },
];

export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
export const SEASON_TEMP = [0, 0, 0, 0];
// What each season changes. mut: mutation chance, prod: hive output, growth: grove growth, fruit: grove yield.
export const SEASON_MODS = [
  { mut: 1.15, prod: 1, growth: 1.25, fruit: 1, text: 'Spring: groves grow faster and the Strand is restless (more mutations).' },
  { mut: 1, prod: 1.2, growth: 1, fruit: 1, text: 'Summer: hives make more.' },
  { mut: 1, prod: 1, growth: 1, fruit: 1.3, text: 'Autumn: groves hang heavy with fruit.' },
  { mut: 1, prod: 0.9, growth: 0.8, fruit: 0.9, text: 'Winter: everything slows a little. Candles in every window.' },
];
export const FESTIVALS = {
  thaw: { name: 'Thaw Night', season: 0, time: 'night', desc: 'Every spring night, the first melt sings.' },
  longday: { name: 'The Longest Day', season: 1, time: 'day', desc: 'Every summer day, the sun refuses to set.' },
  harvestmoon: { name: 'Harvest Moon', season: 2, time: 'night', desc: 'Every autumn night, a great amber moon.' },
  midwinter: { name: 'Midwinter', season: 3, time: 'night', desc: 'Every winter night, candles in every window.' },
  eclipse: { name: 'The Eclipse', desc: 'Once a week the sun is swallowed for a while.' },
};
