// Questline, daily orders, market, letters, Hettie's truths and the Heartroot.
import { QUESTS, DIALOGUE, LETTERS, LORE, RANKS, NPCS, CHATTER } from './data/story.js';
import { ITEMS } from './data/items.js';
import { SPECIES, MUTATIONS, MUT_BY_CHILD } from './data/species.js';
import { BLUEPRINTS } from './data/recipes.js';
import { BIOMES, GATES } from './data/biomes.js';
import { STRUCTURES } from './data/structures.js';
import { mk, mkSpecimen, countIn, removeFrom, addToSlots } from './inv.js';
import { wildGenome, val, isPure, condText, expressedId } from './genetics.js';
import { WILD_HIVE } from './game.js';
import { hash2, mulberry32, pick } from './util.js';
import * as T from './time.js';

const LETTER_EVERY = 4 * 3600 * 1000;

export class Story {
  constructor(game, sim) {
    this.game = game; this.sim = sim;
    this.checkT = 0;
  }
  get s() { return this.game.state; }

  current() { return QUESTS[this.s.quest.i] || null; }

  goalProgress(goal) {
    const g = this.game, s = this.s;
    switch (goal.type) {
      case 'stat': { const v = s.stats[goal.key] || 0; return { done: v >= goal.n, text: `${Math.min(v, goal.n)} / ${goal.n}` }; }
      case 'have': { const v = countIn(s.inv, goal.item); return { done: v >= goal.n, text: `${Math.min(v, goal.n)} / ${goal.n}` }; }
      case 'place': { const v = g.entsOfType('s', goal.s).length; return { done: v >= goal.n, text: `${Math.min(v, goal.n)} / ${goal.n}` }; }
      case 'matron': { const v = Object.values(s.ents).some((e) => e.t === 's' && e.matron); return { done: v, text: v ? 'Done' : 'Not yet' }; }
      case 'colony': { const v = Object.values(s.ents).some((e) => e.t === 'g' && e.colony); return { done: v, text: v ? 'Done' : 'Not yet' }; }
      case 'codex': { const v = g.codexStage(goal.sp); return { done: v >= goal.stage, text: `${SPECIES[goal.sp].name}: ${['not found', 'seen', 'read', 'bred', 'purebred'][v]}` }; }
      case 'gate': { const v = !!s.gates[goal.id]; return { done: v, text: v ? 'Open' : 'Closed' }; }
      case 'rank': { return { done: s.rank >= goal.n, text: `${RANKS[s.rank].name}: ${s.renown} / ${RANKS[goal.n].renown} Renown` }; }
      case 'talk': { return { done: !!s.quest.talked[this.current()?.id], text: `Talk to ${NPCS[goal.npc].name}` }; }
      case 'ferry': return { done: !!s.ferry, text: s.ferry ? 'Repaired' : 'Broken' };
      case 'awake': return { done: !!s.awake, text: s.awake ? 'Awake' : this.awakeStatus().join(' · ') };
      case 'all': {
        const parts = goal.of.map((x) => this.goalProgress(x));
        return { done: parts.every((p) => p.done), text: parts.map((p) => p.text).join(' · ') };
      }
    }
    return { done: false, text: '' };
  }

  // Called every second of real time.
  update() {
    const q = this.current();
    if (q && this.goalProgress(q.goal).done) this.complete(q);
    this.daily();
    this.letters();
    if (!this.s.awake) this.checkAwake();
  }

  complete(q) {
    const g = this.game, s = this.s;
    s.quest.done[q.id] = true;
    s.quest.i++;
    const r = q.reward || {};
    if (r.crowns) g.addCrowns(r.crowns);
    if (r.items) for (const [id, n] of Object.entries(r.items)) g.give(mk(id, n), false);
    if (r.bp) for (const b of r.bp) s.unlocks[b] = true;
    g.addRenown((r.renown || 0) + 10, true);
    g.emit('questDone', { q, reward: r });
    const nx = this.current();
    if (nx) g.emit('questNew', nx);
  }

  onTalk(npc) {
    const q = this.current();
    const s = this.s;
    let lines = [];
    if (q && q.goal.type === 'talk' && q.goal.npc === npc && !s.quest.talked[q.id]) {
      lines = DIALOGUE[q.id] || [];
      s.quest.talked[q.id] = true;
    } else if (!s.quest.flags['met_' + npc] && DIALOGUE['meet_' + npc]) {
      lines = DIALOGUE['meet_' + npc];
    }
    s.quest.flags['met_' + npc] = true;
    if (!lines.length) lines = [[npc, pick(CHATTER[npc] || ['...'])]];
    return lines;
  }

  // Where the current quest wants you to go, if anywhere: {x, y, label}
  questTarget() {
    const g = this.game, q = this.current();
    if (!q) return null;
    const p = g.state.player;
    const goal = q.goal.type === 'all' ? q.goal.of.find((x) => !this.goalProgress(x).done) || q.goal : q.goal;
    const nearest = (list) => list.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    switch (goal.type) {
      case 'talk': {
        const n = g.npcs.find((x) => x.id === goal.npc);
        return n ? { x: n.x, y: n.y, label: NPCS[goal.npc].name } : null;
      }
      case 'gate': {
        const gp = g.world.poi.gates[goal.id];
        return gp ? { x: gp.x + 0.5, y: gp.y + 0.5, label: GATES.find((x) => x.id === goal.id).name } : null;
      }
      case 'ferry': return { x: 64.5, y: 76.5, label: 'The dock' };
      case 'awake': return { x: 64.5, y: 66, label: 'The Heartroot' };
      case 'stat':
        if (goal.key === 'hivesScooped') { const h = nearest(g.entsOfType('w').filter((w) => !w.gone && g.regionAt(w.x, w.y) === 'meadowfold')); return h ? { x: h.x + 0.5, y: h.y + 0.5, label: 'Wild hive' } : null; }
        return null;
      case 'codex': {
        if (goal.stage === 1 && SPECIES[goal.sp].k === 'h') {
          const h = nearest(g.entsOfType('w').filter((w) => !w.gone && w.sp === goal.sp));
          return h ? { x: h.x + 0.5, y: h.y + 0.5, label: SPECIES[goal.sp].name + ' hive' } : null;
        }
        return null;
      }
    }
    return null;
  }

  // ───────── daily things ─────────
  today() { return T.localDayIndex(Date.now()); }

  daily() {
    const s = this.s, d = this.today();
    if (s.daily.day === d) return;
    const first = s.daily.day < 0;
    s.daily.day = d;
    s.daily.orders = this.makeOrders(d);
    const week = Math.floor((d + 3) / 7);
    if (s.daily.grandWeek !== week) { s.daily.grandWeek = week; s.daily.grand = this.makeGrand(d); }
    // market drift & recovery
    const rnd = mulberry32(d * 7919);
    s.market.mult = {};
    for (const c of ['comb', 'hive', 'grove', 'flitter', 'goods', 'material', 'seed', 'frame', 'module']) s.market.mult[c] = 0.8 + rnd() * 0.5;
    for (const k of Object.keys(s.market.sat)) { s.market.sat[k] = 1 - (1 - s.market.sat[k]) * 0.4; if (s.market.sat[k] > 0.98) delete s.market.sat[k]; }
    if (!first) this.game.emit('newDay', d);
  }

  orderPool() {
    const s = this.s;
    const ids = Object.keys(s.seenItems).filter((id) => {
      const d = ITEMS[id];
      return d && d.value > 0 && ['comb', 'hive', 'grove', 'flitter', 'goods'].includes(d.cat) && id !== 'crown_coin' && id !== 'heart_pollen';
    });
    if (ids.length < 3) ids.push('goldcomb', 'timber', 'fiber', 'stone', 'crabapple');
    return [...new Set(ids)];
  }

  makeOrders(d) {
    const rnd = mulberry32(d * 104729 + this.s.rank * 13);
    const pool = this.orderPool();
    const orders = [];
    const used = new Set();
    for (let k = 0; k < 3; k++) {
      let id = pool[Math.floor(rnd() * pool.length)];
      for (let t = 0; t < 5 && used.has(id); t++) id = pool[Math.floor(rnd() * pool.length)];
      used.add(id);
      const v = ITEMS[id].value;
      const target = 35 + Math.min(3, this.s.rank) * 30 + rnd() * 50;
      const n = Math.max(1, Math.min(40, Math.round(target / v)));
      orders.push({ kind: 'item', id, n, crowns: Math.round(v * n * 1.7 + 10), renown: 4 + this.s.rank * 2, done: false });
    }
    // a specimen order once species are being bred
    const bred = Object.keys(this.s.codex).filter((sp) => this.s.codex[sp] >= 3 && SPECIES[sp].k === 'h');
    if (bred.length && rnd() < 0.7) {
      const sp = bred[Math.floor(rnd() * bred.length)];
      const pure = this.s.codex[sp] >= 4 && rnd() < 0.5;
      orders[2] = { kind: 'specimen', id: 'courier', sp, pure, n: pure ? 1 : 2, crowns: 30 + SPECIES[sp].tier * 35 + (pure ? 40 : 0), renown: 8 + SPECIES[sp].tier * 3, done: false };
    }
    return orders;
  }

  makeGrand(d) {
    const rnd = mulberry32(d * 31337);
    const pool = this.orderPool().filter((id) => ITEMS[id].value >= 5);
    const id = pool.length ? pool[Math.floor(rnd() * pool.length)] : 'goldmel';
    const n = Math.max(5, Math.round((250 + this.s.rank * 150) / ITEMS[id].value));
    const prizes = ['waxed_frame', 'catalyst_frame', 'gossamer_frame', 'heartsap_tonic', 'mod_racks', 'steady_eye'];
    const prize = prizes[Math.min(prizes.length - 1, this.s.rank + Math.floor(rnd() * 2))];
    return { kind: 'item', id, n, crowns: Math.round(ITEMS[id].value * n * 2.4 + 100), renown: 30 + this.s.rank * 10, prize, done: false };
  }

  canDeliver(o) {
    const s = this.s;
    if (o.done) return false;
    if (o.kind === 'item') return countIn(s.inv, o.id) >= o.n;
    return this.specimenMatches(o).length >= o.n;
  }
  specimenMatches(o) {
    const out = [];
    this.s.inv.forEach((st, i) => { if (st && st.g && st.sp === o.sp && (st.id === 'courier' || st.id === 'heiress') && (!o.pure || isPure(st.g))) for (let k = 0; k < st.n; k++) out.push(i); });
    return out;
  }
  deliver(o) {
    const g = this.game, s = this.s;
    if (!this.canDeliver(o)) return false;
    if (o.kind === 'item') removeFrom(s.inv, o.id, o.n);
    else {
      let left = o.n;
      for (let i = 0; i < s.inv.length && left > 0; i++) {
        const st = s.inv[i];
        if (st && st.g && st.sp === o.sp && (st.id === 'courier' || st.id === 'heiress') && (!o.pure || isPure(st.g))) {
          const k = Math.min(left, st.n); st.n -= k; left -= k; if (st.n <= 0) s.inv[i] = null;
        }
      }
    }
    o.done = true;
    g.addCrowns(o.crowns);
    g.addRenown(o.renown);
    if (o.prize) g.give(mk(o.prize, 1));
    g.stat('orders');
    g.toast(`Order filled: +${o.crowns} Crowns`, 'good');
    g.emit('inv');
    return true;
  }

  // ───────── market ─────────
  sellPrice(id) {
    const d = ITEMS[id];
    if (!d || !d.value) return 0;
    const m = this.s.market.mult[d.cat] || 1;
    const sat = this.s.market.sat[id] || 1;
    return Math.max(1, Math.round(d.value * m * sat));
  }
  sell(slotIndex, all) {
    const g = this.game, s = this.s;
    const st = s.inv[slotIndex];
    if (!st || st.g) return;
    const n = all ? st.n : 1;
    let total = 0;
    for (let i = 0; i < n; i++) {
      total += this.sellPrice(st.id);
      s.market.sat[st.id] = Math.max(0.35, (s.market.sat[st.id] || 1) * 0.985);
    }
    st.n -= n;
    if (st.n <= 0) s.inv[slotIndex] = null;
    g.addCrowns(total);
    g.stat('sold', n);
    g.emit('inv');
    g.emit('sfx', 'coin');
    return total;
  }
  shopList() {
    const s = this.s, open = (id) => !!s.gates[id];
    const list = [
      ['seed_wild', 6], ['seed_orchard', 12], ['timber', 6], ['stone', 3], ['fiber', 3], ['plain_frame', 18], ['goldmel', 9],
      ['seed_needle', 9, open('g_thicket')], ['seed_fen', 10, open('g_saltfen')], ['seed_desert', 10, open('g_sunscar')],
      ['seed_frost', 14, open('g_rimeback')], ['seed_ember', 18, open('g_ashvent')], ['seed_moon', 24, open('g_hollow')],
      ['candle', 22, s.rank >= 1], ['waxed_timber', 20, s.rank >= 1], ['mulch', 8, s.rank >= 1], ['heartsap_tonic', 140, s.rank >= 2],
    ];
    return list.filter((x) => x[2] !== false).map(([id, price]) => ({ id, price }));
  }
  buy(id, price, n = 1) {
    const g = this.game, s = this.s;
    if (s.crowns < price * n) { g.toast('Not enough Crowns', 'warn'); return false; }
    s.crowns -= price * n;
    g.give(mk(id, n));
    g.emit('sfx', 'coin');
    g.emit('inv');
    return true;
  }
  // A wild Heiress and Courier pair from a region you've opened.
  wildPairOffer() {
    const s = this.s;
    const regions = ['meadowfold', 'thicket', 'saltfen', 'sunscar', 'rimeback', 'canopy', 'ashvent', 'hollow'].filter((r) => r === 'meadowfold' || s.gates[{ thicket: 'g_thicket', saltfen: 'g_saltfen', sunscar: 'g_sunscar', rimeback: 'g_rimeback', canopy: 'g_canopy', ashvent: 'g_ashvent', hollow: 'g_hollow' }[r]]);
    const r = regions[this.today() % regions.length];
    return { sp: WILD_HIVE[r], price: 45 + regions.indexOf(r) * 15 };
  }
  buyWildPair() {
    const g = this.game, s = this.s;
    const o = this.wildPairOffer();
    if (s.daily.boughtPair === this.today()) { g.toast('Marra has sold today\'s pair.', 'warn'); return; }
    if (s.crowns < o.price) { g.toast('Not enough Crowns', 'warn'); return; }
    s.crowns -= o.price;
    s.daily.boughtPair = this.today();
    g.give(mkSpecimen('heiress', wildGenome(o.sp), { pristine: true }));
    g.give(mkSpecimen('courier', wildGenome(o.sp)));
    g.emit('inv');
  }

  buyBlueprint(id) {
    const g = this.game, s = this.s;
    const bp = BLUEPRINTS[id];
    if (s.unlocks[id]) return;
    if (s.rank < bp.rank) { g.toast('Fennick only sells that to higher ranks.', 'warn'); return; }
    if (s.crowns < bp.price) { g.toast('Not enough Crowns', 'warn'); return; }
    s.crowns -= bp.price;
    s.unlocks[id] = true;
    g.toast(`Learned: ${bp.name}`, 'good');
    g.emit('sfx', 'coin');
    g.emit('inv');
  }

  // ───────── letters & basket ─────────
  letters() {
    const s = this.s, now = Date.now();
    if (now - s.letters.last < LETTER_EVERY) return;
    if (s.letters.inbox.length >= 8) return;
    s.letters.last = now;
    let L;
    if (s.letters.next < LETTERS.length) L = LETTERS[s.letters.next++];
    else {
      const who = pick(['Wren', 'Marra Quill', 'Tobin Ashgrove', 'Fennick Gearwright', 'Hettie Moss']);
      const gifts = [{ goldmel: 4 }, { cerewax: 4 }, { timber: 8 }, { seed_orchard: 2 }, { candle: 2 }, { plain_frame: 1 }, { mulch: 3 }, { stone: 10 }];
      L = { from: who, text: pick(['Thinking of you and your hives.', 'The valley looks greener this week. That\'s you, that is.', 'Spare bits from the workshop. Use them.', 'Saw a Flitter I\'ve never seen before. Thought of you.', 'Your grandmother would be proud. Don\'t let it go to your head.']), gift: pick(gifts) };
    }
    s.letters.inbox.push({ ...L, at: now });
    this.game.toast(`A letter from ${L.from} waits at your Homestead`, 'mail');
    this.game.emit('mail');
  }
  claimLetter(i) {
    const s = this.s, L = s.letters.inbox[i];
    if (!L) return;
    if (L.gift) for (const [id, n] of Object.entries(L.gift)) this.game.give(mk(id, n), false);
    s.letters.inbox.splice(i, 1);
    s.stats.lettersRead = (s.stats.lettersRead || 0) + 1;
    this.game.emit('inv');
  }

  basketReady() { return this.s.daily.basketDay !== this.today(); }
  claimBasket() {
    const g = this.game, s = this.s, d = this.today();
    if (!this.basketReady()) return null;
    s.daily.streak = s.daily.basketDay === d - 1 ? s.daily.streak + 1 : 1;
    s.daily.basketDay = d;
    const rnd = mulberry32(d * 991);
    const got = [mk('goldmel', 3 + s.rank * 2), mk(pick(['seed_wild', 'seed_orchard', 'seed_needle']), 2), mk(pick(['timber', 'stone', 'fiber', 'cerewax']), 6)];
    if (s.rank >= 1) got.push(mk(pick(['waxed_timber', 'candle', 'mulch']), 3));
    if (s.rank >= 2) got.push(mk(pick(['crownmilk', 'pollenknot', 'amberglass', 'iron_ingot']), 2));
    const crowns = 10 + Math.min(7, s.daily.streak) * 5;
    if (s.daily.streak % 7 === 0) got.push(mk('heartsap_tonic', 1));
    if (rnd() < 0.35) { const o = this.wildPairOffer(); got.push(mkSpecimen('heiress', wildGenome(o.sp), { pristine: true })); }
    for (const st of got) g.give(st, false);
    g.addCrowns(crowns);
    g.emit('inv');
    return { got, crowns, streak: s.daily.streak };
  }

  // ───────── Hettie ─────────
  hettieTruth() {
    const s = this.s, d = this.today();
    if (s.daily.hettieDay === d) return { already: true, text: s.daily.hettieText };
    let cands = MUTATIONS.filter((m) => !s.revealed[m.c + '|' + m.a + '|' + m.b] && (this.game.codexStage(m.c) < 3));
    const interesting = cands.filter((m) => m.c !== 'hearthling' && m.c !== 'tended');
    if (interesting.length) cands = interesting;
    // prefer ones where you have seen at least one parent
    const known = cands.filter((m) => this.game.codexStage(m.a) >= 1 || this.game.codexStage(m.b) >= 1);
    const list = known.length ? known : cands;
    let text;
    if (!list.length) text = 'You know every crossing I know. Now you\'re the one people should be asking.';
    else {
      const sorted = list.sort((a, b) => (SPECIES[a.c].tier - SPECIES[b.c].tier) || (hash2(d, a.p * 1000, 3) - hash2(d, b.p * 1000, 3)));
      const m = sorted[Math.floor(hash2(d, 1, 9) * Math.min(4, sorted.length))];
      s.revealed[m.c + '|' + m.a + '|' + m.b] = true;
      const cond = condText(m.cond);
      text = `Cross ${SPECIES[m.a].name} with ${SPECIES[m.b].name}${cond ? ', ' + cond : ''}, and you may find a ${SPECIES[m.c].name}. About ${Math.round(m.p * 100)} times in a hundred.`;
    }
    s.daily.hettieDay = d; s.daily.hettieText = text;
    this.game.stat('truths');
    return { already: false, text };
  }

  // Is a mutation's recipe visible to the player in the Codex?
  mutKnown(m) {
    const g = this.game;
    if (this.s.revealed[m.c + '|' + m.a + '|' + m.b]) return true;
    if (g.codexStage(m.c) >= 3) return true;
    return g.codexStage(m.a) >= 1 && g.codexStage(m.b) >= 1;
  }

  // ───────── Heartroot ─────────
  awakeParts() {
    const g = this.game;
    const isle = (e) => g.regionAt(e.x, e.y) === 'isle' || Math.hypot(e.x - 64, e.y - 64) < 6;
    const hw = Object.values(this.s.ents).filter((e) => e.t === 'g' && e.sp === 'heartwood' && e.growth >= 1 && isle(e));
    const hives = Object.values(this.s.ents).filter((e) => e.t === 's' && STRUCTURES[e.s].housing && e.matron && e.matron.sp === 'verdant' && e.work && isle(e));
    const dawn = hw.some((h) => h.colony && h.colony.sp === 'dawnwing' && h.colony.active !== false);
    return { heartwood: hw.length > 0, verdant: hives.length > 0, dawnwing: dawn };
  }
  awakeStatus() {
    const p = this.awakeParts();
    return [`Heartwood ${p.heartwood ? '✓' : '✗'}`, `Verdant hive ${p.verdant ? '✓' : '✗'}`, `Dawnwing ${p.dawnwing ? '✓' : '✗'}`];
  }
  checkAwake() {
    const q = this.current();
    if (!q || q.goal.type !== 'awake') return;
    const p = this.awakeParts();
    if (p.heartwood && p.verdant && p.dawnwing) {
      this.s.awake = true;
      this.s.rank = 4;
      this.game.addRenown(0);
      this.game.give(mk('conduit', 1));
      this.s.unlocks.conduit = true;
      this.game.emit('awake');
    }
  }
}
