// HUD, toasts, dialogue, slots, tooltips and the panel frame.
import { el, fmtNum, esc } from './util.js';
import { iconDataURL, iconFor, personSprite, hummerSprite } from './sprites.js';
import { ITEMS } from './data/items.js';
import { SPECIES } from './data/species.js';
import { STRUCTURES } from './data/structures.js';
import { NPCS, RANKS } from './data/story.js';
import { BIOMES } from './data/biomes.js';
import { species, isPure, trait, val } from './genetics.js';
import { PANELS } from './panels.js';
import { REACH } from './actions.js';
import * as T from './time.js';

const PLAYER_LOOK = { skin: '#e8b48a', hair: '#5a3418', shirt: '#4a7a3a', pants: '#5a4430', hat: '#8a6a30' };

export class UI {
  constructor(game, sim, actions, story, renderer, audio) {
    Object.assign(this, { game, sim, actions, story, renderer, audio });
    this.$ = (id) => document.getElementById(id);
    this.panel = null;
    this.walkFrame = 0;
    this.highlight = null;
    this.ghost = null;
    this.dialogueQ = [];
    this.sel = null; // selected bag slot index
    this.hudT = 0;
    this.panelT = 0;
    this.placeDir = 0;
    this.isTouch = false;
    this.init();
  }

  playerLook() { return PLAYER_LOOK; }

  init() {
    const g = this.game;
    // HUD button icons
    const icons = { bag: { id: 'chest' }, craft: { id: 'workbench' }, codex: { id: 'heiress', sp: 'meadowmote', g: { lineage: ['meadowmote', 'meadowmote'] } }, journal: { id: 'candle' }, map: { id: 'seed_wild' }, settings: { id: 'gearset' } };
    for (const b of document.querySelectorAll('#hud-buttons button')) {
      const k = b.dataset.panel;
      const ico = b.querySelector('.ico');
      if (icons[k]) ico.style.backgroundImage = `url(${iconDataURL(icons[k])})`;
      b.addEventListener('click', () => this.toggle(k));
    }
    this.$('hud-quest').addEventListener('click', () => this.open('journal'));
    this.$('panel-wrap').addEventListener('pointerdown', (e) => { if (e.target.id === 'panel-wrap') this.close(); });
    this.$('dialogue').addEventListener('click', () => this.nextLine());
    g.on('toast', (t) => this.toast(t.text, t.kind, t.icon));
    g.on('open', (d) => this.open(d.type, d));
    g.on('closePanel', () => this.close());
    g.on('talk', (npc) => this.talk(npc));
    g.on('inv', () => { this.renderHotbar(); this.dirtyPanel = true; });
    g.on('questDone', ({ q }) => { this.toast(`Quest complete: ${q.title}`, 'quest'); this.audio?.play('quest'); this.fxAtPlayer('sparkle'); });
    g.on('questNew', (q) => setTimeout(() => { if (this.story.current() === q) this.toast(`New quest: ${q.title}`, 'quest'); }, 1200));
    g.on('rank', () => { this.audio?.play('rank'); });
    g.on('codex', ({ stage }) => { if (stage >= 3) this.audio?.play('discover'); });
    g.on('mail', () => this.audio?.play('mail'));
    g.on('awake', () => this.awakening());
    g.on('sfx', (k) => this.audio?.play(k));
    this.renderHotbar();
    this.updateHUD();
  }

  // ───────── HUD ─────────
  updateHUD() {
    const g = this.game, s = g.state, p = s.player;
    const now = g.now;
    const region = g.regionAt(p.x, p.y);
    const night = T.isNight(now);
    this.$('hud-time').textContent = T.clockText(now);
    this.$('hud-season').textContent = T.seasonName(now);
    const sky = this.$('hud-sky');
    const want = night ? 'moon' : T.rainingIn(now, region) ? 'rain' : 'sun';
    if (sky.dataset.k !== want) { sky.dataset.k = want; sky.style.background = want === 'sun' ? 'radial-gradient(circle,#ffe680 40%,#f0a020 70%,transparent 72%)' : want === 'moon' ? 'radial-gradient(circle at 40% 40%,#f4f0d8 45%,transparent 48%)' : 'linear-gradient(#9ab 50%,transparent 50%) , radial-gradient(circle at 50% 35%,#cdd 50%,transparent 52%)'; sky.style.borderRadius = '50%'; }
    const fest = [...T.festivalsAt(now)].map((f) => ({ thaw: 'Thaw Night', longday: 'Longest Day', harvestmoon: 'Harvest Moon', midwinter: 'Midwinter', eclipse: 'Eclipse' }[f]));
    const place = region === 'isle' ? 'Heartroot Isle' : region === 'lake' ? 'Hollowmere Lake' : BIOMES[region]?.name || '';
    this.$('hud-place').textContent = place + ' · ' + T.weatherWord(now, region) + (fest.length ? ' · ' + fest.join(', ') : '');
    this.$('hud-crowns').textContent = fmtNum(s.crowns);
    this.$('hud-rank').textContent = RANKS[s.rank].name;
    const q = this.story.current();
    const hq = this.$('hud-quest');
    if (q) {
      const pr = this.story.goalProgress(q.goal);
      hq.innerHTML = `<div class="qt">${esc(q.title)}</div><div class="qd">${esc(q.text.length > 110 ? q.text.slice(0, 108) + '…' : q.text)}</div><div class="qp">${esc(pr.text)}</div>`;
    } else hq.innerHTML = `<div class="qt">Heartwarden</div><div class="qd">The valley is awake. Fill the Codex.</div>`;
    // power pill
    const sim = this.sim;
    const anyPower = Object.values(s.ents).some((e) => e.t === 's' && STRUCTURES[e.s].kind === 'machine' && STRUCTURES[e.s].power);
    const pill = this.$('power-pill');
    if (anyPower) {
      pill.classList.remove('hidden');
      pill.textContent = `Gearline ${sim.powerGen.toFixed(1)}/s · use ${sim.powerUse.toFixed(1)}/s · stored ${Math.floor(s.battery || 0)}/${sim.powerCap || 30}`;
    } else pill.classList.add('hidden');
    // notification dots
    const homeDot = s.letters.inbox.length > 0 || this.story.basketReady();
    this.setDot('journal', homeDot);
  }
  setDot(panel, on) {
    const b = document.querySelector(`#hud-buttons button[data-panel="${panel}"]`);
    if (!b) return;
    let d = b.querySelector('.dot');
    if (on && !d) b.appendChild(el('span', { class: 'dot' }));
    if (!on && d) d.remove();
  }

  renderHotbar() {
    const g = this.game, s = g.state;
    const hb = this.$('hotbar');
    hb.className = 'hud-card';
    hb.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const st = s.inv[i];
      const slot = this.slotEl(st, { hotkey: i + 1, sel: i === s.hot, onclick: () => { s.hot = i; this.renderHotbar(); this.audio?.play('tick'); } });
      if (i === s.hot) slot.classList.add('sel');
      hb.appendChild(slot);
    }
    const held = s.inv[s.hot];
    this.$('btn-rot').classList.toggle('hidden', !(held && ITEMS[held.id]?.place && STRUCTURES[ITEMS[held.id].place]?.dir));
  }

  // ───────── slots ─────────
  slotEl(st, o = {}) {
    const d = el('div', { class: 'slot' + (o.small ? ' small' : '') + (o.drop ? ' drop' : '') });
    if (o.hotkey) d.appendChild(el('span', { class: 'k' }, String(o.hotkey)));
    if (st) {
      d.appendChild(el('img', { src: iconDataURL(st), alt: '' }));
      if (st.n > 1) d.appendChild(el('span', { class: 'n' }, String(st.n)));
      if (st.g) {
        if (st.id === 'heiress' && st.pristine === false) d.appendChild(el('span', { class: 'badge worn' }, 'worn'));
        else if (isPure(st.g) && st.an) d.appendChild(el('span', { class: 'badge pure' }, 'pure'));
        if (st.an) d.appendChild(el('span', { class: 'badge an' }, '◆'));
      }
      if (st.wear !== undefined && ITEMS[st.id]?.frame) {
        const left = 1 - st.wear / ITEMS[st.id].frame.dur;
        d.appendChild(el('div', { class: 'wear' }, el('i', { style: { width: Math.max(0, left * 100) + '%' } })));
      }
      this.attachTip(d, st);
    } else if (o.label) {
      d.classList.add('empty-label');
      d.appendChild(el('span', {}, o.label));
    }
    if (o.onclick) d.addEventListener('click', (e) => { e.stopPropagation(); this.hideTip(); o.onclick(e); });
    return d;
  }

  stackTitle(st) {
    const d = ITEMS[st.id];
    if (st.g) return `${SPECIES[st.sp]?.name || '?'} ${d.name}`;
    return d.name;
  }
  stackTip(st) {
    const d = ITEMS[st.id];
    let h = `<div class="tn">${esc(this.stackTitle(st))}</div>`;
    if (st.g) {
      const sp = SPECIES[st.sp];
      if (st.id === 'heiress' || st.id === 'matron') h += `<div>${st.pristine === false ? 'Worn line' : 'Pristine line'} · generation ${st.gen || 0}</div>`;
      if (st.an) {
        const tr = (t) => trait(st.g, t).name;
        h += `<div class="muted">${tr('vigor')} · ${tr('span')} span · ${tr('brood')} brood · ${tr('bloom')} · ${tr('reach')} reach${val(st.g, 'gift') ? ' · ' + tr('gift') : ''}</div>`;
        h += `<div>${isPure(st.g) ? '<span class="tag gold">Purebred</span>' : '<span class="tag violet">Hybrid</span>'}</div>`;
      } else h += `<div class="faint">Not read yet. Use your Lens to read its Strand.</div>`;
      if (sp) h += `<div class="faint">${esc(sp.lore)}</div>`;
    } else if (d.desc) h += `<div class="muted">${esc(d.desc)}</div>`;
    if (d.value && !st.g) h += `<div class="faint">Sells for about ${this.story.sellPrice(st.id)} Crowns</div>`;
    return h;
  }
  attachTip(node, st) {
    node.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') this.showTip(e, this.stackTip(st)); });
    node.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') this.moveTip(e); });
    node.addEventListener('pointerleave', () => this.hideTip());
  }
  showTip(e, html) { const t = this.$('tooltip'); t.innerHTML = html; t.classList.remove('hidden'); this.moveTip(e); }
  moveTip(e) {
    const t = this.$('tooltip');
    const w = t.offsetWidth, h = t.offsetHeight;
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + w > innerWidth - 6) x = e.clientX - w - 10;
    if (y + h > innerHeight - 6) y = e.clientY - h - 10;
    t.style.left = x + 'px'; t.style.top = y + 'px';
  }
  hideTip() { this.$('tooltip').classList.add('hidden'); }

  // ───────── tips (shown once each) ─────────
  tip(id, title, text) {
    const s = this.game.state;
    s.tips ||= {};
    if (s.tips[id] || (this.tipQ || []).some((t) => t.id === id)) return;
    (this.tipQ ||= []).push({ id, title, text });
    if (!this.tipOpen) this.nextTip();
  }
  nextTip() {
    const card = this.$('tipcard');
    const t = (this.tipQ || []).shift();
    if (!t) { card.classList.add('hidden'); this.tipOpen = false; return; }
    this.tipOpen = true;
    this.game.state.tips[t.id] = true;
    card.innerHTML = '';
    card.appendChild(el('div', { class: 'tt' }, t.title));
    card.appendChild(el('p', {}, t.text));
    card.appendChild(el('button', { class: 'btn small', onclick: () => this.nextTip() }, 'Got it'));
    card.classList.remove('hidden');
    this.audio?.play('mail');
  }

  // ───────── toasts ─────────
  toast(text, kind = 'info', icon = null) {
    const box = this.$('toasts');
    const t = el('div', { class: 'toast ' + kind });
    if (icon && icon.sp) t.appendChild(el('img', { src: iconDataURL(SPECIES[icon.sp].k === 'h' ? { id: 'courier', sp: icon.sp, g: { lineage: [icon.sp, icon.sp] } } : SPECIES[icon.sp].k === 'g' ? { id: 'scion', sp: icon.sp, g: { lineage: [icon.sp, icon.sp] } } : { id: 'flitter', sp: icon.sp, g: { lineage: [icon.sp, icon.sp] } }) }));
    t.appendChild(el('span', {}, text));
    box.prepend(t);
    while (box.children.length > 6) box.lastChild.remove();
    const life = kind === 'quest' || kind === 'rank' || kind === 'discover' ? 5200 : 3400;
    setTimeout(() => t.classList.add('out'), life);
    setTimeout(() => t.remove(), life + 600);
    if (kind === 'warn') this.audio?.play('nope');
  }
  fxAtPlayer(kind) {
    const p = this.game.state.player;
    this.game.fx.push({ kind, x: p.x, y: p.y - 1, t: performance.now(), life: 900 });
  }
  floatText(text, x, y, color) { this.game.fx.push({ kind: 'text', text, x, y, color, t: performance.now(), life: 1300 }); }

  // ───────── dialogue ─────────
  talk(npc) {
    const lines = this.story.onTalk(npc);
    this.dialogueQ = lines.map(([who, text]) => ({ who, text }));
    this.afterDialogue = () => this.openService(npc);
    this.nextLine();
  }
  say(lines, after) { this.dialogueQ = lines; this.afterDialogue = after; this.nextLine(); }
  nextLine() {
    const box = this.$('dialogue');
    const l = this.dialogueQ.shift();
    if (!l) {
      box.classList.add('hidden');
      const f = this.afterDialogue; this.afterDialogue = null;
      if (f) f();
      return;
    }
    this.close();
    box.className = 'hud-card';
    box.innerHTML = '';
    const npc = NPCS[l.who];
    const por = document.createElement('canvas');
    por.width = 16; por.height = 20; por.className = 'por';
    if (npc) por.getContext('2d').drawImage(personSprite(npc.look, 0, 0), 0, 0);
    box.appendChild(por);
    const body = el('div', { style: { flex: 1 } },
      el('div', {}, el('span', { class: 'who' }, npc ? npc.name : l.who), npc ? el('span', { class: 'role' }, npc.role) : null),
      el('div', { class: 'txt' }, l.text),
      el('div', { class: 'more' }, this.dialogueQ.length ? 'Tap to continue' : 'Tap to close'));
    box.appendChild(body);
    this.audio?.play('talk');
  }
  inDialogue() { return !this.$('dialogue').classList.contains('hidden'); }

  openService(npc) {
    const map = { marra: 'market', fennick: 'shop', wren: 'orders', tobin: 'guild', hettie: 'hettie' };
    if (map[npc]) this.open(map[npc]);
  }

  // ───────── panels ─────────
  toggle(type) { if (this.panel && this.panel.type === type) this.close(); else this.open(type); }
  open(type, data = {}) {
    if (!PANELS[type]) return;
    this.hideTip();
    const prevTab = this.panel && this.panel.type === type ? this.panel.tab : undefined;
    this.panel = { type, data, tab: data.tab ?? prevTab };
    this.sel = null;
    this.$('panel-wrap').classList.remove('hidden');
    document.body.classList.add('panel-open');
    this.renderPanel();
    this.audio?.play('open');
  }
  close() {
    if (!this.panel) return;
    this.panel = null;
    this.$('panel-wrap').classList.add('hidden');
    document.body.classList.remove('panel-open');
    this.hideTip();
    this.game.state.stats.panelsClosed = (this.game.state.stats.panelsClosed || 0) + 1;
  }
  renderPanel() {
    if (!this.panel) return;
    const P = this.$('panel');
    const body = P.querySelector('.p-body');
    const scroll = body ? body.scrollTop : 0;
    P.innerHTML = '';
    P.className = '';
    const def = PANELS[this.panel.type];
    const out = def(this, this.panel.data, this.panel);
    if (!out) { this.close(); return; }
    if (out.narrow) P.classList.add('narrow');
    const head = el('div', { class: 'p-head' });
    if (out.icon) head.appendChild(el('img', { src: out.icon }));
    head.appendChild(el('h2', {}, out.title));
    if (out.sub) head.appendChild(el('span', { class: 'sub' }, out.sub));
    head.appendChild(el('button', { class: 'x', 'aria-label': 'Close', onclick: () => this.close() }, '×'));
    P.appendChild(head);
    if (out.tabs) {
      const tb = el('div', { class: 'p-tabs' });
      for (const [k, label] of out.tabs) tb.appendChild(el('button', { class: this.panel.tab === k ? 'on' : '', onclick: () => { this.panel.tab = k; this.sel = null; this.renderPanel(); } }, label));
      P.appendChild(tb);
    }
    const b = el('div', { class: 'p-body' });
    b.appendChild(out.body);
    P.appendChild(b);
    b.scrollTop = scroll;
    this.panel.live = !!out.live;
    this.dirtyPanel = false;
  }

  // ───────── frame update ─────────
  update(dt) {
    const g = this.game;
    this.hudT += dt;
    if (this.hudT > 0.3) { this.hudT = 0; this.updateHUD(); }
    if (this.panel) {
      this.panelT += dt;
      if ((this.panel.live && this.panelT > 1) || this.dirtyPanel) { this.panelT = 0; if (!this.pointerDownInPanel) this.renderPanel(); }
    }
  }

  // Interaction prompt + highlight for what's in front of / nearest the player.
  updatePrompt(target, placing) {
    const pr = this.$('prompt');
    if (this.panel || this.inDialogue()) { pr.classList.add('hidden'); return; }
    if (placing) {
      pr.classList.remove('hidden');
      pr.innerHTML = this.isTouch ? `Tap a tile to ${placing}` : `<kbd>Click</kbd>${esc(placing)}${this.placeTurns ? ' · <kbd>R</kbd>turn' : ''}`;
      return;
    }
    if (!target) { pr.classList.add('hidden'); return; }
    pr.classList.remove('hidden');
    pr.innerHTML = this.isTouch ? esc(target.label) : `<kbd>E</kbd>${esc(target.label)}`;
  }

  awakening() {
    this.close();
    this.audio?.play('awake');
    const lines = [
      { who: 'The Heartroot', text: 'Deep under the lake, something very old takes a breath.' },
      { who: 'The Heartroot', text: 'The hum of the Verdant Matriarch. The scent of the Heartwood. The Dawnwing\'s first light. Three kingdoms, together, at last.' },
      { who: 'The Heartroot', text: 'Light runs out along the roots: through the meadows, under the fen, up into the snow and down into the Hollow. The whole valley exhales.' },
      { who: 'The Heartroot', text: 'You have been given a Heartroot Conduit. Place it anywhere: the valley itself will power your machines.' },
    ];
    this.say(lines, () => this.toast('The Heartroot is awake. Go and tell Tobin.', 'quest'));
  }
}
