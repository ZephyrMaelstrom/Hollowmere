// Crafting (hand / workbench) and machine recipes.
// Inputs may use tags: '#fruit', '#nut'.

export const CRAFT = [];
// station: 'hand' (anywhere) | 'bench' (near a Workbench). bp: blueprint needed (null = known from the start).
function C(out, n, inputs, station = 'bench', bp = null) { CRAFT.push({ id: out + (CRAFT.filter((r) => r.out === out).length || ''), out, n, in: inputs, station, bp }); }

// Starting knowledge
C('workbench', 1, { timber: 8 }, 'hand');
C('plain_frame', 1, { timber: 2, fiber: 2 }, 'hand');
C('path', 4, { stone: 2 }, 'hand');
C('fence', 2, { timber: 1 }, 'hand');
C('hedge', 1, { leaf_litter: 4, fiber: 2 }, 'hand');
C('flowerbed', 1, { stone: 2, fiber: 2 }, 'hand');
C('skep', 1, { fiber: 8, timber: 1 });
C('waxed_timber', 1, { timber: 1, cerewax: 1 });
C('hivebox', 1, { waxed_timber: 4, cerewax: 2 });
C('brush_hook', 1, { timber: 2, stone: 3, cerewax: 1 });
C('combwheel', 1, { timber: 6, stone: 4 });
C('press', 1, { timber: 6, stone: 6 });
C('chest', 1, { timber: 6 });
C('cradle', 1, { waxed_timber: 3, fiber: 6, goldmel: 2 });
C('windlass', 1, { timber: 6, stone: 4, fiber: 4 });

// Blueprints (bought from Fennick or earned)
C('waxed_frame', 1, { waxed_timber: 2, cerewax: 2 }, 'bench', 'waxed_frame');
C('stilling_frame', 1, { plain_frame: 1, ice_shard: 3 }, 'bench', 'stilling_frame');
C('catalyst_frame', 1, { waxed_frame: 1, propolis: 4, pollenknot: 1 }, 'bench', 'catalyst_frame');
C('gossamer_frame', 1, { waxed_frame: 1, gossamer: 3 }, 'bench', 'gossamer_frame');
C('postbox', 1, { waxed_timber: 3, stone: 2 }, 'bench', 'postbox');
C('windsail', 1, { waxed_timber: 4, fiber: 10, stone: 4 }, 'bench', 'windsail');
C('waterwheel', 1, { waxed_timber: 8, stone: 6 }, 'bench', 'waterwheel');
C('runnel', 4, { waxed_timber: 1, cerewax: 1 }, 'bench', 'runnel');
C('brewvat', 1, { waxed_timber: 6, stone: 4 }, 'bench', 'brewvat');
C('loomframe', 1, { waxed_timber: 6, fiber: 8 }, 'bench', 'loomframe');
C('chandlery', 1, { stone: 6, waxed_timber: 2, cerewax: 4 }, 'bench', 'chandlery');
C('desk', 1, { waxed_timber: 4, candle: 2, goldmel: 4 }, 'bench', 'desk');
C('lamppost', 1, { stone: 2, candle: 1, timber: 1 }, 'bench', 'lamppost');
C('glassforge', 1, { stone: 16, waxed_timber: 4, propolis: 4 }, 'bench', 'glassforge');
C('smeltery', 1, { stone: 20, amberglass: 2, waxed_timber: 4 }, 'bench', 'smeltery');
C('alembic', 1, { amberglass: 4, iron_ingot: 2, waxed_timber: 4 }, 'bench', 'alembic');
C('joiner', 1, { iron_ingot: 4, waxed_timber: 6, seed_oil: 2 }, 'bench', 'joiner');
C('gearset', 1, { iron_ingot: 2, waxed_timber: 1, seed_oil: 1 }, 'bench', 'joiner');
C('springcoil', 1, { iron_ingot: 2, copper_ingot: 2, waxed_timber: 2 }, 'bench', 'springcoil');
C('bellows', 1, { stone: 12, waxed_timber: 4, iron_ingot: 2 }, 'bench', 'bellows');
C('gate', 1, { runnel: 1, amberglass: 1, propolis: 2 }, 'bench', 'gate');
C('groundskeeper', 1, { waxed_timber: 4, gearset: 1, fiber: 6 }, 'bench', 'groundskeeper');
C('grafting_knife', 1, { iron_ingot: 1, timber: 1 }, 'bench', 'grafting_knife');
C('banner', 1, { silkwax_cloth: 1, timber: 2 }, 'bench', 'banner');
C('hivespire', 1, { regal_panel: 4, amberglass: 4, gearset: 2 }, 'bench', 'hivespire');
C('mod_warmer', 1, { amberglass: 2, peat: 6, copper_ingot: 1, gearset: 1 }, 'bench', 'modules');
C('mod_cooler', 1, { amberglass: 2, ice_shard: 6, copper_ingot: 1, gearset: 1 }, 'bench', 'modules');
C('mod_mister', 1, { amberglass: 2, spore: 6, copper_ingot: 1, gearset: 1 }, 'bench', 'modules');
C('mod_drier', 1, { amberglass: 2, glass_grit: 6, copper_ingot: 1, gearset: 1 }, 'bench', 'modules');
C('mod_canopy', 1, { silkwax_cloth: 3, waxed_timber: 2 }, 'bench', 'modules');
C('mod_steady', 1, { gearset: 1, ice_shard: 4, crownmilk: 2 }, 'bench', 'modules2');
C('mod_lantern', 1, { lumen_candle: 4, glasswood: 2, gearset: 1 }, 'bench', 'modules2');
C('mod_pulse', 1, { gearset: 2, void_propolis: 2, amberglass: 2 }, 'bench', 'modules2');
C('mod_racks', 1, { gold_ingot: 2, regal_panel: 1, gearset: 1 }, 'bench', 'modules2');
C('frost_ward', 1, { silkwax_cloth: 3, ice_shard: 16 }, 'bench', 'frost_ward');
C('ember_lantern', 1, { ember_glass: 2, iron_ingot: 2, candle: 2 }, 'bench', 'ember_lantern');
C('steady_eye', 1, { gem: 2, gold_ingot: 1, lens: 1 }, 'bench', 'steady_eye');
C('conduit', 1, { heart_pollen: 3, heart_timber: 2, glasswood: 4, gearset: 2 }, 'bench', 'conduit');
C('lamppost', 2, { lantern_fig: 2, glasswood: 1, stone: 2 }, 'bench', 'lamppost');

// Machine recipes. out: [item, n, chance]
export const MACHINE = {
  combwheel: [], press: [], brewvat: [], alembic: [], glassforge: [], smeltery: [], loomframe: [], chandlery: [], joiner: [],
};
function R(machine, inputs, out, time, bp = null) { MACHINE[machine].push({ id: machine + MACHINE[machine].length, machine, in: inputs, out, time, bp }); }

// Combwheel: one comb each
R('combwheel', { goldcomb: 1 }, [['cerewax', 1, 1], ['goldmel', 1, 0.9]], 5);
R('combwheel', { regalcomb: 1 }, [['goldmel', 2, 1], ['cerewax', 1, 0.5]], 5);
R('combwheel', { threadcomb: 1 }, [['propolis', 1, 1], ['goldmel', 1, 0.5]], 5);
R('combwheel', { frostcomb: 1 }, [['cerewax', 1, 0.8], ['goldmel', 1, 0.7], ['ice_shard', 1, 0.5]], 5);
R('combwheel', { parchcomb: 1 }, [['cerewax', 1, 1], ['glass_grit', 1, 0.6]], 5);
R('combwheel', { silkcomb: 1 }, [['goldmel', 1, 0.6], ['silk_wisp', 1, 0.8]], 5);
R('combwheel', { smouldercomb: 1 }, [['phosphor', 1, 0.6], ['cerewax', 1, 0.5]], 6);
R('combwheel', { duskcomb: 1 }, [['goldmel', 1, 0.6], ['void_propolis', 1, 0.35]], 6);
R('combwheel', { mirecomb: 1 }, [['cerewax', 1, 0.8], ['spore', 1, 0.6], ['peat', 1, 0.2]], 5);
R('combwheel', { graincomb: 1 }, [['cerewax', 1, 0.8], ['grain', 2, 0.7]], 5);
R('combwheel', { rustcomb: 1 }, [['iron_flake', 2, 1], ['cerewax', 1, 0.3]], 6);
R('combwheel', { coppercomb: 1 }, [['copper_flake', 2, 1], ['cerewax', 1, 0.3]], 6);
R('combwheel', { giltcomb: 1 }, [['gold_flake', 2, 1]], 6);
R('combwheel', { gemcomb: 1 }, [['gem_shard', 1, 0.7]], 7);
R('combwheel', { treatcomb: 1 }, [['goldmel', 1, 1], ['sweet', 1, 1]], 5);
R('combwheel', { verdantcomb: 1 }, [['goldmel', 2, 1], ['crownmilk', 1, 0.5], ['heart_pollen', 1, 0.15]], 8);

R('press', { '#fruit': 2 }, [['fruit_juice', 1, 1]], 5);
R('press', { '#nut': 2 }, [['seed_oil', 1, 1]], 6);
R('press', { heartsap: 3 }, [['syrup', 1, 1]], 6);
R('press', { leaf_litter: 4 }, [['mulch', 1, 1]], 4);

R('brewvat', { goldmel: 2, fruit_juice: 1 }, [['meadmelt', 1, 1]], 20, 'brewvat');
R('brewvat', { leaf_litter: 4, goldmel: 1 }, [['verdant_mash', 2, 1]], 15, 'brewvat');
R('brewvat', { grain: 4, goldmel: 1 }, [['verdant_mash', 3, 1]], 15, 'brewvat');

R('alembic', { verdant_mash: 2 }, [['verdant_spirit', 1, 1]], 12);
R('alembic', { meadmelt: 2 }, [['hearthbrandy', 1, 1]], 25);
R('alembic', { heartsap: 3, crownmilk: 1 }, [['heartsap_tonic', 1, 1]], 30);

R('glassforge', { glass_grit: 2, amber_resin: 1 }, [['amberglass', 1, 1]], 10);
R('glassforge', { amberglass: 1, phosphor: 2 }, [['ember_glass', 1, 1]], 16);

R('smeltery', { iron_flake: 4 }, [['iron_ingot', 1, 1]], 10);
R('smeltery', { copper_flake: 4 }, [['copper_ingot', 1, 1]], 10);
R('smeltery', { gold_flake: 4 }, [['gold_ingot', 1, 1]], 12);
R('smeltery', { gem_shard: 3 }, [['gem', 1, 1]], 20);

R('loomframe', { silk_cocoon: 1 }, [['gossamer', 1, 1]], 6);
R('loomframe', { silk_wisp: 3 }, [['gossamer', 1, 1]], 6);
R('loomframe', { gossamer: 2, cerewax: 1 }, [['silkwax_cloth', 1, 1]], 12);

R('chandlery', { cerewax: 2 }, [['candle', 1, 1]], 6);
R('chandlery', { cerewax: 2, prism_dust: 1 }, [['lumen_candle', 1, 1]], 10);
R('chandlery', { cerewax: 1, glowspore: 3 }, [['lumen_candle', 1, 1]], 10);

R('joiner', { timber: 1, cerewax: 1 }, [['waxed_timber', 1, 1]], 3);
R('joiner', { waxed_timber: 2, cerewax: 2 }, [['waxed_frame', 1, 1]], 6);
R('joiner', { iron_ingot: 2, waxed_timber: 1, seed_oil: 1 }, [['gearset', 1, 1]], 8);
R('joiner', { waxed_timber: 2, crownmilk: 3, pollenknot: 3 }, [['regal_panel', 1, 1]], 20);
R('joiner', { prism_dust: 2, heartsap: 1 }, [['prism_ink', 1, 1]], 8);

export const MACHINE_RECIPES = Object.values(MACHINE).flat();

// Blueprints sold by Fennick. rank: Guild rank needed to buy.
export const BLUEPRINTS = {
  windsail: { name: 'Wind Sail', price: 80, rank: 0 },
  waxed_frame: { name: 'Waxed Frame', price: 40, rank: 0 },
  postbox: { name: 'Post Box', price: 60, rank: 0 },
  lamppost: { name: 'Lamp Post', price: 40, rank: 0 },
  runnel: { name: 'Runnels', price: 120, rank: 1 },
  brewvat: { name: 'Brewvat', price: 100, rank: 1 },
  loomframe: { name: 'Loomframe', price: 100, rank: 1 },
  chandlery: { name: 'Chandlery', price: 80, rank: 1 },
  desk: { name: 'Warden\'s Desk', price: 60, rank: 1 },
  waterwheel: { name: 'Waterwheel', price: 150, rank: 1 },
  stilling_frame: { name: 'Stilling Frame', price: 80, rank: 1 },
  glassforge: { name: 'Glassforge', price: 200, rank: 1 },
  catalyst_frame: { name: 'Catalyst Frame', price: 150, rank: 2 },
  smeltery: { name: 'Smeltery', price: 250, rank: 2 },
  springcoil: { name: 'Spring Coil', price: 120, rank: 2 },
  grafting_knife: { name: 'Grafting Knife', price: 120, rank: 2 },
  alembic: { name: 'Alembic', price: 300, rank: 2 },
  joiner: { name: 'Joiner and Gearsets', price: 300, rank: 2 },
  bellows: { name: 'Bellows Engine', price: 200, rank: 2 },
  gate: { name: 'Strand Gate', price: 250, rank: 2 },
  groundskeeper: { name: 'Groundskeeper', price: 300, rank: 2 },
  banner: { name: 'Guild Banner', price: 50, rank: 2 },
  modules: { name: 'Climate Modules', price: 400, rank: 3 },
  gossamer_frame: { name: 'Gossamer Frame', price: 250, rank: 3 },
  frost_ward: { name: 'Frost Ward', price: 300, rank: 3 },
  modules2: { name: 'Advanced Modules', price: 600, rank: 3 },
  ember_lantern: { name: 'Ember Lantern', price: 300, rank: 3 },
  steady_eye: { name: 'Steady Eye', price: 500, rank: 3 },
};
