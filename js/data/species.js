// Every living Lineage in Hollowmere, and how they cross.
// k: 'h' Hummer, 'g' Grove, 'f' Flitter.
// temp: 0 Frigid .. 5 Searing. hum: 0 Arid, 1 Normal, 2 Damp.

const BASE = {
  h: { vigor: 'idle', span: 'short', brood: 'fair', warmth: 'rigid', damp: 'rigid', rhythm: 'day', hardiness: 'fair', bloom: 'wild', reach: 'close', stature: 'small', gift: 'none' },
  g: { vigor: 'idle', span: 'even', brood: 'fair', warmth: 'rigid', damp: 'rigid', rhythm: 'day', hardiness: 'fair', bloom: 'orchard', reach: 'near', stature: 'medium', gift: 'none' },
  f: { vigor: 'easy', span: 'modest', brood: 'fair', warmth: 'rigid', damp: 'rigid', rhythm: 'day', hardiness: 'fair', bloom: 'orchard', reach: 'near', stature: 'small', gift: 'none' },
};

const LIST = [];
function S(k, id, name, o) {
  const sp = { k, id, name, dom: o.dom !== false, line: o.line || 'Wild', temp: o.temp ?? 2, hum: o.hum ?? 1,
    colors: o.colors || ['#ccc', '#333'], products: o.products || [], special: o.special || [],
    wild: o.wild || null, lore: o.lore || '', tier: o.tier || 1, extra: o.extra || {} };
  sp.genes = { ...BASE[k], ...(o.g || {}) };
  LIST.push(sp);
  return sp;
}

// ───────────────────────── Hummers ─────────────────────────
const H = (id, name, o) => S('h', id, name, o);

H('meadowmote', 'Meadowmote', { line: 'Wild', wild: 'meadowfold', colors: ['#e8b730', '#3a2a14'], products: [['goldcomb', 0.35]],
  g: { vigor: 'idle', span: 'short' }, lore: 'Small, honey-gold and unhurried. The first hum of every Meadowfold spring.' });
H('barkbuzz', 'Barkbuzz', { line: 'Wild', dom: false, wild: 'thicket', temp: 1, hum: 2, colors: ['#8a6a3c', '#2b2218'], products: [['goldcomb', 0.3], ['threadcomb', 0.1]],
  g: { vigor: 'drowsy', brood: 'ample', bloom: 'needle', warmth: 'heat1', damp: 'dry1' }, lore: 'Nests in the cracked bark of old pines and smells faintly of resin.' });
H('bogmote', 'Bogmote', { line: 'Wild', wild: 'saltfen', temp: 2, hum: 2, colors: ['#6f8f4a', '#2a3320'], products: [['mirecomb', 0.32]],
  g: { bloom: 'fen', hardiness: 'rainproof', damp: 'dry1' }, lore: 'Drones along the reeds in any weather. Fen folk say it hums in the key of rain.' });
H('dunemote', 'Dunemote', { line: 'Wild', wild: 'sunscar', temp: 4, hum: 0, colors: ['#d9a35a', '#5a3a1a'], products: [['parchcomb', 0.32]],
  g: { bloom: 'desert', vigor: 'easy' }, lore: 'Builds wax cells against sun-baked stone. Its comb is dry, gritty and oddly sweet.' });
H('rimebuzz', 'Rimebuzz', { line: 'Wild', wild: 'rimeback', temp: 0, hum: 1, colors: ['#cfe6f2', '#3b4b5a'], products: [['frostcomb', 0.3]],
  g: { bloom: 'frost', brood: 'teeming' }, lore: 'Huddles in great numbers against the cold. A single Matron can seed four new colonies.' });
H('leafhum', 'Leafhum', { line: 'Wild', wild: 'canopy', temp: 3, hum: 2, colors: ['#58b06a', '#1d3a22'], products: [['silkcomb', 0.3]],
  g: { hardiness: 'rainproof', vigor: 'easy' }, lore: 'Green as the canopy it hides in. Spins fine silken threads through its comb.' });
H('cinder', 'Cinder', { line: 'Wild', wild: 'ashvent', temp: 5, hum: 0, colors: ['#e0572e', '#2e1410'], products: [['smouldercomb', 0.3]],
  g: { bloom: 'ember', vigor: 'easy' }, lore: 'Its wings shimmer like heat haze. Hives smoke gently and never quite cool.' });
H('gloam', 'Gloam', { line: 'Wild', wild: 'hollow', temp: 1, hum: 1, colors: ['#6b5aa8', '#16122a'], products: [['duskcomb', 0.28]],
  g: { bloom: 'moon', rhythm: 'night', hardiness: 'cavern' }, lore: 'Never seen in daylight. Its comb is dark violet and faintly cold to the touch.' });

H('hearthling', 'Hearthling', { line: 'Homestead', colors: ['#f0c040', '#4a3016'], products: [['goldcomb', 0.4]],
  g: { vigor: 'idle', span: 'short' }, lore: 'The honest backbone of every estate. Hardly remarkable, endlessly useful.' });
H('tended', 'Tended', { line: 'Homestead', colors: ['#f6cf55', '#57391a'], products: [['goldcomb', 0.45]],
  g: { vigor: 'brisk', span: 'fleeting' }, lore: 'Bred for quick work and short lives. Wardens prize it as a stepping stone.' });

H('gentry', 'Gentry', { line: 'Gentry', tier: 2, colors: ['#c99a3a', '#2f2410'], products: [['regalcomb', 0.3]],
  g: { vigor: 'idle', span: 'modest' }, lore: 'Carries itself with an odd dignity. Its comb drips a pale, floral honey.' });
H('baronial', 'Baronial', { line: 'Gentry', tier: 2, colors: ['#d4a83c', '#3a2a12'], products: [['regalcomb', 0.35]],
  g: { vigor: 'steady', span: 'modest', brood: 'teeming' }, lore: 'Large broods, larger opinions.' });
H('sovereign', 'Sovereign', { line: 'Gentry', tier: 3, colors: ['#e6c35a', '#4a2a5a'], products: [['regalcomb', 0.35]], special: [['crownmilk', 0.22]],
  g: { vigor: 'idle', span: 'long', gift: 'hum', bloom: 'orchard' }, lore: 'Only a Sovereign colony makes Crownmilk, the rich cream every great housing needs.' });

H('toiler', 'Toiler', { line: 'Toil', tier: 2, colors: ['#b8b04a', '#2e2c14'], products: [['threadcomb', 0.3]],
  g: { vigor: 'idle', span: 'short' }, lore: 'Never stops for long. Its comb is laced with sticky propolis.' });
H('tireless', 'Tireless', { line: 'Toil', tier: 2, colors: ['#c2bc54', '#33301a'], products: [['threadcomb', 0.35]],
  g: { vigor: 'steady', span: 'modest' }, lore: 'The name is earned.' });
H('foreman', 'Foreman', { line: 'Toil', tier: 3, colors: ['#cfc65e', '#443d16'], products: [['threadcomb', 0.35]], special: [['pollenknot', 0.22]],
  g: { vigor: 'idle', reach: 'near', span: 'modest' }, lore: 'Gathers pollen into tight golden knots, the second key to a Hivespire.' });

H('furrow', 'Furrow', { line: 'Hearthfield', tier: 2, colors: ['#d8b860', '#4f3a20'], products: [['graincomb', 0.3]],
  g: { vigor: 'easy' }, lore: 'Follows the plough lines of old Meadowfold farms.' });
H('reaper', 'Reaper', { line: 'Hearthfield', tier: 2, colors: ['#e0c070', '#5a4022'], products: [['graincomb', 0.35]],
  g: { vigor: 'easy', reach: 'near' }, lore: 'Busiest at harvest. Smells of warm straw.' });
H('granary', 'Granary', { line: 'Hearthfield', tier: 3, colors: ['#f0d080', '#6a4a26'], products: [['graincomb', 0.4]],
  g: { vigor: 'easy', reach: 'wide', gift: 'fertile' }, lore: 'Groves near a Granary hive grow noticeably faster.' });

H('mossmote', 'Mossmote', { line: 'Fen', tier: 2, temp: 2, hum: 2, colors: ['#5f8a5a', '#203020'], products: [['mirecomb', 0.35]],
  g: { bloom: 'fen', hardiness: 'rainproof' }, lore: 'Mossy-backed and slow. Lives where boots sink.' });
H('sporeback', 'Sporeback', { line: 'Fen', tier: 3, temp: 2, hum: 2, colors: ['#7a6a8a', '#28203a'], products: [['mirecomb', 0.35]], special: [['peat', 0.25]],
  g: { bloom: 'fen', hardiness: 'rainproof', span: 'modest' }, lore: 'Its hive grows a crust of rich black peat, the fen-folk\'s favourite fuel.' });
H('balmwing', 'Balmwing', { line: 'Fen', tier: 3, colors: ['#9ac8a0', '#2a3a2c'], products: [['goldcomb', 0.3], ['regalcomb', 0.15]],
  g: { gift: 'mending', span: 'modest' }, lore: 'Old Wardens kept one beside every tired line. Its hum steadies worn Heiresses.' });
H('stormcaller', 'Stormcaller', { line: 'Fen', tier: 2, colors: ['#7090a0', '#203040'], products: [['goldcomb', 0.35]],
  g: { hardiness: 'rainproof', gift: 'shelter', reach: 'near' }, lore: 'Only appears in a downpour. Hives beside it keep working through the rain.' });

H('hoarfrost', 'Hoarfrost', { line: 'Rime', tier: 2, temp: 0, hum: 1, colors: ['#bfe0f0', '#2f4050'], products: [['frostcomb', 0.35]], special: [['ice_shard', 0.15]],
  g: { bloom: 'frost', brood: 'ample' }, lore: 'Leaves frost flowers on the hive boards each morning.' });
H('glacier', 'Glacier', { line: 'Rime', tier: 3, temp: 0, hum: 1, colors: ['#e6f6ff', '#3a5068'], products: [['frostcomb', 0.4]], special: [['ice_shard', 0.25]],
  g: { bloom: 'frost', gift: 'chill', reach: 'near', span: 'modest' }, lore: 'The air around a Glacier hive is cold enough to keep frost species happy.' });
H('quickwing', 'Quickwing', { line: 'Rime', tier: 3, temp: 1, hum: 1, colors: ['#90c0ff', '#203060'], products: [['threadcomb', 0.3]],
  g: { vigor: 'quick', gift: 'quickening', reach: 'near', span: 'short' }, lore: 'Its restless hum seems to shake new things loose from the Strand.' });

H('sparing', 'Sparing', { line: 'Dune', tier: 2, temp: 4, hum: 0, colors: ['#e2b46a', '#5a3c1e'], products: [['parchcomb', 0.35]],
  g: { bloom: 'desert' }, lore: 'Wastes nothing. Lives on a single cactus flower for a week.' });
H('ascetic', 'Ascetic', { line: 'Dune', tier: 3, temp: 4, hum: 0, colors: ['#efc77e', '#6a4422'], products: [['parchcomb', 0.4]], special: [['glass_grit', 0.28]],
  g: { bloom: 'desert', span: 'long' }, lore: 'Lines its cells with fine glassy sand. Glassforges run on it.' });

H('orchid', 'Orchid', { line: 'Canopy', tier: 2, temp: 3, hum: 2, colors: ['#d06ab0', '#3a1a36'], products: [['silkcomb', 0.35]],
  g: { bloom: 'orchard', hardiness: 'rainproof' }, lore: 'Painted like the flowers it visits.' });
H('paradise', 'Paradise', { line: 'Canopy', tier: 3, temp: 3, hum: 2, colors: ['#f08ad0', '#2a5a3a'], products: [['silkcomb', 0.4]], special: [['silk_wisp', 0.2]],
  g: { bloom: 'orchard', gift: 'wonder', span: 'long', hardiness: 'rainproof' }, lore: 'Wardens sit by Paradise hives to think. They usually leave with an idea.' });

H('emberling', 'Emberling', { line: 'Ember', tier: 2, temp: 5, hum: 0, colors: ['#f07040', '#3a1a10'], products: [['smouldercomb', 0.35]],
  g: { bloom: 'ember', vigor: 'easy' }, lore: 'Warm to hold. Do not hold it.' });
H('brimstone', 'Brimstone', { line: 'Ember', tier: 3, temp: 5, hum: 0, colors: ['#ffb040', '#5a2a10'], products: [['smouldercomb', 0.4]], special: [['phosphor', 0.22]],
  g: { bloom: 'ember', gift: 'kindle', span: 'long', reach: 'near' }, lore: 'Its comb crumbles into glowing phosphor. Hives near it stay warm all winter.' });

H('umbral', 'Umbral', { line: 'Gloam', tier: 2, temp: 1, hum: 1, colors: ['#5a4a90', '#100c20'], products: [['duskcomb', 0.35]],
  g: { bloom: 'moon', rhythm: 'night', hardiness: 'cavern' }, lore: 'A shadow with wings.' });
H('eclipse', 'Eclipse', { line: 'Gloam', tier: 3, temp: 1, hum: 1, colors: ['#2a2040', '#d0c0ff'], products: [['duskcomb', 0.4]], special: [['void_propolis', 0.15]],
  g: { bloom: 'moon', rhythm: 'ceaseless', hardiness: 'stalwart', span: 'long' }, lore: 'Born only under a swallowed sun. Works through day and night alike.' });
H('glimmer', 'Glimmer', { line: 'Gloam', tier: 3, temp: 2, hum: 1, colors: ['#f8f0a0', '#3a3060'], products: [['duskcomb', 0.3], ['goldcomb', 0.25]],
  g: { bloom: 'moon', rhythm: 'night', gift: 'lumen', reach: 'near' }, lore: 'Glows softly. Day-working hives near it forget it is night.' });

H('rustwing', 'Rustwing', { line: 'Ore', tier: 2, temp: 4, hum: 0, colors: ['#a0522d', '#2e1a10'], products: [['rustcomb', 0.3]],
  g: { bloom: 'desert' }, lore: 'Sifts iron from the red sand. Its comb rings when tapped.' });
H('copperback', 'Copperback', { line: 'Ore', tier: 3, temp: 2, hum: 2, colors: ['#c87533', '#2a1a10'], products: [['coppercomb', 0.3]],
  g: { bloom: 'fen' }, lore: 'Turns green with age, like the roofs of Thistlewick.' });
H('gilt', 'Gilt', { line: 'Ore', tier: 3, temp: 3, hum: 1, colors: ['#ffd700', '#5a4010'], products: [['giltcomb', 0.25]],
  g: { bloom: 'orchard', span: 'modest' }, lore: 'Collectors once paid fortunes for a single Gilt Heiress.' });
H('gemcutter', 'Gemcutter', { line: 'Ore', tier: 4, temp: 1, hum: 1, colors: ['#60e0d0', '#203a40'], products: [['gemcomb', 0.2]],
  g: { bloom: 'frost', span: 'modest' }, lore: 'Grows tiny clear crystals in its cells, one facet at a time.' });

H('thawling', 'Thawling', { line: 'Festival', colors: ['#a8e0c8', '#2a4038'], products: [['treatcomb', 0.3], ['goldcomb', 0.3]],
  lore: 'Wakes on Thaw Night, when the first melt runs.' });
H('sunblaze', 'Sunblaze', { line: 'Festival', colors: ['#ffcc33', '#aa3300'], products: [['treatcomb', 0.3], ['goldcomb', 0.3]],
  g: { vigor: 'brisk' }, lore: 'A creature of the Longest Day. Loud, bright, and gone by evening.' });
H('moonsheaf', 'Moonsheaf', { line: 'Festival', colors: ['#e8a050', '#402010'], products: [['treatcomb', 0.3], ['graincomb', 0.3]],
  g: { rhythm: 'night' }, lore: 'Gleans the fields by the light of the Harvest Moon.' });
H('frostwick', 'Frostwick', { line: 'Festival', temp: 1, colors: ['#ffffff', '#c03040'], products: [['treatcomb', 0.3], ['frostcomb', 0.3]],
  g: { bloom: 'frost' }, lore: 'Striped red and white. Only ever seen at Midwinter.' });

H('verdant', 'Verdant Matriarch', { line: 'Triad', tier: 5, colors: ['#7fe08a', '#f0d060'], products: [['verdantcomb', 0.4]], special: [['crownmilk', 0.2]],
  g: { vigor: 'steady', span: 'ageless', brood: 'ample', warmth: 'hardy2', damp: 'hardy2', rhythm: 'ceaseless', hardiness: 'stalwart', bloom: 'orchard', reach: 'vast', stature: 'grand', gift: 'fertile' },
  lore: 'The first of the Triad. Grandmother\'s journals call her "the hum the Heartroot listens for".' });

// ───────────────────────── Groves ─────────────────────────
const G = (id, name, o) => S('g', id, name, o);

G('commonwood', 'Commonwood', { wild: 'meadowfold', colors: ['#4f9a3c', '#6a4a2a', '#d04030'], products: [['crabapple', 0.3], ['leaf_litter', 0.15]],
  g: { warmth: 'hardy1', damp: 'wet1', bloom: 'orchard' }, extra: { shape: 'round', timber: 'timber' }, lore: 'Sour little apples and good honest timber.' });
G('paperbark', 'Paperbark', { wild: 'thicket', temp: 1, hum: 2, colors: ['#8ab04a', '#e8e4d8'], products: [['leaf_litter', 0.25], ['heartsap', 0.08]],
  g: { bloom: 'wild', span: 'modest', warmth: 'heat1', damp: 'dry1' }, extra: { shape: 'tall', timber: 'timber' }, lore: 'Peels in white curls. Wardens wrote letters on the bark.' });
G('needlepine', 'Needlepine', { wild: 'thicket', temp: 1, hum: 2, colors: ['#2f6a3a', '#5a3a22'], products: [['amber_resin', 0.15], ['leaf_litter', 0.1]],
  g: { bloom: 'needle', warmth: 'hardy1', damp: 'dry1' }, extra: { shape: 'cone', timber: 'timber' }, lore: 'Weeps a slow golden resin from every wound.' });
G('weepwillow', 'Weepwillow', { wild: 'saltfen', temp: 2, hum: 2, colors: ['#6aa050', '#5a4a30'], products: [['leaf_litter', 0.3]],
  g: { bloom: 'fen', span: 'modest' }, extra: { shape: 'willow', timber: 'timber' }, lore: 'Trails its fingers in the fen water.' });
G('thornpalm', 'Thornpalm', { wild: 'sunscar', temp: 4, hum: 0, colors: ['#5aa040', '#8a6a3a', '#7a4020'], products: [['date', 0.3]],
  g: { bloom: 'desert', warmth: 'heat1' }, extra: { shape: 'palm', timber: 'timber' }, lore: 'Spiny trunk, sweet dates. The dunes\' only shade.' });
G('frostpine', 'Frostpine', { wild: 'rimeback', temp: 0, hum: 1, colors: ['#5a9a9a', '#4a3a2a'], products: [['amber_resin', 0.1], ['leaf_litter', 0.1]],
  g: { bloom: 'frost', span: 'modest', warmth: 'heat1', damp: 'wet1' }, extra: { shape: 'cone', timber: 'timber', snow: true }, lore: 'Never sheds its rime, even in summer.' });
G('tanglewood', 'Tanglewood', { wild: 'canopy', temp: 3, hum: 2, colors: ['#2f8a3a', '#4a3a20', '#f0d040'], products: [['sunfruit', 0.3], ['leaf_litter', 0.1]],
  g: { bloom: 'wild', hardiness: 'rainproof' }, extra: { shape: 'jungle', timber: 'timber' }, lore: 'Vines, roots and fruit all knotted together.' });
G('charbark', 'Charbark', { wild: 'ashvent', temp: 5, hum: 0, colors: ['#b04020', '#2a1a14'], products: [['amber_resin', 0.25]],
  g: { bloom: 'ember' }, extra: { shape: 'twisted', timber: 'timber' }, lore: 'Black bark, glowing cracks. Somehow alive.' });
G('glowcap', 'Glowcap', { wild: 'hollow', temp: 1, hum: 1, colors: ['#9a70e0', '#d8d0c0'], products: [['glowspore', 0.3]],
  g: { bloom: 'moon', rhythm: 'night', hardiness: 'cavern' }, extra: { shape: 'mushroom', timber: 'timber', light: true }, lore: 'A mushroom grown to the size of a tree, lit from within.' });

G('silverleaf', 'Silverleaf', { line: 'Orchard', colors: ['#a8c8b0', '#8a8a80'], products: [['leaf_litter', 0.2], ['heartsap', 0.12]],
  g: { bloom: 'orchard', span: 'modest' }, extra: { shape: 'round', timber: 'timber' }, lore: 'Leaves flash silver in the wind. Gentry hummers love its blossom.' });
G('larchwood', 'Larchwood', { line: 'Timber', temp: 1, hum: 2, colors: ['#7aa04a', '#6a4a2a'], products: [['amber_resin', 0.12], ['leaf_litter', 0.15]],
  g: { bloom: 'needle', stature: 'large', span: 'short', warmth: 'hardy1' }, extra: { shape: 'cone', timber: 'timber' }, lore: 'Grows fast and straight. The Joiner\'s favourite.' });
G('blushcherry', 'Blushcherry', { line: 'Orchard', colors: ['#f0a0b8', '#5a3a2a', '#c01830'], products: [['cherry', 0.4]],
  g: { bloom: 'orchard', warmth: 'hardy1', damp: 'wet1' }, extra: { shape: 'round', timber: 'timber', blossom: true }, lore: 'Pink every spring. Sovereign hummers will forage nothing else.' });
G('sunlemon', 'Sunlemon', { line: 'Orchard', temp: 3, colors: ['#6aa040', '#6a4a2a', '#f0e040'], products: [['lemon', 0.35]],
  g: { bloom: 'orchard', warmth: 'chill1' }, extra: { shape: 'round', timber: 'timber' }, lore: 'Sour enough to make you wince, bright enough to make you smile.' });
G('duskplum', 'Duskplum', { line: 'Orchard', colors: ['#4a6a5a', '#3a2a2a', '#6a2a8a'], products: [['plum', 0.35]],
  g: { bloom: 'moon', rhythm: 'night', warmth: 'hardy1', damp: 'wet1' }, extra: { shape: 'round', timber: 'timber' }, lore: 'Flowers only at night. The plums taste of cold evenings.' });
G('ironnut', 'Ironnut', { line: 'Nut', colors: ['#3f7a34', '#4a3420', '#8a6a40'], products: [['walnut', 0.35]],
  g: { bloom: 'orchard', stature: 'large', span: 'long' }, extra: { shape: 'big', timber: 'timber' }, lore: 'Nuts so hard you need a Press to crack them. Their oil keeps every gear turning.' });
G('hearthchestnut', 'Hearthchestnut', { line: 'Nut', colors: ['#4a8a30', '#5a3a1a', '#7a4a20'], products: [['chestnut', 0.35]],
  g: { bloom: 'orchard', stature: 'large' }, extra: { shape: 'big', timber: 'timber' }, lore: 'Roast them by the fire on Midwinter night.' });
G('syrupmaple', 'Syrupmaple', { line: 'Timber', temp: 1, hum: 2, colors: ['#d05a2a', '#5a3a22'], products: [['heartsap', 0.4]],
  g: { bloom: 'needle', vigor: 'easy', warmth: 'hardy1' }, extra: { shape: 'round', timber: 'timber' }, lore: 'Tap it in spring and Heartsap runs like a stream.' });
G('amberpine', 'Amberpine', { line: 'Timber', temp: 2, hum: 2, colors: ['#3a7a4a', '#a06a2a'], products: [['amber_resin', 0.45]],
  g: { bloom: 'needle' }, extra: { shape: 'cone', timber: 'timber' }, lore: 'So heavy with resin the bark glows orange at sunset.' });
G('spireglass', 'Spireglass', { line: 'Timber', tier: 3, temp: 1, hum: 1, colors: ['#8ad0d0', '#c0d8e0'], products: [['amber_resin', 0.2]],
  g: { bloom: 'needle', stature: 'grand', span: 'long', warmth: 'hardy1', damp: 'wet1' }, extra: { shape: 'spire', timber: 'glasswood' }, lore: 'A towering tree whose wood is clear as frosted glass.' });
G('starapple', 'Starapple', { line: 'Orchard', temp: 3, hum: 2, colors: ['#4a9a50', '#5a3a22', '#f0d050'], products: [['starfruit', 0.35]],
  g: { bloom: 'orchard', hardiness: 'rainproof' }, extra: { shape: 'jungle', timber: 'timber' }, lore: 'Cut the fruit crossways and find a star.' });
G('frostberry', 'Frostberry', { line: 'Orchard', temp: 1, hum: 1, colors: ['#6a9aa0', '#4a3a3a', '#80c0ff'], products: [['frostberry', 0.35]],
  g: { bloom: 'frost', warmth: 'chill1', damp: 'wet1' }, extra: { shape: 'round', timber: 'timber', snow: true }, lore: 'Blue berries that crackle with frost even in July.' });
G('emberbark', 'Emberbark', { line: 'Timber', tier: 3, temp: 4, hum: 0, colors: ['#d06030', '#3a1a10'], products: [['amber_resin', 0.25]],
  g: { bloom: 'ember', warmth: 'hardy1' }, extra: { shape: 'twisted', timber: 'ember_timber' }, lore: 'Its timber will not burn. Glassforges are built from little else.' });
G('nightebony', 'Nightebony', { line: 'Timber', tier: 3, colors: ['#2a3a4a', '#1a1418'], products: [['leaf_litter', 0.2]],
  g: { bloom: 'moon', rhythm: 'night', warmth: 'hardy1', damp: 'wet1' }, extra: { shape: 'tall', timber: 'dusk_timber' }, lore: 'Black-hearted wood, dense as stone. Dusk-moths sleep in its crown.' });
G('lanternfig', 'Lanternfig', { line: 'Orchard', tier: 4, temp: 1, hum: 1, colors: ['#3a4a6a', '#3a2a3a', '#ffe080'], products: [['lantern_fig', 0.3]],
  g: { bloom: 'moon', rhythm: 'ceaseless', gift: 'lumen', hardiness: 'cavern', warmth: 'hardy1', damp: 'wet1' }, extra: { shape: 'round', timber: 'dusk_timber', light: true }, lore: 'Its fruit glows. A grove of them lights a valley.' });
G('heartwood', 'Heartwood', { line: 'Triad', tier: 5, colors: ['#ffcf6a', '#7a4a2a', '#ff7a5a'], products: [['heartsap', 0.5], ['heart_pollen', 0.15]],
  g: { bloom: 'heart', warmth: 'hardy2', damp: 'hardy2', rhythm: 'ceaseless', hardiness: 'stalwart', stature: 'grand', gift: 'wonder', reach: 'wide' },
  extra: { shape: 'heart', timber: 'heart_timber', light: true }, lore: 'The second of the Triad: a sapling of the Heartroot itself.' });

// ───────────────────────── Flitters ─────────────────────────
const F = (id, name, o) => S('f', id, name, o);

F('meadowpale', 'Meadow Pale', { wild: 'meadowfold', colors: ['#f4f0e0', '#c8c090'], products: [['silk_cocoon', 0.25]],
  g: { bloom: 'orchard' }, lore: 'A plain cream butterfly that follows you around the orchard.' });
F('mossback', 'Mossback', { wild: 'thicket', temp: 1, hum: 2, colors: ['#6a7a50', '#3a4030'], products: [['silk_cocoon', 0.3]],
  g: { bloom: 'needle', rhythm: 'night' }, extra: { moth: true }, lore: 'A Dusk-moth that looks exactly like a scrap of bark.' });
F('reedwing', 'Reedwing', { wild: 'saltfen', temp: 2, hum: 2, colors: ['#6ab0c8', '#203a50'], products: [['silk_cocoon', 0.2]],
  g: { bloom: 'fen', hardiness: 'rainproof' }, lore: 'Blue as fen water. Flies low over the reeds.' });
F('ochreskipper', 'Ochre Skipper', { wild: 'sunscar', temp: 4, hum: 0, colors: ['#e0a040', '#6a3a10'], products: [['silk_cocoon', 0.2]],
  g: { bloom: 'desert', vigor: 'brisk' }, lore: 'Darts between cactus blooms too fast to follow.' });
F('frostwing', 'Frostwing', { wild: 'rimeback', temp: 0, hum: 1, colors: ['#e8f4ff', '#7090c0'], products: [['silk_cocoon', 0.2]],
  g: { bloom: 'frost', warmth: 'hardy2' }, lore: 'Wings like frosted glass. Carries cold-hardiness wherever it pollinates.' });
F('jadetail', 'Jadetail', { wild: 'canopy', temp: 3, hum: 2, colors: ['#30c070', '#103020'], products: [['silk_cocoon', 0.25]],
  g: { bloom: 'wild', hardiness: 'rainproof' }, lore: 'A long-tailed green swallowtail of the Canopy Deep.' });
F('ashmoth', 'Ashmoth', { wild: 'ashvent', temp: 5, hum: 0, colors: ['#605050', '#e06030'], products: [['silk_cocoon', 0.2]],
  g: { bloom: 'ember', rhythm: 'night' }, extra: { moth: true }, lore: 'Grey as ash until it opens its wings.' });
F('lanternmoth', 'Lantern Moth', { wild: 'hollow', temp: 1, hum: 1, colors: ['#f0e080', '#403060'], products: [['prism_dust', 0.22]],
  g: { bloom: 'moon', rhythm: 'night', hardiness: 'cavern', gift: 'lumen' }, extra: { moth: true }, lore: 'The only light in the Hollow, drifting between the glowcaps.' });

F('copperwing', 'Copperwing', { line: 'Orchard', colors: ['#e07a30', '#5a2a10'], products: [['silk_cocoon', 0.25]],
  g: { bloom: 'orchard', gift: 'fertile' }, lore: 'Its trail leaves the soil richer.' });
F('jewelwing', 'Jewelwing', { line: 'Orchard', colors: ['#40a0ff', '#ffd040'], products: [['silk_cocoon', 0.2]],
  g: { bloom: 'orchard', reach: 'vast' }, lore: 'Ranges farther than any hummer. Carries pollen across the whole estate.' });
F('silkspinner', 'Silkspinner', { line: 'Silk', colors: ['#e8e0d0', '#8a7a60'], products: [['silk_cocoon', 0.45]],
  g: { bloom: 'needle', rhythm: 'night', stature: 'grand' }, extra: { moth: true }, lore: 'Spins cocoons twice the size of any other.' });
F('admiral', 'Orchard Admiral', { line: 'Orchard', colors: ['#202020', '#e04030'], products: [['silk_cocoon', 0.25]],
  g: { bloom: 'orchard', gift: 'bounty' }, lore: 'Black and red. Trees it hosts on hang heavy with fruit.' });
F('hawkmoth', 'Bramble Hawkmoth', { line: 'Silk', temp: 1, colors: ['#7a5a40', '#c0a080'], products: [['silk_cocoon', 0.3]],
  g: { bloom: 'needle', rhythm: 'night', hardiness: 'stalwart', warmth: 'hardy1' }, extra: { moth: true }, lore: 'Flies through storms that ground everything else.' });
F('prismwing', 'Prismwing', { line: 'Prism', tier: 3, colors: ['#ff80c0', '#80c0ff'], products: [['prism_dust', 0.35]],
  g: { bloom: 'orchard', reach: 'wide' }, lore: 'Every scale a different colour. Its dust makes the finest inks and lamps.' });
F('ashenmonarch', 'Ashen Monarch', { line: 'Prism', tier: 4, temp: 4, hum: 0, colors: ['#ff7020', '#200a05'], products: [['silk_cocoon', 0.3], ['prism_dust', 0.2]],
  g: { bloom: 'ember', warmth: 'hardy1' }, lore: 'Rises from the Ashvent in autumn, thousands at a time.' });
F('dawnwing', 'Dawnwing', { line: 'Triad', tier: 5, colors: ['#ffe9a8', '#ff9a6a'], products: [['prism_dust', 0.3], ['heart_pollen', 0.1]],
  g: { bloom: 'heart', reach: 'boundless', warmth: 'hardy2', damp: 'hardy2', hardiness: 'stalwart', span: 'long' },
  lore: 'The third of the Triad. Said to carry the Heartroot\'s pollen on the first light of the Longest Day.' });

export const SPECIES = Object.fromEntries(LIST.map((s) => [s.id, s]));
export const SPECIES_LIST = LIST;

// ───────────────────────── Mutations ─────────────────────────
// cond keys: biome, season, time ('day'|'night'), festival, spire (Hivespire only), rain, carrier (pollen carrier species), nearGrove
export const MUTATIONS = [];
function M(a, b, c, p, cond = {}, hint = '') { MUTATIONS.push({ a, b, c, p, cond, hint }); }

const WILD_H = ['meadowmote', 'barkbuzz', 'bogmote', 'dunemote', 'rimebuzz', 'leafhum', 'cinder', 'gloam'];
for (let i = 0; i < WILD_H.length; i++) for (let j = i + 1; j < WILD_H.length; j++) M(WILD_H[i], WILD_H[j], 'hearthling', 0.15);
for (const w of WILD_H) M('hearthling', w, 'tended', 0.12);

M('hearthling', 'tended', 'gentry', 0.10);
M('hearthling', 'tended', 'toiler', 0.10);
M('gentry', 'tended', 'baronial', 0.08);
M('gentry', 'baronial', 'sovereign', 0.08);
M('toiler', 'tended', 'tireless', 0.08);
M('toiler', 'tireless', 'foreman', 0.08);
M('meadowmote', 'toiler', 'furrow', 0.12, { biome: 'meadowfold' }, 'Only where the old ploughlines run.');
M('furrow', 'tireless', 'reaper', 0.10, { biome: 'meadowfold' }, 'Only where the old ploughlines run.');
M('reaper', 'foreman', 'granary', 0.06, { biome: 'meadowfold' }, 'Only where the old ploughlines run.');
M('bogmote', 'tended', 'mossmote', 0.12);
M('mossmote', 'bogmote', 'sporeback', 0.08, { biome: 'saltfen' }, 'Only where boots sink.');
M('gentry', 'mossmote', 'balmwing', 0.08);
M('tended', 'bogmote', 'stormcaller', 0.10, { rain: true }, 'Only in the middle of a downpour.');
M('rimebuzz', 'toiler', 'hoarfrost', 0.12);
M('hoarfrost', 'rimebuzz', 'glacier', 0.08, { biome: 'rimeback' }, 'Only among the high snows.');
M('toiler', 'hoarfrost', 'quickwing', 0.07);
M('dunemote', 'tended', 'sparing', 0.14, { biome: 'sunscar' }, 'Only where the sand burns.');
M('sparing', 'dunemote', 'ascetic', 0.08, { biome: 'sunscar' }, 'Only where the sand burns.');
M('leafhum', 'ascetic', 'orchid', 0.12);
M('orchid', 'leafhum', 'paradise', 0.08, { biome: 'canopy' }, 'Only under the deep green roof.');
M('cinder', 'tended', 'emberling', 0.40, { biome: 'ashvent' }, 'Only where the ground smokes.');
M('emberling', 'cinder', 'brimstone', 0.25, { biome: 'ashvent' }, 'Only where the ground smokes.');
M('gloam', 'foreman', 'umbral', 0.10, { time: 'night' }, 'Only after dark.');
M('umbral', 'gloam', 'eclipse', 0.04, { festival: 'eclipse' }, 'Only when the sun is swallowed.');
M('gloam', 'sovereign', 'glimmer', 0.06, { time: 'night' }, 'Only after dark.');
M('foreman', 'sparing', 'rustwing', 0.06, { biome: 'sunscar' }, 'Only where the sand burns red.');
M('rustwing', 'bogmote', 'copperback', 0.06, { biome: 'saltfen' }, 'Only where boots sink.');
M('copperback', 'sovereign', 'gilt', 0.04);
M('gilt', 'glacier', 'gemcutter', 0.03, { biome: 'rimeback' }, 'Only among the high snows.');
M('meadowmote', 'rimebuzz', 'thawling', 0.10, { festival: 'thaw' }, 'Only on Thaw Night.');
M('dunemote', 'meadowmote', 'sunblaze', 0.10, { festival: 'longday' }, 'Only on the Longest Day.');
M('furrow', 'gloam', 'moonsheaf', 0.10, { festival: 'harvestmoon' }, 'Only under the Harvest Moon.');
M('rimebuzz', 'hearthling', 'frostwick', 0.10, { festival: 'midwinter' }, 'Only at Midwinter.');
M('sovereign', 'paradise', 'verdant', 0.01, { spire: true, season: 'spring', nearGrove: 'lanternfig' },
  'Only in a Hivespire, in spring, beneath the light of a Lanternfig.');

// Groves
M('commonwood', 'paperbark', 'silverleaf', 0.15);
M('needlepine', 'paperbark', 'larchwood', 0.10);
M('silverleaf', 'commonwood', 'blushcherry', 0.10);
M('silverleaf', 'blushcherry', 'sunlemon', 0.06);
M('silverleaf', 'blushcherry', 'ironnut', 0.08);
M('sunlemon', 'blushcherry', 'duskplum', 0.05, { time: 'night' }, 'Only pollinated after dark.');
M('ironnut', 'silverleaf', 'hearthchestnut', 0.10);
M('needlepine', 'larchwood', 'syrupmaple', 0.08);
M('larchwood', 'weepwillow', 'amberpine', 0.08, { biome: 'saltfen' }, 'Only where boots sink.');
M('larchwood', 'syrupmaple', 'spireglass', 0.05);
M('blushcherry', 'tanglewood', 'starapple', 0.06, { biome: 'canopy' }, 'Only under the deep green roof.');
M('frostpine', 'blushcherry', 'frostberry', 0.08);
M('thornpalm', 'charbark', 'emberbark', 0.08, { biome: 'ashvent' }, 'Only where the ground smokes.');
M('tanglewood', 'duskplum', 'nightebony', 0.06);
M('nightebony', 'glowcap', 'lanternfig', 0.04, { biome: 'hollow' }, 'Only in the lightless Hollow.');
M('spireglass', 'lanternfig', 'heartwood', 0.01, { carrier: 'verdant' }, 'Only when the pollen is carried by the Verdant Matriarch herself.');

// Flitters
M('meadowpale', 'ochreskipper', 'copperwing', 0.12);
M('copperwing', 'reedwing', 'jewelwing', 0.10);
M('mossback', 'copperwing', 'silkspinner', 0.10);
M('meadowpale', 'jadetail', 'admiral', 0.08);
M('mossback', 'frostwing', 'hawkmoth', 0.08);
M('jewelwing', 'lanternmoth', 'prismwing', 0.06);
M('prismwing', 'ashmoth', 'ashenmonarch', 0.04, { biome: 'ashvent' }, 'Only where the ground smokes.');
M('prismwing', 'silkspinner', 'dawnwing', 0.01, { festival: 'longday' }, 'Only on the Longest Day.');

export const MUT_INDEX = {};
for (const m of MUTATIONS) {
  const k1 = m.a + '|' + m.b, k2 = m.b + '|' + m.a;
  (MUT_INDEX[k1] ||= []).push(m);
  if (k1 !== k2) (MUT_INDEX[k2] ||= []).push(m);
}
export const MUT_BY_CHILD = {};
for (const m of MUTATIONS) (MUT_BY_CHILD[m.c] ||= []).push(m);

export const KINGDOM_NAMES = { h: 'Hummer', g: 'Grove', f: 'Flitter' };
