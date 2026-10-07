// The living estate: everything that happens over time.
import { STRUCTURES } from './data/structures.js';
import { ITEMS } from './data/items.js';
import { MACHINE } from './data/recipes.js';
import { SPECIES } from './data/species.js';
import { val, species, inactiveSpecies, tolerates, breed, cloneGenome, expressedId, trait } from './genetics.js';
import { totalItems, pushOut, addToSlots, canMerge, mkSpecimen, matchesTag, cloneStack, mk } from './inv.js';
import { DIRS, pick, clamp } from './util.js';
import { W, H } from './world.js';
import * as T from './time.js';
import { SEASON_MODS } from './data/biomes.js';

export const TICK = 0.5;
export const HIVE_CYCLE = 20;
export const GROVE_STEP = 10;
export const GROVE_CYCLE = 30;
export const COLONY_CYCLE = 30;
export const POLLEN_DELAY = 40;
const OUT_CAP = 64, MACHINE_OUT_CAP = 48, GROVE_BUF = 12;
const SCION_CHANCE = [0, 0.04, 0.08, 0.14, 0.22];
const PROD_SCALE = 1.6;

export class Sim {
  constructor(game) {
    this.game = game;
    this.tickN = 0;
    this.powerSat = 1; this.powerGen = 0; this.powerUse = 0; this.lastDemand = 0;
    this.giftT = 0; this.decorT = 0;
    this.log = null;
    this.cands = new Map();
  }
  note(key, n = 1) { if (this.log) this.log[key] = (this.log[key] || 0) + n; }
  noteList(key, v) { if (this.log) { (this.log[key] ||= []); if (!this.log[key].includes(v)) this.log[key].push(v); } }

  tick() {
    const g = this.game, dt = TICK;
    g.now += dt * 1000;
    g.state.simTime = g.now;
    this.tickN++;
    this.giftT += dt;
    if (this.giftT >= 5 || g.giftsDirty) { this.giftT = 0; g.giftsDirty = false; g.computeGifts(); }
    this.decorT += dt;
    if (this.decorT >= 30) { this.decorT = 0; this.respawnDecor(); }
    this.power(dt);
    const L = g.lists();
    let demand = 0;
    // Each grove steps every 10 s (staggered); wild groves far from home every 60 s.
    const slot = this.tickN % 20, round = Math.floor(this.tickN / 20) % 6;
    for (const e of L.groveSlots[slot]) {
      if (e.wild && !e.colony && !e.pol) { if ((e.id + round) % 6 === 0) this.groveStep(e, GROVE_STEP * 6); }
      else this.groveStep(e, GROVE_STEP);
    }
    if (this.tickN % 20 === 0) for (const e of L.wild) if (e.gone && g.now >= e.gone) e.gone = 0;
    for (const e of L.housings) this.housingTick(e, dt);
    for (const e of L.machines) demand += this.machineTick(e, dt, STRUCTURES[e.s]);
    for (const e of L.cradles) this.cradleTick(e, dt);
    for (const e of L.keepers) this.keeperTick(e, dt);
    this.lastDemand = demand;
    this.logistics();
  }

  // ───────── power ─────────
  power(dt) {
    const g = this.game;
    let gen = 0, coils = 0;
    for (const e of g.lists().power) {
      if (e.s === 'windsail') gen += 1 * T.windFactor(g.now, g.regionAt(e.x, e.y));
      else if (e.s === 'waterwheel') gen += 3;
      else if (e.s === 'conduit') gen += 40;
      else if (e.s === 'springcoil') coils++;
      else if (e.s === 'bellows') {
        if (e.burn <= 0 && e.fuel && e.fuel.n > 0 && this.lastDemand > 0) {
          e.burn = ITEMS[e.fuel.id].fuel || 10; e.fuel.n--; if (e.fuel.n <= 0) e.fuel = null;
        }
        if (e.burn > 0) { gen += 6; e.burn -= dt; e.on = true; } else e.on = false;
      }
    }
    const cap = 30 + coils * 400;
    g.state.battery = Math.min(cap, (g.state.battery || 0) + gen * dt);
    const need = this.lastDemand * dt;
    if (need <= 0) this.powerSat = 1;
    else if (g.state.battery >= need) { this.powerSat = 1; g.state.battery -= need; }
    else { this.powerSat = g.state.battery / need; g.state.battery = 0; }
    this.powerGen = gen; this.powerUse = this.lastDemand; this.powerCap = cap;
  }

  // ───────── housings ─────────
  housingCenter(e) { return e.s === 'hivespire' ? [e.x + 0.5, e.y + 0.5] : [e.x, e.y]; }
  housingMods(e) {
    const m = { temp: 0, hum: 0, mut: 1, life: 1, prod: 1, light: false, rain: false };
    for (const s of e.mods || []) {
      if (!s) continue;
      const d = ITEMS[s.id].mod;
      if (d.temp) m.temp += d.temp;
      if (d.hum) m.hum += d.hum;
      if (d.mut !== undefined) m.mut *= d.mut;
      if (d.life) m.life *= d.life;
      if (d.prod) m.prod *= d.prod;
      if (d.light) m.light = true;
      if (d.rain) m.rain = true;
    }
    let fp = 1;
    for (const f of e.frames || []) {
      if (!f) continue;
      const d = ITEMS[f.id].frame;
      fp *= d.prod; m.mut *= d.mut; m.life *= d.life;
    }
    m.prod *= Math.min(4, fp);
    return m;
  }
  housingEnv(e) {
    const g = this.game;
    const [cx, cy] = this.housingCenter(e);
    const env = g.envAt(cx, cy, e.id);
    const m = this.housingMods(e);
    env.temp = clamp(env.temp + m.temp, 0, 5);
    env.hum = clamp(env.hum + m.hum, 0, 2);
    if (m.light) env.lit = true;
    if (m.rain) env.shelter = true;
    env.mods = m;
    return env;
  }

  // Why a Matron with genome gm can't work here (or null if she can).
  blocker(gm, env, cx, cy, reach) {
    const sp = species(gm);
    const tol = tolerates(gm, env.temp, env.hum);
    if (!tol.ok) return tol.tooCold ? 'Too cold here' : tol.tooHot ? 'Too hot here' : tol.tooWet ? 'Too damp here' : 'Too dry here';
    const rhythm = val(gm, 'rhythm');
    const dark = env.night || env.dark;
    if (rhythm === 'day' && dark && !env.lit) return env.dark ? 'Too dark: needs light' : 'Resting until daylight';
    if (rhythm === 'night' && !dark) return 'Resting until nightfall';
    const hard = val(gm, 'hardiness');
    if (env.raining && !hard.rain && !env.shelter) return 'Sheltering from the rain';
    if (env.dark && !hard.cave) return 'Needs open sky';
    const bloom = val(gm, 'bloom');
    if (this.game.bloomCount(bloom, Math.round(cx), Math.round(cy), reach) === 0) return `No ${trait(gm, 'bloom').name} within ${reach} tiles`;
    return null;
  }

  housingTick(e, dt) {
    if (!e.matron && e.heiress && e.courier) this.mate(e);
    e.cyc = (e.cyc || 0) + dt;
    if (e.cyc < HIVE_CYCLE) return;
    e.cyc -= HIVE_CYCLE;
    this.housingCycle(e);
  }

  mate(e) {
    const st = STRUCTURES[e.s].housing;
    const h = e.heiress, c = e.courier;
    const m = this.housingMods(e);
    const life = Math.max(1, Math.round(val(h.g, 'span') * st.life * m.life));
    e.matron = { g: h.g, mate: cloneGenome(c.g), pristine: h.pristine !== false, gen: h.gen || 0, life, maxLife: life, sp: h.sp };
    e.heiress = null;
    c.n -= 1; if (c.n <= 0) e.courier = null;
    e.cyc = 0;
    e.status = 'Settling in';
    this.game.stat('matrons');
    this.game.emit('mated', e);
  }

  housingCycle(e) {
    const g = this.game;
    const st = STRUCTURES[e.s].housing;
    if (!e.matron) { e.work = false; e.status = !e.heiress && !e.courier ? 'Needs an Heiress and a Courier' : !e.heiress ? 'Needs an Heiress' : 'Needs a Courier'; return; }
    const env = this.housingEnv(e);
    const [cx, cy] = this.housingCenter(e);
    const gm = e.matron.g;
    const reach = Math.round(val(gm, 'reach') * st.reach);
    const why = this.blocker(gm, env, cx, cy, reach);
    if (why) { e.work = false; e.status = why; return; }
    if (totalItems(e.out) >= OUT_CAP) { e.work = false; e.status = 'Output full'; return; }
    e.work = true; e.status = 'Working';
    const sp = species(gm), sp2 = inactiveSpecies(gm);
    let mult = PROD_SCALE * st.prod * env.mods.prod * val(gm, 'vigor') * SEASON_MODS[g.seasonIdx()].prod;
    if (g.giftNear(cx, cy, 'hum', e.id)) mult *= 1.15;
    const extra = val(gm, 'stature') - 1;
    const roll = (list, factor) => {
      for (const [id, p] of list) {
        if (Math.random() < Math.min(1, p * mult * factor)) {
          const n = 1 + (Math.random() < extra ? 1 : 0);
          pushOut(e.out, mk(id, n));
          this.note('combs', n);
          g.state.seenItems[id] = 1;
        }
      }
    };
    roll(sp.products, 1);
    if (sp2 && sp2.id !== sp.id) roll(sp2.products, 0.5);
    const thriving = env.temp === sp.temp && env.hum === sp.hum;
    e.thriving = thriving;
    if (thriving) roll(sp.special, 1);
    const gift = val(gm, 'gift');
    if (gift === 'gilding' && Math.random() < 0.08) pushOut(e.out, mk('crown_coin', 1 + Math.floor(Math.random() * 3)));
    if (gift === 'wonder' && Math.random() < 0.05) { g.state.renown += 1; g.addRenown(0); }
    // pollination
    this.hivePollinate(e, gm, cx, cy, reach);
    // frames wear
    for (let i = 0; i < (e.frames || []).length; i++) {
      const f = e.frames[i];
      if (!f) continue;
      f.wear = (f.wear || 0) + 1;
      if (f.wear >= ITEMS[f.id].frame.dur) { e.frames[i] = null; }
    }
    e.matron.life -= 1;
    if (e.matron.life <= 0) this.matronDies(e, env, reach);
  }

  hivePollinate(e, gm, cx, cy, reach) {
    const g = this.game;
    if (Math.random() > Math.min(0.85, 0.45 * val(gm, 'vigor') + 0.15)) return;
    const groves = g.grovesNear(cx, cy, reach);
    if (!groves.length) return;
    const target = pick(groves);
    if (e.pollen && e.pollen.src !== target.id && !target.pol && g.ent(e.pollen.src)) {
      target.pol = { g: cloneGenome(e.pollen.g), carrier: e.matron.sp || expressedId(gm, 'lineage'), at: g.now };
      g.stat('pollinations');
    }
    const src = pick(groves);
    e.pollen = { g: cloneGenome(src.g), src: src.id };
  }

  mutCtx(x, y, extra = {}) {
    const g = this.game;
    const region = g.regionAt(x, y);
    return {
      biome: region, season: g.seasonIdx(), time: g.isNight() || region === 'hollow' ? 'night' : 'day', festivals: g.festivals(),
      raining: g.raining(region), notes: g.state.notes, mutMult: 1, ...extra,
    };
  }

  matronDies(e, env, reach) {
    const g = this.game;
    const st = STRUCTURES[e.s].housing;
    const m = e.matron;
    const [cx, cy] = this.housingCenter(e);
    let mutMult = st.mut * env.mods.mut * SEASON_MODS[g.seasonIdx()].mut;
    if (mutMult > 0 && g.giftNear(cx, cy, 'quickening', e.id)) mutMult *= 1.25;
    const nearGroves = new Set(g.grovesNear(cx, cy, Math.max(reach, 4)).map((x) => x.sp));
    const ctx = this.mutCtx(cx, cy, { spire: e.s === 'hivespire', nearGroves, mutMult });
    const born = [];
    const worn = !m.pristine;
    const fail = worn && Math.random() < 0.05 && !g.giftNear(cx, cy, 'mending', e.id);
    if (!fail) {
      const out = {};
      const child = breed(m.g, m.mate, ctx, out);
      const s = mkSpecimen('heiress', child, { pristine: m.pristine, gen: (m.gen || 0) + 1 });
      born.push(s);
    } else {
      g.toast('A worn line failed to leave an Heiress', 'warn');
    }
    const brood = val(m.g, 'brood');
    for (let i = 0; i < brood; i++) {
      const out = {};
      const child = breed(m.g, m.mate, ctx, out);
      born.push(mkSpecimen('courier', child));
    }
    for (const s of born) {
      pushOut(e.out, s);
      g.state.seenItems[s.id] = 1;
      this.registerBirth(s.sp);
    }
    e.matron = null;
    g.stat('generations');
    this.note('generations');
    if (e.auto) {
      const hi = e.out.findIndex((s) => s.id === 'heiress');
      if (hi >= 0 && !e.heiress) { e.heiress = e.out[hi]; e.out.splice(hi, 1); }
      if (!e.courier && e.heiress) {
        // prefer a Courier of the Heiress's own species
        let ci = e.out.findIndex((s) => s.id === 'courier' && s.sp === e.heiress.sp);
        if (ci < 0) ci = e.out.findIndex((s) => s.id === 'courier');
        if (ci >= 0) {
          const c = e.out[ci];
          e.courier = { ...c, n: 1 };
          c.n -= 1; if (c.n <= 0) e.out.splice(ci, 1);
        }
      }
    }
    g.emit('birth', e);
  }

  registerBirth(sp) {
    const g = this.game;
    const prev = g.codexStage(sp);
    if (prev < 3) {
      g.codexMark(sp, 3);
      this.noteList('newSpecies', sp);
    }
  }

  // ───────── groves ─────────
  groveStep(e, dt) {
    const g = this.game;
    if (e.stump) {
      if (e.wild && g.now >= e.stump) { e.stump = 0; e.growth = 0.35; g.bloomDirty = true; }
      return;
    }
    const env = g.envAt(e.x, e.y, e.id);
    const tol = tolerates(e.g, env.temp, env.hum);
    if (!tol.ok) { e.status = tol.tooCold ? 'Struggling: too cold' : tol.tooHot ? 'Struggling: too hot' : tol.tooWet ? 'Struggling: too damp' : 'Struggling: too dry'; return; }
    if (e.growth < 1) {
      let rate = dt / (val(e.g, 'span') * 30);
      if (g.giftNear(e.x, e.y, 'fertile', e.id)) rate *= 1.5;
      if (e.mulch && g.now < e.mulch) rate *= 2;
      rate *= SEASON_MODS[g.seasonIdx()].growth;
      e.growth = Math.min(1, e.growth + rate);
      e.status = `Growing (${Math.floor(e.growth * 100)}%)`;
      if (e.growth >= 1) { g.bloomDirty = true; this.note('matured'); g.emit('matured', e); }
      return;
    }
    e.status = 'Mature';
    e.pcyc = (e.pcyc || 0) + dt;
    if (e.pol && g.now - e.pol.at >= POLLEN_DELAY * 1000) this.dropHybrid(e);
    if (e.colony) this.colonyStep(e, dt, env);
    if (e.pcyc < GROVE_CYCLE) return;
    e.pcyc -= GROVE_CYCLE;
    const rhythm = val(e.g, 'rhythm');
    const dark = env.night || env.dark;
    if (rhythm === 'day' && dark && !env.lit) { e.status = 'Resting until daylight'; return; }
    if (rhythm === 'night' && !dark) { e.status = 'Blooms at night'; return; }
    if (totalItems(e.buf) >= GROVE_BUF) { e.status = 'Laden: harvest me'; return; }
    let mult = val(e.g, 'vigor') * SEASON_MODS[g.seasonIdx()].fruit;
    if (g.giftNear(e.x, e.y, 'bounty', e.id)) mult *= 1.3;
    for (const [id, p] of species(e.g).products) {
      if (Math.random() < Math.min(1, p * mult)) { pushOut(e.buf, mk(id, 1)); g.state.seenItems[id] = 1; this.note('fruit'); }
    }
    if (!e.wild || Math.random() < 0.5) {
      const sc = SCION_CHANCE[val(e.g, 'brood')] || 0.05;
      if (Math.random() < sc) {
        const child = breed(e.g, e.g, { mutMult: 0 });
        pushOut(e.buf, mkSpecimen('scion', child));
      }
    }
  }

  dropHybrid(e) {
    const g = this.game;
    const n = g.hasTool('grafting_knife') ? 2 : 1;
    const ctx = this.mutCtx(e.x, e.y, { carrier: e.pol.carrier, nearGroves: new Set(), mutMult: SEASON_MODS[g.seasonIdx()].mut });
    for (let i = 0; i < n; i++) {
      const out = {};
      const child = breed(e.g, e.pol.g, ctx, out);
      const s = mkSpecimen('scion', child);
      pushOut(e.buf, s);
      if (s.sp !== e.sp || out.mutated) this.registerBirth(s.sp);
      else if (g.codexStage(s.sp) < 3 && !e.wild) this.registerBirth(s.sp);
    }
    g.stat('hybrids');
    this.note('hybrids');
    e.pol = null;
  }

  colonyStep(e, dt, env) {
    const g = this.game;
    const c = e.colony;
    c.cyc = (c.cyc || 0) + dt;
    if (c.cyc < COLONY_CYCLE) return;
    c.cyc -= COLONY_CYCLE;
    const fg = c.g;
    if (val(fg, 'bloom') !== val(e.g, 'bloom')) { this.colonyLeaves(e, 'The host tree no longer suits it'); return; }
    const tol = tolerates(fg, env.temp, env.hum);
    const rhythm = val(fg, 'rhythm'), hard = val(fg, 'hardiness');
    const dark = env.night || env.dark;
    let ok = tol.ok;
    if (rhythm === 'day' && dark && !env.lit) ok = false;
    if (rhythm === 'night' && !dark) ok = false;
    if (env.raining && !hard.rain && !env.shelter) ok = false;
    if (env.dark && !hard.cave) ok = false;
    c.active = ok;
    if (!ok) { c.status = !tol.ok ? 'Struggling with the climate' : 'Resting'; return; }
    c.status = 'Flying';
    if (totalItems(e.buf) < GROVE_BUF) {
      const sm = val(fg, 'stature');
      for (const [id, p] of species(fg).products) {
        if (Math.random() < Math.min(1, p * val(fg, 'vigor'))) { pushOut(e.buf, mk(id, Math.random() < sm - 1 ? 2 : 1)); g.state.seenItems[id] = 1; this.note('silk'); }
      }
    }
    const range = val(fg, 'reach') * 2;
    if (Math.random() < 0.5) {
      const targets = g.grovesNear(e.x, e.y, range).filter((t) => t.id !== e.id && !t.pol);
      if (targets.length) {
        const t = pick(targets);
        t.pol = { g: cloneGenome(e.g), carrier: c.sp, at: g.now };
        g.stat('pollinations');
      }
    }
    c.life -= 1;
    if (c.life <= 0) {
      const mates = g.grovesNear(e.x, e.y, range).filter((t) => t.id !== e.id && t.colony).map((t) => t.colony.g);
      const mate = mates.length ? pick(mates) : c.g;
      const ctx = this.mutCtx(e.x, e.y);
      const brood = val(c.g, 'brood');
      for (let i = 0; i < brood - 1; i++) {
        const ch = breed(c.g, mate, ctx);
        pushOut(e.buf, mkSpecimen('chrysal', ch));
        this.registerBirth(expressedId(ch, 'lineage'));
      }
      const ng = breed(c.g, mate, ctx);
      const nsp = expressedId(ng, 'lineage');
      this.registerBirth(nsp);
      if (val(ng, 'bloom') !== val(e.g, 'bloom')) {
        pushOut(e.buf, mkSpecimen('flitter', ng));
        e.colony = null;
        g.toast(`A ${SPECIES[nsp].name} hatched on a ${SPECIES[e.sp].name} but cannot live there. It waits to be collected.`, 'info', { sp: nsp });
        return;
      }
      e.colony = { g: ng, sp: nsp, life: Math.max(2, Math.round(val(ng, 'span') / 2)), cyc: 0, active: true };
      this.note('colonyGens');
    }
  }

  colonyLeaves(e, why) {
    const g = this.game;
    pushOut(e.buf, mkSpecimen('flitter', e.colony.g));
    e.colony = null;
    g.toast(`A Flitter left its tree: ${why}. It waits in the tree to be collected.`, 'warn');
  }

  // ───────── cradle ─────────
  cradleTick(e, dt) {
    const g = this.game;
    if (e.a && e.b) {
      e.timer += dt;
      e.status = `Pairing (${Math.floor((e.timer / 60) * 100)}%)`;
      if (e.timer >= 60) {
        e.timer = 0;
        const ctx = this.mutCtx(e.x, e.y);
        const brood = val(e.a.g, 'brood') + 1;
        for (let i = 0; i < brood; i++) {
          const ch = breed(e.a.g, e.b.g, ctx);
          const s = mkSpecimen('chrysal', ch);
          pushOut(e.out, s);
          this.registerBirth(s.sp);
        }
        e.a.n -= 1; if (e.a.n <= 0) e.a = null;
        e.b.n -= 1; if (e.b.n <= 0) e.b = null;
        g.stat('pairings');
        this.note('chrysals', brood);
      }
    } else if (e.hatch) {
      e.htimer = (e.htimer || 0) + dt;
      e.status = `Hatching (${Math.floor((e.htimer / 45) * 100)}%)`;
      if (e.htimer >= 45) {
        e.htimer = 0;
        const s = mkSpecimen('flitter', e.hatch.g);
        pushOut(e.out, s);
        e.hatch.n -= 1; if (e.hatch.n <= 0) e.hatch = null;
        this.note('hatched');
      }
    } else {
      e.timer = 0;
      e.status = e.a || e.b ? 'Needs a second Flitter' : 'Empty';
    }
  }

  // ───────── machines ─────────
  recipeFor(e) {
    const list = MACHINE[e.s] || [];
    if (e.rec) return list.find((r) => r.id === e.rec) || null;
    return list.find((r) => this.hasInputs(e, r)) || null;
  }
  countIn(e, tag) { let n = 0; for (const s of e.inb) if (matchesTag(s.id, tag)) n += s.n; return n; }
  hasInputs(e, r) { return Object.entries(r.in).every(([k, n]) => this.countIn(e, k) >= n); }
  consume(e, r) {
    for (const [k, n] of Object.entries(r.in)) {
      let left = n;
      for (let i = e.inb.length - 1; i >= 0 && left > 0; i--) {
        const s = e.inb[i];
        if (!matchesTag(s.id, k)) continue;
        const take = Math.min(left, s.n);
        s.n -= take; left -= take;
        if (s.n <= 0) e.inb.splice(i, 1);
      }
    }
  }
  machineTick(e, dt, st) {
    const g = this.game;
    const r = this.recipeFor(e);
    if (!r) { e.on = false; e.prog = 0; e.cur = null; e.status = e.rec ? 'Waiting for ingredients' : 'Idle'; return 0; }
    if (!this.hasInputs(e, r)) { e.on = false; e.status = 'Waiting for ingredients'; return 0; }
    if (totalItems(e.out) >= MACHINE_OUT_CAP) { e.on = false; e.status = 'Output full'; return 0; }
    if (e.cur !== r.id) { e.cur = r.id; e.prog = 0; }
    let speed = 1;
    if (st.power) {
      speed = this.powerSat > 0.02 ? this.powerSat : st.hand;
      if (speed <= 0) { e.on = false; e.status = 'Needs power'; return st.power; }
    }
    e.on = true;
    e.status = speed < 0.5 && st.power && this.powerSat <= 0.02 ? 'Working slowly by hand' : 'Working';
    e.prog += (dt * speed) / r.time;
    if (e.prog >= 1) this.finishRecipe(e, r);
    return st.power || 0;
  }
  finishRecipe(e, r) {
    const g = this.game;
    e.prog = 0;
    this.consume(e, r);
    for (const [id, n, p] of r.out) {
      if (Math.random() < p) {
        pushOut(e.out, mk(id, n));
        g.stat('made_' + id, n);
        g.state.seenItems[id] = 1;
        this.note('made', n);
      }
    }
    if (e.s === 'combwheel') g.stat('combsSpun');
    g.stat('crafted_' + e.s);
  }
  crank(e) {
    const r = this.recipeFor(e);
    if (!r || !this.hasInputs(e, r) || totalItems(e.out) >= MACHINE_OUT_CAP) return false;
    if (e.cur !== r.id) { e.cur = r.id; e.prog = 0; }
    e.prog += 1.2 / r.time;
    if (e.prog >= 1) this.finishRecipe(e, r);
    return true;
  }

  machineAccepts(e, id) {
    const list = MACHINE[e.s] || [];
    const recs = e.rec ? list.filter((r) => r.id === e.rec) : list;
    for (const r of recs) for (const k of Object.keys(r.in)) if (matchesTag(id, k)) return this.countIn(e, id) < 32;
    return false;
  }

  // ───────── groundskeeper ─────────
  keeperTick(e, dt) {
    e.cyc = (e.cyc || 0) + dt;
    if (e.cyc < 5) return;
    e.cyc = 0;
    const g = this.game;
    const R = STRUCTURES.groundskeeper.radius;
    let moved = 0;
    for (let y = e.y - R; y <= e.y + R; y++) for (let x = e.x - R; x <= e.x + R; x++) {
      const t = g.entAt(x, y);
      if (!t || t === e) continue;
      const list = t.t === 'g' ? t.buf : t.s === 'cradle' ? t.out : null;
      if (!list) continue;
      while (list.length && totalItems(e.out) < OUT_CAP) { pushOut(e.out, list.shift()); moved++; }
    }
    e.status = moved ? `Gathered ${moved}` : 'Watching';
  }

  // ───────── runnels ─────────
  outList(e) {
    if (e.t !== 's') return null;
    const st = STRUCTURES[e.s];
    if (st.housing || st.kind === 'machine' || e.s === 'cradle' || e.s === 'groundskeeper') return e.out;
    if (e.s === 'chest' && e.unload) return e.slots;
    return null;
  }

  accepts(t, s) {
    if (!t || t.t !== 's') return false;
    const st = STRUCTURES[t.s];
    if (st.housing) {
      if (s.id === 'heiress') return !t.heiress && !t.matron;
      if (s.id === 'courier') return !t.courier || (canMerge(t.courier, s) && t.courier.n < 16);
      if (ITEMS[s.id].frame) return t.frames.some((f) => !f);
      return false;
    }
    if (st.kind === 'machine') return this.machineAccepts(t, s.id);
    if (t.s === 'chest') return t.slots.some((x) => !x || (canMerge(x, s) && x.n < 99));
    if (t.s === 'postbox') return true;
    if (t.s === 'cradle') { if (s.id === 'flitter') return !t.a || !t.b; if (s.id === 'chrysal') return !t.hatch; return false; }
    if (t.s === 'flowerbed') return !t.bloom && ITEMS[s.id].cat === 'seed';
    if (t.s === 'bellows') return !!ITEMS[s.id].fuel && (!t.fuel || (t.fuel.id === s.id && t.fuel.n < 32));
    return false;
  }

  insert(t, s) {
    const g = this.game;
    const st = STRUCTURES[t.s];
    if (st.housing) {
      if (s.id === 'heiress') t.heiress = s;
      else if (s.id === 'courier') { if (t.courier) t.courier.n += s.n; else t.courier = s; }
      else { const i = t.frames.findIndex((f) => !f); t.frames[i] = s; }
    } else if (st.kind === 'machine') pushOut(t.inb, s);
    else if (t.s === 'chest') addToSlots(t.slots, s);
    else if (t.s === 'postbox') { addToSlots(g.state.vault, s); }
    else if (t.s === 'cradle') { if (s.id === 'flitter') { if (!t.a) t.a = s; else t.b = s; } else t.hatch = s; }
    else if (t.s === 'flowerbed') { t.bloom = ITEMS[s.id].bloom; g.bloomDirty = true; }
    else if (t.s === 'bellows') { if (t.fuel) t.fuel.n += s.n; else t.fuel = s; }
  }

  gateMatch(gate, s) {
    const f = gate.filter || {};
    switch (f.kind) {
      case 'item': return s.id === f.value;
      case 'role': return s.id === f.value;
      case 'species': return !!s.g && s.sp === f.value;
      case 'pure': return !!s.g && Object.values(s.g).every(([a, b]) => a === b);
      case 'hybrid': return !!s.g && !Object.values(s.g).every(([a, b]) => a === b);
      case 'specimen': return !!s.g;
      case 'thread': return !!s.g && expressedId(s.g, f.thread) === f.value;
      case 'category': return ITEMS[s.id]?.cat === f.value;
      default: return false;
    }
  }

  logistics() {
    const g = this.game;
    const n = this.tickN;
    const L = g.lists();
    const runs = L.runs;
    if (!runs.length) return;
    // push phase
    for (const e of L.outs) {
      const st = STRUCTURES[e.s];
      const list = this.outList(e);
      if (!list || !list.length || !list.some((x) => x)) continue;
      const [w, h] = st.size;
      const cands = this.cands.get(e.id) || this.cands.set(e.id, (() => { const c = []; for (let x = e.x; x < e.x + w; x++) { c.push([x, e.y - 1, 3]); c.push([x, e.y + h, 1]); } for (let y = e.y; y < e.y + h; y++) { c.push([e.x - 1, y, 2]); c.push([e.x + w, y, 0]); } return c; })()).get(e.id);
      e.rr = ((e.rr || 0) + 1) % cands.length;
      for (let k = 0; k < cands.length; k++) {
        const [x, y, d] = cands[(k + e.rr) % cands.length];
        const r = g.floorAt(x, y);
        if (!r || !STRUCTURES[r.s].dir || r.item || r.dir !== d) continue;
        const idx = list.findIndex((x) => x);
        if (idx < 0) break;
        const src = list[idx];
        const one = cloneStack(src); one.n = 1;
        src.n -= 1;
        if (src.n <= 0) { if (list === e.slots) list[idx] = null; else list.splice(idx, 1); }
        r.item = one; r.moved = n;
        r.exit = this.exitDir(r, one);
        break;
      }
    }
    // move phase
    for (const r of runs) {
      if (!r.item || r.moved === n) continue;
      const d = r.exit ?? r.dir;
      const [dx, dy] = DIRS[d];
      const nx = r.x + dx, ny = r.y + dy;
      const next = g.floorAt(nx, ny);
      if (next && STRUCTURES[next.s].dir) {
        if (!next.item) { next.item = r.item; next.moved = n; next.exit = this.exitDir(next, r.item); r.item = null; }
        continue;
      }
      const t = g.entAt(nx, ny);
      if (t && this.accepts(t, r.item)) { this.insert(t, r.item); r.item = null; }
    }
  }
  exitDir(r, item) {
    if (r.s !== 'gate') return r.dir;
    return this.gateMatch(r, item) ? (r.dir + 3) % 4 : r.dir;
  }

  respawnDecor() {
    const g = this.game, w = g.world;
    for (const [k, t] of Object.entries(g.state.decorGone)) {
      if (t > g.now) continue;
      const i = +k;
      if (g.occ[i] || g.floor[i]) { g.state.decorGone[k] = g.now + 3600e3; continue; }
      w.decor[i] = w.decor0[i];
      delete g.state.decorGone[k];
      g.emit('tileChanged', { x: i % W, y: Math.floor(i / W) });
      g.bloomDirty = true;
    }
  }
}
