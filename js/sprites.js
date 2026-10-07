// Procedural pixel art. Everything is drawn at 16px-per-tile on small canvases
// and scaled up with smoothing off.
import { hash2, hashStr } from './util.js';
import { SPECIES } from './data/species.js';
import { ITEMS } from './data/items.js';

export const TS = 16;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

// ── colour helpers ──
export function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  if (amt >= 0) return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  return rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
}
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

// ── tiny painter ──
class P {
  constructor(w, h) { [this.c, this.g] = canvas(w, h); this.w = w; this.h = h; }
  px(x, y, col) { if (!col) return; this.g.fillStyle = col; this.g.fillRect(x | 0, y | 0, 1, 1); }
  rect(x, y, w, h, col) { this.g.fillStyle = col; this.g.fillRect(x | 0, y | 0, w | 0, h | 0); }
  circle(cx, cy, r, col) {
    this.g.fillStyle = col;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.g.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
  }
  ellipse(cx, cy, rx, ry, col) {
    this.g.fillStyle = col;
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.3) + (y * y) / (ry * ry + 0.3) <= 1) this.g.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
  }
  line(x0, y0, x1, y1, col) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) { this.px(x0, y0, col); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  // Dark outline around all opaque pixels.
  outline(col = '#1b1712', diag = false) {
    const d = this.g.getImageData(0, 0, this.w, this.h);
    const a = d.data, w = this.w, h = this.h;
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 40;
    const pts = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1) ||
        (diag && (solid(x - 1, y - 1) || solid(x + 1, y + 1) || solid(x + 1, y - 1) || solid(x - 1, y + 1)))) pts.push([x, y]);
    }
    for (const [x, y] of pts) this.px(x, y, col);
    return this;
  }
  // Light from top-left: lighten opaque pixels whose top-left neighbour is empty, darken bottom-right edge.
  bevel(light = 0.18, dark = -0.2) {
    const d = this.g.getImageData(0, 0, this.w, this.h);
    const a = d.data, w = this.w, h = this.h;
    const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 40;
    const out = this.g.createImageData(w, h);
    out.data.set(a);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!op(x, y)) continue;
      const i = (y * w + x) * 4;
      let f = 0;
      if (!op(x, y - 1) || !op(x - 1, y)) f = light;
      else if (!op(x, y + 1) || !op(x + 1, y)) f = dark;
      if (f) {
        for (let k = 0; k < 3; k++) out.data[i + k] = f > 0 ? a[i + k] + (255 - a[i + k]) * f : a[i + k] * (1 + f);
      }
    }
    this.g.putImageData(out, 0, 0);
    return this;
  }
}

// ───────────────── TILES ─────────────────
export const TILE = {
  GRASS: 0, MEADOW: 1, FOREST: 2, MOSS: 3, SNOW: 4, ICE: 5, CAVE: 6, CAVEMOSS: 7, ASH: 8, BASALT: 9,
  JUNGLE: 10, JUNGLE2: 11, SAND: 12, REDSAND: 13, MUD: 14, MARSH: 15, WATER: 16, DEEP: 17, CLIFF: 18,
  BORDER: 19, PATH: 20, STONE: 21, DIRT: 22, BRIDGE: 23, LAVA: 24, SHORE: 25,
};
export const SOLID_TILES = new Set([TILE.WATER, TILE.DEEP, TILE.CLIFF, TILE.BORDER, TILE.LAVA]);

const TILE_PAL = {
  [TILE.GRASS]: ['#5b9a46', '#64a64e', '#52903f', '#78bb5a'],
  [TILE.MEADOW]: ['#66a64c', '#70b055', '#5d9a45', '#86c464'],
  [TILE.FOREST]: ['#3c6638', '#43703e', '#355d32', '#5a4a2e'],
  [TILE.MOSS]: ['#4b7a3d', '#548644', '#436f37', '#6a9a50'],
  [TILE.SNOW]: ['#e6edf3', '#eef3f8', '#d8e2ec', '#ffffff'],
  [TILE.ICE]: ['#bfe0ee', '#cbe8f4', '#aed4e6', '#ffffff'],
  [TILE.CAVE]: ['#3a3447', '#403a4e', '#332e3f', '#4f4860'],
  [TILE.CAVEMOSS]: ['#34444c', '#3a4c54', '#2e3c44', '#5f86b0'],
  [TILE.ASH]: ['#5a5250', '#625a58', '#4f4846', '#a0442a'],
  [TILE.BASALT]: ['#302b2e', '#383235', '#29252a', '#4a4045'],
  [TILE.JUNGLE]: ['#2f7a3a', '#358640', '#296e33', '#4aa050'],
  [TILE.JUNGLE2]: ['#2a6c42', '#317848', '#25603b', '#45925a'],
  [TILE.SAND]: ['#e0c088', '#e8c890', '#d4b47c', '#f2dcaa'],
  [TILE.REDSAND]: ['#d08a5a', '#da9462', '#c27e50', '#e8aa7a'],
  [TILE.MUD]: ['#6a6040', '#726846', '#5e5638', '#80764e'],
  [TILE.MARSH]: ['#5a7048', '#62784e', '#526842', '#4a7088'],
  [TILE.WATER]: ['#3a7ab8', '#4084c0', '#3672b0', '#7ab4e0'],
  [TILE.DEEP]: ['#2c5c9a', '#3064a2', '#285690', '#4a80c0'],
  [TILE.CLIFF]: ['#6c6658', '#767060', '#625c50', '#8a8472'],
  [TILE.BORDER]: ['#4a463e', '#524d44', '#433f38', '#605a50'],
  [TILE.PATH]: ['#a48c64', '#ac946a', '#9a845c', '#b8a07a'],
  [TILE.STONE]: ['#9a948a', '#a49e94', '#8e887e', '#b4aea4'],
  [TILE.DIRT]: ['#7a5a3a', '#826040', '#704f34', '#5a4028'],
  [TILE.BRIDGE]: ['#8a6a40', '#94744a', '#7e6038', '#5a4028'],
  [TILE.LAVA]: ['#e05020', '#f07030', '#c84018', '#ffd060'],
  [TILE.SHORE]: ['#d8c890', '#e0d098', '#ccbc84', '#f0e6c0'],
};

export function tileBase(t) { return TILE_PAL[t] ? TILE_PAL[t][0] : '#f0f'; }

// Draw one tile (16x16) into ctx at (ox, oy). variant from world coords; frame for animation.
export function drawTile(g, t, ox, oy, wx, wy, frame = 0) {
  const pal = TILE_PAL[t] || ['#f0f', '#f0f', '#f0f', '#f0f'];
  g.fillStyle = pal[0];
  g.fillRect(ox, oy, TS, TS);
  // texture noise
  for (let i = 0; i < 22; i++) {
    const h = hash2(wx * 31 + i, wy * 17 + i * 7, t);
    const x = Math.floor(h * 16), y = Math.floor(hash2(wx + i * 13, wy * 3 + i, t + 9) * 16);
    g.fillStyle = h < 0.5 ? pal[1] : pal[2];
    g.fillRect(ox + x, oy + y, (h * 10) % 1 < 0.5 ? 2 : 1, 1);
  }
  const r = hash2(wx, wy, 77 + t);
  switch (t) {
    case TILE.GRASS: case TILE.MEADOW: case TILE.JUNGLE: case TILE.JUNGLE2: case TILE.MOSS: {
      const n = t === TILE.MEADOW ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const x = Math.floor(hash2(wx + i, wy, 5) * 14) + 1, y = Math.floor(hash2(wx, wy + i, 6) * 13) + 2;
        g.fillStyle = pal[3];
        g.fillRect(ox + x, oy + y, 1, 1); g.fillRect(ox + x + 1, oy + y - 1, 1, 1);
      }
      if (t === TILE.MEADOW && r < 0.35) {
        const cols = ['#f4e060', '#f0f0f0', '#e080c0', '#80b0f0'];
        g.fillStyle = cols[Math.floor(r * 11) % 4];
        g.fillRect(ox + Math.floor(r * 97) % 13 + 1, oy + Math.floor(r * 53) % 12 + 2, 1, 1);
      }
      break;
    }
    case TILE.FOREST:
      for (let i = 0; i < 4; i++) { g.fillStyle = pal[3]; g.fillRect(ox + Math.floor(hash2(wx, wy + i, 8) * 15), oy + Math.floor(hash2(wx + i, wy, 9) * 15), 2, 1); }
      break;
    case TILE.SNOW: case TILE.ICE:
      if (r < 0.5) { g.fillStyle = pal[3]; g.fillRect(ox + Math.floor(r * 31) % 15, oy + Math.floor(r * 71) % 15, 1, 1); }
      break;
    case TILE.CAVEMOSS:
      if (r < 0.4) { g.fillStyle = pal[3]; g.fillRect(ox + Math.floor(r * 37) % 14 + 1, oy + Math.floor(r * 91) % 14 + 1, 1, 1); }
      break;
    case TILE.ASH:
      if (r < 0.25) { g.fillStyle = pal[3]; g.fillRect(ox + Math.floor(r * 37) % 14 + 1, oy + Math.floor(r * 91) % 14 + 1, 1, 1); }
      break;
    case TILE.MARSH:
      if (r < 0.45) { g.fillStyle = pal[3]; g.fillRect(ox + 3 + Math.floor(r * 20) % 6, oy + 4 + Math.floor(r * 40) % 6, 5, 2); }
      break;
    case TILE.WATER: case TILE.DEEP: {
      const f = (frame + Math.floor(r * 4)) % 4;
      g.fillStyle = pal[3];
      const y = (Math.floor(r * 12) + f * 3) % 14 + 1;
      g.fillRect(ox + Math.floor(r * 9) % 10 + 1, oy + y, 3, 1);
      if (r > 0.5) g.fillRect(ox + Math.floor(r * 37) % 10 + 2, oy + (y + 7) % 15, 2, 1);
      break;
    }
    case TILE.LAVA: {
      const f = (frame + Math.floor(r * 4)) % 4;
      g.fillStyle = pal[3];
      g.fillRect(ox + (Math.floor(r * 11) + f * 3) % 13, oy + Math.floor(r * 13) % 13, 3, 2);
      break;
    }
    case TILE.CLIFF: case TILE.BORDER:
      g.fillStyle = shade(pal[0], -0.25);
      for (let i = 0; i < 3; i++) g.fillRect(ox + Math.floor(hash2(wx + i, wy, 3) * 12), oy + Math.floor(hash2(wx, wy + i, 4) * 14), 4, 1);
      g.fillStyle = pal[3];
      for (let i = 0; i < 2; i++) g.fillRect(ox + Math.floor(hash2(wx + i, wy, 13) * 12), oy + Math.floor(hash2(wx, wy + i, 14) * 14), 3, 1);
      break;
    case TILE.STONE:
      g.fillStyle = shade(pal[0], -0.15);
      g.fillRect(ox, oy + 7, 16, 1); g.fillRect(ox + ((wy & 1) ? 4 : 11), oy, 1, 7); g.fillRect(ox + ((wy & 1) ? 11 : 4), oy + 8, 1, 8);
      break;
    case TILE.BRIDGE:
      g.fillStyle = pal[3];
      for (let y = 3; y < 16; y += 4) g.fillRect(ox, oy + y, 16, 1);
      break;
    case TILE.PATH:
      if (r < 0.5) { g.fillStyle = pal[3]; g.fillRect(ox + Math.floor(r * 23) % 13 + 1, oy + Math.floor(r * 57) % 13 + 1, 2, 2); }
      break;
    case TILE.DIRT:
      g.fillStyle = pal[3];
      for (let y = 2; y < 16; y += 4) g.fillRect(ox + 1, oy + y, 14, 1);
      break;
  }
}

// ───────────────── DECOR ─────────────────
export const DECOR = { NONE: 0, TALLGRASS: 1, FLOWER: 2, ROCK: 3, BUSH: 4, REEDS: 5, CACTUS: 6, CRYSTAL: 7, SHROOM: 8, DRIFT: 9, BONES: 10 };
export const SOLID_DECOR = new Set([DECOR.ROCK, DECOR.BUSH, DECOR.CACTUS, DECOR.CRYSTAL]);

const decorCache = {};
export function decorSprite(type, variant, biome) {
  const key = type + ':' + variant + ':' + biome;
  if (decorCache[key]) return decorCache[key];
  const p = new P(16, 16);
  const v = variant;
  switch (type) {
    case DECOR.TALLGRASS: {
      const base = { meadowfold: '#7cc05c', thicket: '#4f8a44', saltfen: '#86a050', canopy: '#4cb058', rimeback: '#a0b8a0', sunscar: '#c8b070', ashvent: '#6a6050', hollow: '#5a7090' }[biome] || '#7cc05c';
      for (let i = 0; i < 6; i++) {
        const x = 3 + ((i * 5 + v * 3) % 10), hgt = 4 + ((i * 7 + v) % 5);
        p.line(x, 14, x + ((i + v) % 3) - 1, 14 - hgt, i % 2 ? base : shade(base, -0.2));
      }
      break;
    }
    case DECOR.FLOWER: {
      const cols = { meadowfold: ['#f4e060', '#ffffff', '#e070b0'], thicket: ['#5a9a6a', '#8ab06a'], saltfen: ['#6ab0c8', '#a0d0e0'], sunscar: ['#ff7040', '#ffb040'],
        rimeback: ['#c0e8ff', '#ffffff'], canopy: ['#ff60a0', '#ffd040', '#a060ff'], ashvent: ['#ff5020', '#ffa040'], hollow: ['#b0a0ff', '#e0d0ff'] }[biome] || ['#f4e060'];
      for (let i = 0; i < 3; i++) {
        const x = 3 + ((i * 5 + v * 2) % 10), y = 6 + ((i * 3 + v) % 6);
        p.line(x, y + 1, x, y + 5, '#3a7a30');
        const c = cols[(i + v) % cols.length];
        p.px(x, y, c); p.px(x - 1, y, c); p.px(x + 1, y, c); p.px(x, y - 1, c); p.px(x, y, shade(c, 0.4));
      }
      break;
    }
    case DECOR.ROCK: {
      const base = { rimeback: '#a8b0b8', sunscar: '#c09060', ashvent: '#3a3436', hollow: '#4a4460', saltfen: '#7a7a6a' }[biome] || '#8a8a82';
      p.ellipse(8, 10, 5 + (v % 2), 4, base);
      p.ellipse(7, 8, 3, 2, shade(base, 0.18));
      if (biome === 'rimeback') p.rect(5, 6, 6, 1, '#ffffff');
      p.outline();
      break;
    }
    case DECOR.BUSH: {
      const base = { thicket: '#2f5a30', canopy: '#2a7a3a', saltfen: '#4a6a3a', rimeback: '#5a8070' }[biome] || '#3f7a35';
      p.circle(8, 9, 5, base); p.circle(5, 10, 3, base); p.circle(11, 10, 3, base);
      p.circle(7, 7, 2, shade(base, 0.2));
      if (v % 3 === 0) { p.px(6, 9, '#c03040'); p.px(10, 8, '#c03040'); p.px(9, 11, '#c03040'); }
      p.outline();
      break;
    }
    case DECOR.REEDS:
      for (let i = 0; i < 5; i++) { const x = 3 + ((i * 3 + v) % 11); p.line(x, 15, x, 5 + (i % 3), '#7a8a4a'); p.rect(x, 4 + (i % 3), 1, 3, '#6a4a2a'); }
      break;
    case DECOR.CACTUS:
      p.rect(7, 3, 3, 12, '#4a9a50'); p.rect(4, 6, 2, 5, '#4a9a50'); p.rect(4, 10, 3, 1, '#4a9a50');
      p.rect(11, 5, 2, 4, '#4a9a50'); p.rect(10, 8, 2, 1, '#4a9a50');
      p.rect(8, 3, 1, 12, '#62b066');
      if (v % 2) p.px(8, 2, '#ff6080');
      p.outline();
      break;
    case DECOR.CRYSTAL: {
      const c = v % 2 ? '#a080ff' : '#60d0e0';
      p.line(6, 14, 4, 6, c); p.line(7, 14, 6, 4, c); p.rect(5, 6, 3, 8, c);
      p.rect(9, 8, 3, 6, shade(c, -0.15)); p.px(10, 7, c);
      p.px(6, 6, '#ffffff');
      p.outline('#1a1428');
      break;
    }
    case DECOR.SHROOM: {
      const c = biome === 'hollow' ? '#9a70e0' : '#c04030';
      p.rect(7, 9, 2, 5, '#e0d8c8'); p.ellipse(8, 8, 4, 2, c); p.px(7, 7, '#ffffff');
      p.rect(3, 12, 1, 2, '#e0d8c8'); p.ellipse(3, 11, 2, 1, c);
      p.outline();
      break;
    }
    case DECOR.DRIFT:
      p.ellipse(8, 11, 6, 3, '#ffffff'); p.ellipse(6, 10, 3, 2, '#f4f8ff'); p.rect(3, 13, 10, 1, '#d0dce8');
      break;
    case DECOR.BONES:
      p.line(4, 12, 11, 9, '#e8e0d0'); p.px(3, 12, '#e8e0d0'); p.px(12, 8, '#e8e0d0'); p.ellipse(8, 6, 2, 2, '#e0d8c8'); p.px(7, 6, '#2a2020');
      break;
  }
  decorCache[key] = p.c;
  return p.c;
}

// ───────────────── TREES ─────────────────
const treeCache = {};
// stage: 0 sapling, 1 young, 2 mature. Returns {c, ox, oy} (anchor offset from tile top-left, in px)
export function treeSprite(speciesId, stage, opts = {}) {
  const key = speciesId + ':' + stage + ':' + (opts.fruit ? 1 : 0) + ':' + (opts.blossom ? 1 : 0) + ':' + (opts.stump ? 1 : 0) + ':' + (opts.big ? 1 : 0);
  if (treeCache[key]) return treeCache[key];
  const sp = SPECIES[speciesId];
  const [leaf, trunk, fruitC] = sp.colors;
  const shape = sp.extra.shape || 'round';
  const W = 32, H = 48;
  const p = new P(W, H);
  const cx = 16, base = 44;
  const seed = hashStr(speciesId);
  const nz = (x, y) => hash2(x, y, seed);
  const leafy = (cx0, cy0, rx, ry, col) => {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
      const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
      const edge = nz(x + cx0, y + cy0) * 0.35;
      if (d <= 1 - edge + 0.15) {
        const lt = (y < -ry * 0.3 && x < rx * 0.3) ? 0.16 : (y > ry * 0.4 ? -0.18 : 0);
        const jitter = nz(x * 3 + cx0, y * 5 + cy0) < 0.18 ? -0.1 : nz(x * 7, y * 2 + cy0) < 0.1 ? 0.12 : 0;
        p.px(cx0 + x, cy0 + y, shade(col, lt + jitter));
      }
    }
  };
  if (opts.stump) {
    p.rect(cx - 3, base - 4, 6, 4, trunk); p.rect(cx - 3, base - 5, 6, 1, shade(trunk, 0.3));
    p.px(cx - 1, base - 5, shade(trunk, -0.3)); p.px(cx + 1, base - 5, shade(trunk, -0.3));
    p.outline();
    return (treeCache[key] = { c: p.c, ox: -8, oy: -32 });
  }
  if (stage === 0) {
    p.line(cx, base, cx, base - 6, trunk);
    leafy(cx - 2, base - 7, 2, 2, leaf); leafy(cx + 2, base - 8, 2, 2, leaf);
    p.outline();
    return (treeCache[key] = { c: p.c, ox: -8, oy: -32 });
  }
  const sc = stage === 1 ? 0.62 : 1;
  const big = shape === 'big' || shape === 'spire' || shape === 'heart';
  const S = (n) => Math.max(1, Math.round(n * sc));
  switch (shape) {
    case 'cone': {
      p.rect(cx - 1, base - S(10), 3, S(10), trunk);
      const tiers = 4;
      for (let i = 0; i < tiers; i++) {
        const w = S(11 - i * 2.2), y = base - S(8) - i * S(7);
        for (let k = 0; k < S(8); k++) {
          const ww = Math.round(w * (k / S(8)));
          p.rect(cx - ww, y - S(8) + k, ww * 2 + 1, 1, shade(leaf, k < 2 ? 0.12 : k > S(6) ? -0.15 : 0));
        }
      }
      if (sp.extra.snow) for (let i = 0; i < tiers; i++) { const y = base - S(8) - i * S(7) - S(8) + 1; p.rect(cx - 1, y, 3, 1, '#ffffff'); p.px(cx - 2, y + 2, '#ffffff'); p.px(cx + 3, y + 3, '#ffffff'); }
      break;
    }
    case 'palm': {
      for (let i = 0; i < S(22); i++) p.rect(cx - 1 + Math.round(Math.sin(i / 6) * 1.5), base - i, 3, 1, i % 3 === 0 ? shade(trunk, -0.2) : trunk);
      const top = base - S(22);
      for (const [dx, dy] of [[-9, 2], [9, 2], [-6, -4], [6, -4], [0, -6], [-10, 6], [10, 6]]) p.line(cx, top, cx + S(dx), top + S(dy), leaf);
      for (const [dx, dy] of [[-8, 3], [8, 3], [-5, -3], [5, -3]]) p.line(cx, top + 1, cx + S(dx), top + S(dy) + 1, shade(leaf, -0.2));
      if (opts.fruit) { p.circle(cx - 1, top + 2, 1, fruitC); p.circle(cx + 2, top + 2, 1, fruitC); }
      break;
    }
    case 'willow': {
      p.rect(cx - 1, base - S(14), 3, S(14), trunk);
      leafy(cx, base - S(20), S(10), S(7), leaf);
      for (let i = -S(9); i <= S(9); i += 2) p.line(cx + i, base - S(18), cx + i + (i > 0 ? 1 : -1), base - S(5) - (Math.abs(i) % 3), shade(leaf, (i / 2) % 2 ? -0.12 : 0.05));
      break;
    }
    case 'jungle': {
      p.rect(cx - 2, base - S(16), 4, S(16), trunk);
      p.line(cx - 2, base, cx - 5, base, trunk); p.line(cx + 2, base, cx + 5, base, trunk);
      leafy(cx - S(5), base - S(19), S(7), S(5), leaf);
      leafy(cx + S(5), base - S(20), S(7), S(5), shade(leaf, 0.05));
      leafy(cx, base - S(25), S(7), S(5), shade(leaf, 0.1));
      for (let i = 0; i < 4; i++) p.line(cx - 6 + i * 4, base - S(17), cx - 6 + i * 4, base - S(10) + (i % 2) * 2, '#3a8a3a');
      break;
    }
    case 'twisted': {
      for (let i = 0; i < S(18); i++) p.rect(cx - 1 + Math.round(Math.sin(i / 3) * 2), base - i, 3, 1, trunk);
      const t = base - S(18);
      p.line(cx, t, cx - S(8), t - S(6), trunk); p.line(cx, t, cx + S(7), t - S(8), trunk); p.line(cx + 1, t + 3, cx + S(9), t - 1, trunk);
      for (const [x, y] of [[-8, -6], [7, -8], [9, -1], [0, -3]]) { leafy(cx + S(x), t + S(y), 2, 2, leaf); p.px(cx + S(x), t + S(y), '#ffb040'); }
      for (let i = 0; i < 5; i++) p.px(cx + (i % 2), base - 3 - i * 3, '#ff8030');
      break;
    }
    case 'mushroom': {
      p.rect(cx - 2, base - S(16), 5, S(16), trunk);
      p.rect(cx - 1, base - S(16), 1, S(16), shade(trunk, 0.2));
      p.ellipse(cx, base - S(18), S(11), S(6), leaf);
      p.ellipse(cx - 2, base - S(20), S(6), S(3), shade(leaf, 0.2));
      for (let i = 0; i < 6; i++) p.px(cx - 8 + i * 3, base - S(17) + (i % 2), '#f0e0ff');
      p.rect(cx - S(10), base - S(14), S(20), 1, shade(leaf, -0.3));
      break;
    }
    case 'tall': {
      p.rect(cx - 1, base - S(22), 3, S(22), trunk);
      if (trunk === '#e8e4d8') for (let i = 2; i < S(22); i += 3) p.px(cx - 1 + (i % 2) * 2, base - i, '#4a4a40');
      leafy(cx, base - S(24), S(7), S(9), leaf);
      leafy(cx - 3, base - S(18), S(4), S(4), shade(leaf, -0.05));
      break;
    }
    case 'big': {
      p.rect(cx - 2, base - S(12), 5, S(12), trunk);
      p.line(cx - 2, base, cx - 4, base, trunk); p.line(cx + 2, base, cx + 4, base, trunk);
      leafy(cx, base - S(21), S(13), S(10), leaf);
      leafy(cx - S(6), base - S(17), S(6), S(5), shade(leaf, -0.06));
      leafy(cx + S(6), base - S(16), S(6), S(5), shade(leaf, -0.04));
      break;
    }
    case 'spire': {
      p.rect(cx - 1, base - S(30), 3, S(30), trunk);
      for (let i = 0; i < 6; i++) {
        const y = base - S(10) - i * S(6), w = S(9 - i * 1.3);
        p.rect(cx - w, y, w * 2 + 1, S(3), shade(leaf, i % 2 ? 0.1 : -0.05));
        p.px(cx - w, y, '#ffffff');
      }
      p.rect(cx, base - S(42), 1, S(8), shade(leaf, 0.3));
      break;
    }
    case 'heart': {
      p.rect(cx - 2, base - S(14), 5, S(14), trunk);
      leafy(cx - S(6), base - S(22), S(8), S(8), leaf);
      leafy(cx + S(6), base - S(22), S(8), S(8), leaf);
      leafy(cx, base - S(16), S(8), S(7), shade(leaf, -0.05));
      p.circle(cx, base - S(20), S(3), '#ffe8b0');
      break;
    }
    default: { // round
      p.rect(cx - 1, base - S(11), 3, S(11), trunk);
      p.px(cx - 2, base, trunk); p.px(cx + 2, base, trunk);
      leafy(cx, base - S(18), S(10), S(9), leaf);
      leafy(cx - S(5), base - S(14), S(5), S(4), shade(leaf, -0.08));
    }
  }
  // fruit or blossom dots
  if (stage === 2 && opts.fruit && shape !== 'palm' && fruitC) {
    for (let i = 0; i < 6; i++) {
      const x = cx - 8 + Math.floor(nz(i, 1) * 16), y = base - 26 + Math.floor(nz(1, i) * 14);
      if (p.g.getImageData(x, y, 1, 1).data[3] > 0) { p.px(x, y, fruitC); p.px(x + 1, y, fruitC); p.px(x, y + 1, shade(fruitC, -0.3)); p.px(x, y - 1, shade(fruitC, 0.4)); }
    }
  }
  if (opts.blossom) {
    for (let i = 0; i < 10; i++) {
      const x = cx - 10 + Math.floor(nz(i, 9) * 20), y = base - 30 + Math.floor(nz(9, i) * 20);
      if (p.g.getImageData(x, y, 1, 1).data[3] > 0) { p.px(x, y, '#ffd0e8'); p.px(x + 1, y, '#ffffff'); }
    }
  }
  p.outline('#14120e');
  const res = { c: p.c, ox: -8, oy: -32 };
  treeCache[key] = res;
  return res;
}

// ───────────────── CREATURES ─────────────────
const bugCache = {};
export function hummerSprite(speciesId, frame = 0) {
  const key = 'h:' + speciesId + ':' + frame;
  if (bugCache[key]) return bugCache[key];
  const sp = SPECIES[speciesId] || SPECIES.meadowmote;
  const [a, b] = sp.colors;
  const p = new P(9, 8);
  // wings
  const wc = 'rgba(230,240,255,0.85)';
  if (frame === 0) { p.rect(2, 0, 2, 2, wc); p.rect(5, 0, 2, 2, wc); } else { p.rect(1, 1, 2, 2, wc); p.rect(6, 1, 2, 2, wc); }
  p.ellipse(4, 4, 3, 2, a);
  p.rect(3, 3, 1, 4, b); p.rect(5, 3, 1, 4, b);
  p.px(8, 4, b); p.px(1, 4, shade(a, -0.4));
  p.outline('#120e08');
  return (bugCache[key] = p.c);
}

export function flitterSprite(speciesId, frame = 0) {
  const key = 'f:' + speciesId + ':' + frame;
  if (bugCache[key]) return bugCache[key];
  const sp = SPECIES[speciesId] || SPECIES.meadowpale;
  const [a, b] = sp.colors;
  const p = new P(11, 9);
  const moth = sp.extra.moth;
  if (frame === 0) {
    p.ellipse(2, 3, 2, 2, a); p.ellipse(8, 3, 2, 2, a);
    p.ellipse(3, 6, 1, 1, b); p.ellipse(7, 6, 1, 1, b);
    p.px(2, 3, b); p.px(8, 3, b);
    if (moth) { p.rect(1, 2, 3, 1, shade(a, -0.2)); p.rect(7, 2, 3, 1, shade(a, -0.2)); }
  } else {
    p.ellipse(3, 3, 1, 2, a); p.ellipse(7, 3, 1, 2, a); p.px(3, 6, b); p.px(7, 6, b);
  }
  p.rect(5, 2, 1, 5, '#2a2018');
  p.px(4, 1, '#2a2018'); p.px(6, 1, '#2a2018');
  p.outline('#120e08');
  return (bugCache[key] = p.c);
}

// ───────────────── PEOPLE ─────────────────
const personCache = {};
// dir: 0 down,1 left,2 right,3 up ; frame 0..3
export function personSprite(look, dir, frame) {
  const key = JSON.stringify(look) + dir + ':' + frame;
  if (personCache[key]) return personCache[key];
  const p = new P(16, 20);
  const { skin = '#e8b48a', hair = '#6a3a1a', shirt = '#3a7a4a', pants = '#4a3a2a', hat = null, apron = null, hairStyle = 0 } = look;
  const step = frame % 4 === 1 ? 1 : frame % 4 === 3 ? -1 : 0;
  // legs
  if (dir === 1 || dir === 2) {
    p.rect(6, 15, 2, 4 - (step > 0 ? 1 : 0), pants); p.rect(9, 15, 2, 4 - (step < 0 ? 1 : 0), pants);
    p.rect(5 + step, 18, 3, 1, '#2a2018'); p.rect(9 - step, 18, 3, 1, '#2a2018');
  } else {
    p.rect(6, 15, 2, 4 - (step > 0 ? 1 : 0), pants); p.rect(9, 15, 2, 4 - (step < 0 ? 1 : 0), pants);
    p.rect(6, 18 - (step > 0 ? 1 : 0), 2, 1, '#2a2018'); p.rect(9, 18 - (step < 0 ? 1 : 0), 2, 1, '#2a2018');
  }
  // body
  p.rect(5, 9, 7, 7, shirt);
  p.rect(5, 9, 7, 1, shade(shirt, 0.15));
  if (apron) { p.rect(6, 11, 5, 5, apron); }
  p.rect(5, 14, 7, 1, shade(shirt, -0.3));
  // arms
  const sw = step;
  if (dir === 1) { p.rect(6, 10 + Math.abs(sw), 2, 4, shade(shirt, -0.1)); p.px(6, 14 + Math.abs(sw), skin); }
  else if (dir === 2) { p.rect(9, 10 + Math.abs(sw), 2, 4, shade(shirt, -0.1)); p.px(10, 14 + Math.abs(sw), skin); }
  else { p.rect(4, 10 + sw, 1, 4, shade(shirt, -0.1)); p.rect(12, 10 - sw, 1, 4, shade(shirt, -0.1)); p.px(4, 14 + sw, skin); p.px(12, 14 - sw, skin); }
  // head
  p.rect(5, 2, 7, 7, skin);
  p.rect(5, 8, 7, 1, shade(skin, -0.15));
  // hair
  p.rect(5, 1, 7, 2, hair);
  if (dir === 3) p.rect(5, 1, 7, 6, hair);
  else if (dir === 1) { p.rect(8, 1, 4, 5, hair); }
  else if (dir === 2) { p.rect(5, 1, 4, 5, hair); }
  else { p.px(5, 3, hair); p.px(11, 3, hair); if (hairStyle === 1) { p.rect(4, 3, 1, 6, hair); p.rect(12, 3, 1, 6, hair); } }
  if (hairStyle === 2 && dir !== 3) p.rect(4, 2, 1, 3, hair);
  // eyes
  if (dir === 0) { p.px(7, 5, '#1a1410'); p.px(10, 5, '#1a1410'); p.px(8, 7, shade(skin, -0.25)); }
  if (dir === 1) { p.px(6, 5, '#1a1410'); }
  if (dir === 2) { p.px(10, 5, '#1a1410'); }
  if (hat) {
    p.rect(3, 1, 11, 1, hat); p.rect(5, -1, 7, 2, hat); p.rect(5, 0, 7, 1, shade(hat, 0.15));
  }
  p.outline('#140f0c');
  return (personCache[key] = p.c);
}

// ───────────────── STRUCTURES ─────────────────
const structCache = {};
export function structSprite(id, opts = {}) {
  const key = id + ':' + JSON.stringify(opts);
  if (structCache[key]) return structCache[key];
  let p, ox = 0, oy = 0;
  const wood = '#9a6a3a', woodL = '#c08a50', woodD = '#6a4422', stone = '#8a8a82', brass = '#c9a24b', wax = '#f0d88a';
  switch (id) {
    case 'skep': {
      p = new P(16, 20); oy = -4;
      for (let i = 0; i < 6; i++) { const w = [4, 6, 7, 7, 7, 6][i]; p.rect(8 - w, 5 + i * 2, w * 2, 2, i % 2 ? '#c8a050' : '#d8b460'); }
      p.rect(2, 17, 12, 2, '#8a6a30');
      p.rect(6, 14, 4, 3, '#2a1a0c');
      p.bevel().outline();
      break;
    }
    case 'hivebox': {
      p = new P(16, 22); oy = -6;
      p.rect(2, 8, 12, 12, wood); p.rect(2, 12, 12, 1, woodD); p.rect(2, 16, 12, 1, woodD);
      p.rect(1, 5, 14, 3, '#b08050'); p.rect(3, 3, 10, 2, '#c09060');
      p.rect(6, 18, 4, 2, '#2a1a0c'); p.rect(2, 20, 2, 2, woodD); p.rect(12, 20, 2, 2, woodD);
      p.bevel().outline();
      break;
    }
    case 'hivespire': {
      p = new P(32, 48); oy = -16;
      p.rect(4, 22, 24, 24, '#b88a50'); p.rect(4, 30, 24, 1, woodD); p.rect(4, 38, 24, 1, woodD);
      p.rect(8, 12, 16, 10, '#c89a5a'); p.rect(8, 17, 16, 1, woodD);
      for (let i = 0; i < 6; i++) p.rect(16 - (11 - i * 2), 6 + i * 1 + 4, (11 - i * 2) * 2, 2, i % 2 ? '#e0b040' : brass);
      p.rect(15, 2, 2, 8, brass); p.circle(16, 2, 2, '#f0d060');
      p.rect(13, 41, 6, 5, '#2a1a0c'); p.rect(6, 24, 4, 4, '#f0c870'); p.rect(22, 24, 4, 4, '#f0c870');
      p.rect(2, 44, 28, 2, '#7a7a72');
      p.bevel().outline();
      break;
    }
    case 'cradle': {
      p = new P(16, 18); oy = -2;
      p.rect(3, 6, 10, 8, '#e8dcc0'); p.rect(3, 6, 10, 2, '#f8f0e0');
      p.rect(2, 13, 12, 3, wood);
      p.ellipse(6, 9, 1, 2, '#c8b890'); p.ellipse(10, 10, 1, 2, '#d0c098');
      p.line(3, 6, 8, 2, woodL); p.line(13, 6, 8, 2, woodL);
      p.bevel().outline();
      break;
    }
    case 'flowerbed': {
      p = new P(16, 16);
      p.rect(1, 6, 14, 9, '#5a3a22'); p.rect(1, 6, 14, 1, '#8a6040'); p.rect(1, 14, 14, 1, '#3a2414');
      p.rect(2, 8, 12, 6, '#4a3020');
      const col = { wild: '#f4e060', orchard: '#ffb0d0', needle: '#4a8a5a', fen: '#6ab0c8', desert: '#ff7040', frost: '#c0e8ff', ember: '#ff5020', moon: '#b0a0ff', prism: '#ff80ff', heart: '#ffcf6a' }[opts.bloom];
      if (col) for (let i = 0; i < 5; i++) {
        const x = 3 + i * 2.4, y = 5 + (i % 2) * 2;
        p.line(x, y + 2, x, y + 6, '#3a7a30'); p.px(x, y, col); p.px(x - 1, y + 1, col); p.px(x + 1, y + 1, col); p.px(x, y + 1, shade(col, 0.5));
      }
      p.outline();
      break;
    }
    case 'chest': {
      p = new P(16, 16);
      p.rect(2, 5, 12, 9, wood); p.rect(2, 5, 12, 3, woodL); p.rect(2, 8, 12, 1, woodD);
      p.rect(7, 7, 2, 3, brass); p.rect(2, 5, 1, 9, woodD); p.rect(13, 5, 1, 9, woodD);
      p.bevel().outline();
      break;
    }
    case 'postbox': {
      p = new P(16, 20); oy = -4;
      p.rect(7, 12, 2, 7, woodD); p.rect(3, 4, 10, 8, '#3a6aa0'); p.rect(3, 4, 10, 2, '#5a8ac0'); p.rect(5, 8, 6, 1, '#1a2a40');
      p.rect(12, 2, 1, 5, '#c03030'); p.rect(12, 2, 3, 2, '#c03030');
      p.bevel().outline();
      break;
    }
    case 'workbench': {
      p = new P(16, 16);
      p.rect(1, 6, 14, 3, woodL); p.rect(2, 9, 2, 6, woodD); p.rect(12, 9, 2, 6, woodD); p.rect(2, 12, 12, 1, woodD);
      p.rect(3, 4, 3, 2, '#a0a0a8'); p.rect(9, 3, 1, 3, '#7a5a3a'); p.rect(8, 3, 3, 1, '#a0a0a8');
      p.bevel().outline();
      break;
    }
    case 'desk': {
      p = new P(16, 18); oy = -2;
      p.rect(1, 8, 14, 3, '#7a4a2a'); p.rect(2, 11, 2, 6, '#5a3418'); p.rect(12, 11, 2, 6, '#5a3418');
      p.rect(3, 6, 6, 2, '#f0e8d0'); p.rect(10, 4, 2, 4, '#f0e0a0'); p.px(10, 3, '#ffb040'); p.px(11, 3, '#ffe080');
      p.rect(4, 5, 4, 1, '#c0b090');
      p.bevel().outline();
      break;
    }
    case 'combwheel': case 'press': case 'brewvat': case 'alembic': case 'glassforge': case 'smeltery': case 'loomframe': case 'chandlery': case 'joiner': {
      p = new P(16, 22); oy = -6;
      drawMachine(p, id, opts.frame || 0, opts.on);
      p.bevel().outline();
      break;
    }
    case 'windlass': {
      p = new P(16, 18); oy = -2;
      p.rect(2, 10, 12, 6, stone); p.rect(4, 6, 8, 4, wood); p.rect(7, 2, 2, 8, woodD);
      const a = (opts.frame || 0) % 4;
      p.line(8, 4, 8 + [4, 0, -4, 0][a], 4 + [0, 4, 0, -4][a], '#a0a0a8');
      p.bevel().outline();
      break;
    }
    case 'windsail': {
      p = new P(24, 32); ox = -4; oy = -16;
      p.rect(11, 12, 2, 19, woodD); p.rect(8, 28, 8, 3, stone);
      const f = (opts.frame || 0) % 2;
      const blades = f ? [[0, -10], [10, 0], [0, 10], [-10, 0]] : [[7, -7], [7, 7], [-7, 7], [-7, -7]];
      for (const [dx, dy] of blades) { p.line(12, 12, 12 + dx, 12 + dy, '#e8dcc0'); p.line(13, 12, 13 + dx, 12 + dy, '#d0c4a8'); }
      p.circle(12, 12, 1, brass);
      p.outline();
      break;
    }
    case 'waterwheel': {
      p = new P(16, 18); oy = -2;
      p.circle(8, 9, 7, wood); p.circle(8, 9, 5, '#5a3a20'); p.circle(8, 9, 1, brass);
      const f = (opts.frame || 0) % 2;
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + f * Math.PI / 4; p.line(8, 9, 8 + Math.cos(a) * 6, 9 + Math.sin(a) * 6, woodL); }
      p.outline();
      break;
    }
    case 'bellows': {
      p = new P(16, 20); oy = -4;
      p.rect(2, 8, 12, 10, '#5a5a62'); p.rect(2, 8, 12, 2, '#7a7a82'); p.rect(11, 2, 3, 6, '#4a4a52');
      p.rect(4, 12, 5, 4, opts.on ? '#ff8030' : '#2a1a14'); if (opts.on) p.rect(5, 13, 3, 2, '#ffd060');
      p.rect(3, 17, 10, 1, brass);
      p.bevel().outline();
      break;
    }
    case 'springcoil': {
      p = new P(16, 18); oy = -2;
      p.rect(3, 13, 10, 3, stone);
      for (let i = 0; i < 5; i++) p.ellipse(8, 4 + i * 2, 4, 1, i % 2 ? '#c0a050' : brass);
      const lvl = opts.level || 0;
      p.rect(2, 3, 1, 10, '#2a2a2a'); p.rect(2, 13 - Math.round(lvl * 10), 1, Math.round(lvl * 10), '#60e0a0');
      p.outline();
      break;
    }
    case 'conduit': {
      p = new P(16, 24); oy = -8;
      p.rect(5, 6, 6, 16, '#7a4a2a'); p.rect(6, 6, 1, 16, '#a06a3a');
      p.circle(8, 5, 4, '#ffcf6a'); p.circle(7, 4, 2, '#fff0c0');
      p.rect(3, 20, 10, 3, '#ffcf6a');
      p.outline();
      break;
    }
    case 'runnel': case 'gate': {
      p = new P(16, 16);
      const d = opts.dir || 0;
      const g = p.g;
      g.save(); g.translate(8, 8); g.rotate(d * Math.PI / 2); g.translate(-8, -8);
      p.rect(0, 3, 16, 10, '#d8b868'); p.rect(0, 3, 16, 1, '#f0d890'); p.rect(0, 12, 16, 1, '#a08040');
      p.rect(0, 5, 16, 6, '#b8984a');
      const f = (opts.frame || 0) % 4;
      for (let i = 0; i < 2; i++) { const x = (i * 8 + f * 2) % 16; p.rect(x, 7, 2, 2, '#e8cc80'); p.px(x + 2, 8, '#e8cc80'); }
      if (id === 'gate') { p.rect(5, 2, 6, 12, '#3a6a8a'); p.rect(6, 3, 4, 10, '#60b0d0'); p.rect(7, 5, 2, 2, '#ffffff'); p.rect(4, 0, 2, 3, '#e05050'); }
      g.restore();
      break;
    }
    case 'groundskeeper': {
      p = new P(16, 22); oy = -6;
      p.rect(7, 10, 2, 11, woodD); p.rect(3, 11, 10, 2, woodD);
      p.rect(5, 12, 6, 6, '#6a8a4a'); p.circle(8, 7, 3, '#d8c090'); p.rect(4, 3, 9, 2, '#8a6a30'); p.rect(6, 1, 5, 2, '#8a6a30');
      p.px(7, 7, '#1a1410'); p.px(9, 7, '#1a1410');
      p.rect(12, 9, 3, 1, '#a0a0a8'); p.rect(14, 8, 1, 3, '#a0a0a8');
      p.bevel().outline();
      break;
    }
    case 'lamppost': {
      p = new P(16, 28); oy = -12;
      p.rect(7, 8, 2, 18, '#3a3a40'); p.rect(5, 25, 6, 2, '#3a3a40');
      p.rect(5, 3, 6, 6, '#3a3a40'); p.rect(6, 4, 4, 4, opts.on ? '#ffe080' : '#a09060'); p.rect(4, 2, 8, 1, '#3a3a40');
      p.outline();
      break;
    }
    case 'path': {
      p = new P(16, 16);
      p.rect(0, 0, 16, 16, '#a09888');
      for (const [x, y, w, h] of [[1, 1, 6, 5], [8, 1, 7, 6], [1, 7, 4, 8], [6, 8, 9, 7]]) { p.rect(x, y, w, h, '#b8b0a0'); p.rect(x, y, w, 1, '#ccc4b4'); }
      break;
    }
    case 'fence': {
      p = new P(16, 16);
      p.rect(2, 4, 2, 11, woodL); p.rect(12, 4, 2, 11, woodL); p.rect(0, 6, 16, 2, wood); p.rect(0, 11, 16, 2, wood);
      p.bevel().outline();
      break;
    }
    case 'hedge': {
      p = new P(16, 18); oy = -2;
      p.rect(1, 3, 14, 13, '#3f7a35');
      for (let i = 0; i < 18; i++) p.px(1 + (i * 7) % 14, 3 + (i * 5) % 13, i % 2 ? '#4f9a45' : '#346a2c');
      p.rect(1, 3, 14, 1, '#5aa04a');
      p.outline();
      break;
    }
    case 'banner': {
      p = new P(16, 26); oy = -10;
      p.rect(7, 2, 2, 23, woodD); p.rect(3, 2, 10, 1, woodD);
      p.rect(3, 3, 10, 12, '#2f6a44'); p.rect(3, 15, 4, 2, '#2f6a44'); p.rect(9, 15, 4, 2, '#2f6a44');
      p.circle(8, 8, 2, brass); p.px(8, 8, '#2f6a44');
      p.outline();
      break;
    }
    default:
      p = new P(16, 16); p.rect(2, 2, 12, 12, '#f0f'); p.outline();
  }
  const res = { c: p.c, ox, oy };
  structCache[key] = res;
  return res;
}

function drawMachine(p, id, frame, on) {
  const stone = '#8a8478', wood = '#9a6a3a', woodD = '#6a4422', brass = '#c9a24b';
  p.rect(1, 18, 14, 3, stone);
  switch (id) {
    case 'combwheel': {
      p.rect(2, 8, 12, 10, wood); p.rect(2, 8, 12, 2, '#b88050');
      p.circle(8, 7, 5, '#e8c060');
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + frame * 0.5; p.px(8 + Math.cos(a) * 4, 7 + Math.sin(a) * 4, '#a07820'); }
      p.circle(8, 7, 1, '#6a4a10');
      p.rect(5, 14, 6, 3, '#f0b020');
      break;
    }
    case 'press': {
      p.rect(3, 10, 10, 8, woodD); p.rect(4, 11, 8, 6, '#8a2a30');
      p.rect(2, 2, 2, 16, wood); p.rect(12, 2, 2, 16, wood); p.rect(2, 2, 12, 2, wood);
      p.rect(7, 4, 2, 5 + (frame % 2), '#a0a0a8'); p.rect(4, 8 + (frame % 2), 8, 2, '#a0a0a8');
      break;
    }
    case 'brewvat': {
      p.ellipse(8, 11, 6, 7, '#8a5a30'); p.rect(2, 7, 12, 1, '#5a5a62'); p.rect(2, 14, 12, 1, '#5a5a62');
      p.rect(6, 2, 4, 3, '#6a3a1a'); if (on) { p.px(7, 1, '#f0f0e0'); p.px(9, 0, '#f0f0e0'); }
      break;
    }
    case 'alembic': {
      p.ellipse(6, 13, 4, 4, '#d88a40'); p.rect(5, 4, 2, 6, '#d88a40'); p.line(6, 4, 13, 8, '#d88a40'); p.rect(12, 8, 2, 8, '#c07a30');
      p.rect(3, 16, 7, 2, on ? '#ff8030' : '#3a2a20');
      p.px(5, 12, '#ffe0a0');
      break;
    }
    case 'glassforge': case 'smeltery': {
      const body = id === 'glassforge' ? '#8a5040' : '#5a5a62';
      p.rect(2, 4, 12, 14, body); p.rect(2, 4, 12, 2, shade(body, 0.2));
      p.rect(5, 10, 6, 5, on ? '#ff7020' : '#1a1210'); if (on) p.rect(6, 11, 4, 3, '#ffd060');
      p.rect(10, 0, 3, 4, '#4a4a52');
      if (id === 'glassforge') { p.rect(3, 7, 3, 2, '#f0b040'); p.px(3, 7, '#ffffff'); }
      else p.rect(3, 7, 10, 1, '#a0a0a8');
      if (on && frame % 2) p.px(11, 0, '#d0d0d0');
      break;
    }
    case 'loomframe': {
      p.rect(2, 4, 2, 14, wood); p.rect(12, 4, 2, 14, wood); p.rect(2, 4, 12, 2, wood); p.rect(2, 15, 12, 2, wood);
      for (let x = 5; x < 12; x += 2) p.rect(x, 6, 1, 9, '#f0ece0');
      p.rect(4, 9 + (frame % 2) * 2, 8, 1, '#c0a060');
      break;
    }
    case 'chandlery': {
      p.rect(2, 10, 12, 8, '#7a5a3a'); p.rect(2, 10, 12, 2, '#9a7a5a');
      for (let i = 0; i < 4; i++) { p.rect(3 + i * 3, 5, 2, 5, '#f0e0a0'); p.px(3 + i * 3, 4, on ? '#ffb040' : '#4a3a2a'); }
      break;
    }
    case 'joiner': {
      p.rect(1, 9, 14, 3, '#b08050'); p.rect(2, 12, 2, 6, woodD); p.rect(12, 12, 2, 6, woodD);
      p.circle(8, 6, 4, '#a0a0a8');
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + frame * 0.4; p.px(8 + Math.cos(a) * 5, 6 + Math.sin(a) * 5, '#c0c0c8'); }
      p.circle(8, 6, 1, brass);
      break;
    }
  }
  if (on) { p.px(14, 9, '#60ff90'); } else p.px(14, 9, '#4a3a2a');
}

// ───────────────── BUILDINGS & LANDMARKS ─────────────────
const bldCache = {};
export function buildingSprite(kind) {
  if (bldCache[kind]) return bldCache[kind];
  let p, ox = 0, oy = 0;
  const roof = (x, y, w, h, col) => {
    for (let i = 0; i < h; i++) { const inset = Math.max(0, h - 1 - i) ; p.rect(x + Math.floor(inset / 2), y + i, w - Math.floor(inset / 2) * 2, 1, shade(col, i % 2 ? -0.08 : 0)); }
  };
  switch (kind) {
    case 'house': { // 4x3 tiles
      p = new P(64, 72); oy = -24;
      p.rect(4, 36, 56, 34, '#d8c8a8'); p.rect(4, 36, 56, 3, '#e8dcc0');
      for (let y = 42; y < 70; y += 6) p.rect(4, y, 56, 1, '#c4b494');
      roof(0, 8, 64, 30, '#8a3a2a');
      p.rect(44, 4, 6, 14, '#7a6a5a'); p.rect(43, 3, 8, 2, '#5a4a3a');
      p.rect(26, 50, 12, 20, '#6a4422'); p.rect(27, 51, 10, 18, '#7a5430'); p.px(35, 60, '#c9a24b');
      p.rect(10, 46, 10, 9, '#f0d890'); p.rect(14, 46, 1, 9, '#6a4422'); p.rect(10, 50, 10, 1, '#6a4422');
      p.rect(44, 46, 10, 9, '#f0d890'); p.rect(48, 46, 1, 9, '#6a4422'); p.rect(44, 50, 10, 1, '#6a4422');
      p.rect(22, 68, 20, 3, '#9a8a6a');
      p.outline();
      break;
    }
    case 'market': case 'guild': case 'workshop': case 'cottage': case 'post': {
      const cfg = {
        market: { roof: '#c06a30', wall: '#e8d8b0', w: 64, awning: true },
        guild: { roof: '#2f6a44', wall: '#d0c8b0', w: 64, banner: true },
        workshop: { roof: '#5a5a62', wall: '#b8a888', w: 48, gear: true },
        cottage: { roof: '#7a5a3a', wall: '#e0d0b0', w: 48 },
        post: { roof: '#3a6aa0', wall: '#e0d8c8', w: 48 },
      }[kind];
      const w = cfg.w;
      p = new P(w, 64); oy = -16;
      p.rect(3, 30, w - 6, 32, cfg.wall); p.rect(3, 30, w - 6, 2, shade(cfg.wall, 0.15));
      roof(0, 6, w, 26, cfg.roof);
      const dx = Math.floor(w / 2) - 5;
      p.rect(dx, 44, 10, 18, '#6a4422'); p.px(dx + 8, 53, '#c9a24b');
      p.rect(7, 38, 9, 8, '#f0d890'); p.rect(w - 16, 38, 9, 8, '#f0d890');
      p.rect(11, 38, 1, 8, '#6a4422'); p.rect(w - 12, 38, 1, 8, '#6a4422');
      if (cfg.awning) for (let x = 3; x < w - 3; x += 4) p.rect(x, 32, 4, 5, (x / 4) % 2 ? '#e05040' : '#f0e8d8');
      if (cfg.banner) { p.rect(w / 2 - 3, 10, 6, 14, '#2f6a44'); p.circle(w / 2, 15, 2, '#c9a24b'); }
      if (cfg.gear) { p.circle(w - 10, 14, 5, '#a0a0a8'); p.circle(w - 10, 14, 2, '#5a5a62'); }
      if (kind === 'post') { p.rect(w / 2 - 6, 33, 12, 4, '#f0f0f0'); p.rect(w / 2 - 6, 33, 12, 1, '#c03030'); }
      p.outline();
      break;
    }
    case 'board': {
      p = new P(32, 32); oy = -16;
      p.rect(4, 14, 2, 18, '#6a4422'); p.rect(26, 14, 2, 18, '#6a4422');
      p.rect(2, 4, 28, 16, '#9a6a3a'); p.rect(4, 6, 24, 12, '#c8a070');
      p.rect(6, 7, 7, 8, '#f0e8d0'); p.rect(15, 8, 6, 6, '#f8f0e0'); p.rect(22, 7, 5, 9, '#e8e0c8');
      p.rect(8, 9, 3, 1, '#7a6a5a'); p.rect(8, 11, 4, 1, '#7a6a5a'); p.px(9, 7, '#c03030'); p.px(17, 8, '#3060c0');
      p.rect(0, 2, 32, 3, '#7a4a2a');
      p.outline();
      break;
    }
    case 'well': {
      p = new P(32, 40); oy = -8;
      p.ellipse(16, 30, 12, 7, '#9a948a'); p.ellipse(16, 29, 9, 5, '#2a3a5a');
      p.rect(4, 8, 2, 22, '#6a4422'); p.rect(26, 8, 2, 22, '#6a4422'); roof(2, 2, 28, 8, '#8a3a2a');
      p.rect(15, 10, 1, 14, '#c0b090'); p.rect(13, 22, 5, 4, '#7a5a3a');
      p.outline();
      break;
    }
    case 'dock': {
      p = new P(48, 32);
      p.rect(0, 4, 48, 20, '#8a6a40');
      for (let x = 0; x < 48; x += 6) p.rect(x, 4, 1, 20, '#6a4a28');
      p.rect(2, 24, 3, 8, '#5a3a20'); p.rect(43, 24, 3, 8, '#5a3a20');
      p.outline();
      break;
    }
    case 'boat': {
      p = new P(32, 20);
      p.ellipse(16, 12, 14, 5, '#7a4a2a'); p.rect(3, 7, 26, 3, '#a06a3a'); p.rect(15, 0, 2, 9, '#5a3a20');
      p.rect(8, 9, 16, 2, '#5a3a20');
      p.outline();
      break;
    }
    case 'heartroot_dormant': case 'heartroot_awake': {
      const awake = kind === 'heartroot_awake';
      p = new P(96, 112); ox = -32; oy = -80;
      const trunk = awake ? '#8a5a30' : '#5a4a40';
      p.rect(38, 60, 20, 50, trunk);
      for (let i = 0; i < 6; i++) p.line(48, 100, 20 + i * 11, 111, trunk);
      p.rect(42, 60, 3, 50, shade(trunk, 0.15));
      const leaf = awake ? '#5ac06a' : '#6a6a5a';
      const blobs = [[48, 40, 30, 22], [26, 48, 18, 14], [70, 48, 18, 14], [48, 22, 22, 14], [34, 30, 14, 10], [62, 30, 14, 10]];
      for (const [x, y, rx, ry] of blobs) p.ellipse(x, y, rx, ry, leaf);
      for (const [x, y, rx, ry] of blobs) p.ellipse(x - 3, y - 4, Math.floor(rx * 0.6), Math.floor(ry * 0.5), shade(leaf, 0.12));
      if (awake) for (let i = 0; i < 30; i++) { const x = 20 + (i * 37) % 60, y = 15 + (i * 23) % 45; p.px(x, y, '#ffe080'); p.px(x + 1, y, '#fff6c0'); }
      else for (let i = 0; i < 18; i++) p.px(20 + (i * 37) % 60, 15 + (i * 23) % 45, '#4a4a40');
      p.outline();
      break;
    }
    case 'cairn': {
      p = new P(16, 24); oy = -8;
      p.ellipse(8, 20, 6, 3, '#7a7a72'); p.ellipse(8, 15, 5, 3, '#8a8a82'); p.ellipse(8, 10, 4, 3, '#9a9a92'); p.ellipse(8, 6, 2, 2, '#aaaaa2');
      p.rect(7, 13, 3, 3, '#e8e0c8'); p.px(8, 14, '#2f6a44');
      p.outline();
      break;
    }
    case 'bramble': case 'bridge': case 'rocks': case 'snow': case 'ravine': case 'vents': case 'barrow': {
      p = new P(48, 48); ox = -16; oy = -16;
      if (kind === 'bramble') {
        for (let i = 0; i < 40; i++) { const x = 4 + (i * 13) % 40, y = 6 + (i * 7) % 36; p.circle(x, y, 3 + (i % 3), i % 2 ? '#3a5a2a' : '#2a4a20'); }
        for (let i = 0; i < 30; i++) p.px(4 + (i * 17) % 40, 4 + (i * 11) % 40, '#c0a080');
        for (let i = 0; i < 8; i++) p.px(6 + (i * 19) % 36, 8 + (i * 13) % 32, '#a02030');
      } else if (kind === 'bridge') {
        p.rect(0, 16, 48, 16, '#2a5a8a');
        p.rect(0, 18, 14, 12, '#6a4a28'); p.rect(34, 18, 14, 12, '#6a4a28'); p.line(14, 20, 20, 30, '#6a4a28'); p.line(34, 20, 28, 31, '#6a4a28');
        for (let x = 0; x < 14; x += 4) p.rect(x, 18, 1, 12, '#4a3018');
      } else if (kind === 'rocks') {
        for (let i = 0; i < 14; i++) { const x = 6 + (i * 11) % 36, y = 8 + (i * 17) % 32; p.ellipse(x, y, 5 + (i % 3), 4, i % 2 ? '#b07a50' : '#c08a60'); }
      } else if (kind === 'snow') {
        for (let i = 0; i < 12; i++) { const x = 6 + (i * 11) % 36, y = 8 + (i * 17) % 32; p.ellipse(x, y, 8, 6, i % 2 ? '#ffffff' : '#e8f0f8'); }
      } else if (kind === 'ravine') {
        p.rect(0, 10, 48, 28, '#1a1410'); p.rect(0, 10, 48, 3, '#4a3a2a'); p.rect(0, 35, 48, 3, '#3a2a1a');
        for (let i = 0; i < 6; i++) p.line(i * 8, 10, i * 8 + 3, 18, '#2f7a3a');
      } else if (kind === 'vents') {
        p.rect(4, 4, 40, 40, '#302b2e');
        for (let i = 0; i < 5; i++) { const x = 8 + (i * 9) % 32, y = 10 + (i * 13) % 28; p.ellipse(x, y, 3, 2, '#ff6020'); p.circle(x, y - 6, 3, 'rgba(240,240,240,0.6)'); }
      } else {
        p.ellipse(24, 30, 22, 16, '#5a5048'); p.ellipse(24, 34, 10, 10, '#0a0808'); p.rect(14, 24, 20, 2, '#7a7068');
      }
      p.outline();
      break;
    }
    default:
      p = new P(16, 16); p.rect(0, 0, 16, 16, '#f0f');
  }
  return (bldCache[kind] = { c: p.c, ox, oy });
}

export function wildHiveSprite(speciesId) {
  const key = 'wh:' + speciesId;
  if (structCache[key]) return structCache[key];
  const sp = SPECIES[speciesId];
  const p = new P(16, 18);
  const col = mix(sp.colors[0], '#c8a060', 0.5);
  p.ellipse(8, 10, 5, 7, col);
  for (let i = 0; i < 5; i++) p.rect(3, 5 + i * 3, 10, 1, shade(col, -0.2));
  p.rect(7, 13, 3, 2, '#1a1008');
  p.rect(7, 0, 2, 4, '#5a3a20');
  p.bevel().outline();
  return (structCache[key] = { c: p.c, ox: 0, oy: -2 });
}

// ───────────────── ITEM ICONS ─────────────────
const iconCache = {};
export function iconFor(stack) {
  const def = ITEMS[stack.id];
  if (!def) return null;
  let key = stack.id;
  let spId = null;
  if (def.cat === 'specimen' && stack.g) { spId = stack.g.lineage[0] === stack.g.lineage[1] ? stack.g.lineage[0] : stack.sp || stack.g.lineage[0]; key += ':' + (stack.sp || spId); }
  if (iconCache[key]) return iconCache[key];
  const p = new P(16, 16);
  const [shape, a, b] = def.icon;
  const sp = stack.sp ? SPECIES[stack.sp] : spId ? SPECIES[spId] : null;
  switch (shape) {
    case 'hummer': {
      const s = hummerSprite(sp ? sp.id : 'meadowmote', 0);
      p.g.drawImage(s, 0, 0, 9, 8, 1, 2, 14, 12);
      if (stack.id === 'heiress' || stack.id === 'matron') { p.rect(5, 0, 6, 2, '#ffd040'); p.px(5, 0, '#fff0a0'); p.px(8, 0, '#fff0a0'); p.px(10, 0, '#fff0a0'); }
      break;
    }
    case 'scion': {
      const [leaf, trunk] = sp ? sp.colors : ['#4f9a3c', '#6a4a2a'];
      p.rect(5, 12, 6, 3, '#7a5030'); p.rect(5, 12, 6, 1, '#9a7050');
      p.line(8, 12, 8, 6, trunk); p.circle(6, 6, 2, leaf); p.circle(10, 5, 2, shade(leaf, 0.1)); p.circle(8, 3, 2, shade(leaf, -0.05));
      p.outline();
      break;
    }
    case 'flitter': {
      const s = flitterSprite(sp ? sp.id : 'meadowpale', 0);
      p.g.drawImage(s, 0, 0, 11, 9, 1, 2, 14, 12);
      break;
    }
    case 'chrysal': {
      const c = sp ? mix(sp.colors[0], '#e8dcc0', 0.5) : '#e8dcc0';
      p.line(8, 0, 8, 3, '#6a5a40'); p.ellipse(8, 9, 3, 6, c); p.ellipse(7, 7, 1, 3, shade(c, 0.3)); p.rect(5, 11, 6, 1, shade(c, -0.2));
      p.outline();
      break;
    }
    case 'comb': {
      for (const [x, y] of [[3, 3], [8, 3], [5, 7], [10, 7], [3, 11], [8, 11], [13, 3]]) {
        if (x > 12 && y > 2) continue;
        p.rect(x, y, 4, 4, a); p.rect(x + 1, y + 1, 2, 2, b); p.px(x, y, shade(a, 0.3));
      }
      p.outline();
      break;
    }
    case 'jar': p.rect(4, 5, 8, 9, a); p.rect(5, 3, 6, 2, '#e8e0d0'); p.rect(5, 6, 2, 6, shade(a, 0.35)); p.rect(4, 3, 8, 1, '#c0a060'); p.outline(); break;
    case 'wax': p.rect(3, 6, 10, 7, a); p.rect(3, 6, 10, 2, shade(a, 0.3)); p.rect(4, 8, 2, 4, shade(a, -0.15)); p.outline(); break;
    case 'bottle': p.rect(5, 6, 6, 8, a); p.rect(7, 2, 2, 4, b || shade(a, -0.2)); p.rect(6, 2, 4, 1, '#6a4a2a'); p.rect(6, 7, 1, 5, shade(a, 0.4)); p.rect(5, 10, 6, 2, b || shade(a, -0.3)); p.outline(); break;
    case 'knot': p.circle(8, 8, 5, a); p.line(4, 6, 12, 10, shade(a, -0.3)); p.line(5, 11, 11, 5, shade(a, -0.3)); p.px(6, 6, '#fff8c0'); p.outline(); break;
    case 'blob': p.ellipse(8, 9, 5, 4, a); p.ellipse(7, 8, 2, 1, shade(a, 0.35)); p.outline(); break;
    case 'dust': for (let i = 0; i < 14; i++) p.px(3 + (i * 7) % 10, 4 + (i * 5) % 9, i % 3 ? a : shade(a, 0.5)); p.ellipse(8, 12, 5, 2, shade(a, -0.1)); p.outline(); break;
    case 'shard': p.line(5, 13, 9, 2, a); p.rect(6, 6, 3, 7, a); p.line(10, 13, 11, 6, shade(a, -0.15)); p.px(7, 5, '#ffffff'); p.outline(); break;
    case 'flake': for (const [x, y] of [[4, 5], [9, 4], [6, 9], [10, 10], [3, 11]]) { p.rect(x, y, 3, 2, a); p.px(x, y, shade(a, 0.4)); } p.outline(); break;
    case 'grain': for (let i = 0; i < 4; i++) { p.line(5 + i * 2, 14, 6 + i * 2, 4, '#a08040'); p.ellipse(6 + i * 2, 5, 1, 2, a); } p.outline(); break;
    case 'block': p.rect(3, 5, 10, 8, a); p.rect(3, 5, 10, 2, shade(a, 0.25)); p.outline(); break;
    case 'candy': p.ellipse(8, 8, 4, 3, a); p.line(2, 6, 4, 8, a); p.line(2, 10, 4, 8, a); p.line(12, 8, 14, 6, a); p.line(12, 8, 14, 10, a); p.px(7, 7, '#ffffff'); p.outline(); break;
    case 'coin': p.circle(8, 8, 5, a); p.circle(8, 8, 3, shade(a, -0.15)); p.px(7, 6, '#fff8c0'); p.outline(); break;
    case 'log': p.rect(2, 6, 12, 6, a); p.ellipse(13, 9, 2, 3, b); p.ellipse(13, 9, 1, 1, shade(b, -0.2)); p.rect(2, 6, 12, 1, shade(a, 0.2)); p.outline(); break;
    case 'leaf': p.ellipse(8, 8, 5, 3, a); p.line(4, 11, 12, 5, shade(a, -0.3)); p.ellipse(5, 11, 2, 1, shade(a, -0.15)); p.outline(); break;
    case 'drop': p.circle(8, 10, 4, a); p.line(8, 3, 8, 7, a); p.rect(7, 5, 3, 3, a); p.px(6, 9, shade(a, 0.4)); p.outline(); break;
    case 'fruit': p.circle(8, 9, 5, a); p.line(8, 4, 9, 2, '#5a3a20'); p.ellipse(10, 3, 2, 1, '#4a9a3c'); p.px(6, 7, shade(a, 0.45)); p.outline(); break;
    case 'cherry': p.circle(5, 11, 3, a); p.circle(11, 11, 3, a); p.line(5, 8, 9, 2, '#4a3a20'); p.line(11, 8, 9, 2, '#4a3a20'); p.px(4, 10, '#ffffff'); p.px(10, 10, '#ffffff'); p.outline(); break;
    case 'nut': p.ellipse(8, 9, 5, 5, a); p.rect(8, 4, 1, 10, shade(a, -0.3)); p.px(6, 7, shade(a, 0.3)); p.outline(); break;
    case 'banana': for (let i = 0; i < 9; i++) p.rect(3 + i, 10 - Math.round(Math.sin(i / 3) * 3), 2, 3, a); p.px(3, 10, '#5a3a20'); p.outline(); break;
    case 'star': p.circle(8, 8, 3, a); for (let i = 0; i < 5; i++) { const ang = i * 1.2566 - 1.57; p.line(8, 8, 8 + Math.cos(ang) * 6, 8 + Math.sin(ang) * 6, a); } p.outline(); break;
    case 'cocoon': p.ellipse(8, 8, 3, 6, a); p.line(5, 5, 11, 7, shade(a, -0.12)); p.line(5, 9, 11, 11, shade(a, -0.12)); p.outline(); break;
    case 'wisp': for (let i = 0; i < 3; i++) p.line(3, 4 + i * 4, 13, 6 + i * 3, i % 2 ? a : shade(a, -0.1)); p.outline(); break;
    case 'fiber': for (let i = 0; i < 5; i++) p.line(4 + i * 2, 14, 7 + i, 2, i % 2 ? a : shade(a, -0.2)); p.rect(4, 9, 9, 2, '#8a6a30'); p.outline(); break;
    case 'stone': p.ellipse(8, 9, 5, 4, a); p.ellipse(7, 8, 2, 1, shade(a, 0.3)); p.outline(); break;
    case 'plank': p.rect(2, 5, 12, 3, a); p.rect(2, 9, 12, 3, a); p.rect(2, 5, 12, 1, b || shade(a, 0.3)); p.rect(2, 9, 12, 1, b || shade(a, 0.3)); p.outline(); break;
    case 'mug': p.rect(4, 5, 7, 9, '#c0a060'); p.rect(5, 6, 5, 3, a); p.rect(11, 7, 2, 4, '#c0a060'); p.rect(4, 4, 7, 2, '#fff8e0'); p.outline(); break;
    case 'pane': p.rect(3, 3, 10, 10, a); p.rect(3, 3, 10, 1, shade(a, 0.4)); p.line(5, 11, 11, 5, shade(a, 0.5)); p.rect(3, 3, 1, 10, shade(a, -0.2)); p.outline(); break;
    case 'cloth': p.rect(3, 4, 10, 9, a); for (let i = 0; i < 4; i++) p.rect(3, 5 + i * 2, 10, 1, b); p.outline(); break;
    case 'candle': p.rect(6, 6, 4, 8, a); p.rect(5, 13, 6, 2, '#a07a40'); p.px(8, 4, '#ffb040'); p.px(8, 5, '#ffe080'); p.outline(); break;
    case 'ingot': p.rect(2, 7, 12, 5, a); p.rect(4, 5, 8, 2, shade(a, 0.25)); p.rect(2, 11, 12, 1, shade(a, -0.3)); p.outline(); break;
    case 'gem': p.line(4, 6, 8, 2, a); p.line(12, 6, 8, 2, a); p.rect(4, 6, 9, 2, a); p.line(4, 7, 8, 13, a); p.line(12, 7, 8, 13, a); p.rect(6, 7, 5, 3, a); p.px(7, 4, '#ffffff'); p.outline(); break;
    case 'gear': p.circle(8, 8, 5, a); for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4; p.rect(8 + Math.cos(ang) * 6 - 1, 8 + Math.sin(ang) * 6 - 1, 2, 2, a); } p.circle(8, 8, 2, '#3a3a3a'); p.outline(); break;
    case 'frame': p.rect(2, 3, 12, 11, a); p.rect(4, 5, 8, 7, '#e8c060'); for (let i = 0; i < 3; i++) p.rect(5 + i * 2.5, 6, 1, 5, '#c09030'); p.outline(); break;
    case 'module': p.rect(2, 3, 12, 11, '#6a6a72'); p.rect(2, 3, 12, 2, '#8a8a92'); p.circle(8, 9, 3, a); p.px(7, 8, '#ffffff'); p.outline(); break;
    case 'scoop': p.ellipse(10, 6, 4, 4, a); p.ellipse(10, 5, 3, 2, shade(a, -0.3)); p.line(7, 9, 2, 14, '#6a4a2a'); p.outline(); break;
    case 'net': p.circle(10, 6, 4, a); p.circle(10, 6, 3, 'rgba(0,0,0,0)'); for (let i = 7; i < 14; i += 2) p.line(i, 3, i, 9, shade(a, -0.2)); p.line(7, 9, 2, 14, '#6a4a2a'); p.outline(); break;
    case 'axe': p.line(4, 14, 11, 3, '#7a5030'); p.rect(9, 2, 5, 5, a); p.rect(13, 2, 1, 5, shade(a, 0.3)); p.outline(); break;
    case 'knife': p.line(3, 13, 7, 9, '#5a3a20'); p.line(7, 9, 13, 3, a); p.line(8, 9, 13, 4, shade(a, -0.2)); p.outline(); break;
    case 'lens': p.circle(7, 7, 4, a); p.circle(7, 7, 3, '#c8e8f8'); p.px(6, 5, '#ffffff'); p.line(10, 10, 14, 14, '#6a4a2a'); p.outline(); break;
    case 'hook': p.line(4, 14, 9, 6, '#7a5030'); p.line(9, 6, 12, 2, a); p.line(12, 2, 14, 5, a); p.outline(); break;
    case 'ward': p.ellipse(8, 9, 5, 6, a); p.rect(6, 2, 4, 3, shade(a, -0.2)); p.line(5, 6, 5, 13, shade(a, 0.3)); p.outline(); break;
    case 'lantern': p.rect(5, 5, 6, 8, '#4a4a52'); p.rect(6, 6, 4, 6, a); p.rect(7, 2, 2, 3, '#4a4a52'); p.px(7, 8, '#fff0a0'); p.outline(); break;
    case 'seed': p.rect(4, 5, 8, 9, '#c8a870'); p.rect(4, 5, 8, 2, '#a88a50'); p.circle(8, 10, 2, a); p.outline(); break;
    case 'struct': {
      const s = structSprite(b || stack.id, { dir: 0, bloom: 'wild' });
      const w = s.c.width, h = s.c.height, sc = Math.min(15 / w, 15 / h);
      p.g.drawImage(s.c, 0, 0, w, h, Math.round(8 - w * sc / 2), Math.round(8 - h * sc / 2), Math.round(w * sc), Math.round(h * sc));
      break;
    }
    default: p.rect(3, 3, 10, 10, a || '#f0f'); p.outline();
  }
  return (iconCache[key] = p.c);
}

export function iconDataURL(stack) {
  const c = iconFor(stack);
  if (!c) return '';
  const key = '__url_' + (stack.sp || '') + stack.id;
  if (iconCache[key]) return iconCache[key];
  // Upscale for crisp CSS display
  const [big, g] = canvas(48, 48);
  g.imageSmoothingEnabled = false;
  g.drawImage(c, 0, 0, 16, 16, 0, 0, 48, 48);
  return (iconCache[key] = big.toDataURL());
}
