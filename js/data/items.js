// Every item in Hollowmere. icon: [shape, colorA, colorB?]
// cat: specimen | comb | hive | grove | flitter | material | goods | frame | module | tool | seed | place

const I = {};
function item(id, name, cat, value, icon, desc = '', extra = {}) {
  I[id] = { id, name, cat, value, icon, desc, ...extra };
}

// Specimens (genetic)
item('heiress', 'Heiress', 'specimen', 0, ['hummer'], 'A young Hummer queen. Pair her with a Courier in a housing to make a Matron.', { kingdom: 'h', stack: 1 });
item('courier', 'Courier', 'specimen', 0, ['hummer'], 'A male Hummer. Mates with an Heiress.', { kingdom: 'h', stack: 99 });
item('matron', 'Matron', 'specimen', 0, ['hummer'], 'A mated queen, carrying her Courier\'s genes. Place her in a housing to work.', { kingdom: 'h', stack: 1 });
item('scion', 'Scion', 'specimen', 0, ['scion'], 'A young tree, ready to plant on open ground.', { kingdom: 'g', stack: 99 });
item('flitter', 'Flitter', 'specimen', 0, ['flitter'], 'A living butterfly or moth. Release it onto a Grove it can host on, or pair two in a Chrysal Cradle.', { kingdom: 'f', stack: 99 });
item('chrysal', 'Chrysal', 'specimen', 0, ['chrysal'], 'A living cocoon. Hatch it in a Chrysal Cradle.', { kingdom: 'f', stack: 99 });

// Combs
item('goldcomb', 'Goldcomb', 'comb', 4, ['comb', '#e8b730', '#a8781a'], 'Plain honeycomb. Spin it in a Combwheel.');
item('regalcomb', 'Regal Comb', 'comb', 8, ['comb', '#f0d080', '#b08a30']);
item('threadcomb', 'Threadcomb', 'comb', 6, ['comb', '#c2b850', '#6a6420']);
item('frostcomb', 'Frostcomb', 'comb', 7, ['comb', '#d8f0ff', '#7aa0c0']);
item('parchcomb', 'Parchcomb', 'comb', 7, ['comb', '#e0b878', '#9a6a30']);
item('silkcomb', 'Silkcomb', 'comb', 8, ['comb', '#e8f0e0', '#80b080']);
item('smouldercomb', 'Smoulder Comb', 'comb', 10, ['comb', '#e06030', '#601a10']);
item('duskcomb', 'Duskcomb', 'comb', 12, ['comb', '#6a5aa8', '#2a2048']);
item('mirecomb', 'Mirecomb', 'comb', 6, ['comb', '#7a9a5a', '#3a4a2a']);
item('graincomb', 'Graincomb', 'comb', 6, ['comb', '#e8cc80', '#a08040']);
item('rustcomb', 'Rustcomb', 'comb', 10, ['comb', '#b0603a', '#5a2a18']);
item('coppercomb', 'Coppercomb', 'comb', 12, ['comb', '#d8884a', '#6a8a6a']);
item('giltcomb', 'Giltcomb', 'comb', 25, ['comb', '#ffe040', '#b08a10']);
item('gemcomb', 'Gemcomb', 'comb', 35, ['comb', '#80f0e0', '#2a8a80']);
item('treatcomb', 'Treat Comb', 'comb', 15, ['comb', '#ff9ac0', '#ffffff']);
item('verdantcomb', 'Verdant Comb', 'comb', 60, ['comb', '#90f0a0', '#f0d060']);

// Hive goods
item('goldmel', 'Goldmel', 'hive', 3, ['jar', '#f0b020'], 'Golden honey in a little jar. Used everywhere.');
item('cerewax', 'Cerewax', 'hive', 3, ['wax', '#f0e0a0'], 'Pale beeswax.');
item('crownmilk', 'Crownmilk', 'hive', 15, ['bottle', '#fff6e0', '#e0c060'], 'Rich royal cream from Sovereign hives.');
item('pollenknot', 'Pollenknot', 'hive', 14, ['knot', '#f8d030'], 'A tight knot of pollen from Foreman hives.');
item('propolis', 'Propolis', 'hive', 4, ['blob', '#a07a30']);
item('phosphor', 'Phosphor', 'hive', 10, ['dust', '#ffb040'], 'Glowing crumbs from Brimstone comb. Burns hot.', { fuel: 60 });
item('ice_shard', 'Ice Shard', 'hive', 5, ['shard', '#c0f0ff']);
item('glass_grit', 'Glass Grit', 'hive', 5, ['dust', '#e8d8b0']);
item('silk_wisp', 'Silk Wisp', 'hive', 6, ['wisp', '#f0f0f0']);
item('void_propolis', 'Void Propolis', 'hive', 20, ['blob', '#3a2a6a']);
item('spore', 'Fen Spores', 'hive', 3, ['dust', '#9a8aaa']);
item('grain', 'Grain', 'hive', 2, ['grain', '#e0c070']);
item('peat', 'Peat', 'hive', 3, ['block', '#4a3a28'], 'Dense fen fuel.', { fuel: 40 });
item('iron_flake', 'Iron Flakes', 'hive', 3, ['flake', '#9a8a80']);
item('copper_flake', 'Copper Flakes', 'hive', 4, ['flake', '#d88a50']);
item('gold_flake', 'Gold Flakes', 'hive', 9, ['flake', '#ffd040']);
item('gem_shard', 'Gem Shard', 'hive', 18, ['shard', '#70f0e0']);
item('sweet', 'Festival Sweet', 'hive', 7, ['candy', '#ff80b0']);
item('heart_pollen', 'Heart Pollen', 'hive', 80, ['dust', '#ffcf6a'], 'Warm golden pollen from the Triad.');
item('crown_coin', 'Crown', 'hive', 1, ['coin', '#ffd040'], 'Worth one Crown.');

// Grove goods
item('timber', 'Timber', 'grove', 2, ['log', '#8a6038', '#c89a60'], 'Felled wood. The start of almost everything.', { fuel: 20 });
item('glasswood', 'Glasswood', 'grove', 12, ['log', '#a8d8e0', '#e8f8ff'], 'Clear as frosted glass.');
item('ember_timber', 'Ember Timber', 'grove', 14, ['log', '#a04020', '#f08040'], 'It will not burn.');
item('dusk_timber', 'Dusk Timber', 'grove', 14, ['log', '#2a2a3a', '#4a4a6a']);
item('heart_timber', 'Heart Timber', 'grove', 60, ['log', '#c08040', '#ffd080']);
item('leaf_litter', 'Leaf Litter', 'grove', 1, ['leaf', '#8a9a40'], 'Fallen leaves. Ferment them or burn them.', { fuel: 6 });
item('heartsap', 'Heartsap', 'grove', 5, ['drop', '#d8902a'], 'Thick amber sap.');
item('amber_resin', 'Amber Resin', 'grove', 4, ['blob', '#f0a020']);
item('crabapple', 'Crabapple', 'grove', 2, ['fruit', '#d04030'], '', { fruit: true });
item('cherry', 'Blushcherry', 'grove', 4, ['cherry', '#c01830'], '', { fruit: true });
item('lemon', 'Sunlemon', 'grove', 5, ['fruit', '#f0e040'], '', { fruit: true });
item('plum', 'Duskplum', 'grove', 6, ['fruit', '#6a2a8a'], '', { fruit: true });
item('walnut', 'Ironnut', 'grove', 5, ['nut', '#8a6a40'], '', { nut: true });
item('chestnut', 'Chestnut', 'grove', 5, ['nut', '#7a4a20'], '', { nut: true });
item('date', 'Thorn Date', 'grove', 4, ['fruit', '#7a4020'], '', { fruit: true });
item('sunfruit', 'Sunfruit', 'grove', 5, ['banana', '#f0d040'], '', { fruit: true });
item('starfruit', 'Starapple', 'grove', 8, ['star', '#f0d050'], '', { fruit: true });
item('frostberry', 'Frostberry', 'grove', 7, ['cherry', '#80c0ff'], '', { fruit: true });
item('lantern_fig', 'Lantern Fig', 'grove', 18, ['fruit', '#ffe080'], 'Glows faintly.', { fruit: true });
item('glowspore', 'Glowspore', 'grove', 6, ['dust', '#b090f0']);

// Flitter goods
item('silk_cocoon', 'Spent Cocoon', 'flitter', 5, ['cocoon', '#f0ece0'], 'An empty cocoon. Unravel it on a Loomframe for Gossamer.');
item('prism_dust', 'Prism Dust', 'flitter', 15, ['dust', '#ff90d0'], 'Shimmering wing scales.');

// Raw materials
item('fiber', 'Fiber', 'material', 1, ['fiber', '#a0b860'], 'Cut from tall grass.');
item('stone', 'Fieldstone', 'material', 1, ['stone', '#9a9a90'], 'Picked from rocks.');

// Processed goods
item('waxed_timber', 'Waxed Timber', 'goods', 7, ['plank', '#c89a50', '#f0e0a0'], 'Timber sealed with Cerewax. Weatherproof.');
item('seed_oil', 'Seed Oil', 'goods', 6, ['bottle', '#e8d070', '#a09030'], 'Pressed from nuts. Every machine needs it.');
item('fruit_juice', 'Fruit Juice', 'goods', 6, ['bottle', '#ff8060', '#c04030']);
item('mulch', 'Mulch', 'goods', 2, ['block', '#5a4a30'], 'Rich soil food. Speeds a grove or bed when applied.');
item('syrup', 'Heartsap Syrup', 'goods', 14, ['bottle', '#c07020', '#803a10']);
item('meadmelt', 'Meadmelt', 'goods', 20, ['mug', '#f0c040'], 'Honey wine. Thistlewick drinks a lot of it.');
item('verdant_mash', 'Verdant Mash', 'goods', 4, ['blob', '#7a9a40']);
item('verdant_spirit', 'Verdant Spirit', 'goods', 12, ['bottle', '#a0f0a0', '#40a060'], 'Clean-burning fuel.', { fuel: 160 });
item('hearthbrandy', 'Hearthbrandy', 'goods', 45, ['bottle', '#c06030', '#602010'], 'Fine spirit. Sells well.');
item('heartsap_tonic', 'Heartsap Tonic', 'goods', 40, ['bottle', '#f0a040', '#fff0c0'], 'Restores a worn Heiress line to pristine.');
item('amberglass', 'Amberglass', 'goods', 18, ['pane', '#f0b040'], 'Warm golden glass.');
item('ember_glass', 'Ember Glass', 'goods', 40, ['pane', '#ff6030'], 'Glass that drinks heat.');
item('gossamer', 'Gossamer', 'goods', 10, ['wisp', '#fff8f0'], 'Soft spun silk.');
item('silkwax_cloth', 'Silkwax Cloth', 'goods', 26, ['cloth', '#f0e8c8', '#c0a860'], 'Waterproof silk cloth.');
item('candle', 'Candle', 'goods', 8, ['candle', '#f0e0a0']);
item('lumen_candle', 'Lumen Candle', 'goods', 30, ['candle', '#ffb0f0']);
item('iron_ingot', 'Iron Ingot', 'goods', 16, ['ingot', '#a0a0a8']);
item('copper_ingot', 'Copper Ingot', 'goods', 20, ['ingot', '#d88850']);
item('gold_ingot', 'Gold Ingot', 'goods', 45, ['ingot', '#ffd040']);
item('gem', 'Cut Gem', 'goods', 70, ['gem', '#60f0e0']);
item('gearset', 'Gearset', 'goods', 30, ['gear', '#b0a080'], 'Iron gears on a waxed frame. Powered machines need them.');
item('prism_ink', 'Prism Ink', 'goods', 25, ['bottle', '#e070ff', '#4020a0']);
item('regal_panel', 'Regal Panel', 'goods', 60, ['plank', '#e8c060', '#fff0c0'], 'Hivespire wall section.');

// Frames (go in Hive Box and Hivespire)
item('plain_frame', 'Plain Frame', 'frame', 6, ['frame', '#a07a48'], 'Production ×1.5. Lasts 40 cycles.', { frame: { prod: 1.5, mut: 1, life: 1, dur: 40 } });
item('waxed_frame', 'Waxed Frame', 'frame', 14, ['frame', '#d8b060'], 'Production ×2. Lasts 80 cycles.', { frame: { prod: 2, mut: 1, life: 1, dur: 80 } });
item('gossamer_frame', 'Gossamer Frame', 'frame', 40, ['frame', '#f0f0f8'], 'Production ×2. Lasts 240 cycles.', { frame: { prod: 2, mut: 1, life: 1, dur: 240 } });
item('catalyst_frame', 'Catalyst Frame', 'frame', 30, ['frame', '#c060ff'], 'Mutation ×2, lifespan ×0.6, production ×0.8. Lasts 30 cycles.', { frame: { prod: 0.8, mut: 2, life: 0.6, dur: 30 } });
item('stilling_frame', 'Stilling Frame', 'frame', 20, ['frame', '#60a0ff'], 'No mutations, lifespan ×0.5. For purifying lines. Lasts 60 cycles.', { frame: { prod: 1, mut: 0, life: 0.5, dur: 60 } });

// Hivespire modules
item('mod_warmer', 'Warmer', 'module', 40, ['module', '#e06030'], 'Hivespire module: one step warmer.', { mod: { temp: 1 } });
item('mod_cooler', 'Cooler', 'module', 40, ['module', '#60c0f0'], 'Hivespire module: one step colder.', { mod: { temp: -1 } });
item('mod_mister', 'Mister', 'module', 40, ['module', '#40a0c0'], 'Hivespire module: one step damper.', { mod: { hum: 1 } });
item('mod_drier', 'Drier', 'module', 40, ['module', '#d0a060'], 'Hivespire module: one step drier.', { mod: { hum: -1 } });
item('mod_steady', 'Steady Heart', 'module', 50, ['module', '#80a0ff'], 'Hivespire module: no mutations.', { mod: { mut: 0 } });
item('mod_pulse', 'Pulse Coil', 'module', 80, ['module', '#c060ff'], 'Hivespire module: mutation ×1.5, lifespan ×0.7.', { mod: { mut: 1.5, life: 0.7 } });
item('mod_lantern', 'Lantern Array', 'module', 70, ['module', '#ffe080'], 'Hivespire module: day workers keep working at night.', { mod: { light: true } });
item('mod_canopy', 'Rain Canopy', 'module', 50, ['module', '#80a080'], 'Hivespire module: works in rain.', { mod: { rain: true } });
item('mod_racks', 'Crown Racks', 'module', 90, ['module', '#ffd040'], 'Hivespire module: production ×1.3.', { mod: { prod: 1.3 } });

// Tools
item('scoop', 'Hive Scoop', 'tool', 5, ['scoop', '#c0a070'], 'Lets you gather wild hives.', { tool: true, stack: 1 });
item('net', 'Flitter Net', 'tool', 5, ['net', '#e0e0d0'], 'Lets you catch wild Flitters.', { tool: true, stack: 1 });
item('axe', 'Woodsman\'s Axe', 'tool', 8, ['axe', '#a0a0a8'], 'Lets you fell Groves for timber.', { tool: true, stack: 1 });
item('grafting_knife', 'Grafting Knife', 'tool', 25, ['knife', '#d0d0d8'], 'Pollinated Groves give two hybrid Scions instead of one.', { tool: true, stack: 1 });
item('lens', 'Warden\'s Lens', 'tool', 15, ['lens', '#c0a050'], 'Reads a specimen\'s Strand for one Goldmel.', { tool: true, stack: 1 });
item('steady_eye', 'Steady Eye', 'tool', 200, ['lens', '#60f0e0'], 'A gem-set Lens. Reads any specimen for free.', { tool: true, stack: 1 });
item('brush_hook', 'Brush Hook', 'tool', 20, ['hook', '#a0a0a8'], 'Cuts through bramble.', { tool: true, stack: 1 });
item('frost_ward', 'Frost Ward', 'tool', 120, ['ward', '#a0e0ff'], 'A chilled cloak. Lets you pass the Scalding Vents.', { tool: true, stack: 1 });
item('ember_lantern', 'Ember Lantern', 'tool', 120, ['lantern', '#ff9040'], 'Lights the way through the Sealed Barrow.', { tool: true, stack: 1 });
item('sun_mirror', 'Sun Mirror', 'tool', 100, ['pane', '#ffe080'], 'Focuses sunlight.', { tool: true, stack: 1 });

// Seeds for flower beds
item('seed_wild', 'Wildflower Seeds', 'seed', 2, ['seed', '#f0d040'], 'Plant in a Flower Bed for Wildflower bloom.', { bloom: 'wild' });
item('seed_fen', 'Reedbloom Seeds', 'seed', 3, ['seed', '#6ab0c8'], 'Plant in a Flower Bed for Reedbloom.', { bloom: 'fen' });
item('seed_desert', 'Cactus Seeds', 'seed', 3, ['seed', '#e08040'], 'Plant in a Flower Bed for Cactus Bloom.', { bloom: 'desert' });
item('seed_frost', 'Frostbell Seeds', 'seed', 4, ['seed', '#c0e8ff'], 'Plant in a Flower Bed for Frostbell.', { bloom: 'frost' });
item('seed_ember', 'Ash Lily Seeds', 'seed', 6, ['seed', '#ff6030'], 'Plant in a Flower Bed for Ash Lily.', { bloom: 'ember' });
item('seed_moon', 'Moonbloom Seeds', 'seed', 8, ['seed', '#b0a0ff'], 'Plant in a Flower Bed for Moonbloom.', { bloom: 'moon' });
item('seed_needle', 'Needlebloom Cones', 'seed', 3, ['seed', '#3a7a4a'], 'Plant in a Flower Bed for Needlebloom.', { bloom: 'needle' });
item('seed_orchard', 'Orchard Blossom Cutting', 'seed', 4, ['seed', '#f0a0c0'], 'Plant in a Flower Bed for Orchard blossom.', { bloom: 'orchard' });

export const ITEMS = I;

export function itemName(stack) {
  const d = I[stack.id];
  return d ? d.name : stack.id;
}
