// Map generation for Hollowmere Valley. The map is the same for every player (fixed seed).
import { fbm, hash2, mulberry32 } from './util.js';
import { TILE, DECOR, SOLID_TILES, SOLID_DECOR } from './sprites.js';
import { BIOMES, REGION_ORDER, GATES } from './data/biomes.js';

export const W = 128, H = 128, CX = 64, CY = 64;
export const LAKE = 8, ISLE = 9, BORDER = 10;
const SEED = 4177;

const GROUND = {
  meadowfold: [TILE.GRASS, TILE.MEADOW], thicket: [TILE.FOREST, TILE.MOSS], rimeback: [TILE.SNOW, TILE.ICE],
  hollow: [TILE.CAVE, TILE.CAVEMOSS], ashvent: [TILE.ASH, TILE.BASALT], canopy: [TILE.JUNGLE, TILE.JUNGLE2],
  sunscar: [TILE.SAND, TILE.REDSAND], saltfen: [TILE.MUD, TILE.MARSH],
};

export function angDiff(a, b) { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }

export class World {
  constructor() {
    this.W = W; this.H = H;
    this.tiles = new Uint8Array(W * H);
    this.decor = new Uint8Array(W * H);
    this.region = new Uint8Array(W * H);
    this.gateTiles = new Map(); // tile index -> gate id
    this.poi = {};
    this.generate();
  }
  idx(x, y) { return y * W + x; }
  inside(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }
  tile(x, y) { return this.inside(x, y) ? this.tiles[y * W + x] : TILE.BORDER; }
  regionId(x, y) {
    if (!this.inside(x, y)) return 'border';
    const r = this.region[y * W + x];
    return r < 8 ? REGION_ORDER[r] : r === LAKE ? 'lake' : r === ISLE ? 'isle' : 'border';
  }
  biomeAt(x, y) { const r = this.regionId(Math.floor(x), Math.floor(y)); return BIOMES[r] ? r : r === 'isle' ? 'meadowfold' : r === 'lake' ? 'meadowfold' : 'meadowfold'; }

  generate() {
    const rnd = mulberry32(SEED);
    const ang = REGION_ORDER.map((r) => BIOMES[r].angle);
    // 1. regions
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = this.idx(x, y);
      const dx = x - CX + 0.5, dy = y - CY + 0.5;
      const d = Math.hypot(dx, dy);
      let a = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (a < 0) a += 360;
      const wob = (fbm(x * 0.045, y * 0.045, SEED) - 0.5) * 20;
      const lakeR = 12.5 + (fbm(x * 0.12, y * 0.12, SEED + 5) - 0.5) * 4;
      const outer = 60 + (fbm(x * 0.08, y * 0.08, SEED + 9) - 0.5) * 6;
      if (d < 3.6) { this.region[i] = ISLE; continue; }
      if (d < lakeR) { this.region[i] = LAKE; continue; }
      if (d > outer) { this.region[i] = BORDER; continue; }
      let best = 0, bd = 999;
      for (let k = 0; k < ang.length; k++) { const dd = angDiff(a + wob, ang[k]) / (k === 0 ? 1.55 : 1); if (dd < bd) { bd = dd; best = k; } }
      this.region[i] = best;
    }
    // 2. base tiles
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = this.idx(x, y);
      const r = this.region[i];
      if (r === LAKE) {
        const d = Math.hypot(x - CX + 0.5, y - CY + 0.5);
        this.tiles[i] = d < 9 ? TILE.DEEP : TILE.WATER;
      } else if (r === ISLE) this.tiles[i] = TILE.GRASS;
      else if (r === BORDER) this.tiles[i] = TILE.BORDER;
      else {
        const [a, b] = GROUND[REGION_ORDER[r]];
        this.tiles[i] = fbm(x * 0.15, y * 0.15, SEED + r * 11) > 0.56 ? b : a;
      }
    }
    // 3. region boundary cliffs
    const isLand = (r) => r < 8;
    const cliff = new Uint8Array(W * H);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const r = this.region[this.idx(x, y)];
      if (!isLand(r)) continue;
      for (let oy = -1; oy <= 1 && !cliff[this.idx(x, y)]; oy++) for (let ox = -1; ox <= 1; ox++) {
        const r2 = this.region[this.idx(x + ox, y + oy)];
        if (isLand(r2) && r2 !== r) { cliff[this.idx(x, y)] = 1; break; }
      }
    }
    for (let i = 0; i < W * H; i++) if (cliff[i]) this.tiles[i] = TILE.CLIFF;
    // 4. shoreline & the isle edge
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = this.idx(x, y);
      const t = this.tiles[i];
      if (t === TILE.WATER || t === TILE.DEEP || t === TILE.CLIFF || t === TILE.BORDER) continue;
      let water = false;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const t2 = this.tiles[this.idx(x + ox, y + oy)]; if (t2 === TILE.WATER || t2 === TILE.DEEP) water = true; }
      if (water) this.tiles[i] = this.region[i] === 3 ? TILE.CAVE : this.region[i] === 4 ? TILE.BASALT : this.region[i] === 2 ? TILE.ICE : TILE.SHORE;
    }
    // 5. special points
    const polar = (deg, r) => [Math.round(CX + Math.cos((deg * Math.PI) / 180) * r), Math.round(CY + Math.sin((deg * Math.PI) / 180) * r)];
    this.poi.home = polar(103, 44);
    this.poi.village = polar(91, 31);
    this.poi.dock = [CX, CY + 13];
    this.poi.isle = [CX, CY];
    // 6. gates
    this.poi.gates = {};
    const gateR = { g_thicket: 34, g_saltfen: 36, g_sunscar: 40, g_rimeback: 42, g_canopy: 42, g_ashvent: 42, g_hollow: 42 };
    for (const gt of GATES) {
      const ra = REGION_ORDER.indexOf(gt.a), rb = REGION_ORDER.indexOf(gt.b);
      let best = null, bd = 1e9;
      for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
        if (!cliff[this.idx(x, y)]) continue;
        let ha = false, hb = false;
        for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
          const r = this.region[this.idx(x + ox, y + oy)];
          if (r === ra) ha = true; if (r === rb) hb = true;
        }
        if (!ha || !hb) continue;
        const d = Math.abs(Math.hypot(x - CX, y - CY) - gateR[gt.id]);
        if (d < bd) { bd = d; best = [x, y]; }
      }
      if (!best) continue;
      const [gx, gy] = best;
      const set = [];
      for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
        const x = gx + ox, y = gy + oy, i = this.idx(x, y);
        if (!cliff[i]) continue;
        if (ox * ox + oy * oy > 3.2) continue;
        const r = this.region[i];
        this.tiles[i] = r === 3 ? TILE.CAVE : TILE.PATH;
        set.push(i);
        this.gateTiles.set(i, gt.id);
      }
      // make sure the passage connects through thick cliff along the boundary normal
      this.poi.gates[gt.id] = { x: gx, y: gy, tiles: set };
    }
    // 7. features: ponds in Saltfen, lava in Ashvent, ice in Rimeback
    const avoid = [this.poi.home, this.poi.village, ...Object.values(this.poi.gates).map((g) => [g.x, g.y])];
    const farFromAvoid = (x, y, r) => avoid.every(([ax, ay]) => Math.hypot(x - ax, y - ay) > r);
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      const i = this.idx(x, y), r = this.region[i];
      if (!isLand(r) || cliff[i] || this.gateTiles.has(i)) continue;
      const n = fbm(x * 0.2, y * 0.2, SEED + 77);
      if (r === 7 && n > 0.66 && farFromAvoid(x, y, 6)) this.tiles[i] = TILE.WATER;
      if (r === 4 && n > 0.68 && farFromAvoid(x, y, 6)) this.tiles[i] = TILE.LAVA;
    }
    // 8. paths
    const homeDoor = [this.poi.home[0] + 1, this.poi.home[1] + 2];
    const G = this.poi.gates;
    const line = (a, b, regionOnly = null) => this.drawPath(a, b, regionOnly);
    line(homeDoor, this.poi.village);
    line(this.poi.village, [CX, CY + 14]);
    if (G.g_saltfen) line(this.poi.village, [G.g_saltfen.x, G.g_saltfen.y]);
    if (G.g_thicket) line(homeDoor, [G.g_thicket.x, G.g_thicket.y]);
    const pairs = [['g_thicket', 'g_rimeback'], ['g_saltfen', 'g_sunscar'], ['g_sunscar', 'g_canopy'], ['g_canopy', 'g_ashvent'], ['g_rimeback', 'g_hollow']];
    for (const [a, b] of pairs) if (G[a] && G[b]) line([G[a].x, G[a].y], [G[b].x, G[b].y]);
    // 9. village plaza
    const [vx, vy] = this.poi.village;
    for (let oy = -3; oy <= 3; oy++) for (let ox = -4; ox <= 4; ox++) {
      const i = this.idx(vx + ox, vy + oy);
      if (this.region[i] === 0 && this.tiles[i] !== TILE.CLIFF) this.tiles[i] = TILE.STONE;
    }
    // Village layout (building top-left anchors)
    this.poi.buildings = [
      { kind: 'market', x: vx - 9, y: vy - 7, w: 4, h: 3, npc: 'marra', name: 'Quill\'s Market' },
      { kind: 'guild', x: vx - 2, y: vy - 8, w: 4, h: 3, npc: 'tobin', name: 'Wardens\' Guild Hall' },
      { kind: 'workshop', x: vx + 5, y: vy - 7, w: 3, h: 3, npc: 'fennick', name: 'Fennick\'s Workshop' },
      { kind: 'post', x: vx + 6, y: vy + 2, w: 3, h: 3, npc: 'wren', name: 'Post Office' },
      { kind: 'cottage', x: vx - 10, y: vy + 2, w: 3, h: 3, name: 'Cottage' },
      { kind: 'cottage', x: vx - 4, y: vy + 5, w: 3, h: 3, name: 'Cottage' },
      { kind: 'house', x: this.poi.home[0] - 1, y: this.poi.home[1] - 2, w: 4, h: 3, name: 'Homestead' },
    ];
    this.poi.board = [vx + 2, vy + 1];
    this.poi.well = [vx - 1, vy];
    // clear ground under buildings
    for (const b of this.poi.buildings) for (let oy = -1; oy <= b.h; oy++) for (let ox = -1; ox <= b.w; ox++) {
      const i = this.idx(b.x + ox, b.y + oy);
      if (this.tiles[i] === TILE.WATER) this.tiles[i] = TILE.GRASS;
    }
    const [hx, hy] = this.poi.home;
    // dock & ferry
    this.poi.dockTile = [CX - 1, CY + 12];
    for (let oy = 0; oy <= 2; oy++) for (let ox = -1; ox <= 1; ox++) {
      const i = this.idx(CX + ox, CY + 12 + oy);
      this.tiles[i] = TILE.BRIDGE;
    }
    // isle: ring of grass, Heartroot centre
    // 10. decor
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = this.idx(x, y), r = this.region[i], t = this.tiles[i];
      if (!isLand(r) || [TILE.CLIFF, TILE.PATH, TILE.STONE, TILE.WATER, TILE.LAVA, TILE.BRIDGE, TILE.SHORE].includes(t)) continue;
      if (this.gateTiles.has(i)) continue;
      if (Math.hypot(x - hx, y - hy) < 8 || Math.hypot(x - vx, y - vy) < 11) {
        if (Math.hypot(x - hx, y - hy) > 4 && hash2(x, y, 3) < 0.05) this.decor[i] = DECOR.FLOWER;
        continue;
      }
      const h = hash2(x, y, SEED);
      const biome = REGION_ORDER[r];
      const table = {
        meadowfold: [[0.07, DECOR.TALLGRASS], [0.055, DECOR.FLOWER], [0.015, DECOR.ROCK], [0.02, DECOR.BUSH]],
        thicket: [[0.06, DECOR.TALLGRASS], [0.03, DECOR.FLOWER], [0.02, DECOR.ROCK], [0.05, DECOR.BUSH], [0.02, DECOR.SHROOM]],
        saltfen: [[0.09, DECOR.REEDS], [0.04, DECOR.FLOWER], [0.03, DECOR.TALLGRASS], [0.01, DECOR.ROCK]],
        sunscar: [[0.035, DECOR.CACTUS], [0.03, DECOR.FLOWER], [0.03, DECOR.ROCK], [0.01, DECOR.BONES], [0.02, DECOR.TALLGRASS]],
        rimeback: [[0.04, DECOR.DRIFT], [0.03, DECOR.FLOWER], [0.03, DECOR.ROCK], [0.02, DECOR.TALLGRASS]],
        canopy: [[0.08, DECOR.TALLGRASS], [0.05, DECOR.FLOWER], [0.06, DECOR.BUSH], [0.01, DECOR.ROCK]],
        ashvent: [[0.04, DECOR.ROCK], [0.03, DECOR.FLOWER], [0.02, DECOR.BONES], [0.02, DECOR.TALLGRASS]],
        hollow: [[0.04, DECOR.CRYSTAL], [0.05, DECOR.SHROOM], [0.04, DECOR.FLOWER], [0.02, DECOR.ROCK]],
      }[biome];
      let acc = 0;
      for (const [p, d] of table) { acc += p; if (h < acc) { this.decor[i] = d; break; } }
    }
    // keep paths clear
    for (let i = 0; i < W * H; i++) if (this.tiles[i] === TILE.PATH || this.tiles[i] === TILE.STONE) this.decor[i] = 0;
    // 11. lore cairns: 3 per land region, 2 on the isle approach
    this.poi.cairns = [];
    for (let r = 0; r < 8; r++) {
      const cands = [];
      for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
        const i = this.idx(x, y);
        if (this.region[i] !== r || this.tiles[i] === TILE.CLIFF || this.tiles[i] === TILE.WATER || this.tiles[i] === TILE.LAVA) continue;
        const d = Math.hypot(x - CX, y - CY);
        if (d < 18 || d > 56) continue;
        if (!farFromAvoid(x, y, 8)) continue;
        cands.push([x, y]);
      }
      const chosen = [];
      for (let k = 0; k < 400 && chosen.length < 3; k++) {
        const c = cands[Math.floor(rnd() * cands.length)];
        if (!c) break;
        if (chosen.every(([x, y]) => Math.hypot(x - c[0], y - c[1]) > 12)) chosen.push(c);
      }
      for (const [x, y] of chosen) { this.decor[this.idx(x, y)] = 0; this.poi.cairns.push({ x, y, region: REGION_ORDER[r] }); }
    }
    this.rnd = rnd;
    this.decor0 = this.decor.slice();
  }

  drawPath(a, b) {
    let [x0, y0] = a; const [x1, y1] = b;
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const wob = Math.sin(t * Math.PI * 3 + x0) * 1.2 * Math.sin(t * Math.PI);
      const x = Math.round(x0 + (x1 - x0) * t + wob * ((y1 - y0) / (steps / 2 || 1)) * 0.6);
      const y = Math.round(y0 + (y1 - y0) * t - wob * ((x1 - x0) / (steps / 2 || 1)) * 0.6);
      for (const [ox, oy] of [[0, 0], [1, 0]]) {
        const i = this.idx(x + ox, y + oy);
        if (!this.inside(x + ox, y + oy)) continue;
        const t0 = this.tiles[i];
        if (t0 === TILE.CLIFF || t0 === TILE.BORDER || t0 === TILE.WATER || t0 === TILE.DEEP || t0 === TILE.LAVA || t0 === TILE.BRIDGE) continue;
        if (this.region[i] === 3) continue; // no paths in the Hollow
        this.tiles[i] = TILE.PATH;
      }
    }
  }

  tileSolid(x, y) {
    if (!this.inside(x, y)) return true;
    const i = this.idx(x, y);
    if (SOLID_TILES.has(this.tiles[i])) return true;
    if (SOLID_DECOR.has(this.decor[i])) return true;
    return false;
  }
}
