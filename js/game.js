// Game state, entities and world queries.
import { World, W, H, CX, CY } from './world.js';
import { TILE, DECOR, SOLID_DECOR } from './sprites.js';
import { BIOMES, REGION_ORDER, GATES, SEASON_TEMP } from './data/biomes.js';
import { SPECIES } from './data/species.js';
import { STRUCTURES } from './data/structures.js';
import { ITEMS } from './data/items.js';
import { NPCS, RANKS } from './data/story.js';
import { hash2, clamp, pick, chance } from './util.js';
import { template, wildGenome, val, species, trait, expressedId } from './genetics.js';
import { mkSpecimen, mk, addToSlots } from './inv.js';
import * as T from './time.js';

export const BLOOMS = ['wild', 'orchard', 'needle', 'fen', 'desert', 'frost', 'ember', 'moon', 'prism', 'heart'];
export const WILD_HIVE = { meadowfold: 'meadowmote', thicket: 'barkbuzz', saltfen: 'bogmote', sunscar: 'dunemote', rimeback: 'rimebuzz', canopy: 'leafhum', ashvent: 'cinder', hollow: 'gloam' };
export const WILD_FLITTER = { meadowfold: 'meadowpale', thicket: 'mossback', saltfen: 'reedwing', sunscar: 'ochreskipper', rimeback: 'frostwing', canopy: 'jadetail', ashvent: 'ashmoth', hollow: 'lanternmoth' };
export const WILD_GROVES = { meadowfold: ['commonwood'], thicket: ['paperbark', 'needlepine'], saltfen: ['weepwillow'], sunscar: ['thornpalm'], rimeback: ['frostpine'], canopy: ['tanglewood'], ashvent: ['charbark'], hollow: ['glowcap'] };
const GROVE_DENSITY = { meadowfold: 0.025, thicket: 0.085, saltfen: 0.03, sunscar: 0.018, rimeback: 0.04, canopy: 0.08, ashvent: 0.02, hollow: 0.045 };
const BIOME_SEED = { meadowfold: 'seed_wild', thicket: 'seed_needle', saltfen: 'seed_fen', sunscar: 'seed_desert', rimeback: 'seed_frost', canopy: 'seed_wild', ashvent: 'seed_ember', hollow: 'seed_moon' };
export { BIOME_SEED };

export const STAGE_RENOWN = [0, 1, 2, 5, 6];
export const STAGE_NAMES = ['Unknown', 'Seen', 'Read', 'Bred', 'Purebred'];

export function newState() {
  return {
    v: 1,
    created: Date.now(),
    savedAt: Date.now(),
    simTime: Date.now(),
    player: { x: 0, y: 0, dir: 0, name: 'Warden' },
    inv: new Array(36).fill(null),
    hot: 0,
    vault: new Array(120).fill(null),
    crowns: 30,
    renown: 0,
    rank: 0,
    ents: {},
    nextId: 1,
    decorGone: {},
    gates: {},
    codex: {},
    notes: {},
    revealed: {},
    unlocks: {},
    quest: { i: 0, done: {}, talked: {}, flags: {} },
    lore: {},
    tips: {},
    stats: {},
    seenItems: {},
    daily: { day: -1, orders: [], streak: 0, basketDay: -1, hettieDay: -1, grand: null, grandWeek: -1 },
    market: { sat: {}, day: -1, mult: {} },
    letters: { next: 0, last: 0, inbox: [] },
    battery: 0,
    ferry: false,
    awake: false,
    intro: false,
    settings: { sound: true, music: true, zoom: 0 },
  };
}

// Fill in anything a save from an older version is missing.
export function migrate(saved) {
  const fresh = newState();
  const fill = (dst, src) => {
    for (const [k, v] of Object.entries(src)) {
      if (dst[k] === undefined) dst[k] = v;
      else if (v && typeof v === 'object' && !Array.isArray(v) && dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) fill(dst[k], v);
    }
  };
  fill(saved, fresh);
  while (saved.inv.length < 36) saved.inv.push(null);
  while (saved.vault.length < 120) saved.vault.push(null);
  return saved;
}

export class Game {
  constructor(saved) {
    this.world = new World();
    this.listeners = {};
    this.toasts = [];
    this.fx = [];
    this.wildFlitters = [];
    this.npcs = [];
    if (saved) {
      this.state = migrate(saved);
    } else {
      this.state = newState();
      this.occ = new Int32Array(W * H);
      this.floor = new Int32Array(W * H);
      this.buildFixtures();
      this.setupNew();
    }
    this.now = this.state.simTime;
    this.rebuild();
  }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, data) { for (const fn of this.listeners[ev] || []) fn(data); }
  toast(text, kind = 'info', icon = null) { if (!this.quiet) this.emit('toast', { text, kind, icon }); }

  // ───────── setup ─────────
  setupNew() {
    const s = this.state, w = this.world;
    const [hx, hy] = w.poi.home;
    s.player.x = hx + 1.5; s.player.y = hy + 3.2;
    // Wild groves
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      const r = w.regionId(x, y);
      if (!BIOMES[r]) continue;
      const t = w.tile(x, y);
      if ([TILE.CLIFF, TILE.PATH, TILE.STONE, TILE.WATER, TILE.DEEP, TILE.LAVA, TILE.BRIDGE, TILE.SHORE].includes(t)) continue;
      if (w.gateTiles.has(w.idx(x, y))) continue;
      if (SOLID_DECOR.has(w.decor[w.idx(x, y)])) continue;
      const dHome = Math.hypot(x - hx, y - hy), dVil = Math.hypot(x - w.poi.village[0], y - w.poi.village[1]);
      if (dHome < 7 || dVil < 12) continue;
      if (w.poi.cairns.some((c) => Math.abs(c.x - x) <= 1 && Math.abs(c.y - y) <= 1)) continue;
      if (Object.values(w.poi.gates).some((g) => Math.hypot(g.x - x, g.y - y) < 4)) continue;
      let dens = GROVE_DENSITY[r];
      if (r === 'meadowfold' && dHome < 16) dens *= 2.2;
      if (hash2(x, y, 901) < dens) {
        const spid = pick(WILD_GROVES[r]);
        this.addEnt({ t: 'g', x, y, g: wildGenome(spid), sp: spid, growth: 1, wild: true, buf: [], cyc: Math.random() * 30 });
        if (w.decor[w.idx(x, y)]) { w.decor[w.idx(x, y)] = 0; s.decorGone[w.idx(x, y)] = 1e15; }
      }
    }
    // Wild hive spots: next to wild groves, 6 per region (+3 near home)
    const groves = Object.values(s.ents).filter((e) => e.t === 'g');
    for (const r of REGION_ORDER) {
      const cand = groves.filter((g) => w.regionId(g.x, g.y) === r);
      const want = r === 'meadowfold' ? 7 : 6;
      let made = 0;
      cand.sort((a, b) => hash2(a.x, a.y, 5) - hash2(b.x, b.y, 5));
      if (r === 'meadowfold') cand.sort((a, b) => Math.hypot(a.x - hx, a.y - hy) - Math.hypot(b.x - hx, b.y - hy));
      for (const g of cand) {
        if (made >= want) break;
        const spot = [[0, 1], [1, 0], [-1, 0], [1, 1]].map(([ox, oy]) => [g.x + ox, g.y + oy]).find(([x, y]) => this.freeTile(x, y) && w.regionId(x, y) === r && !w.gateTiles.has(w.idx(x, y)));
        if (!spot) continue;
        if (Object.values(s.ents).some((e) => e.t === 'w' && Math.hypot(e.x - spot[0], e.y - spot[1]) < (r === 'meadowfold' && made < 3 ? 3 : 7))) continue;
        this.addEnt({ t: 'w', x: spot[0], y: spot[1], sp: WILD_HIVE[r], gone: 0 });
        made++;
      }
    }
    // Starting gear
    const give = (id, n) => addToSlots(s.inv, mk(id, n));
    give('scoop', 1); give('net', 1); give('axe', 1); give('lens', 1);
    give('skep', 1); give('goldmel', 6); give('seed_wild', 2);
    // Workbench in the yard, and an Heiress-free start: the player must scoop.
    this.placeStructure('workbench', hx + 4, hy + 2, 0, true);
    this.placeStructure('chest', hx + 5, hy + 2, 0, true);
    s.letters.last = Date.now() - 3.5 * 3600 * 1000; // first letter arrives quickly
  }

  // ───────── entities & occupancy ─────────
  addEnt(e) {
    e.id = this.state.nextId++;
    this.state.ents[e.id] = e;
    if (this.occ) this.occupy(e, true);
    this.listsDirty = true;
    return e;
  }
  removeEnt(e) {
    this.occupy(e, false);
    delete this.state.ents[e.id];
    this.bloomDirty = true;
    this.listsDirty = true;
  }
  entSize(e) {
    if (e.t === 's') return STRUCTURES[e.s].size;
    return [1, 1];
  }
  isFloor(e) { return e.t === 's' && STRUCTURES[e.s].floor; }
  occupy(e, on) {
    const [w, h] = this.entSize(e);
    const grid = this.isFloor(e) ? this.floor : this.occ;
    for (let oy = 0; oy < h; oy++) for (let ox = 0; ox < w; ox++) {
      const i = (e.y + oy) * W + (e.x + ox);
      if (on) grid[i] = e.id; else if (grid[i] === e.id) grid[i] = 0;
    }
  }
  // Entities grouped by what the simulation needs to visit.
  lists() {
    if (!this.listsDirty && this._lists) return this._lists;
    const L = { all: [], groves: [], groveSlots: Array.from({ length: 20 }, () => []), wild: [], housings: [], machines: [], cradles: [], keepers: [], power: [], outs: [], runs: [] };
    for (const e of Object.values(this.state.ents)) {
      L.all.push(e);
      if (e.t === 'g') { L.groves.push(e); L.groveSlots[e.id % 20].push(e); continue; }
      if (e.t === 'w') { L.wild.push(e); continue; }
      if (e.t !== 's') continue;
      const st = STRUCTURES[e.s];
      if (st.housing) L.housings.push(e);
      else if (st.kind === 'machine') L.machines.push(e);
      else if (e.s === 'cradle') L.cradles.push(e);
      else if (e.s === 'groundskeeper') L.keepers.push(e);
      if (st.kind === 'power') L.power.push(e);
      if (st.floor && st.dir) L.runs.push(e);
      else if (st.housing || st.kind === 'machine' || e.s === 'cradle' || e.s === 'groundskeeper' || e.s === 'chest') L.outs.push(e);
    }
    this._lists = L;
    this.listsDirty = false;
    return L;
  }

  rebuild() {
    this.listsDirty = true;
    this.occ = new Int32Array(W * H);
    this.floor = new Int32Array(W * H);
    for (const e of Object.values(this.state.ents)) this.occupy(e, true);
    // reapply decor removals
    for (const k of Object.keys(this.state.decorGone)) this.world.decor[+k] = 0;
    this.buildFixtures();
    this.bloomDirty = true;
    this.giftTimer = 0;
    this.computeGifts();
  }
  ent(id) { return this.state.ents[id]; }
  entAt(x, y) { if (x < 0 || y < 0 || x >= W || y >= H) return null; const id = this.occ[y * W + x]; return id ? this.state.ents[id] : null; }
  floorAt(x, y) { if (x < 0 || y < 0 || x >= W || y >= H) return null; const id = this.floor[y * W + x]; return id ? this.state.ents[id] : null; }
  fixtureAt(x, y) { if (x < 0 || y < 0 || x >= W || y >= H) return null; const i = this.fixOcc[y * W + x]; return i ? this.fixtures[i - 1] : null; }
  entsOfType(t, s) { return Object.values(this.state.ents).filter((e) => e.t === t && (!s || e.s === s)); }

  buildFixtures() {
    const w = this.world;
    this.fixtures = [];
    this.fixOcc = new Int16Array(W * H);
    const add = (f, solidTiles) => {
      this.fixtures.push(f);
      for (const [x, y] of solidTiles) this.fixOcc[y * W + x] = this.fixtures.length;
    };
    for (const b of w.poi.buildings) {
      const tiles = [];
      for (let oy = 0; oy < b.h; oy++) for (let ox = 0; ox < b.w; ox++) tiles.push([b.x + ox, b.y + oy]);
      add({ kind: 'building', b, x: b.x, y: b.y, w: b.w, h: b.h, door: [b.x + Math.floor(b.w / 2), b.y + b.h] }, tiles);
    }
    const [bx, by] = w.poi.board;
    add({ kind: 'board', x: bx, y: by, w: 2, h: 1 }, [[bx, by], [bx + 1, by]]);
    const [wx, wy] = w.poi.well;
    add({ kind: 'well', x: wx, y: wy, w: 2, h: 1 }, [[wx, wy], [wx + 1, wy]]);
    for (const c of w.poi.cairns) add({ kind: 'cairn', x: c.x, y: c.y, w: 1, h: 1, region: c.region, idx: w.poi.cairns.filter((d) => d.region === c.region).indexOf(c) }, [[c.x, c.y]]);
    // Ferry boats
    add({ kind: 'boat', x: CX - 1, y: CY + 11, w: 2, h: 1, to: 'isle' }, [[CX - 1, CY + 11], [CX, CY + 11]]);
    add({ kind: 'boat', x: CX - 1, y: CY - 5, w: 2, h: 1, to: 'shore' }, [[CX - 1, CY - 5], [CX, CY - 5]]);
    // Heartroot
    add({ kind: 'heartroot', x: CX - 1, y: CY - 1, w: 3, h: 2 }, [[CX - 1, CY - 1], [CX, CY - 1], [CX + 1, CY - 1], [CX - 1, CY], [CX, CY], [CX + 1, CY]]);
    // Gates
    for (const gt of GATES) {
      const g = w.poi.gates[gt.id];
      if (!g || this.state.gates[gt.id]) continue;
      add({ kind: 'gate', gate: gt, x: g.x, y: g.y, w: 1, h: 1 }, g.tiles.map((i) => [i % W, Math.floor(i / W)]));
    }
    // NPCs
    if (!this.npcs.length) {
      for (const b of w.poi.buildings) if (b.npc) {
        const d = [b.x + Math.floor(b.w / 2), b.y + b.h + 1];
        this.npcs.push({ id: b.npc, x: d[0] + 0.5, y: d[1] + 0.5, hx: d[0] + 0.5, hy: d[1] + 0.5, dir: 0, t: Math.random() * 5, moving: false, frame: 0 });
      }
      this.npcs.push({ id: 'hettie', x: wx + 0.5, y: wy + 1.6, hx: wx + 0.5, hy: wy + 1.6, dir: 0, t: 0, moving: false, frame: 0 });
    }
  }

  // ───────── tiles & placement ─────────
  biomeAt(x, y) { return this.world.biomeAt(x, y); }
  regionAt(x, y) { return this.world.regionId(Math.floor(x), Math.floor(y)); }

  freeTile(x, y) {
    const w = this.world;
    if (!w.inside(x, y)) return false;
    if (w.tileSolid(x, y)) return false;
    if ([TILE.PATH, TILE.STONE, TILE.BRIDGE].includes(w.tile(x, y))) return false;
    if (this.occ && this.occ[y * W + x]) return false;
    if (this.fixOcc && this.fixOcc[y * W + x]) return false;
    if (w.gateTiles.has(w.idx(x, y)) && !this.isGateOpenAt(x, y)) return false;
    return true;
  }
  isGateOpenAt(x, y) { const id = this.world.gateTiles.get(this.world.idx(x, y)); return !id || !!this.state.gates[id]; }

  solidAt(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return true;
    const w = this.world, i = y * W + x;
    if (w.tileSolid(x, y)) {
      // bridge planks after a gate opens over water
      return true;
    }
    if (this.occ[i]) return true;
    if (this.fixOcc[i]) return true;
    return false;
  }

  // Does the player's (or an NPC's) collision box overlap this rectangle of tiles?
  bodyOverlaps(x, y, w = 1, h = 1) {
    const hit = (px, py) => {
      for (const [cx, cy] of [[px - 0.27, py - 0.19], [px + 0.27, py - 0.19], [px - 0.27, py + 0.09], [px + 0.27, py + 0.09]]) {
        if (cx >= x && cx < x + w && cy >= y && cy < y + h) return true;
      }
      return false;
    };
    if (hit(this.state.player.x, this.state.player.y)) return true;
    return this.npcs.some((n) => hit(n.x, n.y) || hit(n.hx, n.hy));
  }

  canPlace(sid, x, y) {
    const st = STRUCTURES[sid];
    const [w, h] = st.size;
    const p = this.state.player;
    for (let oy = 0; oy < h; oy++) for (let ox = 0; ox < w; ox++) {
      const tx = x + ox, ty = y + oy;
      if (!this.world.inside(tx, ty)) return 'Out of bounds';
      const t = this.world.tile(tx, ty);
      if ([TILE.WATER, TILE.DEEP, TILE.CLIFF, TILE.BORDER, TILE.LAVA].includes(t)) return 'Can\'t build there';
      if (SOLID_DECOR.has(this.world.decor[ty * W + tx])) return 'Something is in the way';
      if (this.fixOcc[ty * W + tx]) return 'Something is in the way';
      if (this.world.gateTiles.has(ty * W + tx)) return 'Keep the pass clear';
      if (st.floor) { if (this.floor[ty * W + tx]) return 'There is already something there'; if (this.occ[ty * W + tx]) return 'Something is in the way'; }
      else {
        if (this.occ[ty * W + tx]) return 'Something is in the way';
        if (this.floor[ty * W + tx]) { const f = this.ent(this.floor[ty * W + tx]); if (f && f.s !== 'path') return 'There is a runnel there'; }
        if (this.bodyOverlaps(tx, ty)) return 'You are standing there';
      }
    }
    if (st.water) {
      let ok = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const t = this.world.tile(x + dx, y + dy); if (t === TILE.WATER || t === TILE.DEEP) ok = true; }
      if (!ok) return 'A Waterwheel must touch water';
    }
    if (sid === 'conduit' && !this.state.awake) return 'The Heartroot is asleep';
    return null;
  }

  placeStructure(sid, x, y, dir = 0, force = false) {
    if (!force && this.canPlace(sid, x, y)) return null;
    const st = STRUCTURES[sid];
    const e = { t: 's', s: sid, x, y };
    if (st.dir) { e.dir = dir; e.item = null; e.prog = 0; }
    if (st.housing) Object.assign(e, { heiress: null, courier: null, matron: null, frames: new Array(st.housing.frames).fill(null), mods: new Array(st.housing.mods).fill(null), out: [], cyc: 0, status: 'Empty', auto: true, pollen: null, work: false });
    if (st.kind === 'machine') Object.assign(e, { inb: [], out: [], rec: null, prog: 0, status: 'Idle', on: false });
    if (st.kind === 'storage') e.slots = new Array(st.slots || 12).fill(null);
    if (sid === 'cradle') Object.assign(e, { a: null, b: null, hatch: null, timer: 0, out: [], status: 'Empty' });
    if (sid === 'flowerbed') Object.assign(e, { bloom: null });
    if (sid === 'bellows') Object.assign(e, { fuel: null, burn: 0 });
    if (sid === 'groundskeeper') Object.assign(e, { out: [], cyc: 0 });
    if (sid === 'gate') e.filter = { kind: 'role', value: 'heiress' };
    if (sid === 'chest') e.unload = false;
    // clear walkable decor under it
    const [w, h] = st.size;
    for (let oy = 0; oy < h; oy++) for (let ox = 0; ox < w; ox++) {
      const i = (y + oy) * W + x + ox;
      if (this.world.decor[i]) { this.world.decor[i] = 0; this.state.decorGone[i] = 1e15; this.emit('tileChanged', { x: x + ox, y: y + oy }); }
    }
    this.addEnt(e);
    this.bloomDirty = true;
    this.state.stats['placed_' + sid] = (this.state.stats['placed_' + sid] || 0) + 1;
    this.emit('placed', e);
    return e;
  }

  // ───────── environment ─────────
  seasonIdx() { return T.season(this.now); }
  isNight() { return T.isNight(this.now); }
  raining(biome) { return T.rainingIn(this.now, biome); }
  festivals() { return T.festivalsAt(this.now); }

  baseClimate(x, y) {
    const r = this.regionAt(x, y);
    const b = BIOMES[r] || BIOMES.meadowfold;
    return { temp: b.temp + SEASON_TEMP[this.seasonIdx()], hum: b.hum, biome: r === 'isle' || r === 'lake' ? 'meadowfold' : r, region: r };
  }

  // Bloom prefix sums (one layer per bloom type)
  computeBlooms() {
    const n = BLOOMS.length, WW = W + 1;
    if (!this.bloomPS) this.bloomPS = BLOOMS.map(() => new Int32Array(WW * (H + 1)));
    const grid = BLOOMS.map(() => new Uint8Array(W * H));
    const w = this.world;
    const TILE_BLOOM = { [TILE.MEADOW]: 'wild', [TILE.JUNGLE2]: 'wild', [TILE.MARSH]: 'fen', [TILE.REDSAND]: 'desert', [TILE.CAVEMOSS]: 'moon', [TILE.MOSS]: 'needle', [TILE.ICE]: 'frost', [TILE.BASALT]: 'ember' };
    for (let i = 0; i < W * H; i++) {
      const tb = TILE_BLOOM[w.tiles[i]];
      if (tb) grid[BLOOMS.indexOf(tb)][i] = 1;
      if (w.decor[i] === DECOR.FLOWER) {
        const r = w.regionId(i % W, Math.floor(i / W));
        const b = BIOMES[r]?.flowers;
        if (b) grid[BLOOMS.indexOf(b)][i] = 1;
      }
    }
    for (const e of Object.values(this.state.ents)) {
      if (e.t === 's' && e.s === 'flowerbed' && e.bloom) grid[BLOOMS.indexOf(e.bloom)][e.y * W + e.x] = 1;
      if (e.t === 'g' && e.growth >= 1 && !e.stump) {
        const b = val(e.g, 'bloom');
        const k = BLOOMS.indexOf(b);
        if (k >= 0) grid[k][e.y * W + e.x] = 1;
      }
    }
    for (let k = 0; k < n; k++) {
      const ps = this.bloomPS[k], g = grid[k];
      for (let y = 0; y < H; y++) {
        let row = 0;
        for (let x = 0; x < W; x++) {
          row += g[y * W + x];
          ps[(y + 1) * WW + (x + 1)] = ps[y * WW + (x + 1)] + row;
        }
      }
    }
    this.bloomDirty = false;
  }
  bloomCount(type, x, y, r) {
    if (this.bloomDirty || !this.bloomPS) this.computeBlooms();
    const k = BLOOMS.indexOf(type);
    if (k < 0) return 0;
    const ps = this.bloomPS[k], WW = W + 1;
    const x0 = clamp(x - r, 0, W), y0 = clamp(y - r, 0, H), x1 = clamp(x + r + 1, 0, W), y1 = clamp(y + r + 1, 0, H);
    return ps[y1 * WW + x1] - ps[y0 * WW + x1] - ps[y1 * WW + x0] + ps[y0 * WW + x0];
  }

  // Aura sources from working hives, mature groves and colonies.
  computeGifts() {
    const list = [], lights = [];
    for (const e of Object.values(this.state.ents)) {
      let g = null, cx = e.x, cy = e.y, r = 0;
      if (e.t === 's' && STRUCTURES[e.s].housing && e.matron && e.work) {
        g = e.matron.g; r = Math.round(val(g, 'reach') * STRUCTURES[e.s].housing.reach);
        if (e.s === 'hivespire') { cx += 0.5; cy += 0.5; }
        if (e.mods && e.mods.some((m) => m && m.id === 'mod_lantern')) lights.push({ x: cx, y: cy, r: 4 });
      } else if (e.t === 'g' && e.growth >= 1 && !e.stump) {
        g = e.g; r = val(g, 'reach');
        if (SPECIES[e.sp]?.extra.light) lights.push({ x: cx, y: cy, r: 3, soft: true });
        if (e.colony) {
          const cg = e.colony.g, gift = val(cg, 'gift');
          if (gift) list.push({ x: cx, y: cy, r: val(cg, 'reach') * 2, gift, src: e.id });
          if (gift === 'lumen') lights.push({ x: cx, y: cy, r: val(cg, 'reach') * 2 });
        }
      } else if (e.t === 's' && e.s === 'lamppost') { lights.push({ x: cx, y: cy, r: 3 }); continue; }
      if (!g) continue;
      const gift = val(g, 'gift');
      if (!gift) continue;
      list.push({ x: cx, y: cy, r, gift, src: e.id });
      if (gift === 'lumen') lights.push({ x: cx, y: cy, r });
    }
    this.gifts = list;
    this.lights = lights;
  }
  giftNear(x, y, gift, excludeId = -1) {
    for (const s of this.gifts) if (s.gift === gift && s.src !== excludeId && Math.abs(s.x - x) <= s.r && Math.abs(s.y - y) <= s.r) return true;
    return false;
  }
  litAt(x, y) {
    for (const l of this.lights) if (Math.abs(l.x - x) <= l.r && Math.abs(l.y - y) <= l.r) return true;
    return false;
  }

  envAt(x, y, excludeId = -1) {
    const c = this.baseClimate(x, y);
    if (this.giftNear(x, y, 'chill', excludeId)) c.temp -= 1;
    if (this.giftNear(x, y, 'kindle', excludeId)) c.temp += 1;
    c.temp = clamp(c.temp, 0, 5); c.hum = clamp(c.hum, 0, 2);
    c.raining = this.raining(c.region);
    c.dark = c.region === 'hollow';
    c.night = this.isNight();
    c.lit = this.litAt(x, y);
    c.shelter = this.giftNear(x, y, 'shelter', excludeId);
    return c;
  }

  // Mature groves within r (square) of a point
  grovesNear(x, y, r, matureOnly = true) {
    const out = [];
    for (let ty = Math.max(0, Math.floor(y - r)); ty <= Math.min(H - 1, Math.ceil(y + r)); ty++)
      for (let tx = Math.max(0, Math.floor(x - r)); tx <= Math.min(W - 1, Math.ceil(x + r)); tx++) {
        const e = this.entAt(tx, ty);
        if (e && e.t === 'g' && !e.stump && (!matureOnly || e.growth >= 1)) out.push(e);
      }
    return out;
  }

  // ───────── codex & renown ─────────
  codexStage(sp) { return this.state.codex[sp] || 0; }
  codexMark(sp, stage) {
    const cur = this.state.codex[sp] || 0;
    if (stage <= cur) return false;
    let gained = 0;
    for (let k = cur + 1; k <= stage; k++) gained += STAGE_RENOWN[k];
    this.state.codex[sp] = stage;
    const name = SPECIES[sp]?.name || sp;
    if (cur === 0 && stage >= 3) this.toast(`New species bred: ${name}!`, 'discover', { sp });
    else if (cur === 0) this.toast(`New species: ${name}`, 'discover', { sp });
    else if (stage === 3 && cur < 3) this.toast(`${name} bred`, 'discover', { sp });
    else if (stage === 4) this.toast(`${name} purebred line`, 'discover', { sp });
    this.addRenown(gained, true);
    this.emit('codex', { sp, stage, prev: cur });
    return true;
  }
  addRenown(n, quiet = false) {
    if (!n) return;
    const s = this.state;
    s.renown += n;
    if (!quiet) this.toast(`+${n} Renown`, 'renown');
    let r = s.rank;
    while (r + 1 < RANKS.length - 1 && s.renown >= RANKS[r + 1].renown) r++;
    if (r > s.rank && s.rank < 4) {
      s.rank = r;
      this.toast(`The Guild names you ${RANKS[r].name}`, 'rank');
      this.emit('rank', r);
    }
  }
  addCrowns(n) {
    this.state.crowns += n;
    if (n > 0) this.state.stats.crownsEarned = (this.state.stats.crownsEarned || 0) + n;
  }
  stat(key, n = 1) { this.state.stats[key] = (this.state.stats[key] || 0) + n; }

  // Give item to player; overflow goes to vault, then is dropped (lost) with a warning.
  give(stack, note = true) {
    if (stack.id === 'crown_coin') { this.addCrowns(stack.n); return 0; }
    this.state.seenItems[stack.id] = 1;
    if (stack.g && stack.sp) {
      if (this.codexStage(stack.sp) < 1) this.codexMark(stack.sp, 1);
    }
    let left = addToSlots(this.state.inv, stack);
    if (left > 0) {
      const s2 = { ...stack, n: left };
      left = addToSlots(this.state.vault, s2);
      if (note) this.toast('Bag full: sent to your Vault', 'warn');
    }
    this.emit('inv');
    return left;
  }
  hasTool(id) { return this.state.inv.some((s) => s && s.id === id); }
}
