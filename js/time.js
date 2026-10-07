// Clock, seasons, weather and festivals. All derived from real time so offline
// catch-up sees exactly the same weather the player would have.
import { hash2 } from './util.js';
import { BIOMES, SEASONS } from './data/biomes.js';

export const DAY_MS = 20 * 60 * 1000; // one in-game day = 20 real minutes
const RAIN_SLOT = 6 * 60 * 1000;

let tzCacheT = -1e15, tzOff = 0;
function tz(t) {
  if (Math.abs(t - tzCacheT) > 3600000) { tzCacheT = t; tzOff = new Date(t).getTimezoneOffset() * 60000; }
  return tzOff;
}
export function localDayIndex(t) {
  return Math.floor((t - tz(t)) / 86400000);
}
export function season(t) { return ((localDayIndex(t) % 4) + 4) % 4; }
export function seasonName(t) { return SEASONS[season(t)]; }
export function msToNextSeason(t) {
  const off = tz(t);
  const d = localDayIndex(t);
  return (d + 1) * 86400000 + off - t;
}

export function tod(t) { return ((t / DAY_MS) + 0.3) % 1; }
export function gameDay(t) { return Math.floor(t / DAY_MS + 0.3); }
export function isEclipse(t) { const d = localDayIndex(t); const x = tod(t); return ((d % 7) + 7) % 7 === 3 && x > 0.42 && x < 0.56; }
export function isNight(t) { const x = tod(t); return x > 0.82 || x < 0.12 || isEclipse(t); }
export function timeWord(t) { return isNight(t) ? 'night' : 'day'; }

// 0 = full day, 1 = deepest night (for lighting)
export function darkness(t) {
  const x = tod(t);
  let d;
  if (x >= 0.12 && x <= 0.78) d = 0;
  else if (x > 0.78 && x < 0.86) d = (x - 0.78) / 0.08;
  else if (x >= 0.86 || x < 0.06) d = 1;
  else d = 1 - (x - 0.06) / 0.06;
  if (isEclipse(t)) { const e = 1 - Math.abs(x - 0.49) / 0.07; d = Math.max(d, Math.min(0.9, e * 1.4)); }
  return Math.max(0, Math.min(1, d));
}

export function clockText(t) {
  const x = tod(t);
  const mins = Math.floor(x * 24 * 60);
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(Math.floor(m / 10) * 10).padStart(2, '0')}`;
}

export function rainingGlobal(t) {
  const slot = Math.floor(t / RAIN_SLOT);
  const s = season(t);
  const p = s === 0 || s === 2 ? 0.22 : s === 1 ? 0.12 : 0.18;
  return hash2(slot, 7, 999) < p;
}
export function rainingIn(t, biome) {
  const b = BIOMES[biome];
  if (!b || b.hum === 0 || biome === 'hollow') return false;
  return rainingGlobal(t);
}
export function weatherWord(t, biome) {
  if (biome === 'hollow') return 'Still air';
  if (!rainingIn(t, biome)) return BIOMES[biome]?.hum === 0 ? 'Dry heat' : 'Clear';
  return biome === 'rimeback' ? 'Snowing' : 'Raining';
}

export function festivalsAt(t) {
  const out = new Set();
  const s = season(t), night = isNight(t) && !isEclipse(t);
  if (s === 0 && night) out.add('thaw');
  if (s === 1 && !night) out.add('longday');
  if (s === 2 && night) out.add('harvestmoon');
  if (s === 3 && night) out.add('midwinter');
  if (isEclipse(t)) out.add('eclipse');
  return out;
}

export function windFactor(t, biome) {
  const base = biome === 'rimeback' ? 1.8 : biome === 'sunscar' ? 1.3 : biome === 'hollow' ? 0.2 : biome === 'canopy' ? 0.7 : 1;
  const gust = 0.75 + 0.5 * (0.5 + 0.5 * Math.sin(t / 47000) * Math.cos(t / 91000));
  return base * gust * (rainingIn(t, biome) ? 1.25 : 1);
}
