// One-time hints that explain a mechanic the first time it matters.
import { STRUCTURES } from './data/structures.js';
import { SPECIES } from './data/species.js';
import * as T from './time.js';

export function bindTips(game, ui, story) {
  const tip = (id, title, text) => ui.tip(id, title, text);
  game.on('placed', (e) => {
    if (e.s === 'skep') tip('skep', 'A Skep', 'Open it and put in an Heiress and a Courier. They pair into a Matron who works until she dies, then leaves a new Heiress and Couriers in the output. Skeps never mutate.');
    if (e.s === 'hivebox') tip('hivebox', 'Hive Box', 'Unlike a Skep, a Hive Box lets the Strand shift: crossing two different species can give a new one. Load a whole stack of Couriers and each new Matron takes the next one.');
    if (STRUCTURES[e.s].kind === 'machine') tip('machine', 'Machines', 'Drop ingredients in and it works on its own. With no power, early machines run slowly by hand: press Crank to speed them up. A Windlass or Wind Sail powers them properly.');
    if (e.s === 'runnel' || e.s === 'gate') tip('runnel', 'Runnels', 'A Runnel carries items the way it faces. Point one away from a hive or machine and it fills with output; point one into a machine, chest or hive and it delivers. Press R (or Turn) to rotate before placing.');
    if (e.s === 'flowerbed') tip('bed', 'Flower Beds', 'Plant seeds to grow a blossom. Hummers only work with their own blossom within reach, so a bed beside a hive keeps it busy anywhere.');
  });
  game.on('mated', () => tip('mated', 'Your first Matron', 'She works every 20 seconds while conditions suit her: her climate, her blossom nearby, daylight (or night for night workers) and dry weather. The hive panel shows exactly why she might be resting.'));
  game.on('birth', () => tip('birth', 'A new generation', 'The old Matron left an Heiress and some Couriers. Read their Strand with your Lens to see all twelve Threads. "Keep the line going" loads the next pair for you.'));
  game.on('codex', ({ sp, stage, prev }) => {
    if (stage >= 3 && prev < 3 && SPECIES[sp].k === 'h' && !SPECIES[sp].wild) tip('mutation', 'A new species', `You bred a ${SPECIES[sp].name}! Breed it with itself in a Skep to make a purebred line, or cross it again in a Hive Box. The Codex shows every crossing you know.`);
    if (stage >= 3 && prev < 3 && SPECIES[sp].k === 'g' && !SPECIES[sp].wild) tip('grovemut', 'A new tree', 'Pollen carried between two different trees can give a hybrid Scion. Plant it and see what grows.');
  });
  game.on('matured', (e) => { if (!e.wild) tip('matured', 'A mature Grove', 'It now blossoms, fruits and drops Scions now and then. Gather from it with E. Hummers and Flitters carry its pollen to other trees nearby.'); });
  game.on('gate', () => tip('gate', 'A new region', 'Each region has its own climate, wild hives, trees and Flitters. Species from here may not work at home: check their climate in the Codex.'));
  game.on('rank', () => tip('rank', 'Guild rank', 'A higher rank opens new passes and lets Fennick sell you better blueprints.'));
  let checkT = 0;
  return (dt) => {
    checkT += dt;
    if (checkT < 1) return;
    checkT = 0;
    const s = game.state;
    if (!s.intro) return;
    const p = s.player;
    const region = game.regionAt(p.x, p.y);
    if (T.isNight(game.now) && region !== 'hollow') tip('night', 'Night falls', 'Most hummers rest at night, and day Flitters sleep. Dusk-moths come out. A day lasts twenty minutes, so morning is never far off.');
    if (T.rainingIn(game.now, region)) tip('rain', 'Rain', 'Fair-weather hummers shelter from rain. Rainproof species keep working, and so does anything near a Stormcaller hive.');
    const [vx, vy] = game.world.poi.village;
    if (Math.hypot(p.x - vx, p.y - vy) < 8) tip('village', 'Thistlewick', 'Marra buys and sells at the market. Fennick sells blueprints. Wren pins fresh orders on the board every morning, and Hettie at the well tells you one crossing a day.');
    if (s.inv.every(Boolean)) tip('full', 'A full bag', 'When your bag is full, new things go to the Vault in your Homestead. Chests and a Post Box help too.');
    if (story.basketReady() && s.daily.basketDay >= 0) tip('basket', 'The morning basket', 'Every day a basket of supplies waits on your Homestead porch. Collect it from the Homestead or the Journal. Days in a row add up.');
    for (const e of game.lists().housings) {
      if (e.status && e.status.startsWith('No ')) { tip('nobloom', 'Missing blossom', `A hive is idle: "${e.status}". Plant the right seeds in a Flower Bed next to it, or move the hive.`); break; }
      if (e.status && e.status.startsWith('Too ')) { tip('climate', 'Wrong climate', `A hive is idle: "${e.status}". Every species has a home climate it was born to. Breed tolerance into the line, or keep it in a region that suits it.`); break; }
    }
    if (game.lists().groves.some((g) => g.pol && !g.wild)) tip('pollen', 'Pollinated', 'Pale blossom on a tree means it has been pollinated. Soon a Scion with both parents\' genes drops into it.');
  };
}
