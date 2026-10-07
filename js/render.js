// Draws the world.
import { TS, TILE, drawTile, decorSprite, treeSprite, structSprite, buildingSprite, wildHiveSprite, personSprite, hummerSprite, flitterSprite, iconFor, shade, tileBase } from './sprites.js';
import { W, H, CX, CY } from './world.js';
import { STRUCTURES } from './data/structures.js';
import { SPECIES } from './data/species.js';
import { NPCS } from './data/story.js';
import { REGION_ORDER } from './data/biomes.js';
import { hash2 } from './util.js';
import * as T from './time.js';
import { val } from './genetics.js';

const CH = 16; // chunk size in tiles

const GROUND_ORDER = { [TILE.WATER]: 0, [TILE.DEEP]: 0, [TILE.LAVA]: 0, [TILE.SHORE]: 2, [TILE.PATH]: 5, [TILE.STONE]: 6, [TILE.BRIDGE]: 7, [TILE.CLIFF]: 9, [TILE.BORDER]: 10 };

export class Renderer {
  constructor(canvas, game) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.chunks = new Map();
    this.zoom = 3;
    this.cam = { x: 0, y: 0 };
    this.rain = [];
    this.light = document.createElement('canvas');
    this.lctx = this.light.getContext('2d');
    this.t0 = performance.now();
    game.on('tileChanged', ({ x, y }) => this.dirty(x, y));
    game.on('gate', () => this.chunks.clear());
  }

  dirty(x, y) {
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const cx = Math.floor((x + ox) / CH), cy = Math.floor((y + oy) / CH);
      this.chunks.delete(cx + ',' + cy);
    }
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    this.cv.width = Math.floor(w * dpr); this.cv.height = Math.floor(h * dpr);
    this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
    this.dpr = dpr;
    const target = w < 700 ? 13 : w < 1100 ? 18 : 23; // tiles across
    const pref = this.game.state.settings.zoom || 0;
    let z = Math.max(2, Math.round((w * dpr) / (target * TS)));
    z = Math.max(2, z + pref);
    this.zoom = z;
    this.ctx.imageSmoothingEnabled = false;
    this.light.width = Math.ceil(this.cv.width / 4); this.light.height = Math.ceil(this.cv.height / 4);
  }

  // world tile coords -> screen px
  sx(x) { return Math.round((x * TS - this.cam.x) * this.zoom); }
  sy(y) { return Math.round((y * TS - this.cam.y) * this.zoom); }
  screenToTile(px, py) {
    const x = (px * this.dpr) / this.zoom / TS + this.cam.x / TS;
    const y = (py * this.dpr) / this.zoom / TS + this.cam.y / TS;
    return [x, y];
  }

  chunk(cx, cy) {
    const key = cx + ',' + cy;
    let c = this.chunks.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = CH * TS; c.height = CH * TS;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const w = this.game.world;
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const x = cx * CH + tx, y = cy * CH + ty;
      if (!w.inside(x, y)) { g.fillStyle = '#2a2622'; g.fillRect(tx * TS, ty * TS, TS, TS); continue; }
      drawTile(g, w.tile(x, y), tx * TS, ty * TS, x, y, 0);
    }
    // soft transitions + cliff faces + water edges
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const x = cx * CH + tx, y = cy * CH + ty;
      if (!w.inside(x, y)) continue;
      this.edges(g, w, x, y, tx * TS, ty * TS);
    }
    // decor
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const x = cx * CH + tx, y = cy * CH + ty;
      if (!w.inside(x, y)) continue;
      const d = w.decor[y * W + x];
      if (!d) continue;
      g.drawImage(decorSprite(d, Math.floor(hash2(x, y, 3) * 4), w.regionId(x, y)), tx * TS, ty * TS);
    }
    this.chunks.set(key, c);
    return c;
  }

  edges(g, w, x, y, ox, oy) {
    const t = w.tile(x, y);
    const isWater = (tt) => tt === TILE.WATER || tt === TILE.DEEP;
    const n = w.tile(x, y - 1), s = w.tile(x, y + 1), e = w.tile(x + 1, y), wv = w.tile(x - 1, y);
    if (t === TILE.CLIFF || t === TILE.BORDER) {
      const base = tileBase(t);
      if (n !== TILE.CLIFF && n !== TILE.BORDER) { g.fillStyle = shade(base, 0.25); g.fillRect(ox, oy, TS, 2); g.fillStyle = shade(base, 0.12); g.fillRect(ox, oy + 2, TS, 1); }
      if (s !== TILE.CLIFF && s !== TILE.BORDER) {
        g.fillStyle = shade(base, -0.3); g.fillRect(ox, oy + TS - 5, TS, 5);
        g.fillStyle = shade(base, -0.45); g.fillRect(ox, oy + TS - 1, TS, 1);
        for (let i = 0; i < 4; i++) g.fillRect(ox + Math.floor(hash2(x, y + i, 2) * 14), oy + TS - 5, 1, 4);
      }
      if (e !== TILE.CLIFF && e !== TILE.BORDER) { g.fillStyle = shade(base, -0.18); g.fillRect(ox + TS - 1, oy, 1, TS); }
      if (wv !== TILE.CLIFF && wv !== TILE.BORDER) { g.fillStyle = shade(base, 0.1); g.fillRect(ox, oy, 1, TS); }
      return;
    }
    if (isWater(t)) {
      g.fillStyle = 'rgba(255,255,255,0.35)';
      if (!isWater(n) && n !== TILE.LAVA) g.fillRect(ox, oy, TS, 1);
      if (!isWater(wv)) g.fillRect(ox, oy, 1, TS);
      if (!isWater(e)) g.fillRect(ox + TS - 1, oy, 1, TS);
      g.fillStyle = 'rgba(0,0,40,0.18)';
      if (!isWater(n)) g.fillRect(ox, oy + 1, TS, 3);
      return;
    }
    // dithered blending with lower-order neighbours
    const myO = GROUND_ORDER[t] ?? 3;
    const dirs = [[0, -1, n], [0, 1, s], [1, 0, e], [-1, 0, wv]];
    for (const [dx, dy, nt] of dirs) {
      if (nt === t || isWater(nt) || nt === TILE.CLIFF || nt === TILE.BORDER || nt === TILE.LAVA) continue;
      const no = GROUND_ORDER[nt] ?? 3;
      if (no <= myO && !(no === myO && nt > t)) continue;
      const col = tileBase(nt);
      g.fillStyle = col;
      for (let k = 0; k < 16; k++) {
        const r = hash2(x * 7 + k, y * 13 + k, nt);
        const depth = r < 0.5 ? 0 : r < 0.8 ? 1 : 2;
        const along = k;
        if (hash2(x + k, y - k, 9) < 0.55) continue;
        if (dy === -1) g.fillRect(ox + along, oy + depth, 1, 1);
        if (dy === 1) g.fillRect(ox + along, oy + TS - 1 - depth, 1, 1);
        if (dx === 1) g.fillRect(ox + TS - 1 - depth, oy + along, 1, 1);
        if (dx === -1) g.fillRect(ox + depth, oy + along, 1, 1);
      }
    }
  }

  draw(ui) {
    const g = this.game, ctx = this.ctx, z = this.zoom;
    const now = performance.now();
    const p = g.state.player;
    const vw = this.cv.width / z, vh = this.cv.height / z; // in px (16/tile)
    this.cam.x = Math.round(p.x * TS - vw / 2);
    this.cam.y = Math.round(p.y * TS - vh / 2 - 6);
    this.cam.x = Math.max(0, Math.min(W * TS - vw, this.cam.x));
    this.cam.y = Math.max(0, Math.min(H * TS - vh, this.cam.y));
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1d1a17';
    ctx.fillRect(0, 0, this.cv.width, this.cv.height);
    const x0 = Math.floor(this.cam.x / TS) - 1, y0 = Math.floor(this.cam.y / TS) - 1;
    const x1 = Math.ceil((this.cam.x + vw) / TS) + 1, y1 = Math.ceil((this.cam.y + vh) / TS) + 3;
    // ground
    for (let cy = Math.floor(y0 / CH); cy <= Math.floor(y1 / CH); cy++)
      for (let cx = Math.floor(x0 / CH); cx <= Math.floor(x1 / CH); cx++) {
        if (cx < 0 || cy < 0 || cx * CH >= W || cy * CH >= H) continue;
        const c = this.chunk(cx, cy);
        ctx.drawImage(c, this.sx(cx * CH), this.sy(cy * CH), CH * TS * z, CH * TS * z);
      }
    // animated water/lava
    const frame = Math.floor(now / 450);
    const w = g.world;
    for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
      const t = w.tiles[y * W + x];
      if (t === TILE.WATER || t === TILE.DEEP) {
        const r = hash2(x, y, 31);
        const f = (frame + Math.floor(r * 8)) % 8;
        if (f < 3) { ctx.fillStyle = 'rgba(200,230,255,0.45)'; ctx.fillRect(this.sx(x) + Math.floor(r * 10) * z, this.sy(y) + ((Math.floor(r * 13) + f * 2) % 14) * z, 3 * z, z); }
      } else if (t === TILE.LAVA) {
        const r = hash2(x, y, 33), f = (frame + Math.floor(r * 6)) % 6;
        ctx.fillStyle = f < 2 ? 'rgba(255,230,120,0.7)' : 'rgba(255,120,40,0.3)';
        ctx.fillRect(this.sx(x) + Math.floor(r * 11) * z, this.sy(y) + Math.floor(r * 7 + f) % 14 * z, 3 * z, 2 * z);
      }
    }
    // floor entities
    const sprites = [];
    for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
      const fid = g.floor[y * W + x];
      if (fid) {
        const e = g.state.ents[fid];
        if (e && e.x === x && e.y === y) this.drawFloor(e, frame);
      }
      const id = g.occ[y * W + x];
      if (id) {
        const e = g.state.ents[id];
        if (e && e.x === x && e.y === y) sprites.push({ k: e.y + (e.t === 's' ? STRUCTURES[e.s].size[1] : 1) - 0.01, e });
      }
    }
    // fixtures
    for (const f of g.fixtures) {
      if (f.x + (f.w || 1) + 3 < x0 || f.x - 3 > x1 || f.y - 6 > y1 || f.y + 3 < y0) continue;
      sprites.push({ k: f.y + (f.h || 1) - 0.02, f });
    }
    // people
    for (const n of g.npcs) if (n.x > x0 - 1 && n.x < x1 + 1 && n.y > y0 - 1 && n.y < y1 + 2) sprites.push({ k: n.y, npc: n });
    sprites.push({ k: p.y, player: true });
    for (const fl of g.wildFlitters) sprites.push({ k: fl.y + 0.6, wf: fl });
    sprites.sort((a, b) => a.k - b.k);
    for (const s of sprites) {
      if (s.e) this.drawEnt(s.e, now, frame);
      else if (s.f) this.drawFixture(s.f, now);
      else if (s.npc) this.drawPerson(NPCS[s.npc.id].look, s.npc.x, s.npc.y, s.npc.dir, s.npc.moving ? s.npc.frame : 0);
      else if (s.player) this.drawPerson(ui.playerLook(), p.x, p.y, p.dir, ui.walkFrame);
      else if (s.wf) this.drawWildFlitter(s.wf, now);
    }
    // particles / effects
    this.drawFx(now);
    // weather
    const region = g.regionAt(p.x, p.y);
    if (T.rainingIn(g.now, region)) this.drawRain(region === 'rimeback', now);
    if (region === 'ashvent') this.drawAsh(now);
    // lighting
    this.drawLight(region);
    // highlight
    if (ui.highlight) {
      const h = ui.highlight;
      ctx.strokeStyle = h.bad ? 'rgba(255,90,70,0.9)' : 'rgba(255,240,180,0.9)';
      ctx.lineWidth = Math.max(2, z / 1.5);
      ctx.strokeRect(this.sx(h.x) + 1, this.sy(h.y) + 1, (h.w || 1) * TS * z - 2, (h.h || 1) * TS * z - 2);
    }
    if (ui.ghost) this.drawGhost(ui.ghost);
  }

  drawFloor(e, frame) {
    const ctx = this.ctx, z = this.zoom;
    const spr = structSprite(e.s, { dir: e.dir || 0, frame: e.item ? frame : 0 });
    ctx.drawImage(spr.c, this.sx(e.x) + spr.ox * z, this.sy(e.y) + spr.oy * z, spr.c.width * z, spr.c.height * z);
    if (e.item) {
      const ic = iconFor(e.item);
      if (ic) ctx.drawImage(ic, this.sx(e.x) + 3 * z, this.sy(e.y) + 2 * z, 10 * z, 10 * z);
    }
  }

  drawEnt(e, now, frame) {
    const ctx = this.ctx, z = this.zoom, g = this.game;
    if (e.t === 'g') {
      const stage = e.stump ? 0 : e.growth >= 1 ? 2 : e.growth >= 0.35 ? 1 : 0;
      const fruit = e.buf && e.buf.some((s) => !s.g && s.id !== 'leaf_litter' && s.id !== 'silk_cocoon');
      const spr = treeSprite(e.sp, stage, { fruit, blossom: !!e.pol, stump: !!e.stump });
      ctx.drawImage(spr.c, this.sx(e.x) + spr.ox * z, this.sy(e.y) + spr.oy * z, spr.c.width * z, spr.c.height * z);
      if (e.colony && stage === 2) {
        const n = e.colony.active === false ? 1 : 2;
        for (let i = 0; i < n; i++) {
          const t = now / 1000 + i * 2.3 + e.id;
          const fx = e.x + 0.5 + Math.sin(t * 0.9) * 0.9, fy = e.y - 0.9 + Math.cos(t * 1.3) * 0.5 - (e.colony.active === false ? -0.6 : 0);
          const fs = flitterSprite(e.colony.sp, Math.floor(now / 140 + i) % 2);
          ctx.drawImage(fs, this.sx(fx) - 5 * z, this.sy(fy) - 4 * z, fs.width * z, fs.height * z);
        }
      }
      if (e.buf && e.buf.length && stage === 2) this.bubble(e.x + 0.5, e.y - 1.9, now);
      return;
    }
    if (e.t === 'w') {
      if (e.gone) return;
      const spr = wildHiveSprite(e.sp);
      ctx.drawImage(spr.c, this.sx(e.x) + spr.ox * z, this.sy(e.y) + spr.oy * z, spr.c.width * z, spr.c.height * z);
      this.bees(e.x + 0.5, e.y + 0.4, e.sp, now, 2, e.id);
      return;
    }
    const st = STRUCTURES[e.s];
    let opts = {};
    if (st.kind === 'machine') opts = { frame: e.on ? Math.floor(now / 200) % 8 : 0, on: !!e.on };
    else if (e.s === 'windsail') opts = { frame: Math.floor(now / 250) % 2 };
    else if (e.s === 'waterwheel') opts = { frame: Math.floor(now / 300) % 2 };
    else if (e.s === 'windlass') opts = { frame: e.crankT && now - e.crankT < 600 ? Math.floor(now / 100) % 4 : 0 };
    else if (e.s === 'bellows') opts = { on: !!e.on };
    else if (e.s === 'springcoil') opts = { level: Math.round(Math.min(1, (g.state.battery || 0) / Math.max(1, g.simRef?.powerCap || 430)) * 8) / 8 };
    else if (e.s === 'flowerbed') opts = { bloom: e.bloom };
    else if (e.s === 'lamppost') opts = { on: T.darkness(g.now) > 0.2 || g.regionAt(e.x, e.y) === 'hollow' };
    const spr = structSprite(e.s, opts);
    ctx.drawImage(spr.c, this.sx(e.x) + spr.ox * z, this.sy(e.y) + spr.oy * z, spr.c.width * z, spr.c.height * z);
    if (st.housing && e.matron) {
      if (e.work) this.bees(e.x + st.size[0] / 2, e.y + st.size[1] / 2 - 0.3, e.matron.sp, now, e.s === 'hivespire' ? 5 : 3, e.id);
      if (e.out && e.out.length) this.bubble(e.x + st.size[0] / 2, e.y - (e.s === 'hivespire' ? 1.4 : 0.9), now);
    } else if ((st.kind === 'machine' || e.s === 'cradle' || e.s === 'groundskeeper') && e.out && e.out.length) {
      this.bubble(e.x + 0.5, e.y - 0.8, now);
    }
    if (st.housing && !e.work && e.matron && Math.floor(now / 600) % 2) this.zz(e.x + st.size[0] - 0.2, e.y - 0.6);
  }

  bubble(x, y, now) {
    const ctx = this.ctx, z = this.zoom;
    const by = y + Math.sin(now / 300) * 0.06;
    ctx.fillStyle = '#fff6d8';
    ctx.fillRect(this.sx(x) - 3 * z, this.sy(by) - 3 * z, 6 * z, 5 * z);
    ctx.fillRect(this.sx(x) - 1 * z, this.sy(by) + 2 * z, 2 * z, z);
    ctx.fillStyle = '#c9a24b';
    ctx.fillRect(this.sx(x) - 1 * z, this.sy(by) - 2 * z, 2 * z, 3 * z);
  }
  zz(x, y) {
    const ctx = this.ctx, z = this.zoom;
    ctx.fillStyle = 'rgba(230,240,255,0.85)';
    ctx.font = `${6 * z}px "Pixelify Sans", monospace`;
    ctx.fillText('z', this.sx(x), this.sy(y));
  }

  bees(x, y, sp, now, n, seed) {
    const ctx = this.ctx, z = this.zoom;
    for (let i = 0; i < n; i++) {
      const t = now / 1000 * (1 + i * 0.13) + i * 1.7 + seed;
      const bx = x + Math.sin(t * 1.7) * (0.6 + i * 0.12), by = y + Math.cos(t * 2.3) * 0.45 - 0.2;
      const s = hummerSprite(sp, Math.floor(now / 60 + i) % 2);
      ctx.drawImage(s, this.sx(bx) - 2 * z, this.sy(by) - 2 * z, 5 * z, 4 * z);
    }
  }

  drawFixture(f, now) {
    const ctx = this.ctx, z = this.zoom, g = this.game;
    let spr, dx = 0, dy = 0;
    switch (f.kind) {
      case 'building': spr = buildingSprite(f.b.kind); break;
      case 'board': spr = buildingSprite('board'); break;
      case 'well': spr = buildingSprite('well'); break;
      case 'cairn': spr = buildingSprite('cairn'); break;
      case 'boat': spr = buildingSprite('boat'); dy = Math.sin(now / 700) * 1; if (!g.state.ferry) { ctx.globalAlpha = 0.65; } break;
      case 'heartroot': spr = buildingSprite(g.state.awake ? 'heartroot_awake' : 'heartroot_dormant'); dx = 8; break;
      case 'gate': spr = buildingSprite(f.gate.obstacle); break;
    }
    if (!spr) return;
    ctx.drawImage(spr.c, this.sx(f.x) + (spr.ox + dx) * z, this.sy(f.y) + (spr.oy + dy) * z, spr.c.width * z, spr.c.height * z);
    ctx.globalAlpha = 1;
    if (f.kind === 'cairn' && !g.state.lore[f.region + ':' + f.idx]) {
      ctx.fillStyle = `rgba(255,230,140,${0.5 + 0.4 * Math.sin(now / 300)})`;
      ctx.fillRect(this.sx(f.x + 0.5) - z, this.sy(f.y - 0.9), 2 * z, 2 * z);
    }
  }

  drawPerson(look, x, y, dir, frame) {
    const ctx = this.ctx, z = this.zoom;
    const s = personSprite(look, dir, frame);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(this.sx(x), this.sy(y) + z, 5 * z, 2 * z, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(s, this.sx(x) - 8 * z, this.sy(y) - 18 * z, 16 * z, 20 * z);
  }

  drawWildFlitter(f, now) {
    const ctx = this.ctx, z = this.zoom;
    const s = flitterSprite(f.sp, Math.floor(now / 130 + f.seed) % 2);
    const bob = Math.sin(now / 250 + f.seed) * 0.15;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(this.sx(f.x) - 2 * z, this.sy(f.y) + z, 4 * z, z);
    ctx.drawImage(s, this.sx(f.x) - 5 * z, this.sy(f.y - 0.7 + bob) - 4 * z, s.width * z, s.height * z);
  }

  drawFx(now) {
    const ctx = this.ctx, z = this.zoom, g = this.game;
    g.fx = g.fx.filter((f) => now - f.t < f.life);
    for (const f of g.fx) {
      const a = 1 - (now - f.t) / f.life;
      if (f.kind === 'text') {
        ctx.globalAlpha = a;
        ctx.font = `bold ${5 * z}px "Pixelify Sans", monospace`;
        ctx.fillStyle = '#1a140c';
        ctx.fillText(f.text, this.sx(f.x) + z, this.sy(f.y - (1 - a) * 1.2) + z);
        ctx.fillStyle = f.color || '#fff4c0';
        ctx.fillText(f.text, this.sx(f.x), this.sy(f.y - (1 - a) * 1.2));
        ctx.globalAlpha = 1;
      } else if (f.kind === 'sparkle') {
        for (let i = 0; i < 6; i++) {
          const ang = i / 6 * Math.PI * 2 + f.t, r = (1 - a) * 1.1;
          ctx.fillStyle = `rgba(255,240,170,${a})`;
          ctx.fillRect(this.sx(f.x + Math.cos(ang) * r), this.sy(f.y + Math.sin(ang) * r), z, z);
        }
      }
    }
  }

  drawRain(snow, now) {
    const ctx = this.ctx;
    const w = this.cv.width, h = this.cv.height;
    while (this.rain.length < (snow ? 110 : 160)) this.rain.push({ x: Math.random() * w, y: Math.random() * h, s: 0.6 + Math.random() * 0.8 });
    ctx.strokeStyle = snow ? 'rgba(255,255,255,0.85)' : 'rgba(180,210,255,0.45)';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(1, this.zoom / 2);
    ctx.beginPath();
    for (const r of this.rain) {
      if (snow) { r.y += 1.2 * r.s * this.zoom / 2; r.x += Math.sin(now / 600 + r.s * 9) * 0.6; ctx.fillRect(r.x, r.y, this.zoom, this.zoom); }
      else { r.y += 9 * r.s * this.zoom / 3; r.x -= 2 * r.s; ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + 2 * this.zoom / 3, r.y - 6 * this.zoom / 2); }
      if (r.y > h) { r.y = -10; r.x = Math.random() * w; }
      if (r.x < 0) r.x = w;
    }
    ctx.stroke();
    ctx.fillStyle = snow ? 'rgba(220,230,255,0.08)' : 'rgba(40,60,90,0.12)';
    ctx.fillRect(0, 0, w, h);
  }

  drawAsh(now) {
    const ctx = this.ctx;
    const w = this.cv.width, h = this.cv.height;
    ctx.fillStyle = 'rgba(255,140,60,0.06)'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = (hash2(i, 1, 5) * w + now / 40 * (0.3 + hash2(i, 2, 5))) % w;
      const y = h - ((hash2(i, 3, 5) * h + now / 25 * (0.5 + hash2(i, 4, 5))) % h);
      ctx.fillStyle = i % 3 ? 'rgba(90,80,80,0.7)' : 'rgba(255,140,50,0.8)';
      ctx.fillRect(x, y, this.zoom, this.zoom);
    }
  }

  drawLight(region) {
    const g = this.game, ctx = this.ctx;
    let dark = T.darkness(g.now);
    const hollow = region === 'hollow';
    if (hollow) dark = Math.max(dark, 0.86);
    if (g.state.awake) dark *= 0.8;
    if (dark < 0.02) return;
    const L = this.light, lc = this.lctx;
    const sc = 1 / 4;
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, L.width, L.height);
    const alpha = dark * (hollow ? 0.9 : 0.68);
    lc.fillStyle = hollow ? `rgba(8,6,20,${alpha})` : `rgba(12,18,48,${alpha})`;
    lc.fillRect(0, 0, L.width, L.height);
    lc.globalCompositeOperation = 'destination-out';
    const z = this.zoom;
    const hole = (x, y, r, str = 1) => {
      const px = this.sx(x) * sc, py = this.sy(y) * sc, pr = r * TS * z * sc;
      if (px < -pr || py < -pr || px > L.width + pr || py > L.height + pr) return;
      const grd = lc.createRadialGradient(px, py, 0, px, py, pr);
      grd.addColorStop(0, `rgba(0,0,0,${str})`); grd.addColorStop(0.6, `rgba(0,0,0,${str * 0.55})`); grd.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = grd;
      lc.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    };
    const p = g.state.player;
    hole(p.x, p.y - 0.4, hollow ? (g.hasTool('ember_lantern') ? 5 : 2.5) : 3.2, 0.9);
    for (const l of g.lights || []) hole(l.x + 0.5, l.y + 0.3, l.soft ? l.r * 0.8 : l.r, l.soft ? 0.7 : 0.95);
    for (const f of g.fixtures) {
      if (f.kind === 'building') hole(f.x + f.w / 2, f.y + f.h - 0.5, 2.6, 0.7);
      if (f.kind === 'heartroot' && g.state.awake) hole(f.x + 1.5, f.y, 9, 1);
    }
    for (const e of g.wildFlitters) if (e.sp === 'lanternmoth') hole(e.x, e.y - 0.6, 1.6, 0.8);
    // lava glow
    const w = g.world;
    if (region === 'ashvent') {
      const x0 = Math.floor(this.cam.x / TS), y0 = Math.floor(this.cam.y / TS);
      for (let y = y0; y < y0 + 30; y++) for (let x = x0; x < x0 + 40; x++) if (w.tile(x, y) === TILE.LAVA && (x + y) % 2 === 0) hole(x + 0.5, y + 0.5, 1.8, 0.6);
    }
    lc.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(L, 0, 0, this.cv.width, this.cv.height);
    ctx.imageSmoothingEnabled = false;
    // warm tint for lamp-lit areas at night
    if (dark > 0.3) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.08 * dark;
      for (const l of g.lights || []) {
        const px = this.sx(l.x + 0.5), py = this.sy(l.y + 0.3), pr = l.r * TS * z * 0.7;
        const grd = ctx.createRadialGradient(px, py, 0, px, py, pr);
        grd.addColorStop(0, '#ffcc66'); grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  drawGhost(gh) {
    const ctx = this.ctx, z = this.zoom;
    ctx.globalAlpha = 0.6;
    if (gh.sid) {
      const spr = structSprite(gh.sid, { dir: gh.dir || 0, bloom: null });
      ctx.drawImage(spr.c, this.sx(gh.x) + spr.ox * z, this.sy(gh.y) + spr.oy * z, spr.c.width * z, spr.c.height * z);
    } else if (gh.tree) {
      const spr = treeSprite(gh.tree, 0, {});
      ctx.drawImage(spr.c, this.sx(gh.x) + spr.ox * z, this.sy(gh.y) + spr.oy * z, spr.c.width * z, spr.c.height * z);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = gh.bad ? 'rgba(255,80,60,0.95)' : 'rgba(140,255,160,0.95)';
    ctx.lineWidth = Math.max(2, z / 1.5);
    ctx.strokeRect(this.sx(gh.x) + 1, this.sy(gh.y) + 1, (gh.w || 1) * TS * z - 2, (gh.h || 1) * TS * z - 2);
    if (gh.dirArrow !== undefined) {
      const cx = this.sx(gh.x + 0.5), cy = this.sy(gh.y + 0.5);
      const [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][gh.dirArrow];
      ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * 6 * z, cy + dy * 6 * z); ctx.stroke();
    }
  }

  // Small overview for the map panel
  mapImage() {
    if (this._map) return this._map;
    const c = document.createElement('canvas');
    c.width = W * 3; c.height = H * 3;
    const g = c.getContext('2d');
    const w = this.game.world;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      g.fillStyle = tileBase(w.tile(x, y));
      g.fillRect(x * 3, y * 3, 3, 3);
    }
    this._map = c;
    return c;
  }
}
