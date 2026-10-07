// Every panel in the game. Each returns { title, body, icon?, tabs?, live?, narrow? }.
import { el, esc, fmtTime, pct, DIR_NAMES } from './util.js';
import { iconDataURL, structSprite } from './sprites.js';
import { ITEMS } from './data/items.js';
import { SPECIES, SPECIES_LIST, MUTATIONS, MUT_BY_CHILD, KINGDOM_NAMES } from './data/species.js';
import { STRUCTURES } from './data/structures.js';
import { CRAFT, MACHINE, BLUEPRINTS } from './data/recipes.js';
import { THREADS, THREAD_INFO, ALLELES, ALLELE_INDEX, TEMPS, HUMS, BLOOM_NAMES } from './data/threads.js';
import { BIOMES, GATES, REGION_ORDER, SEASONS, SEASON_MODS } from './data/biomes.js';
import { NPCS, LORE, QUESTS, RANKS, INTRO, CHATTER } from './data/story.js';
import { species, trait, val, isPure, expressedId, forecast, tolerates, condText, inactiveSpecies } from './genetics.js';
import { addToSlots, countIn, removeFrom, totalItems, canMerge, cloneStack, mk, matchesTag, pushOut, maxStack } from './inv.js';
import { STAGE_NAMES } from './game.js';
import { HIVE_CYCLE } from './sim.js';
import * as T from './time.js';
import { W } from './world.js';

const icon = (id, extra = {}) => iconDataURL({ id, ...extra });
const spIcon = (sp) => {
  const S = SPECIES[sp];
  const id = S.k === 'h' ? 'courier' : S.k === 'g' ? 'scion' : 'flitter';
  return iconDataURL({ id, sp, g: { lineage: [sp, sp] } });
};
const btn = (label, onclick, cls = '', disabled = false) => el('button', { class: 'btn ' + cls, onclick, disabled }, label);

// ───────────────────────── shared pieces ─────────────────────────
function bagGrid(ui, onClick, opts = {}) {
  const s = ui.game.state;
  const grid = el('div', { class: 'grid' });
  s.inv.forEach((st, i) => {
    const slot = ui.slotEl(st, { hotkey: i < 9 ? i + 1 : null, onclick: () => onClick(i) });
    if (ui.sel === i) slot.classList.add('sel');
    if (opts.dim && st && !opts.dim(st)) slot.style.opacity = '0.4';
    grid.appendChild(slot);
  });
  return grid;
}

function moveSlot(ui, from, to) {
  const inv = ui.game.state.inv;
  if (from === to) return;
  const a = inv[from], b = inv[to];
  if (a && b && canMerge(a, b) && b.n < maxStack(b.id)) {
    const k = Math.min(a.n, maxStack(b.id) - b.n);
    b.n += k; a.n -= k; if (a.an) b.an = true;
    if (a.n <= 0) inv[from] = null;
  } else { inv[from] = b; inv[to] = a; }
  ui.game.emit('inv');
}

// Click a bag slot while a container is open: send it in.
function bagToContainer(ui, i, accept) {
  const s = ui.game.state;
  const st = s.inv[i];
  if (!st) return;
  const took = accept(st);
  if (took === false) { ui.toast('That doesn\'t go here.', 'warn'); return; }
  if (typeof took === 'number') { st.n -= took; if (st.n <= 0) s.inv[i] = null; }
  else s.inv[i] = null;
  ui.game.emit('inv');
  ui.renderPanel();
}
function takeToBag(ui, stack, remove) {
  const left = ui.game.give(cloneStack(stack), false);
  if (left > 0) { ui.toast('Your bag and Vault are full.', 'warn'); return; }
  remove();
  ui.game.emit('inv');
  ui.renderPanel();
}

export function genomeTable(g, kingdom) {
  const t = el('table', { class: 'genome' });
  t.appendChild(el('tr', {}, el('th', {}, 'Thread'), el('th', {}, 'Shown'), el('th', {}, 'Hidden')));
  for (const th of THREADS) {
    const [a, b] = g[th];
    const shown = expressedId(g, th);
    const hidden = shown === a ? b : a;
    const nm = (id) => th === 'lineage' ? SPECIES[id]?.name : ALLELE_INDEX[th][id]?.name;
    const dom = (id) => th === 'lineage' ? SPECIES[id]?.dom : ALLELE_INDEX[th][id]?.dom;
    const cell = (id) => el('td', { class: dom(id) ? 'd' : 'r', title: dom(id) ? 'Dominant' : 'Recessive' }, nm(id) || id);
    t.appendChild(el('tr', { class: a !== b ? 'het' : '' }, el('td', { class: 't', title: THREAD_INFO[th][kingdom] }, THREAD_INFO[th].name), cell(shown), cell(hidden)));
  }
  return el('div', {}, t, el('div', { class: 'faint', style: { marginTop: '4px' } }, el('span', { class: 'd' }, 'Red'), ' = dominant, ', el('span', { class: 'r' }, 'blue'), ' = recessive. Shaded rows carry two different alleles.'));
}

function climateLine(sp, g, env) {
  const [wd, wu] = val(g, 'warmth'), [dd, du] = val(g, 'damp');
  const tr = (lo, hi, arr) => lo === hi ? arr[lo] : `${arr[Math.max(0, lo)]}–${arr[Math.min(arr.length - 1, hi)]}`;
  const tol = env ? tolerates(g, env.temp, env.hum) : null;
  return el('div', { class: 'kv' },
    el('span', {}, 'Likes'), el('span', {}, `${TEMPS[sp.temp]}, ${HUMS[sp.hum]}`),
    el('span', {}, 'Tolerates'), el('span', {}, `${tr(sp.temp - wd, sp.temp + wu, TEMPS)} · ${tr(sp.hum - dd, sp.hum + du, HUMS)}`),
    env ? el('span', {}, 'Here') : null, env ? el('span', { class: tol.ok ? 'status ok' : 'status bad' }, `${TEMPS[env.temp]}, ${HUMS[env.hum]} ${tol.ok ? '✓' : '✗'}`) : null);
}

function analyseBtn(ui, st, after) {
  const g = ui.game;
  if (!st || !st.g || st.an) return null;
  const free = g.hasTool('steady_eye');
  if (!free && !g.hasTool('lens')) return el('div', { class: 'faint' }, 'You need a Lens to read this.');
  return btn(free ? 'Read Strand' : 'Read Strand (1 Goldmel)', () => {
    if (!free) { if (countIn(g.state.inv, 'goldmel') < 1) { ui.toast('Reading costs 1 Goldmel.', 'warn'); return; } removeFrom(g.state.inv, 'goldmel', 1); }
    st.an = true;
    g.stat('analysed');
    g.codexMark(st.sp, 2);
    if (isPure(st.g)) g.codexMark(st.sp, 4);
    ui.audio?.play('lens');
    g.emit('inv');
    after ? after() : ui.renderPanel();
  }, 'alt');
}

function stackDetail(ui, st, extraButtons = []) {
  const d = ITEMS[st.id];
  const box = el('div', { class: 'col' });
  box.appendChild(el('div', { class: 'row' }, el('img', { src: iconDataURL(st), style: { width: '48px', height: '48px', imageRendering: 'pixelated' } }),
    el('div', {}, el('div', { class: 'status' }, ui.stackTitle(st)), el('div', { class: 'faint' }, st.n > 1 ? `${st.n} in this stack` : d.cat === 'specimen' ? (KINGDOM_NAMES[d.kingdom] + ' specimen') : ''))));
  if (st.g) {
    const sp = SPECIES[st.sp];
    if (st.id === 'heiress' || st.id === 'matron') box.appendChild(el('div', {}, st.pristine === false ? el('span', { class: 'tag bad' }, 'Worn line') : el('span', { class: 'tag gold' }, 'Pristine line'), el('span', { class: 'faint' }, ` generation ${st.gen || 0}`)));
    box.appendChild(el('p', { class: 'muted' }, sp.lore));
    if (st.an) {
      box.appendChild(climateLine(sp, st.g));
      box.appendChild(genomeTable(st.g, sp.k));
      if (st.id === 'matron' && st.mate) { box.appendChild(el('h3', {}, 'Her Courier\'s Strand')); box.appendChild(genomeTable(st.mate, sp.k)); }
    } else {
      box.appendChild(el('p', { class: 'faint' }, 'Its Strand is unread. Read it to see all twelve Threads.'));
      const ab = analyseBtn(ui, st);
      if (ab) box.appendChild(el('div', {}, ab));
    }
  } else if (d.desc) box.appendChild(el('p', { class: 'muted' }, d.desc));
  if (d.value && !st.g) box.appendChild(el('div', { class: 'faint' }, `Marra pays about ${ui.story.sellPrice(st.id)} Crowns each today.`));
  if (extraButtons.length) box.appendChild(el('div', { class: 'row' }, ...extraButtons));
  return box;
}

// ───────────────────────── BAG ─────────────────────────
function bag(ui) {
  const g = ui.game, s = g.state;
  const body = el('div', { class: 'split' });
  const left = el('div', {});
  left.appendChild(el('div', { class: 'faint', style: { marginBottom: '6px' } }, 'Tap an item to see it. Tap another slot to move it there. Slots 1 to 9 are your hotbar.'));
  left.appendChild(bagGrid(ui, (i) => {
    if (ui.sel !== null && ui.sel !== i) { moveSlot(ui, ui.sel, i); ui.sel = null; }
    else ui.sel = ui.sel === i ? null : (s.inv[i] ? i : null);
    ui.renderPanel();
  }));
  body.appendChild(left);
  const right = el('div', {});
  const st = ui.sel !== null ? s.inv[ui.sel] : null;
  if (st) {
    const extra = [];
    const i = ui.sel;
    if (i >= 9) extra.push(btn('Move to hotbar', () => { moveSlot(ui, i, s.hot); ui.sel = null; ui.renderPanel(); }, 'alt small'));
    else extra.push(btn('Hold this', () => { s.hot = i; ui.renderHotbar(); ui.close(); }, 'alt small'));
    if (st.n > 1 && !ITEMS[st.id].tool) extra.push(btn('Split', () => {
      const empty = s.inv.findIndex((x) => !x);
      if (empty < 0) return;
      const half = Math.floor(st.n / 2);
      const ns = cloneStack(st); ns.n = half; st.n -= half; s.inv[empty] = ns; g.emit('inv'); ui.renderPanel();
    }, 'alt small'));
    if (st.g && s.inv.some((x) => x && x.g && !x.an)) {
      const n = s.inv.filter((x) => x && x.g && !x.an).length;
      extra.push(btn(`Read all (${n})`, () => {
        const free = g.hasTool('steady_eye');
        for (const x of s.inv) if (x && x.g && !x.an) {
          if (!free) { if (countIn(s.inv, 'goldmel') < 1) { ui.toast('Out of Goldmel.', 'warn'); break; } removeFrom(s.inv, 'goldmel', 1); }
          x.an = true; g.stat('analysed'); g.codexMark(x.sp, 2); if (isPure(x.g)) g.codexMark(x.sp, 4);
        }
        ui.audio?.play('lens'); g.emit('inv'); ui.renderPanel();
      }, 'alt small'));
    }
    if (!ITEMS[st.id].tool || st.id === 'sun_mirror') extra.push(btn(ui.confirmTrash === i ? 'Really discard?' : 'Discard', () => {
      if (ui.confirmTrash === i) { s.inv[i] = null; ui.confirmTrash = null; ui.sel = null; g.emit('inv'); }
      else ui.confirmTrash = i;
      ui.renderPanel();
    }, 'danger small'));
    right.appendChild(stackDetail(ui, st, extra));
  } else {
    right.appendChild(el('h3', {}, 'Your bag'));
    right.appendChild(el('p', { class: 'muted' }, `${s.inv.filter(Boolean).length} of 36 slots used. Overflow goes to the Vault at your Homestead.`));
    right.appendChild(el('div', { class: 'kv' },
      el('span', {}, 'Crowns'), el('span', {}, String(s.crowns)),
      el('span', {}, 'Renown'), el('span', {}, `${s.renown} (${RANKS[s.rank].name})`),
      el('span', {}, 'Tools'), el('span', {}, ['scoop', 'net', 'axe', 'lens', 'grafting_knife', 'steady_eye', 'brush_hook', 'frost_ward', 'ember_lantern'].filter((t) => g.hasTool(t)).map((t) => ITEMS[t].name).join(', ') || 'None')));
    right.appendChild(btn('Sort bag', () => {
      const hot = s.inv.slice(0, 9);
      const rest = s.inv.slice(9).filter(Boolean);
      const order = ['tool', 'specimen', 'place', 'frame', 'module', 'seed', 'comb', 'hive', 'grove', 'flitter', 'goods', 'material'];
      rest.sort((a, b) => order.indexOf(ITEMS[a.id].cat) - order.indexOf(ITEMS[b.id].cat) || a.id.localeCompare(b.id) || (a.sp || '').localeCompare(b.sp || ''));
      const merged = new Array(27).fill(null);
      for (const x of rest) addToSlots(merged, x);
      s.inv = [...hot, ...merged];
      g.emit('inv'); ui.renderPanel();
    }, 'alt small'));
  }
  body.appendChild(right);
  return { title: 'Bag', body, icon: icon('chest') };
}

// ───────────────────────── STRUCTURES ─────────────────────────
function struct(ui, data) {
  const e = data.e;
  if (!ui.game.ent(e.id)) return null;
  const st = STRUCTURES[e.s];
  if (st.housing) return housing(ui, e);
  if (st.kind === 'machine') return machine(ui, e);
  if (e.s === 'cradle') return cradle(ui, e);
  if (e.s === 'workbench') return craft(ui, { station: 'bench' }, ui.panel);
  if (e.s === 'desk') return desk(ui, e);
  if (e.s === 'chest' || e.s === 'postbox') return chest(ui, e);
  if (e.s === 'flowerbed') return flowerbed(ui, e);
  if (e.s === 'runnel' || e.s === 'gate') return runnel(ui, e);
  if (e.s === 'groundskeeper') return keeper(ui, e);
  if (st.kind === 'power') return power(ui, e);
  return simple(ui, e);
}

function pickUpRow(ui, e) {
  return el('div', { class: 'row', style: { marginTop: '12px' } }, btn('Pick up', () => ui.actions.pickUp(e), 'danger small'));
}

function containerShell(ui, e, top, accept, title, opts = {}) {
  const body = el('div', {});
  body.appendChild(top);
  body.appendChild(el('h3', {}, 'Your bag'));
  body.appendChild(el('div', { class: 'faint', style: { marginBottom: '4px' } }, opts.hint || 'Tap an item in your bag to put it in.'));
  body.appendChild(bagGrid(ui, (i) => bagToContainer(ui, i, accept), { dim: opts.dim }));
  if (!opts.noPickup) body.appendChild(pickUpRow(ui, e));
  return { title, body, icon: icon(e.s), live: true, sub: opts.sub };
}

function housing(ui, e) {
  const g = ui.game, sim = ui.sim, st = STRUCTURES[e.s];
  const top = el('div', {});
  const ok = e.work;
  const env = sim.housingEnv(e);
  const status = el('div', { class: 'status ' + (ok ? 'ok' : e.matron ? 'bad' : '') }, e.status || 'Empty');
  top.appendChild(status);
  if (e.s === 'skep') top.appendChild(el('div', { class: 'faint' }, 'Skeps never mutate: offspring are always a mix of their parents.'));
  const slots = el('div', { class: 'row', style: { margin: '8px 0', alignItems: 'flex-start' } });
  const cs = (label, stack, onTake) => el('div', { class: 'cslot' }, ui.slotEl(stack, { label, onclick: stack ? onTake : null }), el('span', { class: 'lbl-sm' }, label));
  if (e.matron) {
    const m = e.matron;
    const mst = { id: 'matron', n: 1, g: m.g, sp: m.sp, mate: m.mate, pristine: m.pristine, gen: m.gen, an: true };
    slots.appendChild(el('div', { class: 'cslot' }, ui.slotEl(mst, { onclick: () => { ui.sel = 'matron'; ui.renderPanel(); } }), el('span', { class: 'lbl-sm' }, 'Matron')));
  } else {
    slots.appendChild(cs('Heiress', e.heiress, () => takeToBag(ui, e.heiress, () => (e.heiress = null))));
    slots.appendChild(cs('Courier', e.courier, () => takeToBag(ui, e.courier, () => (e.courier = null))));
  }
  for (let i = 0; i < e.frames.length; i++) slots.appendChild(cs('Frame', e.frames[i], () => takeToBag(ui, e.frames[i], () => (e.frames[i] = null))));
  for (let i = 0; i < e.mods.length; i++) slots.appendChild(cs('Module', e.mods[i], () => takeToBag(ui, e.mods[i], () => (e.mods[i] = null))));
  top.appendChild(slots);
  if (e.matron) {
    const m = e.matron, sp = SPECIES[m.sp];
    const lifeLeft = m.life;
    top.appendChild(el('div', { class: 'row' }, el('span', {}, `${sp.name} Matron`), el('span', { class: 'faint' }, `${m.pristine ? 'pristine' : 'worn'}, gen ${m.gen}`),
      el('div', { class: 'bar gold', style: { flex: 1 } }, el('i', { style: { width: (lifeLeft / m.maxLife) * 100 + '%' } })),
      el('span', { class: 'faint' }, `about ${fmtTime(lifeLeft * HIVE_CYCLE - e.cyc)} left while working`)));
    if (ui.sel === 'matron') {
      top.appendChild(el('div', { class: 'box', style: { marginTop: '8px' } }, genomeTable(m.g, 'h'), el('h3', {}, 'Her Courier'), genomeTable(m.mate, 'h'),
        el('div', { class: 'row', style: { marginTop: '6px' } }, btn('Remove Matron', () => {
          const s = { id: 'matron', n: 1, g: m.g, sp: m.sp, mate: m.mate, pristine: m.pristine, gen: m.gen, life: m.life, an: true };
          takeToBag(ui, s, () => { e.matron = null; e.work = false; });
        }, 'danger small'))));
    }
    const reach = Math.round(val(m.g, 'reach') * st.housing.reach);
    const info = el('div', { class: 'box', style: { marginTop: '8px' } });
    info.appendChild(climateLine(sp, m.g, env));
    info.appendChild(el('div', { class: 'kv', style: { marginTop: '4px' } },
      el('span', {}, 'Forages'), el('span', {}, `${trait(m.g, 'bloom').name} within ${reach} tiles (${g.bloomCount(val(m.g, 'bloom'), Math.round(e.x), Math.round(e.y), reach)} found)`),
      el('span', {}, 'Works'), el('span', {}, `${trait(m.g, 'rhythm').name}, ${trait(m.g, 'hardiness').name}`),
      el('span', {}, 'Makes'), el('span', {}, [...sp.products.map(([id]) => ITEMS[id].name), ...sp.special.map(([id]) => ITEMS[id].name + ' (when thriving)')].join(', ')),
      el('span', {}, 'Thriving'), el('span', {}, e.thriving ? 'Yes: exactly its home climate' : 'No: specialty products need its exact home climate')));
    top.appendChild(info);
  }
  // Forecast
  const mother = e.matron ? e.matron.g : e.heiress?.g;
  const father = e.matron ? e.matron.mate : e.courier?.g;
  if (mother && father) {
    const showF = ui.showForecast;
    top.appendChild(el('div', { class: 'row', style: { marginTop: '8px' } }, btn(showF ? 'Hide forecast' : 'Forecast offspring', () => { ui.showForecast = !showF; ui.renderPanel(); }, 'alt small')));
    if (showF) top.appendChild(forecastBox(ui, e, mother, father));
  }
  // Output
  top.appendChild(el('h3', {}, `Output (${totalItems(e.out)}/64)`));
  const og = el('div', { class: 'grid' });
  e.out.forEach((s, i) => og.appendChild(ui.slotEl(s, { onclick: () => takeToBag(ui, s, () => e.out.splice(e.out.indexOf(s), 1)) })));
  if (!e.out.length) og.appendChild(el('span', { class: 'faint' }, 'Nothing yet.'));
  top.appendChild(og);
  if (e.out.length) top.appendChild(el('div', { class: 'row', style: { marginTop: '6px' } }, btn('Take all', () => { while (e.out.length) { const s = e.out[0]; if (ui.game.give(cloneStack(s), false) > 0) break; e.out.shift(); } ui.game.emit('inv'); ui.renderPanel(); }, 'small')));
  top.appendChild(el('label', { class: 'row', style: { marginTop: '8px', cursor: 'pointer' } },
    el('input', { type: 'checkbox', checked: e.auto ? true : undefined, onchange: (ev) => { e.auto = ev.target.checked; } }),
    el('span', {}, 'Keep the line going: when the Matron dies, load her new Heiress and a Courier automatically')));
  const accept = (s) => {
    if (s.id === 'heiress') { if (e.heiress || e.matron) return false; e.heiress = { ...cloneStack(s), n: 1 }; return 1; }
    if (s.id === 'matron') { if (e.matron || e.heiress) return false; e.matron = { g: s.g, mate: s.mate, pristine: s.pristine !== false, gen: s.gen || 0, life: s.life || val(s.g, 'span'), maxLife: Math.max(s.life || 1, val(s.g, 'span')), sp: s.sp }; e.cyc = 0; return 1; }
    if (s.id === 'courier') { if (e.courier && !canMerge(e.courier, s)) return false; if (e.courier) e.courier.n += s.n; else e.courier = cloneStack(s); return s.n; }
    if (ITEMS[s.id].frame) { const k = e.frames.findIndex((f) => !f); if (k < 0) return false; e.frames[k] = { ...cloneStack(s), n: 1 }; return 1; }
    if (ITEMS[s.id].mod) { const k = e.mods.findIndex((f) => !f); if (k < 0) return false; e.mods[k] = { ...cloneStack(s), n: 1 }; ui.game.bloomDirty = true; return 1; }
    return false;
  };
  return containerShell(ui, e, top, accept, st.name, { hint: 'Tap an Heiress, Courier, frame or module in your bag to load it.', dim: (s) => ['heiress', 'courier', 'matron'].includes(s.id) || ITEMS[s.id].frame || ITEMS[s.id].mod });
}

function forecastBox(ui, e, mother, father) {
  const g = ui.game, sim = ui.sim;
  const st = STRUCTURES[e.s].housing;
  const env = sim.housingEnv(e);
  const [cx, cy] = sim.housingCenter(e);
  let mutMult = st.mut * env.mods.mut * SEASON_MODS[g.seasonIdx()].mut;
  if (mutMult > 0 && g.giftNear(cx, cy, 'quickening', e.id)) mutMult *= 1.25;
  const reach = Math.round(val(mother, 'reach') * st.reach);
  const ctx = sim.mutCtx(cx, cy, { spire: e.s === 'hivespire', nearGroves: new Set(g.grovesNear(cx, cy, Math.max(reach, 4)).map((x) => x.sp)), mutMult });
  const f = forecast(mother, father, ctx, 1200);
  const box = el('div', { class: 'box', style: { marginTop: '6px' } });
  box.appendChild(el('div', { class: 'faint' }, 'Odds for each offspring under current conditions.'));
  const sp = el('div', { class: 'row', style: { gap: '6px', margin: '4px 0' } });
  for (const [id, p] of f.species.slice(0, 6)) sp.appendChild(el('span', { class: 'tag ' + (g.codexStage(id) < 3 ? 'gold' : '') }, `${g.codexStage(id) >= 1 ? SPECIES[id].name : '???'} ${pct(p)}`));
  box.appendChild(sp);
  if (f.muts.length) {
    box.appendChild(el('div', { class: 'lbl-sm' }, 'Possible mutations'));
    for (const { m, p, met } of f.muts) {
      const known = ui.story.mutKnown(m);
      box.appendChild(el('div', { class: met ? '' : 'faint' }, `${known || g.codexStage(m.c) >= 1 ? SPECIES[m.c].name : '???'}: ${met ? pct(p) + ' per roll' : 'conditions not met' + (known ? ' (' + condText(m.cond) + ')' : ' (' + (m.hint || 'something is missing') + ')')}`));
    }
  } else box.appendChild(el('div', { class: 'faint' }, 'These two lineages have no known mutation together.'));
  box.appendChild(el('div', { class: 'faint' }, `Purebred offspring: ${pct(f.pure)}`));
  const tt = el('div', { class: 'row', style: { gap: '4px', marginTop: '4px' } });
  for (const th of ['vigor', 'span', 'brood', 'warmth', 'damp', 'reach', 'gift']) {
    const top = f.threads[th][0];
    tt.appendChild(el('span', { class: 'tag' }, `${THREAD_INFO[th].name}: ${ALLELE_INDEX[th][top[0]].name} ${pct(top[1])}`));
  }
  box.appendChild(tt);
  return box;
}

function machine(ui, e) {
  const g = ui.game, sim = ui.sim, st = STRUCTURES[e.s];
  const top = el('div', {});
  const r = sim.recipeFor(e);
  top.appendChild(el('div', { class: 'status ' + (e.on ? 'ok' : '') }, e.status));
  if (st.power) top.appendChild(el('div', { class: 'faint' }, sim.powerSat > 0.02 ? `Gearline power: ${Math.round(sim.powerSat * 100)}%` : st.hand ? 'No Gearline power: working slowly by hand. Crank it, or build a Windlass or Wind Sail.' : 'Needs Gearline power: build a Windlass, Wind Sail, Waterwheel or Bellows Engine.'));
  if (r) {
    top.appendChild(el('div', { class: 'row', style: { margin: '6px 0' } }, el('div', { class: 'bar', style: { flex: 1 } }, el('i', { style: { width: Math.min(100, e.prog * 100) + '%' } })),
      st.hand !== 0 || !st.power ? btn('Crank', () => { if (sim.crank(e)) { ui.audio?.play('crank'); g.stat('cranks'); } ui.renderPanel(); }, 'alt small') : null));
  }
  // recipe chooser
  const list = MACHINE[e.s];
  const sel = el('select', { onchange: (ev) => { e.rec = ev.target.value || null; e.prog = 0; ui.renderPanel(); }, style: { fontSize: '14px', padding: '4px', background: '#142822', color: '#f1ead6', border: '1px solid #c9a24b', borderRadius: '4px', maxWidth: '100%' } });
  sel.appendChild(el('option', { value: '' }, 'Automatic: first recipe it can make'));
  for (const rc of list) sel.appendChild(el('option', { value: rc.id, selected: e.rec === rc.id ? true : undefined }, recipeText(rc)));
  top.appendChild(el('div', { class: 'row' }, el('span', { class: 'lbl-sm' }, 'Recipe'), sel));
  // recipes list
  const rl = el('div', { style: { marginTop: '8px' } });
  for (const rc of (e.rec ? list.filter((x) => x.id === e.rec) : list)) {
    const have = Object.entries(rc.in).every(([k, n]) => sim.countIn(e, k) >= n);
    rl.appendChild(el('div', { class: 'recipe' + (have ? '' : ' cant') },
      el('div', { class: 'ins' }, ...Object.entries(rc.in).map(([k, n]) => ingChip(k, n, sim.countIn(e, k)))),
      el('span', {}, '→'),
      el('div', { class: 'ins' }, ...rc.out.map(([id, n, p]) => el('span', { class: 'ing' }, el('img', { src: icon(id) }), `${n}× ${ITEMS[id].name}${p < 1 ? ` (${Math.round(p * 100)}%)` : ''}`))),
      el('span', { class: 'faint' }, `${rc.time}s`)));
  }
  top.appendChild(rl);
  top.appendChild(el('h3', {}, 'Inside'));
  const ib = el('div', { class: 'grid' });
  e.inb.forEach((s) => ib.appendChild(ui.slotEl(s, { onclick: () => takeToBag(ui, s, () => e.inb.splice(e.inb.indexOf(s), 1)) })));
  if (!e.inb.length) ib.appendChild(el('span', { class: 'faint' }, 'Empty. Put ingredients in from your bag, or feed it with a Runnel.'));
  top.appendChild(ib);
  top.appendChild(el('h3', {}, 'Output'));
  const og = el('div', { class: 'grid' });
  e.out.forEach((s) => og.appendChild(ui.slotEl(s, { onclick: () => takeToBag(ui, s, () => e.out.splice(e.out.indexOf(s), 1)) })));
  if (!e.out.length) og.appendChild(el('span', { class: 'faint' }, 'Nothing yet.'));
  top.appendChild(og);
  if (e.out.length) top.appendChild(el('div', { class: 'row', style: { marginTop: '6px' } }, btn('Take all', () => { while (e.out.length) { if (g.give(cloneStack(e.out[0]), false) > 0) break; e.out.shift(); } g.emit('inv'); ui.renderPanel(); }, 'small')));
  const accept = (s) => {
    if (s.g || !sim.machineAccepts(e, s.id)) return false;
    const room = 32 - sim.countIn(e, s.id);
    const k = Math.min(room, s.n);
    if (k <= 0) return false;
    pushOut(e.inb, mk(s.id, k));
    return k;
  };
  return containerShell(ui, e, top, accept, st.name, { dim: (s) => !s.g && sim.machineAccepts(e, s.id), sub: st.power ? `uses ${st.power} power/s` : '' });
}
function recipeText(rc) {
  return Object.entries(rc.in).map(([k, n]) => `${n} ${k === '#fruit' ? 'fruit' : k === '#nut' ? 'nuts' : ITEMS[k].name}`).join(' + ') + ' → ' + rc.out.map(([id, n]) => `${n} ${ITEMS[id].name}`).join(', ');
}
function ingChip(k, n, have) {
  const id = k === '#fruit' ? 'crabapple' : k === '#nut' ? 'walnut' : k;
  const name = k === '#fruit' ? 'any fruit' : k === '#nut' ? 'any nut' : ITEMS[k].name;
  return el('span', { class: 'ing' + (have < n ? ' miss' : '') }, el('img', { src: icon(id) }), `${have !== undefined ? Math.min(have, 999) + '/' : ''}${n} ${name}`);
}

function cradle(ui, e) {
  const top = el('div', {});
  top.appendChild(el('div', { class: 'status' }, e.status));
  top.appendChild(el('p', { class: 'faint' }, 'Two Flitters lay Chrysals here; a Chrysal hatches into a Flitter. Pairing takes a minute, hatching 45 seconds.'));
  const row = el('div', { class: 'row', style: { alignItems: 'flex-start' } });
  const cs = (label, stack, clear) => el('div', { class: 'cslot' }, ui.slotEl(stack, { label, onclick: stack ? () => takeToBag(ui, stack, clear) : null }), el('span', { class: 'lbl-sm' }, label));
  row.appendChild(cs('Flitter', e.a, () => (e.a = null)));
  row.appendChild(cs('Flitter', e.b, () => (e.b = null)));
  row.appendChild(cs('Chrysal', e.hatch, () => (e.hatch = null)));
  top.appendChild(row);
  if (e.a && e.b && e.a.g && e.b.g) {
    const ctx = ui.sim.mutCtx(e.x, e.y);
    const f = forecast(e.a.g, e.b.g, ctx, 800);
    const box = el('div', { class: 'box', style: { marginTop: '6px' } }, el('div', { class: 'lbl-sm' }, 'Chrysal forecast'));
    const r = el('div', { class: 'row', style: { gap: '4px' } });
    for (const [id, p] of f.species.slice(0, 5)) r.appendChild(el('span', { class: 'tag' }, `${ui.game.codexStage(id) >= 1 ? SPECIES[id].name : '???'} ${pct(p)}`));
    box.appendChild(r);
    for (const { m, p, met } of f.muts) box.appendChild(el('div', { class: met ? '' : 'faint' }, `${ui.story.mutKnown(m) ? SPECIES[m.c].name : '???'}: ${met ? pct(p) : 'conditions not met (' + (m.hint || condText(m.cond)) + ')'}`));
    top.appendChild(box);
  }
  top.appendChild(el('h3', {}, 'Output'));
  const og = el('div', { class: 'grid' });
  e.out.forEach((s) => og.appendChild(ui.slotEl(s, { onclick: () => takeToBag(ui, s, () => e.out.splice(e.out.indexOf(s), 1)) })));
  if (!e.out.length) og.appendChild(el('span', { class: 'faint' }, 'Nothing yet.'));
  top.appendChild(og);
  const accept = (s) => {
    if (s.id === 'flitter') { if (!e.a) e.a = { ...cloneStack(s), n: 1 }; else if (!e.b) e.b = { ...cloneStack(s), n: 1 }; else return false; e.timer = 0; return 1; }
    if (s.id === 'chrysal') { if (e.hatch) return false; e.hatch = { ...cloneStack(s), n: 1 }; e.htimer = 0; return 1; }
    return false;
  };
  return containerShell(ui, e, top, accept, 'Chrysal Cradle', { dim: (s) => s.id === 'flitter' || s.id === 'chrysal' });
}

function chest(ui, e) {
  const g = ui.game;
  const top = el('div', {});
  if (e.s === 'postbox') {
    top.appendChild(el('p', { class: 'muted' }, 'Anything you put in goes straight to the Vault at your Homestead. Runnels can feed it too.'));
    return containerShell(ui, e, top, (s) => { const left = addToSlots(g.state.vault, cloneStack(s)); if (left === s.n) { ui.toast('The Vault is full.', 'warn'); return false; } ui.toast(`Posted to the Vault`, 'good'); return s.n - left; }, 'Post Box');
  }
  const grid = el('div', { class: 'grid' });
  e.slots.forEach((s, i) => grid.appendChild(ui.slotEl(s, { onclick: s ? () => takeToBag(ui, s, () => (e.slots[i] = null)) : null })));
  top.appendChild(grid);
  top.appendChild(el('label', { class: 'row', style: { marginTop: '8px', cursor: 'pointer' } },
    el('input', { type: 'checkbox', checked: e.unload ? true : undefined, onchange: (ev) => { e.unload = ev.target.checked; } }),
    el('span', {}, 'Unload into Runnels that lead away from it')));
  top.appendChild(el('div', { class: 'row', style: { marginTop: '6px' } }, btn('Put everything in', () => {
    const s = g.state;
    for (let i = 9; i < s.inv.length; i++) { const st = s.inv[i]; if (!st || ITEMS[st.id].tool) continue; const left = addToSlots(e.slots, st); if (left === 0) s.inv[i] = null; else st.n = left; }
    g.emit('inv'); ui.renderPanel();
  }, 'alt small'), el('span', { class: 'faint' }, 'Keeps your hotbar and tools.')));
  return containerShell(ui, e, top, (s) => { const left = addToSlots(e.slots, cloneStack(s)); if (left === s.n) return false; return s.n - left; }, 'Chest');
}

function flowerbed(ui, e) {
  const top = el('div', {});
  if (e.bloom) {
    top.appendChild(el('p', {}, `Growing ${BLOOM_NAMES[e.bloom]}. Hummers that forage ${BLOOM_NAMES[e.bloom]} will find it.`));
    top.appendChild(btn('Dig it up', () => { e.bloom = null; ui.game.bloomDirty = true; ui.renderPanel(); }, 'danger small'));
  } else top.appendChild(el('p', { class: 'muted' }, 'Empty. Tap seeds in your bag to plant them.'));
  return containerShell(ui, e, top, (s) => { if (e.bloom || ITEMS[s.id].cat !== 'seed') return false; e.bloom = ITEMS[s.id].bloom; ui.game.bloomDirty = true; return 1; }, 'Flower Bed', { dim: (s) => ITEMS[s.id].cat === 'seed' });
}

function runnel(ui, e) {
  const body = el('div', {});
  body.appendChild(el('p', {}, `Facing ${DIR_NAMES[e.dir]}. ${e.item ? 'Carrying ' + ui.stackTitle(e.item) + '.' : 'Empty.'}`));
  body.appendChild(el('div', { class: 'row' }, btn('Turn', () => { e.dir = (e.dir + 1) % 4; ui.game.emit('tileChanged', e); ui.renderPanel(); }, 'alt small'),
    e.item ? btn('Take item', () => takeToBag(ui, e.item, () => (e.item = null)), 'small') : null));
  if (e.s === 'gate') {
    body.appendChild(el('h3', {}, 'What turns left'));
    body.appendChild(el('p', { class: 'faint' }, 'Items that match turn left of the way the Gate faces. Everything else goes straight on.'));
    const f = e.filter || (e.filter = { kind: 'role', value: 'heiress' });
    const kinds = [['role', 'Specimen type'], ['species', 'Species'], ['pure', 'Purebred specimens'], ['hybrid', 'Hybrid specimens'], ['specimen', 'Any specimen'], ['thread', 'Trait'], ['item', 'Exact item'], ['category', 'Item category']];
    const selS = { fontSize: '14px', padding: '4px', background: '#142822', color: '#f1ead6', border: '1px solid #c9a24b', borderRadius: '4px' };
    const kindSel = el('select', { style: selS, onchange: (ev) => { f.kind = ev.target.value; f.value = defaultFilterValue(ui, f.kind); f.thread = 'vigor'; if (f.kind === 'thread') f.value = 'quick'; ui.renderPanel(); } },
      ...kinds.map(([k, n]) => el('option', { value: k, selected: f.kind === k ? true : undefined }, n)));
    const row = el('div', { class: 'row' }, kindSel);
    if (f.kind === 'role') row.appendChild(el('select', { style: selS, onchange: (ev) => { f.value = ev.target.value; } }, ...['heiress', 'courier', 'scion', 'flitter', 'chrysal'].map((r) => el('option', { value: r, selected: f.value === r ? true : undefined }, ITEMS[r].name))));
    if (f.kind === 'species') row.appendChild(el('select', { style: selS, onchange: (ev) => { f.value = ev.target.value; } }, ...SPECIES_LIST.filter((sp) => ui.game.codexStage(sp.id) >= 1).map((sp) => el('option', { value: sp.id, selected: f.value === sp.id ? true : undefined }, sp.name))));
    if (f.kind === 'item') row.appendChild(el('select', { style: selS, onchange: (ev) => { f.value = ev.target.value; } }, ...Object.keys(ui.game.state.seenItems).filter((id) => ITEMS[id] && !ITEMS[id].kingdom).map((id) => el('option', { value: id, selected: f.value === id ? true : undefined }, ITEMS[id].name))));
    if (f.kind === 'category') row.appendChild(el('select', { style: selS, onchange: (ev) => { f.value = ev.target.value; } }, ...['comb', 'hive', 'grove', 'flitter', 'goods', 'frame', 'seed'].map((c) => el('option', { value: c, selected: f.value === c ? true : undefined }, c))));
    if (f.kind === 'thread') {
      row.appendChild(el('select', { style: selS, onchange: (ev) => { f.thread = ev.target.value; f.value = ALLELES[f.thread][0].id; ui.renderPanel(); } }, ...THREADS.filter((t) => t !== 'lineage').map((t) => el('option', { value: t, selected: f.thread === t ? true : undefined }, THREAD_INFO[t].name))));
      row.appendChild(el('select', { style: selS, onchange: (ev) => { f.value = ev.target.value; } }, ...ALLELES[f.thread].map((a) => el('option', { value: a.id, selected: f.value === a.id ? true : undefined }, a.name))));
    }
    body.appendChild(row);
  }
  body.appendChild(pickUpRow(ui, e));
  return { title: STRUCTURES[e.s].name, body, icon: icon(e.s), narrow: true };
}
function defaultFilterValue(ui, kind) {
  if (kind === 'role') return 'heiress';
  if (kind === 'species') return SPECIES_LIST.find((sp) => ui.game.codexStage(sp.id) >= 1)?.id || 'meadowmote';
  if (kind === 'item') return 'goldmel';
  if (kind === 'category') return 'comb';
  return null;
}

function keeper(ui, e) {
  const top = el('div', {});
  top.appendChild(el('div', { class: 'status' }, e.status || 'Watching'));
  top.appendChild(el('p', { class: 'faint' }, 'Every 5 seconds it gathers what Groves and Cradles within 4 tiles have dropped. Point a Runnel away from it to carry things off.'));
  const og = el('div', { class: 'grid' });
  e.out.forEach((s) => og.appendChild(ui.slotEl(s, { onclick: () => takeToBag(ui, s, () => e.out.splice(e.out.indexOf(s), 1)) })));
  if (!e.out.length) og.appendChild(el('span', { class: 'faint' }, 'Nothing gathered yet.'));
  top.appendChild(og);
  if (e.out.length) top.appendChild(btn('Take all', () => { while (e.out.length) { if (ui.game.give(cloneStack(e.out[0]), false) > 0) break; e.out.shift(); } ui.game.emit('inv'); ui.renderPanel(); }, 'small'));
  top.appendChild(pickUpRow(ui, e));
  return { title: 'Groundskeeper', body: top, icon: icon('groundskeeper'), live: true };
}

function power(ui, e) {
  const g = ui.game, sim = ui.sim, st = STRUCTURES[e.s];
  const body = el('div', {});
  body.appendChild(el('p', { class: 'muted' }, st.desc));
  body.appendChild(el('div', { class: 'kv' },
    el('span', {}, 'Gearline'), el('span', {}, `${sim.powerGen.toFixed(1)} made/s, ${sim.powerUse.toFixed(1)} used/s`),
    el('span', {}, 'Stored'), el('span', {}, `${Math.floor(g.state.battery)} / ${sim.powerCap}`)));
  if (e.s === 'windlass') body.appendChild(el('div', { class: 'row', style: { marginTop: '8px' } }, btn('Crank (+25)', () => {
    g.state.battery = Math.min(sim.powerCap || 30, (g.state.battery || 0) + 25); e.crankT = performance.now(); ui.audio?.play('crank'); g.stat('cranks'); ui.renderPanel();
  })));
  if (e.s === 'bellows') {
    body.appendChild(el('div', { class: 'row', style: { marginTop: '8px' } }, el('span', {}, 'Fuel:'), ui.slotEl(e.fuel, { label: 'Fuel', onclick: e.fuel ? () => takeToBag(ui, e.fuel, () => (e.fuel = null)) : null }), el('span', { class: 'faint' }, e.burn > 0 ? `burning, ${Math.ceil(e.burn)}s left` : 'cold')));
    body.appendChild(el('p', { class: 'faint' }, 'Burns Timber, Leaf Litter, Peat, Phosphor or Verdant Spirit, only while machines want power.'));
    return containerShell(ui, e, body, (s) => { if (!ITEMS[s.id].fuel) return false; if (e.fuel && e.fuel.id !== s.id) return false; if (e.fuel) e.fuel.n += s.n; else e.fuel = cloneStack(s); return s.n; }, st.name, { dim: (s) => !!ITEMS[s.id].fuel });
  }
  if (e.s === 'windsail') body.appendChild(el('p', { class: 'faint' }, `Wind here: ${T.windFactor(g.now, g.regionAt(e.x, e.y)).toFixed(2)}×`));
  body.appendChild(pickUpRow(ui, e));
  return { title: st.name, body, icon: icon(e.s), live: true, narrow: true };
}

function simple(ui, e) {
  const st = STRUCTURES[e.s];
  const body = el('div', {}, el('p', { class: 'muted' }, st.desc), pickUpRow(ui, e));
  return { title: st.name, body, icon: icon(e.s), narrow: true };
}

// ───────────────────────── GROVE ─────────────────────────
function grove(ui, data) {
  const g = ui.game, e = data.e;
  if (!g.ent(e.id)) return null;
  const sp = SPECIES[e.sp];
  const body = el('div', {});
  body.appendChild(el('div', { class: 'status ' + (e.status?.startsWith('Struggling') ? 'bad' : 'ok') }, e.stump ? 'A stump. It will regrow.' : e.status || ''));
  if (!e.stump && e.growth < 1) body.appendChild(el('div', { class: 'bar', style: { margin: '6px 0' } }, el('i', { style: { width: e.growth * 100 + '%' } })));
  body.appendChild(el('p', { class: 'muted' }, sp.lore));
  const env = g.envAt(e.x, e.y, e.id);
  if (e.an || e.wild) body.appendChild(climateLine(sp, e.g, env));
  body.appendChild(el('div', { class: 'kv', style: { marginTop: '6px' } },
    el('span', {}, 'Makes'), el('span', {}, sp.products.map(([id]) => ITEMS[id].name).join(', ') + `, Scions now and then`),
    el('span', {}, 'Blossom'), el('span', {}, trait(e.g, 'bloom').name),
    el('span', {}, 'Pollinated'), el('span', {}, e.pol ? `Yes, by a ${SPECIES[e.pol.carrier]?.name || 'visitor'}: a hybrid Scion will drop soon` : 'No'),
    el('span', {}, 'Colony'), el('span', {}, e.colony ? `${SPECIES[e.colony.sp].name} (${e.colony.status || 'Flying'})` : 'None. Release a Flitter that hosts on ' + trait(e.g, 'bloom').name + ' trees')));
  if (e.buf && e.buf.length) {
    body.appendChild(el('h3', {}, 'Ready to gather'));
    const og = el('div', { class: 'grid' });
    e.buf.forEach((s) => og.appendChild(ui.slotEl(s, { onclick: () => takeToBag(ui, s, () => e.buf.splice(e.buf.indexOf(s), 1)) })));
    body.appendChild(og);
    body.appendChild(el('div', { class: 'row', style: { marginTop: '6px' } }, btn('Gather all', () => { ui.actions.harvest(e); ui.renderPanel(); })));
  }
  if (e.an) body.appendChild(el('div', { class: 'box', style: { marginTop: '8px' } }, genomeTable(e.g, 'g')));
  else {
    const free = g.hasTool('steady_eye');
    body.appendChild(el('div', { class: 'row', style: { marginTop: '8px' } }, btn(free ? 'Read Strand' : 'Read Strand (1 Goldmel)', () => {
      if (!free) { if (countIn(g.state.inv, 'goldmel') < 1) { ui.toast('Reading costs 1 Goldmel.', 'warn'); return; } removeFrom(g.state.inv, 'goldmel', 1); }
      e.an = true; g.codexMark(e.sp, 2); if (isPure(e.g)) g.codexMark(e.sp, 4); g.emit('inv'); ui.audio?.play('lens'); ui.renderPanel();
    }, 'alt small')));
  }
  if (e.colony) {
    body.appendChild(el('h3', {}, `${SPECIES[e.colony.sp].name} colony`));
    if (e.an) body.appendChild(el('div', { class: 'box' }, genomeTable(e.colony.g, 'f')));
    body.appendChild(btn('Catch the colony', () => { g.give({ id: 'flitter', n: 1, g: e.colony.g, sp: e.colony.sp }); e.colony = null; g.emit('inv'); ui.renderPanel(); }, 'alt small'));
  }
  const actions = el('div', { class: 'row', style: { marginTop: '12px' } });
  if (e.growth < 1 && !e.stump && countIn(g.state.inv, 'mulch') > 0) actions.appendChild(btn('Apply Mulch', () => { ui.actions.mulch(e); ui.renderPanel(); }, 'alt small'));
  if (!e.stump) actions.appendChild(btn(e.wild ? 'Fell (regrows)' : 'Fell', () => { ui.actions.fell(e); ui.close(); }, 'danger small', !g.hasTool('axe')));
  if (!e.wild && !e.stump && e.growth < 0.35) actions.appendChild(btn('Dig up Scion', () => { g.give({ id: 'scion', n: 1, g: e.g, sp: e.sp }); g.removeEnt(e); g.emit('inv'); ui.close(); }, 'alt small'));
  body.appendChild(actions);
  return { title: sp.name + (e.wild ? ' (wild)' : ''), body, icon: spIcon(e.sp), live: true, narrow: true };
}

// ───────────────────────── CRAFTING ─────────────────────────
export function nearbyStores(ui) {
  const g = ui.game, p = g.state.player;
  const stores = [g.state.inv];
  for (const e of Object.values(g.state.ents)) if (e.t === 's' && e.s === 'chest' && Math.hypot(e.x + 0.5 - p.x, e.y + 0.5 - p.y) < 7) stores.push(e.slots);
  const [hx, hy] = g.world.poi.home;
  if (Math.hypot(hx + 2 - p.x, hy + 1 - p.y) < 9) stores.push(g.state.vault);
  return stores;
}
function haveCount(stores, id) { return stores.reduce((n, s) => n + countIn(s, id), 0); }
function takeFrom(stores, id, n) { let left = n; for (const s of stores) { if (left <= 0) break; left -= removeFrom(s, id, left); } }
function nearBench(ui) {
  const g = ui.game, p = g.state.player;
  return Object.values(g.state.ents).some((e) => e.t === 's' && e.s === 'workbench' && Math.hypot(e.x + 0.5 - p.x, e.y + 0.5 - p.y) < 4.5);
}

function craft(ui, data = {}, panel) {
  const g = ui.game, s = g.state;
  const stores = nearbyStores(ui);
  const bench = nearBench(ui);
  const tab = panel.tab || 'all';
  const body = el('div', {});
  body.appendChild(el('p', { class: 'faint' }, `${bench ? 'You are at a Workbench.' : 'Workbench recipes need you to stand near a Workbench.'} Ingredients come from your bag${stores.length > 1 ? ', nearby chests' : ''}${stores.includes(s.vault) ? ' and your Vault' : ''}.`));
  const groups = { all: 'Everything', hives: 'Hives', machines: 'Machines', logistics: 'Logistics', parts: 'Parts', tools: 'Tools', deco: 'Decor' };
  const groupOf = (r) => {
    const d = ITEMS[r.out];
    const st = STRUCTURES[r.out];
    if (st) { if (st.housing || r.out === 'cradle' || r.out === 'flowerbed') return 'hives'; if (st.kind === 'machine' || st.kind === 'power' || st.kind === 'station') return 'machines'; if (st.kind === 'logistics' || st.kind === 'storage') return 'logistics'; return 'deco'; }
    if (d.tool) return 'tools';
    return 'parts';
  };
  const list = CRAFT.filter((r) => !r.bp || s.unlocks[r.bp]).filter((r) => tab === 'all' || groupOf(r) === tab);
  list.sort((a, b) => {
    const ca = Object.entries(a.in).every(([k, n]) => haveCount(stores, k) >= n), cb = Object.entries(b.in).every(([k, n]) => haveCount(stores, k) >= n);
    return (cb - ca);
  });
  for (const r of list) {
    const can = Object.entries(r.in).every(([k, n]) => haveCount(stores, k) >= n);
    const stationOk = r.station === 'hand' || bench;
    const doCraft = (times) => {
      for (let t = 0; t < times; t++) {
        if (!Object.entries(r.in).every(([k, n]) => haveCount(stores, k) >= n)) break;
        for (const [k, n] of Object.entries(r.in)) takeFrom(stores, k, n);
        g.give(mk(r.out, r.n), false);
        g.stat('crafted');
        g.stat('made_' + r.out, r.n);
      }
      ui.audio?.play('craft');
      g.emit('inv');
      ui.renderPanel();
    };
    body.appendChild(el('div', { class: 'recipe' + (can && stationOk ? '' : ' cant') },
      el('div', { class: 'out' }, el('img', { src: icon(r.out) }), el('div', {}, el('div', {}, `${r.n > 1 ? r.n + '× ' : ''}${ITEMS[r.out].name}`), el('div', { class: 'lbl-sm' }, r.station === 'hand' ? 'By hand' : 'Workbench'))),
      el('div', { class: 'ins' }, ...Object.entries(r.in).map(([k, n]) => ingChip(k, n, haveCount(stores, k)))),
      el('div', { class: 'row', style: { gap: '4px' } }, btn('Make', () => doCraft(1), 'small', !(can && stationOk)), btn('×5', () => doCraft(5), 'alt small', !(can && stationOk)))));
  }
  if (!list.length) body.appendChild(el('p', { class: 'muted' }, 'Nothing here yet.'));
  const locked = CRAFT.filter((r) => r.bp && !s.unlocks[r.bp]).length;
  if (locked) body.appendChild(el('p', { class: 'faint' }, `${locked} more recipes are locked behind blueprints. Fennick sells them at his workshop in Thistlewick.`));
  return { title: 'Crafting', body, icon: icon('workbench'), tabs: Object.entries(groups), sub: bench ? 'at the Workbench' : '' };
}

// ───────────────────────── CODEX ─────────────────────────
function codex(ui, data, panel) {
  const g = ui.game;
  const tab = panel.tab || 'h';
  panel.tab = tab;
  const body = el('div', { class: 'split' });
  const list = SPECIES_LIST.filter((s) => s.k === tab);
  const done = list.filter((s) => g.codexStage(s.id) >= 3).length;
  const left = el('div', {});
  left.appendChild(el('div', { class: 'faint', style: { marginBottom: '6px' } }, `${done} of ${list.length} bred. Stars: seen, read, bred, purebred.`));
  const grid = el('div', { class: 'codex-grid' });
  for (const sp of list) {
    const stg = g.codexStage(sp.id);
    const card = el('div', { class: `cx s${stg}` + (ui.codexSel === sp.id ? ' sel' : ''), onclick: () => { ui.codexSel = sp.id; ui.renderPanel(); } },
      el('img', { src: spIcon(sp.id) }), el('div', { class: 'nm' }, stg ? sp.name : '???'), el('div', { class: 'stars' }, '★'.repeat(stg) + '☆'.repeat(4 - stg)));
    grid.appendChild(card);
  }
  left.appendChild(grid);
  body.appendChild(left);
  const right = el('div', {});
  const sel = SPECIES[ui.codexSel];
  if (sel && sel.k === tab) right.appendChild(codexEntry(ui, sel));
  else right.appendChild(el('p', { class: 'muted' }, 'Pick a species to see what you know about it.'));
  body.appendChild(right);
  return { title: 'Codex', body, icon: spIcon('meadowmote'), tabs: [['h', 'Hummers'], ['g', 'Groves'], ['f', 'Flitters']] };
}

function codexEntry(ui, sp) {
  const g = ui.game;
  const stg = g.codexStage(sp.id);
  const box = el('div', { class: 'col' });
  box.appendChild(el('div', { class: 'row' }, el('img', { src: spIcon(sp.id), style: { width: '48px', height: '48px', imageRendering: 'pixelated', filter: stg ? '' : 'brightness(0) opacity(.45)' } }),
    el('div', {}, el('div', { class: 'status' }, stg ? sp.name : 'Unknown species'), el('div', { class: 'faint' }, `${KINGDOM_NAMES[sp.k]} · ${sp.line} line · ${STAGE_NAMES[stg]}`))));
  if (stg) {
    box.appendChild(el('p', { class: 'muted' }, sp.lore));
    box.appendChild(el('div', { class: 'kv' },
      el('span', {}, 'Home'), el('span', {}, `${TEMPS[sp.temp]}, ${HUMS[sp.hum]}` + (sp.wild ? ` · wild in ${BIOMES[sp.wild].name}` : '')),
      el('span', {}, 'Makes'), el('span', {}, [...sp.products.map(([id, p]) => `${ITEMS[id].name}`), ...sp.special.map(([id]) => ITEMS[id].name + ' (thriving)')].join(', ') || '—'),
      stg >= 2 ? el('span', {}, 'Traits') : null, stg >= 2 ? el('span', {}, ['vigor', 'span', 'brood', 'rhythm', 'bloom', 'reach', 'gift'].map((t) => ALLELE_INDEX[t][sp.genes[t]].name).join(' · ')) : null));
  } else if (sp.wild) box.appendChild(el('p', { class: 'faint' }, `Lives wild somewhere in ${g.state.gates[gateFor(sp.wild)] || sp.wild === 'meadowfold' ? BIOMES[sp.wild].name : 'a part of the valley you haven\'t reached'}.`));
  // How to breed it
  const ways = MUT_BY_CHILD[sp.id] || [];
  if (ways.length) {
    box.appendChild(el('h3', {}, 'How it is bred'));
    for (const m of ways) {
      const known = ui.story.mutKnown(m);
      const notes = g.state.notes[m.c] || 0;
      box.appendChild(el('div', { class: 'box' },
        known ? el('div', {}, `${SPECIES[m.a].name} + ${SPECIES[m.b].name}: ${Math.round(m.p * 100)}%${notes ? ` (+${Math.min(5, notes) * 10}% from Field Notes)` : ''}`)
          : el('div', {}, `${g.codexStage(m.a) >= 1 ? SPECIES[m.a].name : '???'} + ${g.codexStage(m.b) >= 1 ? SPECIES[m.b].name : '???'}`),
        m.cond && Object.keys(m.cond).length ? el('div', { class: 'faint' }, known ? condText(m.cond) : m.hint) : null));
    }
  }
  // What it leads to
  const kids = MUTATIONS.filter((m) => (m.a === sp.id || m.b === sp.id) && ui.story.mutKnown(m) && m.c !== 'hearthling' || ((m.a === sp.id || m.b === sp.id) && m.c === 'hearthling' && ui.story.mutKnown(m) && (m.a === 'meadowmote' || m.b === 'meadowmote')));
  if (stg && kids.length) {
    box.appendChild(el('h3', {}, 'Known crosses'));
    for (const m of kids.slice(0, 12)) {
      const other = m.a === sp.id ? m.b : m.a;
      box.appendChild(el('div', {}, `with ${SPECIES[other].name} → ${g.codexStage(m.c) >= 1 ? SPECIES[m.c].name : 'something new'} (${Math.round(m.p * 100)}%)`));
    }
  }
  return box;
}
function gateFor(region) { return { thicket: 'g_thicket', saltfen: 'g_saltfen', sunscar: 'g_sunscar', rimeback: 'g_rimeback', canopy: 'g_canopy', ashvent: 'g_ashvent', hollow: 'g_hollow' }[region]; }

// ───────────────────────── JOURNAL ─────────────────────────
function journal(ui, data, panel) {
  const g = ui.game, s = g.state, st = ui.story;
  const tab = panel.tab || 'quest';
  panel.tab = tab;
  const body = el('div', {});
  if (tab === 'quest') {
    const q = st.current();
    if (q) {
      const pr = st.goalProgress(q.goal);
      body.appendChild(el('div', { class: 'faint' }, `Act ${q.act}`));
      body.appendChild(el('h3', {}, q.title));
      body.appendChild(el('p', {}, q.text));
      body.appendChild(el('div', { class: 'box' }, el('div', { class: 'status ' + (pr.done ? 'ok' : '') }, pr.text), q.hint ? el('div', { class: 'faint', style: { marginTop: '4px' } }, 'Hint: ' + q.hint) : null));
    } else body.appendChild(el('p', {}, 'The Heartroot is awake. The Codex still has gaps. The orders keep coming. Hollowmere is yours.'));
    const done = QUESTS.filter((x) => s.quest.done[x.id]).reverse();
    if (done.length) {
      body.appendChild(el('h3', {}, 'Done'));
      for (const x of done) body.appendChild(el('div', { class: 'faint' }, `✓ ${x.title}`));
    }
  } else if (tab === 'home') {
    body.appendChild(homeExtras(ui));
  } else if (tab === 'lore') {
    let any = false;
    for (const r of REGION_ORDER) {
      const pages = LORE[r].map((p, i) => ({ p, i })).filter(({ i }) => s.lore[r + ':' + i]);
      body.appendChild(el('h3', {}, `${BIOMES[r].name} (${pages.length}/3)`));
      for (const { p } of pages) { any = true; body.appendChild(el('details', { class: 'box', style: { marginBottom: '4px' } }, el('summary', { style: { cursor: 'pointer', fontFamily: 'var(--pix)' } }, p.title), el('p', {}, p.text))); }
    }
    if (!any) body.prepend(el('p', { class: 'muted' }, 'Your grandmother left pages in stone cairns across the valley. Find them and they\'ll be kept here.'));
  } else if (tab === 'stats') {
    const S = s.stats;
    const rows = [['Hives scooped', S.hivesScooped], ['Generations bred', S.generations], ['Mutation finds', Object.values(s.codex).filter((v) => v >= 3).length], ['Groves planted', S.scionsPlanted], ['Hybrid scions', S.hybrids], ['Pollinations', S.pollinations], ['Flitters caught', S.flittersCaught], ['Combs spun', S.combsSpun], ['Orders filled', S.orders], ['Crowns earned', S.crownsEarned], ['Lore pages', S.lore], ['Days visited', s.daily.streak + ' in a row']];
    body.appendChild(el('div', { class: 'kv' }, ...rows.flatMap(([k, v]) => [el('span', {}, k), el('span', {}, String(v || 0))])));
  }
  return { title: 'Journal', body, icon: icon('candle'), tabs: [['quest', 'Quest'], ['home', 'Mail & basket'], ['lore', 'Lore'], ['stats', 'Records']] };
}

function homeExtras(ui) {
  const g = ui.game, s = g.state, st = ui.story;
  const box = el('div', {});
  const [hx, hy] = g.world.poi.home;
  const atHome = Math.hypot(hx + 2 - s.player.x, hy + 1 - s.player.y) < 10;
  box.appendChild(el('h3', {}, 'Morning basket'));
  if (st.basketReady()) {
    if (atHome) box.appendChild(btn('Open today\'s basket', () => {
      const r = st.claimBasket();
      if (r) { ui.toast(`Basket: ${r.got.map((x) => x.n + ' ' + ui.stackTitle(x)).join(', ')} and ${r.crowns} Crowns (day ${r.streak} in a row)`, 'good'); ui.audio?.play('quest'); }
      ui.renderPanel();
    }));
    else box.appendChild(el('p', { class: 'muted' }, 'A basket is waiting on your Homestead porch.'));
  } else box.appendChild(el('p', { class: 'faint' }, `Collected today. ${s.daily.streak} day${s.daily.streak === 1 ? '' : 's'} in a row. Come back tomorrow for the next one.`));
  box.appendChild(el('h3', {}, `Letters (${s.letters.inbox.length})`));
  if (!s.letters.inbox.length) box.appendChild(el('p', { class: 'faint' }, 'No letters. Wren brings post every few hours.'));
  s.letters.inbox.forEach((L, i) => {
    box.appendChild(el('div', { class: 'letter', style: { marginBottom: '8px' } }, el('h4', {}, `From ${L.from}`), el('p', {}, L.text),
      L.gift ? el('div', { class: 'row' }, el('span', {}, 'Enclosed: ' + Object.entries(L.gift).map(([id, n]) => `${n} ${ITEMS[id].name}`).join(', ')),
        atHome ? btn('Take', () => { st.claimLetter(i); ui.renderPanel(); }, 'small') : el('span', { class: 'faint' }, '(collect at home)')) : btn('Done', () => { st.claimLetter(i); ui.renderPanel(); }, 'small')));
  });
  return box;
}

// ───────────────────────── HOME ─────────────────────────
function home(ui, data, panel) {
  const g = ui.game, s = g.state;
  const tab = panel.tab || 'vault';
  panel.tab = tab;
  const body = el('div', {});
  if (tab === 'vault') {
    body.appendChild(el('p', { class: 'faint' }, 'Tap your bag to store, tap the Vault to take. Crafting near home can use the Vault directly.'));
    const vg = el('div', { class: 'grid' });
    s.vault.forEach((st, i) => vg.appendChild(ui.slotEl(st, { small: true, onclick: st ? () => takeToBag(ui, st, () => (s.vault[i] = null)) : null })));
    body.appendChild(vg);
    body.appendChild(el('div', { class: 'row', style: { margin: '8px 0' } }, btn('Store everything but the hotbar', () => {
      for (let i = 9; i < s.inv.length; i++) { const st = s.inv[i]; if (!st || ITEMS[st.id].tool) continue; const left = addToSlots(s.vault, st); if (left === 0) s.inv[i] = null; else st.n = left; }
      g.emit('inv'); ui.renderPanel();
    }, 'alt small')));
    body.appendChild(el('h3', {}, 'Your bag'));
    body.appendChild(bagGrid(ui, (i) => bagToContainer(ui, i, (st) => { const left = addToSlots(s.vault, cloneStack(st)); if (left === st.n) return false; return st.n - left; })));
  } else body.appendChild(homeExtras(ui));
  return { title: 'Homestead', body, icon: icon('chest'), tabs: [['vault', 'Vault'], ['post', 'Mail & basket']] };
}

// ───────────────────────── MAP ─────────────────────────
function map(ui) {
  const g = ui.game, s = g.state;
  const base = ui.renderer.mapImage();
  const c = document.createElement('canvas');
  c.width = base.width; c.height = base.height;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(base, 0, 0);
  x.fillStyle = 'rgba(0,0,0,0.35)';
  // fog over closed regions
  const closed = REGION_ORDER.filter((r) => r !== 'meadowfold' && !s.gates[gateFor(r)]);
  const w = g.world;
  for (let ty = 0; ty < w.H; ty++) for (let tx = 0; tx < w.W; tx++) if (closed.includes(w.regionId(tx, ty))) x.fillRect(tx * 3, ty * 3, 3, 3);
  const dot = (tx, ty, col, r = 3) => { x.fillStyle = '#1a1410'; x.fillRect(tx * 3 - r - 1, ty * 3 - r - 1, r * 2 + 2, r * 2 + 2); x.fillStyle = col; x.fillRect(tx * 3 - r, ty * 3 - r, r * 2, r * 2); };
  for (const e of Object.values(s.ents)) if (e.t === 's' && STRUCTURES[e.s].housing) dot(e.x + 0.5, e.y + 0.5, '#f2c84b', 2);
  for (const f of g.fixtures) {
    if (f.kind === 'cairn') dot(f.x + 0.5, f.y + 0.5, s.lore[f.region + ':' + f.idx] ? '#8a9c8c' : '#e6c66e', 2);
    if (f.kind === 'gate') dot(f.x + 0.5, f.y + 0.5, '#e0714a', 3);
    if (f.kind === 'building') dot(f.x + f.w / 2, f.y + f.h / 2, f.b.kind === 'house' ? '#8fd18a' : '#c9a24b', 3);
  }
  dot(s.player.x, s.player.y, '#ffffff', 3);
  const body = el('div', {});
  body.appendChild(el('div', { class: 'map-wrap' }, c));
  const legend = el('div', { class: 'row', style: { justifyContent: 'center', marginTop: '8px', gap: '14px' } },
    el('span', {}, el('span', { class: 'tag', style: { background: '#fff', color: '#000' } }, 'You')), el('span', {}, el('span', { class: 'tag', style: { background: '#8fd18a', color: '#000' } }, 'Home')),
    el('span', {}, el('span', { class: 'tag gold' }, 'Your hives')), el('span', {}, el('span', { class: 'tag bad' }, 'Closed pass')), el('span', {}, el('span', { class: 'tag', style: { background: '#e6c66e', color: '#000' } }, 'Unread cairn')));
  body.appendChild(legend);
  const regions = el('div', { class: 'row', style: { justifyContent: 'center', marginTop: '8px' } });
  for (const r of REGION_ORDER) regions.appendChild(el('span', { class: 'tag ' + (closed.includes(r) ? '' : 'gold') }, `${BIOMES[r].name}: ${TEMPS[BIOMES[r].temp]}, ${HUMS[BIOMES[r].hum]}`));
  body.appendChild(regions);
  return { title: 'Hollowmere Valley', body, icon: icon('seed_wild') };
}

// ───────────────────────── VILLAGE SERVICES ─────────────────────────
function orders(ui) {
  const g = ui.game, s = g.state, st = ui.story;
  st.daily();
  const body = el('div', {});
  body.appendChild(el('p', { class: 'muted' }, 'Wren pins new orders here every morning. Bring what\'s asked in your bag.'));
  const card = (o, grand) => {
    const what = o.kind === 'item' ? `${o.n} × ${ITEMS[o.id].name}` : `${o.n} × ${o.pure ? 'purebred ' : ''}${SPECIES[o.sp].name} Courier${o.n > 1 ? 's' : ''} or Heiress`;
    const have = o.kind === 'item' ? countIn(s.inv, o.id) : st.specimenMatches(o).length;
    return el('div', { class: 'recipe' + (o.done ? ' cant' : '') },
      el('div', { class: 'out' }, el('img', { src: o.kind === 'item' ? icon(o.id) : spIcon(o.sp) }), el('div', {}, el('div', {}, what), el('div', { class: 'lbl-sm' }, grand ? 'Grand Order of the week' : 'Today'))),
      el('div', { class: 'ins' }, el('span', { class: 'tag gold' }, `${o.crowns} Crowns`), el('span', { class: 'tag' }, `${o.renown} Renown`), o.prize ? el('span', { class: 'tag violet' }, ITEMS[o.prize].name) : null, el('span', { class: 'faint' }, o.done ? 'Filled' : `You have ${have}`)),
      o.done ? el('span', { class: 'status ok' }, '✓') : btn('Deliver', () => { st.deliver(o); ui.renderPanel(); }, 'small', !st.canDeliver(o)));
  };
  for (const o of s.daily.orders) body.appendChild(card(o, false));
  if (s.daily.grand) body.appendChild(card(s.daily.grand, true));
  const ms = T.msToNextSeason(Date.now());
  body.appendChild(el('p', { class: 'faint' }, `New orders in ${fmtTime(ms / 1000)}. It is ${T.seasonName(Date.now())}; tomorrow brings ${SEASONS[(T.season(Date.now()) + 1) % 4]}.`));
  return { title: 'Order Board', body, icon: icon('candle'), narrow: false };
}

function market(ui, data, panel) {
  const g = ui.game, s = g.state, st = ui.story;
  st.daily();
  const tab = panel.tab || 'sell';
  panel.tab = tab;
  const body = el('div', {});
  if (tab === 'sell') {
    body.appendChild(el('p', { class: 'faint' }, 'Tap an item to sell one; use the buttons for the whole stack. Prices fall a little each time you sell the same thing, and recover overnight.'));
    body.appendChild(bagGrid(ui, (i) => { if (s.inv[i] && !s.inv[i].g && ITEMS[s.inv[i].id].value && !ITEMS[s.inv[i].id].tool) { ui.sel = i; ui.renderPanel(); } }, { dim: (x) => !x.g && ITEMS[x.id].value > 0 && !ITEMS[x.id].tool }));
    const sel = ui.sel !== null ? s.inv[ui.sel] : null;
    if (sel && !sel.g) {
      const pr = st.sellPrice(sel.id);
      body.appendChild(el('div', { class: 'box', style: { marginTop: '8px' } }, el('div', { class: 'row' }, el('img', { src: iconDataURL(sel), style: { width: '32px', imageRendering: 'pixelated' } }), el('span', { class: 'status' }, `${sel.n} × ${ITEMS[sel.id].name}`), el('span', { class: 'tag gold' }, `${pr} each`),
        btn('Sell 1', () => { const t = st.sell(ui.sel, false); ui.toast(`Sold for ${t} Crowns`, 'good'); if (!s.inv[ui.sel]) ui.sel = null; ui.renderPanel(); }, 'small'),
        btn(`Sell all (${sel.n})`, () => { const t = st.sell(ui.sel, true); ui.toast(`Sold for ${t} Crowns`, 'good'); ui.sel = null; ui.renderPanel(); }, 'small'))));
    }
    const mult = s.market.mult || {};
    const hot = Object.entries(mult).sort((a, b) => b[1] - a[1])[0];
    if (hot) body.appendChild(el('p', { class: 'faint' }, `Marra: "${{ comb: 'Combs', hive: 'Hive goods', grove: 'Fruit and timber', flitter: 'Silk and dust', goods: 'Made goods', material: 'Raw materials', seed: 'Seeds', frame: 'Frames', module: 'Modules' }[hot[0]]} are fetching a good price today."`));
  } else {
    body.appendChild(el('p', { class: 'faint' }, 'Marra\'s stock grows as the roads open.'));
    for (const { id, price } of st.shopList()) {
      body.appendChild(el('div', { class: 'recipe' }, el('div', { class: 'out' }, el('img', { src: icon(id) }), ITEMS[id].name), el('div', { class: 'ins' }, el('span', { class: 'faint' }, ITEMS[id].desc || '')),
        el('span', { class: 'tag gold' }, `${price}`), btn('Buy', () => { st.buy(id, price); ui.renderPanel(); }, 'small', s.crowns < price), btn('×5', () => { st.buy(id, price, 5); ui.renderPanel(); }, 'alt small', s.crowns < price * 5)));
    }
    const o = st.wildPairOffer();
    const sold = s.daily.boughtPair === st.today();
    body.appendChild(el('h3', {}, 'Today\'s live pair'));
    body.appendChild(el('div', { class: 'recipe' + (sold ? ' cant' : '') }, el('div', { class: 'out' }, el('img', { src: spIcon(o.sp) }), `${SPECIES[o.sp].name} Heiress and Courier`),
      el('div', { class: 'ins' }, el('span', { class: 'faint' }, 'A pristine wild pair, caught this morning. One a day.')), el('span', { class: 'tag gold' }, String(o.price)),
      btn(sold ? 'Sold' : 'Buy', () => { st.buyWildPair(); ui.renderPanel(); }, 'small', sold || s.crowns < o.price)));
  }
  return { title: 'Quill\'s Market', body, icon: icon('goldmel'), tabs: [['sell', 'Sell'], ['buy', 'Buy']], sub: `${s.crowns} Crowns` };
}

function shop(ui) {
  const g = ui.game, s = g.state, st = ui.story;
  const body = el('div', {});
  body.appendChild(el('p', { class: 'muted' }, '"Blueprints. Learn one once and you can build it forever. The Guild only lets me sell the advanced ones to higher ranks."'));
  const list = Object.entries(BLUEPRINTS).sort((a, b) => a[1].rank - b[1].rank || a[1].price - b[1].price);
  for (const [id, bp] of list) {
    const owned = !!s.unlocks[id];
    const locked = s.rank < bp.rank;
    const outs = CRAFT.filter((r) => r.bp === id).map((r) => r.out);
    body.appendChild(el('div', { class: 'recipe' + (owned || locked ? ' cant' : '') },
      el('div', { class: 'out' }, el('img', { src: icon(outs[0] || 'gearset') }), el('div', {}, el('div', {}, bp.name), el('div', { class: 'lbl-sm' }, locked ? `${RANKS[bp.rank].name} rank` : owned ? 'Known' : ''))),
      el('div', { class: 'ins' }, el('span', { class: 'faint' }, outs.map((o) => ITEMS[o].name).join(', '))),
      owned ? el('span', { class: 'status ok' }, '✓') : el('span', { class: 'tag gold' }, String(bp.price)),
      owned ? null : btn('Learn', () => { st.buyBlueprint(id); ui.renderPanel(); }, 'small', locked || s.crowns < bp.price)));
  }
  return { title: 'Fennick\'s Workshop', body, icon: icon('gearset'), sub: `${s.crowns} Crowns` };
}

function guild(ui) {
  const g = ui.game, s = g.state;
  const body = el('div', {});
  const next = RANKS[Math.min(s.rank + 1, 3)];
  body.appendChild(el('div', { class: 'kv' }, el('span', {}, 'Rank'), el('span', { class: 'status' }, RANKS[s.rank].name), el('span', {}, 'Renown'), el('span', {}, String(s.renown))));
  if (s.rank < 3) body.appendChild(el('div', { class: 'row', style: { margin: '6px 0' } }, el('div', { class: 'bar gold', style: { flex: 1 } }, el('i', { style: { width: Math.min(100, ((s.renown - RANKS[s.rank].renown) / (next.renown - RANKS[s.rank].renown)) * 100) + '%' } })), el('span', { class: 'faint' }, `${next.renown - s.renown} to ${next.name}`)));
  body.appendChild(el('h3', {}, 'How Renown is earned'));
  body.appendChild(el('div', { class: 'kv' }, el('span', {}, 'New species seen'), el('span', {}, '+1'), el('span', {}, 'Strand read'), el('span', {}, '+2'), el('span', {}, 'Species bred'), el('span', {}, '+5'),
    el('span', {}, 'Purebred line'), el('span', {}, '+6'), el('span', {}, 'Lore page'), el('span', {}, '+5'), el('span', {}, 'Orders'), el('span', {}, '+4 and up'), el('span', {}, 'Quests'), el('span', {}, '+10 and up')));
  body.appendChild(el('h3', {}, 'Ranks open'));
  body.appendChild(el('div', {}, ...['Keeper: the Thicket and the Saltfen bridge', 'Tender: the Sunscar rockfall, more blueprints', 'Grower: the Rimeback and Canopy passes, iron and gears', 'Warden: the Ashvent and the Hollow'].map((t, i) => el('div', { class: i <= s.rank ? '' : 'faint' }, (i <= s.rank ? '✓ ' : '· ') + t))));
  body.appendChild(el('div', { class: 'row', style: { marginTop: '10px' } }, btn('Ask Tobin for advice', () => ui.say([{ who: 'tobin', text: CHATTER.tobin[Math.floor(Math.random() * CHATTER.tobin.length)] }]), 'alt small')));
  return { title: 'Wardens\' Guild', body, icon: icon('banner'), narrow: true };
}

function hettie(ui) {
  const r = ui.story.hettieTruth();
  const body = el('div', {});
  body.appendChild(el('div', { class: 'letter' }, el('h4', {}, r.already ? 'Today\'s true thing (again)' : 'Today\'s true thing'), el('p', {}, r.text)));
  body.appendChild(el('p', { class: 'faint', style: { marginTop: '8px' } }, 'Hettie tells you one crossing a day. It\'s recorded in your Codex.'));
  return { title: 'Hettie Moss', body, narrow: true };
}

function gatePanel(ui, data) {
  const gt = data.f.gate;
  const miss = ui.actions.gateMissing(gt);
  const body = el('div', {});
  body.appendChild(el('p', {}, gt.text));
  const n = gt.need;
  const kv = el('div', { class: 'kv' });
  if (n.rank) { kv.appendChild(el('span', {}, 'Rank')); kv.appendChild(el('span', { class: ui.game.state.rank >= n.rank ? 'status ok' : 'status bad' }, RANKS[n.rank].name)); }
  if (n.crowns) { kv.appendChild(el('span', {}, 'Crowns')); kv.appendChild(el('span', { class: ui.game.state.crowns >= n.crowns ? 'status ok' : 'status bad' }, `${ui.game.state.crowns} / ${n.crowns}`)); }
  if (n.items) for (const [id, k] of Object.entries(n.items)) { const have = countIn(ui.game.state.inv, id); kv.appendChild(el('span', {}, ITEMS[id].name)); kv.appendChild(el('span', { class: have >= k ? 'status ok' : 'status bad' }, `${have} / ${k}${n.keep ? ' (you keep it)' : ''}`)); }
  body.appendChild(kv);
  body.appendChild(el('div', { class: 'row', style: { marginTop: '10px' } }, btn('Open the way', () => { if (ui.actions.openGate(gt)) { ui.close(); ui.audio?.play('quest'); } }, '', miss.length > 0)));
  return { title: gt.name, body, narrow: true, sub: `to ${BIOMES[gt.b].name}` };
}

function ferry(ui) {
  const body = el('div', {});
  body.appendChild(el('p', {}, 'The old Warden ferry lies half-sunk at the end of the dock. With 12 Waxed Timber and 3 Silkwax Cloth you could make it float again, and reach the isle at the heart of the lake.'));
  const s = ui.game.state;
  body.appendChild(el('div', { class: 'kv' }, el('span', {}, 'Waxed Timber'), el('span', {}, `${countIn(s.inv, 'waxed_timber')} / 12`), el('span', {}, 'Silkwax Cloth'), el('span', {}, `${countIn(s.inv, 'silkwax_cloth')} / 3`)));
  body.appendChild(el('div', { class: 'row', style: { marginTop: '10px' } }, btn('Repair the ferry', () => { if (ui.actions.repairFerry()) ui.close(); })));
  return { title: 'The Warden Ferry', body, narrow: true };
}

function heartroot(ui) {
  const g = ui.game, s = g.state;
  const body = el('div', {});
  if (s.awake) body.appendChild(el('p', {}, 'The Heartroot is awake. Light moves slowly through its leaves. If you stand very still, you can feel it hum.'));
  else {
    body.appendChild(el('p', {}, 'A colossal tree, grey and still, its roots running down into the lake. It is not dead. It is waiting.'));
    if (s.quest.i >= QUESTS.findIndex((q) => q.id === 'q31')) {
      body.appendChild(el('h3', {}, 'What it is waiting for'));
      for (const line of ui.story.awakeStatus()) body.appendChild(el('div', {}, line));
      body.appendChild(el('p', { class: 'faint' }, 'All three on the isle, at once: a mature Heartwood, a working Verdant Matriarch hive beside it, and a Dawnwing colony in the Heartwood\'s leaves.'));
    }
  }
  return { title: 'The Heartroot', body, narrow: true };
}

function lore(ui, data) {
  const page = LORE[data.region][data.idx];
  const body = el('div', {}, el('div', { class: 'letter' }, el('h4', {}, page.title), el('p', {}, page.text)));
  if (data.first) body.appendChild(el('p', { class: 'faint', style: { marginTop: '8px' } }, 'Kept in your Journal. +5 Renown.'));
  return { title: 'Warden Cairn', body, narrow: true, sub: BIOMES[data.region].name };
}

function intro(ui) {
  const s = ui.game.state;
  const body = el('div', {});
  const letter = el('div', { class: 'letter' }, ...INTRO.map((t, i) => el('p', { class: i === INTRO.length - 1 ? 'sig' : '' }, t)));
  body.appendChild(letter);
  const input = el('input', { type: 'text', value: s.player.name === 'Warden' ? '' : s.player.name, placeholder: 'Your name', maxlength: 18, style: { fontSize: '16px', padding: '6px 8px', borderRadius: '4px', border: '2px solid #c9a24b', background: '#142822', color: '#f1ead6' } });
  body.appendChild(el('div', { class: 'row', style: { marginTop: '12px' } }, el('label', {}, 'Sign your name: '), input,
    btn('Begin', () => { s.player.name = input.value.trim() || 'Warden'; s.intro = true; ui.close(); ui.toast('Find a wild hive near the Homestead and scoop it.', 'quest'); })));
  body.appendChild(el('p', { class: 'faint', style: { marginTop: '10px' } }, 'Move with WASD or the arrow keys (or the stick on a touchscreen). E or tap to use things. I for your bag, C to craft, J for your journal.'));
  return { title: 'A letter, left on the table', body, narrow: false };
}

function away(ui, data) {
  const L = data.log || {};
  const body = el('div', {});
  body.appendChild(el('p', {}, `You were away for ${fmtTime(data.secs)}. The estate kept working${data.capped ? ' (up to 12 hours of it)' : ''}.`));
  const rows = [['Combs and hive goods', L.combs], ['Fruit and grove goods', L.fruit], ['Silk and dust', L.silk], ['Things made by machines', L.made], ['Hummer generations', L.generations], ['Hybrid Scions', L.hybrids], ['Groves matured', L.matured], ['Chrysals laid', L.chrysals]].filter(([, v]) => v);
  if (rows.length) body.appendChild(el('div', { class: 'kv' }, ...rows.flatMap(([k, v]) => [el('span', {}, k), el('span', {}, String(v))])));
  else body.appendChild(el('p', { class: 'muted' }, 'Quiet. Nothing much needed tending.'));
  if (L.newSpecies && L.newSpecies.length) {
    body.appendChild(el('h3', {}, 'New while you were gone'));
    const r = el('div', { class: 'row' });
    for (const sp of L.newSpecies) r.appendChild(el('span', { class: 'tag gold' }, el('img', { src: spIcon(sp), style: { width: '20px', verticalAlign: 'middle', imageRendering: 'pixelated' } }), ' ', SPECIES[sp].name));
    body.appendChild(r);
  }
  const extras = [];
  if (ui.story.basketReady()) extras.push('Your morning basket is waiting on the porch.');
  if (ui.game.state.letters.inbox.length) extras.push(`${ui.game.state.letters.inbox.length} letter${ui.game.state.letters.inbox.length > 1 ? 's' : ''} at the Homestead.`);
  if (data.newDay) extras.push(`A new day: ${T.seasonName(Date.now())} has come, and Wren has posted fresh orders.`);
  for (const t of extras) body.appendChild(el('p', { class: 'muted' }, t));
  body.appendChild(el('div', { class: 'row', style: { marginTop: '10px' } }, btn('Back to work', () => ui.close())));
  return { title: 'While you were away', body, narrow: true };
}

function settings(ui) {
  const g = ui.game, s = g.state;
  const body = el('div', {});
  body.appendChild(el('h3', {}, 'Sound'));
  body.appendChild(el('div', { class: 'row' },
    el('label', { class: 'row' }, el('input', { type: 'checkbox', checked: s.settings.sound ? true : undefined, onchange: (e) => { s.settings.sound = e.target.checked; ui.audio?.apply(); } }), 'Effects'),
    el('label', { class: 'row' }, el('input', { type: 'checkbox', checked: s.settings.music ? true : undefined, onchange: (e) => { s.settings.music = e.target.checked; ui.audio?.apply(); } }), 'Music')));
  body.appendChild(el('h3', {}, 'View'));
  body.appendChild(el('div', { class: 'row' }, btn('Zoom out', () => { s.settings.zoom = Math.max(-2, (s.settings.zoom || 0) - 1); ui.renderer.resize(); }, 'alt small'), btn('Zoom in', () => { s.settings.zoom = Math.min(3, (s.settings.zoom || 0) + 1); ui.renderer.resize(); }, 'alt small'),
    document.fullscreenEnabled ? btn('Full screen', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); }, 'alt small') : null));
  body.appendChild(el('h3', {}, 'Your save'));
  body.appendChild(el('p', { class: 'faint' }, 'The game saves itself in this browser every few seconds. Copy a backup code to move your estate to another device.'));
  const ta = el('textarea', { rows: 3, style: { width: '100%', fontSize: '11px', background: '#142822', color: '#f1ead6', border: '1px solid #c9a24b', borderRadius: '4px' }, placeholder: 'Paste a backup code here to load it' });
  body.appendChild(ta);
  body.appendChild(el('div', { class: 'row', style: { marginTop: '6px' } },
    btn('Copy backup code', async () => { const code = ui.saver.exportCode(); ta.value = code; try { await navigator.clipboard.writeText(code); ui.toast('Backup code copied', 'good'); } catch { ta.select(); ui.toast('Select the code and copy it', 'info'); } }, 'alt small'),
    btn('Load backup code', () => { if (ui.saver.importCode(ta.value.trim())) location.reload(); else ui.toast('That code didn\'t work.', 'warn'); }, 'alt small'),
    btn(ui.confirmReset ? 'Really start over?' : 'Start over', () => { if (ui.confirmReset) { ui.saver.wipe(); location.reload(); } else { ui.confirmReset = true; ui.renderPanel(); } }, 'danger small')));
  body.appendChild(el('h3', {}, 'How to play'));
  body.appendChild(el('div', { class: 'kv' },
    el('span', {}, 'Move'), el('span', {}, 'WASD / arrows, or the stick'),
    el('span', {}, 'Use'), el('span', {}, 'E or Space, or tap a thing'),
    el('span', {}, 'Place'), el('span', {}, 'Hold an item from the hotbar (1–9), click a tile. R turns runnels'),
    el('span', {}, 'Panels'), el('span', {}, 'I bag · C craft · K codex · J journal · M map · Esc close')));
  body.appendChild(el('p', { class: 'faint', style: { marginTop: '10px' } }, `Hollowmere · ${s.player.name}'s estate, started ${new Date(s.created).toLocaleDateString()}`));
  return { title: 'Menu', body, icon: icon('gearset'), narrow: true };
}

// ───────────────────────── WARDEN'S DESK ─────────────────────────
const GLYPHS = ['✿', '❖', '☘', '✦', '❂', '✧', '❦', '☾', '✺', '❀'];
function desk(ui, e) {
  const g = ui.game, s = g.state;
  const body = el('div', {});
  const game = ui.deskGame;
  if (game && game.e === e.id) {
    const m = game.m;
    body.appendChild(el('p', {}, `Studying: ${SPECIES[m.a].name} + ${SPECIES[m.b].name} → ${SPECIES[m.c].name}. Match every pair before your focus runs out.`));
    body.appendChild(el('div', { class: 'row' }, el('span', { class: 'status' }, `Focus: ${'●'.repeat(game.focus)}${'○'.repeat(Math.max(0, game.maxFocus - game.focus))}`)));
    const grid = el('div', { class: 'memory' });
    game.cards.forEach((c, i) => {
      const up = c.done || game.open.includes(i);
      grid.appendChild(el('div', { class: 'card' + (c.done ? ' done' : up ? ' up' : ''), onclick: () => {
        if (c.done || game.open.includes(i) || game.open.length >= 2 || game.over) return;
        game.open.push(i);
        ui.audio?.play('tick');
        if (game.open.length === 2) {
          const [a, b] = game.open;
          if (game.cards[a].v === game.cards[b].v) { game.cards[a].done = game.cards[b].done = true; game.open = []; ui.audio?.play('pick');
            if (game.cards.every((x) => x.done)) { game.over = 'win'; s.notes[m.c] = (s.notes[m.c] || 0) + 1; g.stat('fieldNotes'); g.addRenown(3); ui.audio?.play('quest'); }
          } else { game.focus--; setTimeout(() => { game.open = []; if (game.focus <= 0) game.over = 'lose'; ui.renderPanel(); }, 700); }
        }
        ui.renderPanel();
      } }, up ? c.v : ''));
    });
    body.appendChild(grid);
    if (game.over === 'win') body.appendChild(el('div', { class: 'box' }, el('div', { class: 'status ok' }, `Field Note written. ${SPECIES[m.c].name} now has ${s.notes[m.c]} note${s.notes[m.c] > 1 ? 's' : ''} (+${Math.min(5, s.notes[m.c]) * 10}% chance).`), btn('Done', () => { ui.deskGame = null; ui.renderPanel(); }, 'small')));
    if (game.over === 'lose') body.appendChild(el('div', { class: 'box' }, el('div', { class: 'status bad' }, 'Your mind wanders. The candle gutters out.'), btn('Done', () => { ui.deskGame = null; ui.renderPanel(); }, 'small')));
    return { title: 'Warden\'s Desk', body, icon: icon('desk'), narrow: true };
  }
  body.appendChild(el('p', {}, 'Study a mutation you know about. Win the memory game and you write a Field Note: each note raises that mutation\'s chance by 10% of its base odds (up to five notes). Each study burns one Candle.'));
  const known = MUTATIONS.filter((m) => ui.story.mutKnown(m) && g.codexStage(m.c) < 4 && m.c !== 'hearthling');
  const seen = new Set();
  const list = known.filter((m) => { const k = m.c; if (seen.has(k)) return false; seen.add(k); return true; });
  if (!list.length) body.appendChild(el('p', { class: 'muted' }, 'You don\'t know any crossings worth studying yet. Discover more species, or ask Hettie.'));
  for (const m of list) {
    const notes = s.notes[m.c] || 0;
    body.appendChild(el('div', { class: 'recipe' },
      el('div', { class: 'out' }, el('img', { src: spIcon(m.c) }), g.codexStage(m.c) >= 1 ? SPECIES[m.c].name : '???'),
      el('div', { class: 'ins' }, el('span', { class: 'faint' }, `${SPECIES[m.a].name} + ${SPECIES[m.b].name}, ${Math.round(m.p * 100)}% base`), el('span', { class: 'tag' }, `${notes}/5 notes`)),
      btn('Study', () => {
        if (countIn(s.inv, 'candle') < 1) { ui.toast('You need a Candle to study by.', 'warn'); return; }
        removeFrom(s.inv, 'candle', 1);
        const pairs = 6 + Math.min(2, Math.floor(SPECIES[m.c].tier / 2));
        const vals = GLYPHS.slice(0, pairs);
        const cards = [...vals, ...vals].map((v) => ({ v, done: false })).sort(() => Math.random() - 0.5);
        ui.deskGame = { e: e.id, m, cards, open: [], focus: 6 + pairs - 4, maxFocus: 6 + pairs - 4 };
        g.emit('inv');
        ui.renderPanel();
      }, 'small', notes >= 5)));
  }
  body.appendChild(pickUpRow(ui, e));
  return { title: 'Warden\'s Desk', body, icon: icon('desk'), narrow: true };
}

export const PANELS = {
  bag, struct, grove, craft: (ui, d, p) => craft(ui, d, p), codex, journal, home, map, orders, market, shop, guild, hettie,
  gate: gatePanel, ferry, heartroot, lore, intro, away, settings,
};
