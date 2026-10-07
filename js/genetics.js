// The Strand: genome creation, expression, inheritance and mutation.
import { THREADS, ALLELE_INDEX, ALLELES } from './data/threads.js';
import { SPECIES, MUT_INDEX } from './data/species.js';
import { FESTIVALS, SEASONS } from './data/biomes.js';
import { BIOMES } from './data/biomes.js';

export function template(speciesId) {
  const sp = SPECIES[speciesId];
  const g = { lineage: [speciesId, speciesId] };
  for (const t of THREADS) if (t !== 'lineage') g[t] = [sp.genes[t], sp.genes[t]];
  return g;
}

// A wild specimen: the species template with a little natural variation.
export function wildGenome(speciesId) {
  const g = template(speciesId);
  for (const t of THREADS) {
    if (t === 'lineage' || t === 'bloom' || t === 'gift') continue;
    if (Math.random() < 0.07) {
      const list = ALLELES[t];
      const i = list.findIndex((a) => a.id === g[t][0]);
      const j = Math.max(0, Math.min(list.length - 1, i + (Math.random() < 0.5 ? -1 : 1)));
      g[t][1] = list[j].id;
    }
  }
  return g;
}

export function cloneGenome(g) {
  const o = {};
  for (const t of THREADS) o[t] = [g[t][0], g[t][1]];
  return o;
}

function isDom(thread, id) {
  if (thread === 'lineage') return SPECIES[id] ? SPECIES[id].dom : true;
  const a = ALLELE_INDEX[thread][id];
  return a ? a.dom : true;
}

// Genomes never change once made, so the expressed allele is cached on a hidden property.
export function expressedId(g, thread) {
  let memo = g._x;
  if (!memo) { memo = {}; Object.defineProperty(g, '_x', { value: memo, enumerable: false }); }
  const m = memo[thread];
  if (m !== undefined) return m;
  return (memo[thread] = expressedRaw(g, thread));
}
function expressedRaw(g, thread) {
  const [a, b] = g[thread];
  if (a === b) return a;
  const da = isDom(thread, a), db = isDom(thread, b);
  if (db && !da) return b;
  return a;
}

export function allele(thread, id) { return ALLELE_INDEX[thread][id]; }

export function trait(g, thread) {
  return ALLELE_INDEX[thread][expressedId(g, thread)];
}
export function val(g, thread) { return trait(g, thread).v; }

export function species(g) { return SPECIES[expressedId(g, 'lineage')]; }
export function inactiveSpecies(g) {
  const a = expressedId(g, 'lineage');
  const [x, y] = g.lineage;
  return SPECIES[a === x ? y : x];
}

export function isPure(g) {
  for (const t of THREADS) if (g[t][0] !== g[t][1]) return false;
  return true;
}

export function genomeKey(g) {
  let s = '';
  for (const t of THREADS) s += g[t][0] + ',' + g[t][1] + ';';
  return s;
}

// ── Environment helpers ──
export function tolerates(g, envTemp, envHum) {
  const sp = species(g);
  const [wd, wu] = val(g, 'warmth');
  const [dd, du] = val(g, 'damp');
  const tOk = envTemp >= sp.temp - wd && envTemp <= sp.temp + wu;
  const hOk = envHum >= sp.hum - dd && envHum <= sp.hum + du;
  return { ok: tOk && hOk, tOk, hOk, tooHot: envTemp > sp.temp + wu, tooCold: envTemp < sp.temp - wd, tooWet: envHum > sp.hum + du, tooDry: envHum < sp.hum - dd };
}

// ── Mutation conditions ──
export function condMet(cond, ctx) {
  if (!cond) return true;
  if (cond.biome && ctx.biome !== cond.biome) return false;
  if (cond.season && SEASONS[ctx.season].toLowerCase() !== cond.season) return false;
  if (cond.time && ctx.time !== cond.time) return false;
  if (cond.festival && !(ctx.festivals && ctx.festivals.has(cond.festival))) return false;
  if (cond.spire && !ctx.spire) return false;
  if (cond.rain && !ctx.raining) return false;
  if (cond.carrier && ctx.carrier !== cond.carrier) return false;
  if (cond.nearGrove && !(ctx.nearGroves && ctx.nearGroves.has(cond.nearGrove))) return false;
  return true;
}

export function condText(cond) {
  if (!cond) return '';
  const parts = [];
  if (cond.biome) parts.push('in ' + BIOMES[cond.biome].name);
  if (cond.season) parts.push('in ' + cond.season);
  if (cond.time) parts.push(cond.time === 'night' ? 'at night' : 'by day');
  if (cond.festival) parts.push('during ' + FESTIVALS[cond.festival].name);
  if (cond.spire) parts.push('in a Hivespire');
  if (cond.rain) parts.push('in the rain');
  if (cond.carrier) parts.push('with pollen carried by ' + SPECIES[cond.carrier].name);
  if (cond.nearGrove) parts.push('near a ' + SPECIES[cond.nearGrove].name);
  return parts.join(', ');
}

export function mutationsFor(a, b) { return MUT_INDEX[a + '|' + b] || []; }

// Effective chance of one mutation given context.
export function mutChance(m, ctx) {
  if (!condMet(m.cond, ctx)) return 0;
  let p = m.p * (ctx.mutMult ?? 1);
  const notes = ctx.notes ? (ctx.notes[m.c] || 0) : 0;
  if (notes > 0) p += Math.min(5, notes) * 0.1 * m.p * Math.min(1, ctx.mutMult ?? 1);
  return Math.min(1, p);
}

// One side's possible replacement: pick a random pairing of the parents' lineage alleles.
function rollReplacement(mother, father, ctx, out) {
  const a = mother.lineage[Math.random() < 0.5 ? 0 : 1];
  const b = father.lineage[Math.random() < 0.5 ? 0 : 1];
  if (a === b || (ctx.mutMult ?? 1) <= 0) return null;
  const list = mutationsFor(a, b);
  for (const m of list) {
    const p = mutChance(m, ctx);
    if (p > 0 && Math.random() < p) {
      if (out) out.mutated = m.c;
      return template(m.c);
    }
  }
  return null;
}

// Produce one child genome from two parents.
export function breed(mother, father, ctx = {}, out = null) {
  const m = rollReplacement(mother, father, ctx, out) || mother;
  const f = rollReplacement(father, mother, ctx, out) || father;
  const child = {};
  for (const t of THREADS) {
    const x = m[t][Math.random() < 0.5 ? 0 : 1];
    const y = f[t][Math.random() < 0.5 ? 0 : 1];
    child[t] = Math.random() < 0.5 ? [x, y] : [y, x];
  }
  return child;
}

// Monte Carlo forecast of offspring.
export function forecast(mother, father, ctx, samples = 1500) {
  const speciesCount = {};
  const threadCount = {};
  for (const t of THREADS) threadCount[t] = {};
  let pure = 0;
  for (let i = 0; i < samples; i++) {
    const c = breed(mother, father, ctx);
    const sp = expressedId(c, 'lineage');
    speciesCount[sp] = (speciesCount[sp] || 0) + 1;
    for (const t of THREADS) {
      const e = expressedId(c, t);
      threadCount[t][e] = (threadCount[t][e] || 0) + 1;
    }
    if (isPure(c)) pure++;
  }
  const norm = (o) => Object.entries(o).map(([k, n]) => [k, n / samples]).sort((x, y) => y[1] - x[1]);
  const threads = {};
  for (const t of THREADS) threads[t] = norm(threadCount[t]);
  // exact mutation odds for each listed mutation
  const muts = [];
  const seen = new Set();
  for (const a of new Set([...mother.lineage, ...father.lineage])) {
    for (const b of new Set([...mother.lineage, ...father.lineage])) {
      if (a === b) continue;
      for (const m of mutationsFor(a, b)) {
        if (seen.has(m)) continue;
        seen.add(m);
        muts.push({ m, p: mutChance(m, ctx), met: condMet(m.cond, ctx) });
      }
    }
  }
  return { species: norm(speciesCount), threads, pure: pure / samples, muts };
}

export function traitSummary(g) {
  const sp = species(g);
  return {
    species: sp,
    vigor: trait(g, 'vigor'), span: trait(g, 'span'), brood: trait(g, 'brood'),
    warmth: trait(g, 'warmth'), damp: trait(g, 'damp'), rhythm: trait(g, 'rhythm'),
    hardiness: trait(g, 'hardiness'), bloom: trait(g, 'bloom'), reach: trait(g, 'reach'),
    stature: trait(g, 'stature'), gift: trait(g, 'gift'),
  };
}

// Compact save form
export function packGenome(g) { return THREADS.map((t) => g[t][0] + '/' + g[t][1]).join('|'); }
export function unpackGenome(s) {
  const parts = s.split('|');
  const g = {};
  THREADS.forEach((t, i) => { const [a, b] = parts[i].split('/'); g[t] = [a, b]; });
  return g;
}
