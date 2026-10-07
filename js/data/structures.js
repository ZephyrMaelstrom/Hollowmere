// Things you can build and place on the map.
// kind: housing | cradle | bed | storage | machine | power | logistics | deco | station

import { ITEMS } from './items.js';

export const STRUCTURES = {
  skep: { name: 'Skep', kind: 'housing', size: [1, 1], desc: 'A woven straw hive. Half output, and no mutations: lines breed true.',
    housing: { prod: 0.5, mut: 0, life: 1, frames: 0, mods: 0, reach: 1 } },
  hivebox: { name: 'Hive Box', kind: 'housing', size: [1, 1], desc: 'A proper wooden hive with three frame slots. Mutations happen here.',
    housing: { prod: 1, mut: 1, life: 1, frames: 3, mods: 0, reach: 1 } },
  hivespire: { name: 'Hivespire', kind: 'housing', size: [2, 2], desc: 'The great Warden hive. Double output, wider reach, three frames and four modules.',
    housing: { prod: 2, mut: 1, life: 1, frames: 3, mods: 4, reach: 1.5 } },
  cradle: { name: 'Chrysal Cradle', kind: 'cradle', size: [1, 1], desc: 'Pair two Flitters to lay Chrysals, or hatch a Chrysal into a Flitter.' },
  flowerbed: { name: 'Flower Bed', kind: 'bed', size: [1, 1], desc: 'Plant seeds to grow a blossom that Hummers can forage.' },
  chest: { name: 'Chest', kind: 'storage', size: [1, 1], desc: 'Holds 24 stacks. Runnels can fill it.', slots: 24 },
  postbox: { name: 'Post Box', kind: 'storage', size: [1, 1], desc: 'Anything put in here is carried to the Homestead Vault.', post: true },
  workbench: { name: 'Workbench', kind: 'station', size: [1, 1], desc: 'Stand near it to craft workbench recipes. Draws from nearby chests too.' },
  combwheel: { name: 'Combwheel', kind: 'machine', size: [1, 1], desc: 'Spins combs into honey, wax and more.', power: 1, hand: 0.25 },
  press: { name: 'Press', kind: 'machine', size: [1, 1], desc: 'Presses fruit, nuts and sap.', power: 1, hand: 0.25 },
  brewvat: { name: 'Brewvat', kind: 'machine', size: [1, 1], desc: 'Ferments sweet things into something stronger.', power: 0.5, hand: 0.25 },
  alembic: { name: 'Alembic', kind: 'machine', size: [1, 1], desc: 'Distils spirits and tonics. Needs power.', power: 2, hand: 0 },
  glassforge: { name: 'Glassforge', kind: 'machine', size: [1, 1], desc: 'Melts grit and resin into Amberglass. Needs power.', power: 3, hand: 0 },
  smeltery: { name: 'Smeltery', kind: 'machine', size: [1, 1], desc: 'Smelts ore flakes into ingots. Needs power.', power: 3, hand: 0 },
  loomframe: { name: 'Loomframe', kind: 'machine', size: [1, 1], desc: 'Unravels cocoons and weaves cloth.', power: 1, hand: 0.25 },
  chandlery: { name: 'Chandlery', kind: 'machine', size: [1, 1], desc: 'Pours candles.', power: 0.5, hand: 0.25 },
  joiner: { name: 'Joiner', kind: 'machine', size: [1, 1], desc: 'Builds frames, panels and gearsets. Needs power.', power: 2, hand: 0 },
  desk: { name: 'Warden\'s Desk', kind: 'station', size: [1, 1], desc: 'Study mutations to raise their odds.' },
  windlass: { name: 'Windlass', kind: 'power', size: [1, 1], desc: 'Crank it by hand to charge the Gearline.', gen: 0, crank: 25 },
  windsail: { name: 'Wind Sail', kind: 'power', size: [1, 1], desc: 'Turns in the breeze. About 1 power per second, more up high.', gen: 1 },
  waterwheel: { name: 'Waterwheel', kind: 'power', size: [1, 1], desc: 'Must touch water. 3 power per second.', gen: 3, water: true },
  bellows: { name: 'Bellows Engine', kind: 'power', size: [1, 1], desc: 'Burns fuel for 6 power per second.', gen: 6, burner: true },
  springcoil: { name: 'Spring Coil', kind: 'power', size: [1, 1], desc: 'Stores 400 power for later.', store: 400 },
  conduit: { name: 'Heartroot Conduit', kind: 'power', size: [1, 1], desc: 'Draws on the wakened Heartroot. 40 power per second.', gen: 40 },
  runnel: { name: 'Runnel', kind: 'logistics', size: [1, 1], desc: 'A waxed chute. Carries items one tile at a time in the direction it faces.', dir: true, floor: true },
  gate: { name: 'Strand Gate', kind: 'logistics', size: [1, 1], desc: 'A runnel that reads what passes. Matching items turn left; the rest go straight on.', dir: true, floor: true },
  groundskeeper: { name: 'Groundskeeper', kind: 'logistics', size: [1, 1], desc: 'Gathers everything Groves, beds and Cradles nearby have dropped. Pushes it into runnels or keeps it.', power: 0.5, radius: 4 },
  lamppost: { name: 'Lamp Post', kind: 'deco', size: [1, 1], desc: 'Lights the night. Day-working hives nearby keep working after dark.', light: 3 },
  path: { name: 'Stone Path', kind: 'deco', size: [1, 1], desc: 'Walk a little faster.', floor: true },
  fence: { name: 'Fence', kind: 'deco', size: [1, 1], desc: 'Keeps things tidy.' },
  hedge: { name: 'Hedge', kind: 'deco', size: [1, 1], desc: 'A neat clipped hedge.' },
  banner: { name: 'Guild Banner', kind: 'deco', size: [1, 1], desc: 'The green and gold of the Wardens.' },
};

// Every structure is also an item you carry and place.
for (const [id, s] of Object.entries(STRUCTURES)) {
  if (!ITEMS[id]) ITEMS[id] = { id, name: s.name, cat: 'place', value: 0, icon: ['struct', id], desc: s.desc, place: id };
}
