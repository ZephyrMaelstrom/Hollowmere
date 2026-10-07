// What happens when the player touches something.
import { DECOR } from './sprites.js';
import { STRUCTURES } from './data/structures.js';
import { ITEMS } from './data/items.js';
import { SPECIES } from './data/species.js';
import { BIOMES, GATES } from './data/biomes.js';
import { wildGenome, val, trait, species } from './genetics.js';
import { mk, mkSpecimen, countIn, removeFrom, totalItems, cloneStack } from './inv.js';
import { WILD_HIVE, BIOME_SEED } from './game.js';
import { randi, chance, pick } from './util.js';
import { TILE } from './sprites.js';

export const REACH = 2.3;

export class Actions {
  constructor(game, sim) { this.game = game; this.sim = sim; }

  inReach(x, y, w = 1, h = 1) {
    const p = this.game.state.player;
    const cx = Math.max(x, Math.min(p.x, x + w)), cy = Math.max(y, Math.min(p.y, y + h));
    return Math.hypot(cx - p.x, cy - p.y) <= REACH;
  }

  // What would a tap on this tile do? Returns {kind, label, ...} or null.
  targetAt(tx, ty) {
    const g = this.game;
    const npc = g.npcs.find((n) => Math.abs(n.x - (tx + 0.5)) < 0.8 && Math.abs(n.y - 0.3 - (ty + 0.5)) < 0.9);
    if (npc) return { kind: 'npc', npc, label: 'Talk', x: npc.x - 0.5, y: npc.y - 0.5 };
    const f = g.fixtureAt(tx, ty);
    if (f) return { kind: 'fixture', f, label: this.fixtureLabel(f), x: f.x, y: f.y, w: f.w, h: f.h };
    const e = g.entAt(tx, ty);
    if (e) {
      if (e.t === 'w') return e.gone ? null : { kind: 'wildhive', e, label: 'Scoop hive', x: e.x, y: e.y };
      if (e.t === 'g') return { kind: 'grove', e, label: e.buf && e.buf.length ? 'Harvest' : 'Inspect', x: e.x, y: e.y };
      const [w, h] = STRUCTURES[e.s].size;
      return { kind: 'struct', e, label: 'Open ' + STRUCTURES[e.s].name, x: e.x, y: e.y, w, h };
    }
    const fl = g.floorAt(tx, ty);
    if (fl) return { kind: 'struct', e: fl, label: fl.s === 'path' ? 'Path' : 'Open ' + STRUCTURES[fl.s].name, x: fl.x, y: fl.y };
    const d = g.world.decor[ty * g.world.W + tx];
    if (d) return { kind: 'decor', d, label: DECOR_LABEL[d] || 'Gather', x: tx, y: ty };
    return null;
  }

  fixtureLabel(f) {
    switch (f.kind) {
      case 'building': return f.b.kind === 'house' ? 'Enter Homestead' : f.b.name;
      case 'board': return 'Order board';
      case 'well': return 'Well';
      case 'cairn': return 'Read cairn';
      case 'boat': return 'Ferry';
      case 'heartroot': return 'The Heartroot';
      case 'gate': return f.gate.name;
    }
    return '';
  }

  // Perform the default action for a target.
  use(tg) {
    const g = this.game;
    if (!tg) return;
    switch (tg.kind) {
      case 'npc': g.emit('talk', tg.npc.id); return;
      case 'fixture': return this.useFixture(tg.f);
      case 'wildhive': return this.scoop(tg.e);
      case 'grove': return this.useGrove(tg.e);
      case 'struct': if (tg.e.s !== 'path') g.emit('open', { type: 'struct', e: tg.e }); return;
      case 'decor': return this.gather(tg.x, tg.y, tg.d);
    }
  }

  useFixture(f) {
    const g = this.game;
    switch (f.kind) {
      case 'building':
        if (f.b.kind === 'house') g.emit('open', { type: 'home' });
        else if (f.b.npc) g.emit('talk', f.b.npc);
        else g.toast('Nobody answers. Smells of baking.', 'info');
        return;
      case 'board': g.emit('open', { type: 'orders' }); return;
      case 'well': g.emit('talk', 'hettie'); return;
      case 'cairn': return this.readCairn(f);
      case 'boat': return this.ferry(f);
      case 'heartroot': g.emit('open', { type: 'heartroot' }); return;
      case 'gate': g.emit('open', { type: 'gate', f }); return;
    }
  }

  readCairn(f) {
    const g = this.game;
    const key = f.region + ':' + f.idx;
    const first = !g.state.lore[key];
    g.state.lore[key] = true;
    if (first) { g.addRenown(5); g.stat('lore'); }
    g.emit('open', { type: 'lore', region: f.region, idx: f.idx, first });
  }

  ferry(f) {
    const g = this.game, s = g.state;
    if (!s.ferry) {
      g.emit('open', { type: 'ferry' });
      return;
    }
    if (f.to === 'isle') { s.player.x = 64.5; s.player.y = 61.3; g.toast('The ferry glides across the still lake.', 'info'); }
    else { s.player.x = 64.5; s.player.y = 77.6; g.toast('Back to the Meadowfold shore.', 'info'); }
    g.emit('teleport');
  }

  repairFerry() {
    const g = this.game, s = g.state;
    if (countIn(s.inv, 'waxed_timber') < 12 || countIn(s.inv, 'silkwax_cloth') < 3) { g.toast('You need 12 Waxed Timber and 3 Silkwax Cloth.', 'warn'); return false; }
    removeFrom(s.inv, 'waxed_timber', 12); removeFrom(s.inv, 'silkwax_cloth', 3);
    s.ferry = true;
    g.toast('The old Warden ferry floats again.', 'good');
    g.emit('inv');
    return true;
  }

  openGate(gt) {
    const g = this.game, s = g.state, n = gt.need;
    const miss = this.gateMissing(gt);
    if (miss.length) { g.toast('Still needed: ' + miss.join(', '), 'warn'); return false; }
    if (n.crowns) s.crowns -= n.crowns;
    if (n.items && !n.keep) for (const [id, k] of Object.entries(n.items)) removeFrom(s.inv, id, k);
    s.gates[gt.id] = true;
    g.buildFixtures();
    g.toast(`${gt.name}: the way to ${BIOMES[gt.b].name} is open`, 'good');
    g.stat('gates');
    g.emit('gate', gt.id);
    g.emit('inv');
    return true;
  }
  gateMissing(gt) {
    const g = this.game, s = g.state, n = gt.need, miss = [];
    if (n.rank && s.rank < n.rank) miss.push(['Keeper', 'Tender', 'Grower', 'Warden'][n.rank] + ' rank');
    if (n.crowns && s.crowns < n.crowns) miss.push(`${n.crowns} Crowns`);
    if (n.items) for (const [id, k] of Object.entries(n.items)) if (countIn(s.inv, id) < k) miss.push(`${k} ${ITEMS[id].name}`);
    return miss;
  }

  scoop(e) {
    const g = this.game;
    if (!g.hasTool('scoop')) { g.toast('You need a Hive Scoop.', 'warn'); return; }
    const sp = e.sp;
    const gen = () => wildGenome(sp);
    const pristine = Math.random() < 0.78;
    g.give(mkSpecimen('heiress', gen(), { pristine }));
    const nC = randi(1, 3);
    for (let i = 0; i < nC; i++) g.give(mkSpecimen('courier', gen()));
    const combs = randi(0, 2);
    if (combs) g.give(mk(SPECIES[sp].products[0][0], combs));
    e.gone = g.now + 3 * 3600 * 1000;
    g.stat('hivesScooped');
    g.codexMark(sp, 1);
    g.toast(`Scooped a wild ${SPECIES[sp].name} hive: an Heiress${pristine ? '' : ' (worn)'} and ${nC} Courier${nC > 1 ? 's' : ''}${combs ? `, ${combs} comb` : ''}`, 'good', { sp });
    g.emit('sfx', 'scoop');
  }

  useGrove(e) {
    const g = this.game;
    const held = g.state.inv[g.state.hot];
    if (held && held.id === 'flitter') { this.release(e, held); return; }
    if (held && held.id === 'mulch') { this.mulch(e); return; }
    if (e.buf && e.buf.length) { this.harvest(e); return; }
    g.emit('open', { type: 'grove', e });
  }

  harvest(e) {
    const g = this.game;
    let n = 0;
    while (e.buf.length) { const s = e.buf.shift(); n += s.n; g.give(s, false); }
    if (n) { g.toast(`Gathered ${n} item${n > 1 ? 's' : ''} from the ${SPECIES[e.sp].name}`, 'good'); g.emit('sfx', 'pick'); }
    g.emit('inv');
  }

  mulch(e) {
    const g = this.game;
    removeFrom(g.state.inv, 'mulch', 1);
    e.mulch = Math.max(e.mulch || 0, g.now) + 5 * 60 * 1000;
    g.toast('Mulched: grows twice as fast for 5 minutes', 'good');
    g.emit('inv');
  }

  release(e, held) {
    const g = this.game, s = g.state;
    if (e.growth < 1) { g.toast('Flitters only settle on mature Groves.', 'warn'); return; }
    if (e.colony) { g.toast('A colony already lives here.', 'warn'); return; }
    const fb = val(held.g, 'bloom'), gb = val(e.g, 'bloom');
    if (fb !== gb) { g.toast(`This ${SPECIES[held.sp].name} hosts on ${trait(held.g, 'bloom').name} trees. ${SPECIES[e.sp].name} has ${trait(e.g, 'bloom').name}.`, 'warn'); return; }
    e.colony = { g: held.g, sp: held.sp, life: Math.max(2, Math.round(val(held.g, 'span') / 2)), cyc: 0, active: true };
    held.n -= 1;
    if (held.n <= 0) s.inv[s.hot] = null;
    g.stat('coloniesReleased');
    g.toast(`The ${SPECIES[e.colony.sp].name} settles into the ${SPECIES[e.sp].name}.`, 'good', { sp: e.colony.sp });
    g.emit('inv');
  }

  fell(e) {
    const g = this.game;
    if (!g.hasTool('axe')) { g.toast('You need an axe.', 'warn'); return; }
    const sp = SPECIES[e.sp];
    const timber = sp.extra.timber || 'timber';
    const st = val(e.g, 'stature');
    const n = e.growth >= 1 ? Math.round(3 * st + randi(0, 2)) : 1;
    g.give(mk(timber, n));
    if (timber !== 'timber') g.give(mk('timber', 2));
    if (e.growth >= 1) g.give(mk('leaf_litter', randi(1, 3)));
    if (e.growth >= 1 && Math.random() < 0.6) g.give(mkSpecimen('scion', e.g));
    for (const b of e.buf || []) g.give(b, false);
    if (e.colony) g.give(mkSpecimen('flitter', e.colony.g));
    g.stat('felled');
    if (e.wild) { e.stump = g.now + 2 * 3600 * 1000; e.growth = 0; e.buf = []; e.colony = null; e.pol = null; g.bloomDirty = true; }
    else g.removeEnt(e);
    g.toast(`Felled: +${n} ${ITEMS[timber].name}`, 'good');
    g.emit('sfx', 'chop');
    g.emit('inv');
  }

  gather(x, y, d) {
    const g = this.game, w = g.world;
    const i = y * w.W + x;
    const biome = g.regionAt(x, y);
    const get = [];
    let respawn = 3600e3;
    switch (d) {
      case DECOR.TALLGRASS: get.push(mk('fiber', randi(1, 2))); if (chance(0.12)) get.push(mk(BIOME_SEED[biome] || 'seed_wild', 1)); respawn = 40 * 60e3; break;
      case DECOR.FLOWER: get.push(mk(BIOME_SEED[biome] || 'seed_wild', chance(0.35) ? 2 : 1)); respawn = 90 * 60e3; break;
      case DECOR.ROCK: get.push(mk('stone', randi(2, 3))); if (biome === 'sunscar' && chance(0.15)) get.push(mk('iron_flake', 1)); respawn = 3 * 3600e3; break;
      case DECOR.BUSH: get.push(mk('leaf_litter', randi(1, 2)), mk('fiber', 1)); respawn = 2 * 3600e3; break;
      case DECOR.REEDS: get.push(mk('fiber', 2)); if (chance(0.15)) get.push(mk('seed_fen', 1)); respawn = 40 * 60e3; break;
      case DECOR.CACTUS: if (!g.hasTool('axe')) { g.toast('Too spiny to pull up by hand.', 'warn'); return; } get.push(mk('fiber', 2)); if (chance(0.4)) get.push(mk('seed_desert', 1)); respawn = 3 * 3600e3; break;
      case DECOR.CRYSTAL: get.push(mk('stone', 1)); if (chance(0.25)) get.push(mk('glass_grit', 1)); if (chance(0.06)) get.push(mk('gem_shard', 1)); respawn = 4 * 3600e3; break;
      case DECOR.SHROOM: get.push(mk(biome === 'hollow' ? 'glowspore' : 'spore', 1)); respawn = 90 * 60e3; break;
      case DECOR.DRIFT: get.push(mk('ice_shard', 1)); respawn = 2 * 3600e3; break;
      case DECOR.BONES: g.toast('Old bones. Best left alone.', 'info'); return;
      default: return;
    }
    w.decor[i] = 0;
    g.state.decorGone[i] = g.now + respawn;
    g.emit('tileChanged', { x, y });
    g.bloomDirty = true;
    for (const s of get) g.give(s, false);
    g.toast(get.map((s) => `+${s.n} ${ITEMS[s.id].name}`).join(', '), 'good');
    g.emit('sfx', 'pick');
    g.emit('inv');
  }

  catchFlitter(f) {
    const g = this.game;
    if (!g.hasTool('net')) { g.toast('You need a Flitter Net.', 'warn'); return false; }
    g.give(mkSpecimen('flitter', f.genome));
    g.codexMark(f.sp, 1);
    g.stat('flittersCaught');
    g.toast(`Caught a ${SPECIES[f.sp].name}!`, 'good', { sp: f.sp });
    g.emit('sfx', 'net');
    return true;
  }

  // Use the held item on a tile (place / plant).
  useHeld(tx, ty, dir = 0) {
    const g = this.game, s = g.state;
    const held = s.inv[s.hot];
    if (!held) return false;
    const def = ITEMS[held.id];
    if (def.place) {
      const why = g.canPlace(def.place, tx, ty);
      if (why) { g.toast(why, 'warn'); return true; }
      const e = g.placeStructure(def.place, tx, ty, dir);
      if (e) {
        held.n -= 1; if (held.n <= 0) s.inv[s.hot] = null;
        g.emit('sfx', 'place');
        g.emit('inv');
      }
      return true;
    }
    if (held.id === 'scion') {
      if (!this.plantable(tx, ty)) { g.toast('Scions need open ground.', 'warn'); return true; }
      const e = g.addEnt({ t: 'g', x: tx, y: ty, g: held.g, sp: held.sp, growth: 0, wild: false, buf: [], cyc: 0 });
      const i = ty * g.world.W + tx;
      if (g.world.decor[i]) { g.world.decor[i] = 0; g.state.decorGone[i] = 1e15; g.emit('tileChanged', { x: tx, y: ty }); }
      held.n -= 1; if (held.n <= 0) s.inv[s.hot] = null;
      g.stat('scionsPlanted');
      g.toast(`Planted a ${SPECIES[e.sp].name}`, 'good', { sp: e.sp });
      g.emit('sfx', 'place');
      g.emit('inv');
      return true;
    }
    if (def.cat === 'seed') {
      const bed = g.entAt(tx, ty);
      if (bed && bed.s === 'flowerbed') {
        if (bed.bloom) { g.toast('This bed is already planted. Open it to dig it up.', 'warn'); return true; }
        bed.bloom = def.bloom; held.n -= 1; if (held.n <= 0) s.inv[s.hot] = null; g.bloomDirty = true;
        g.toast(`Planted ${def.name.replace(' Seeds', '').replace(' Cones', '').replace(' Cutting', '')}`, 'good'); g.emit('inv');
        return true;
      }
      g.toast('Seeds go in a Flower Bed.', 'warn');
      return true;
    }
    return false;
  }

  plantable(x, y) {
    const g = this.game, w = g.world;
    if (!g.freeTile(x, y)) return false;
    if (g.floorAt(x, y)) return false;
    const t = w.tile(x, y);
    if ([TILE.PATH, TILE.STONE, TILE.BRIDGE, TILE.SHORE].includes(t) && g.regionAt(x, y) !== 'isle') return t === TILE.SHORE;
    return !g.bodyOverlaps(x, y);
  }

  pickUp(e) {
    const g = this.game;
    const st = STRUCTURES[e.s];
    const back = [mk(e.s, 1)];
    const add = (s) => { if (s) back.push(cloneStack(s)); };
    if (st.housing) {
      add(e.heiress); add(e.courier); (e.frames || []).forEach(add); (e.mods || []).forEach(add); (e.out || []).forEach(add);
      if (e.matron) back.push({ id: 'matron', n: 1, g: e.matron.g, sp: e.matron.sp, mate: e.matron.mate, pristine: e.matron.pristine, gen: e.matron.gen, life: e.matron.life });
    }
    if (st.kind === 'machine') { (e.inb || []).forEach(add); (e.out || []).forEach(add); }
    if (e.slots) e.slots.forEach(add);
    if (e.s === 'cradle') { add(e.a); add(e.b); add(e.hatch); (e.out || []).forEach(add); }
    if (e.s === 'groundskeeper') (e.out || []).forEach(add);
    if (e.s === 'bellows') add(e.fuel);
    if (e.item) add(e.item);
    if (e.s === 'flowerbed' && e.bloom) { const seed = Object.values(ITEMS).find((d) => d.cat === 'seed' && d.bloom === e.bloom); if (seed) back.push(mk(seed.id, 1)); }
    g.removeEnt(e);
    for (const s of back) g.give(s, false);
    g.toast(`Picked up the ${st.name}`, 'info');
    g.emit('inv');
    g.emit('closePanel');
  }
}

const DECOR_LABEL = {
  [DECOR.TALLGRASS]: 'Cut grass', [DECOR.FLOWER]: 'Pick flower', [DECOR.ROCK]: 'Take stone', [DECOR.BUSH]: 'Strip bush',
  [DECOR.REEDS]: 'Cut reeds', [DECOR.CACTUS]: 'Cut cactus', [DECOR.CRYSTAL]: 'Chip crystal', [DECOR.SHROOM]: 'Pick mushroom',
  [DECOR.DRIFT]: 'Chip ice', [DECOR.BONES]: 'Bones',
};
