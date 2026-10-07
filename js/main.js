// Boot, input and the main loop.
import { Game, WILD_FLITTER } from './game.js';
import { Sim, TICK } from './sim.js';
import { Actions, REACH } from './actions.js';
import { Story } from './story.js';
import { Renderer } from './render.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';
import { Saver } from './save.js';
import { ITEMS } from './data/items.js';
import { STRUCTURES } from './data/structures.js';
import { SPECIES } from './data/species.js';
import { wildGenome, val } from './genetics.js';
import { TILE } from './sprites.js';
import * as T from './time.js';
import { clamp, rand } from './util.js';

const MAX_AWAY = 12 * 3600 * 1000;
const $ = (id) => document.getElementById(id);

const saver = new Saver();
let game, sim, actions, story, renderer, ui, audio;
let keys = new Set();
let stick = { x: 0, y: 0, active: false };
let mouse = { x: 0, y: 0, in: false };
let walkTo = null; // { x, y, then }
let lastFrame = performance.now();
let walkAnim = 0;
let catchingUp = false;

function setLoad(p, text) { $('load-fill').style.width = Math.round(p * 100) + '%'; if (text) $('load-text').textContent = text; }

async function boot() {
  setLoad(0.1, 'Waking the valley…');
  await new Promise((r) => setTimeout(r, 30));
  const saved = saver.load();
  game = new Game(saved);
  saver.game = game;
  sim = new Sim(game);
  game.simRef = sim;
  actions = new Actions(game, sim);
  story = new Story(game, sim);
  audio = new Audio(game);
  renderer = new Renderer($('game'), game);
  ui = new UI(game, sim, actions, story, renderer, audio);
  ui.saver = saver;
  window.HM = { game, sim, actions, story, ui, renderer, saver };
  renderer.resize();
  setLoad(0.4, 'Tending the estate…');
  bindInput();
  const behind = Date.now() - game.now;
  if (saved && behind > 5000) await catchUp(behind, true);
  else game.now = Date.now();
  story.daily();
  setLoad(1);
  $('loading').classList.add('hidden');
  if (!game.state.intro) ui.open('intro');
  requestAnimationFrame(frame);
  setInterval(() => { if (!catchingUp) { story.update(); } }, 1000);
  setInterval(() => saver.save(), 8000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saver.save(); });
  window.addEventListener('pagehide', () => saver.save());
}

// Simulate missed time in chunks, with a progress bar.
async function catchUp(ms, report) {
  catchingUp = true;
  let capped = false;
  if (ms > MAX_AWAY) { game.now = Date.now() - MAX_AWAY; ms = MAX_AWAY; capped = true; }
  const dayBefore = T.localDayIndex(game.now);
  const ticks = Math.floor(ms / (TICK * 1000));
  sim.log = {};
  const loading = $('loading');
  const showBar = ticks > 4000;
  if (showBar) { loading.classList.remove('hidden'); setLoad(0, 'Tending the estate while you were away…'); }
  const BATCH = 1500;
  for (let i = 0; i < ticks; i += BATCH) {
    const n = Math.min(BATCH, ticks - i);
    for (let k = 0; k < n; k++) sim.tick();
    if (showBar) { setLoad(i / ticks); await new Promise((r) => setTimeout(r, 0)); }
  }
  game.now = Date.now();
  const log = sim.log; sim.log = null;
  if (showBar) loading.classList.add('hidden');
  catchingUp = false;
  const newDay = T.localDayIndex(Date.now()) !== dayBefore;
  if (report && ms > 60000) ui.open('away', { log, secs: ms / 1000, capped, newDay });
  renderer.chunks.clear();
}

// ───────── input ─────────
function bindInput() {
  const cv = $('game');
  addEventListener('resize', () => renderer.resize());
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    audio.start();
    const k = e.key.toLowerCase();
    keys.add(k);
    if (ui.inDialogue() && (k === 'e' || k === ' ' || k === 'enter' || k === 'escape')) { ui.nextLine(); e.preventDefault(); return; }
    if (k === 'escape') { if (ui.panel) ui.close(); else ui.open('settings'); return; }
    if (k === 'i' || k === 'tab') { ui.toggle('bag'); e.preventDefault(); return; }
    if (k === 'c') return ui.toggle('craft');
    if (k === 'k') return ui.toggle('codex');
    if (k === 'j') return ui.toggle('journal');
    if (k === 'm') return ui.toggle('map');
    if (ui.panel) return;
    if (k >= '1' && k <= '9') { game.state.hot = +k - 1; ui.renderHotbar(); return; }
    if (k === 'r') { ui.placeDir = (ui.placeDir + 1) % 4; return; }
    if (k === 'q') { game.state.hot = -1 >= 0 ? 0 : game.state.hot; return; }
    if (k === 'e' || k === ' ') { useNearest(); e.preventDefault(); }
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());
  cv.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = e.pointerType === 'mouse'; });
  cv.addEventListener('pointerleave', () => { mouse.in = false; });
  cv.addEventListener('pointerdown', (e) => {
    audio.start();
    if (e.pointerType !== 'mouse') { document.body.classList.add('touch'); ui.isTouch = true; }
    if (ui.inDialogue()) { ui.nextLine(); return; }
    if (ui.panel) { ui.close(); return; }
    const [x, y] = renderer.screenToTile(e.clientX, e.clientY);
    tapWorld(Math.floor(x), Math.floor(y), x, y, e.button === 2);
  });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('wheel', (e) => {
    if (ui.panel) return;
    const s = game.state;
    const dir = Math.sign(e.deltaY);
    let h = s.hot;
    for (let i = 0; i < 9; i++) { h = (h + dir + 9) % 9; break; }
    s.hot = h; ui.renderHotbar();
  }, { passive: true });
  // touch stick
  const st = $('stick'), knob = $('stick-knob');
  let sid = null;
  const stickMove = (e) => {
    const r = st.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy), max = r.width / 2 - 10;
    const k = len > max ? max / len : 1;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    stick.x = (dx * k) / max; stick.y = (dy * k) / max;
    stick.active = len > 8;
  };
  st.addEventListener('pointerdown', (e) => { sid = e.pointerId; st.setPointerCapture(sid); stickMove(e); walkTo = null; audio.start(); });
  st.addEventListener('pointermove', (e) => { if (e.pointerId === sid) stickMove(e); });
  const end = () => { sid = null; stick = { x: 0, y: 0, active: false }; knob.style.transform = ''; };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  $('btn-use').addEventListener('click', () => { audio.start(); useNearest(); });
  $('btn-rot').addEventListener('click', () => { ui.placeDir = (ui.placeDir + 1) % 4; ui.toast('Facing ' + ['east', 'south', 'west', 'north'][ui.placeDir], 'info'); });
  if ('ontouchstart' in window && matchMedia('(pointer: coarse)').matches) { document.body.classList.add('touch'); ui.isTouch = true; }
  $('panel').addEventListener('pointerdown', () => { ui.pointerDownInPanel = true; });
  addEventListener('pointerup', () => { setTimeout(() => (ui.pointerDownInPanel = false), 50); });
}

function heldPlaceable() {
  const s = game.state;
  const held = s.inv[s.hot];
  if (!held) return null;
  const d = ITEMS[held.id];
  if (d.place) return { kind: 'place', sid: d.place, st: STRUCTURES[d.place] };
  if (held.id === 'scion') return { kind: 'plant', sp: held.sp };
  return null;
}

function tapWorld(tx, ty, fx, fy, alt) {
  const p = game.state.player;
  const hp = heldPlaceable();
  const tg = actions.targetAt(tx, ty);
  // Flitters first
  const fl = game.wildFlitters.find((f) => Math.hypot(f.x - fx, f.y - 0.6 - fy) < 0.9);
  if (fl) {
    if (Math.hypot(fl.x - p.x, fl.y - p.y) < REACH + 0.3) { if (actions.catchFlitter(fl)) game.wildFlitters.splice(game.wildFlitters.indexOf(fl), 1); }
    else walkTo = { x: fl.x, y: fl.y, then: null };
    return;
  }
  // Using held item on an existing target (flitter on grove, seeds on bed, mulch)
  const held = game.state.inv[game.state.hot];
  if (tg && held && (held.id === 'flitter' || held.id === 'mulch') && tg.kind === 'grove') return reachThen(tg, () => actions.use(tg));
  if (tg && held && ITEMS[held.id].cat === 'seed' && tg.kind === 'struct' && tg.e.s === 'flowerbed' && !tg.e.bloom) return reachThen(tg, () => actions.useHeld(tx, ty));
  if (hp && (!tg || tg.kind === 'decor' && hp.kind === 'place' && !hp.st.floor)) {
    const d = Math.hypot(tx + 0.5 - p.x, ty + 0.5 - p.y);
    if (d <= 5.5) actions.useHeld(tx, ty, ui.placeDir);
    else walkTo = { x: tx + 0.5, y: ty + 0.5, then: () => actions.useHeld(tx, ty, ui.placeDir), stop: 3 };
    return;
  }
  if (hp && hp.st && hp.st.floor && tg && tg.kind === 'decor') { actions.useHeld(tx, ty, ui.placeDir); return; }
  if (tg) return reachThen(tg, () => actions.use(tg));
  // walk there
  if (!game.solidAt(tx, ty)) walkTo = { x: fx, y: fy, then: null };
}

function reachThen(tg, fn) {
  if (actions.inReach(tg.x, tg.y, tg.w || 1, tg.h || 1)) { fn(); walkTo = null; }
  else walkTo = { x: tg.x + (tg.w || 1) / 2, y: tg.y + (tg.h || 1) / 2 + 0.6, then: fn, tg };
}

// Nearest usable thing to the player, favouring the direction they face.
function nearestTarget() {
  const p = game.state.player;
  const fdx = [0, -1, 1, 0][p.dir], fdy = [1, 0, 0, -1][p.dir];
  let best = null, bd = 1e9;
  const fl = game.wildFlitters.find((f) => Math.hypot(f.x - p.x, f.y - p.y) < 1.4);
  if (fl) return { kind: 'flitter', f: fl, label: `Catch ${SPECIES[fl.sp].name}`, x: fl.x - 0.5, y: fl.y - 0.5 };
  const seen = new Set();
  for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
    const tx = Math.floor(p.x) + ox, ty = Math.floor(p.y) + oy;
    const tg = actions.targetAt(tx, ty);
    if (!tg) continue;
    const key = (tg.e && tg.e.id) || (tg.f && tg.f.x + ':' + tg.f.y) || (tg.npc && tg.npc.id) || tx + ':' + ty;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!actions.inReach(tg.x, tg.y, tg.w || 1, tg.h || 1)) continue;
    const cx = tg.x + (tg.w || 1) / 2, cy = tg.y + (tg.h || 1) / 2;
    const dx = cx - p.x, dy = cy - p.y;
    let d = Math.hypot(dx, dy);
    const dot = (dx * fdx + dy * fdy) / (d || 1);
    d -= dot * 0.8;
    if (tg.kind === 'decor') d += 0.6;
    if (tg.kind === 'struct' && tg.e.s === 'path') continue;
    if (d < bd) { bd = d; best = tg; }
  }
  return best;
}

function useNearest() {
  if (ui.inDialogue()) { ui.nextLine(); return; }
  const tg = nearestTarget();
  if (!tg) return;
  if (tg.kind === 'flitter') { if (actions.catchFlitter(tg.f)) game.wildFlitters.splice(game.wildFlitters.indexOf(tg.f), 1); return; }
  const held = game.state.inv[game.state.hot];
  if (held && tg.kind === 'grove' && (held.id === 'flitter' || held.id === 'mulch')) return actions.use(tg);
  actions.use(tg);
}

// ───────── per-frame updates ─────────
function movePlayer(dt) {
  const p = game.state.player;
  if (ui.panel || ui.inDialogue()) return false;
  let mx = 0, my = 0;
  if (keys.has('w') || keys.has('arrowup')) my -= 1;
  if (keys.has('s') || keys.has('arrowdown')) my += 1;
  if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
  if (keys.has('d') || keys.has('arrowright')) mx += 1;
  if (stick.active) { mx = stick.x; my = stick.y; }
  if (mx || my) walkTo = null;
  if (walkTo) {
    const dx = walkTo.x - p.x, dy = walkTo.y - p.y;
    const d = Math.hypot(dx, dy);
    const arrived = walkTo.tg ? actions.inReach(walkTo.tg.x, walkTo.tg.y, walkTo.tg.w || 1, walkTo.tg.h || 1) : d < (walkTo.stop || 0.15);
    if (arrived) { const f = walkTo.then; walkTo = null; if (f) f(); return false; }
    mx = dx / d; my = dy / d;
    walkTo.stuck = (walkTo.stuck || 0);
  }
  const len = Math.hypot(mx, my);
  if (len < 0.05) return false;
  if (len > 1) { mx /= len; my /= len; }
  const t = game.world.tile(Math.floor(p.x), Math.floor(p.y));
  const onPath = t === TILE.PATH || t === TILE.STONE || t === TILE.BRIDGE || (game.floorAt(Math.floor(p.x), Math.floor(p.y))?.s === 'path');
  const sp = 4.4 * (onPath ? 1.3 : 1) * dt;
  const ox = p.x, oy = p.y;
  tryMove(p, mx * sp, 0);
  tryMove(p, 0, my * sp);
  if (Math.abs(mx) > Math.abs(my)) p.dir = mx < 0 ? 1 : 2; else p.dir = my < 0 ? 3 : 0;
  const moved = Math.hypot(p.x - ox, p.y - oy);
  if (walkTo) { if (moved < sp * 0.2) { walkTo.stuck += dt; if (walkTo.stuck > 0.6) walkTo = null; } else walkTo.stuck = 0; }
  return moved > 0.001;
}
function blocked(x, y) {
  const r = 0.26;
  for (const [cx, cy] of [[x - r, y - 0.18], [x + r, y - 0.18], [x - r, y + 0.08], [x + r, y + 0.08]]) {
    if (game.solidAt(Math.floor(cx), Math.floor(cy))) return true;
  }
  return false;
}
function tryMove(p, dx, dy) {
  const nx = p.x + dx, ny = p.y + dy;
  if (!blocked(nx, ny)) { p.x = nx; p.y = ny; return; }
  // slide around corners
  if (dx && !blocked(nx, ny - 0.3)) { p.y -= Math.min(0.06, Math.abs(dx)); }
  else if (dx && !blocked(nx, ny + 0.3)) { p.y += Math.min(0.06, Math.abs(dx)); }
  else if (dy && !blocked(nx - 0.3, ny)) { p.x -= Math.min(0.06, Math.abs(dy)); }
  else if (dy && !blocked(nx + 0.3, ny)) { p.x += Math.min(0.06, Math.abs(dy)); }
}

function updateFlitters(dt) {
  const g = game, p = g.state.player;
  const region = g.regionAt(p.x, p.y);
  const sp = WILD_FLITTER[region];
  const night = T.isNight(g.now) || region === 'hollow';
  g.wildFlitters = g.wildFlitters.filter((f) => Math.hypot(f.x - p.x, f.y - p.y) < 18 && g.regionAt(f.x, f.y) === region && (SPECIES[f.sp].genes.rhythm === 'night') === night);
  const wantsNight = sp && SPECIES[sp].genes.rhythm === 'night';
  const want = sp && wantsNight === night && !T.rainingIn(g.now, region) ? (region === 'meadowfold' ? 4 : 3) : 0;
  if (g.wildFlitters.length < want && Math.random() < dt * 0.4) {
    for (let k = 0; k < 10; k++) {
      const a = Math.random() * Math.PI * 2, d = rand(6, 12);
      const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      if (g.regionAt(x, y) !== region || g.solidAt(Math.floor(x), Math.floor(y))) continue;
      g.wildFlitters.push({ x, y, sp, genome: wildGenome(sp), tx: x, ty: y, seed: Math.random() * 10, pause: 0 });
      break;
    }
  }
  for (const f of g.wildFlitters) {
    const dp = Math.hypot(f.x - p.x, f.y - p.y);
    if (dp < 1.8 && !f.flee) { f.flee = 0.5; const a = Math.atan2(f.y - p.y, f.x - p.x) + rand(-0.6, 0.6); f.tx = f.x + Math.cos(a) * 2.2; f.ty = f.y + Math.sin(a) * 2.2; }
    if (f.flee) { f.flee -= dt; if (f.flee <= 0) { f.flee = 0; f.pause = rand(0.8, 2); } }
    if (f.pause > 0) { f.pause -= dt; continue; }
    const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy);
    if (d < 0.1) { f.tx = f.x + rand(-3, 3); f.ty = f.y + rand(-3, 3); if (g.regionAt(f.tx, f.ty) !== region) { f.tx = f.x; f.ty = f.y; } if (Math.random() < 0.4) f.pause = rand(0.5, 2.5); continue; }
    const spd = (f.flee ? 2.4 : 1.1) * dt;
    f.x += (dx / d) * Math.min(spd, d); f.y += (dy / d) * Math.min(spd, d);
  }
}

function updateNPCs(dt) {
  for (const n of game.npcs) {
    n.t -= dt;
    if (n.moving) {
      const dx = n.tx - n.x, dy = n.ty - n.y, d = Math.hypot(dx, dy);
      if (d < 0.05) { n.moving = false; n.t = rand(2, 6); continue; }
      const s = 1.3 * dt;
      const nx = n.x + (dx / d) * Math.min(s, d), ny = n.y + (dy / d) * Math.min(s, d);
      if (game.solidAt(Math.floor(nx), Math.floor(ny))) { n.moving = false; n.t = rand(1, 3); continue; }
      n.x = nx; n.y = ny;
      n.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
      n.anim = (n.anim || 0) + dt * 8; n.frame = Math.floor(n.anim) % 4;
    } else if (n.t <= 0) {
      n.tx = n.hx + rand(-1.8, 1.8); n.ty = n.hy + rand(-0.5, 1.5); n.moving = true;
    } else {
      // face the player when close
      const p = game.state.player;
      if (Math.hypot(p.x - n.x, p.y - n.y) < 2.5) n.dir = Math.abs(p.x - n.x) > Math.abs(p.y - n.y) ? (p.x < n.x ? 1 : 2) : (p.y < n.y ? 3 : 0);
    }
  }
}

function updateGhost() {
  ui.ghost = null; ui.highlight = null;
  const hp = heldPlaceable();
  if (!ui.panel && hp && (mouse.in || ui.isTouch === false)) {
    if (!mouse.in) return;
    const [x, y] = renderer.screenToTile(mouse.x, mouse.y);
    const tx = Math.floor(x), ty = Math.floor(y);
    if (hp.kind === 'place') {
      const why = game.canPlace(hp.sid, tx, ty);
      const [w, h] = hp.st.size;
      ui.ghost = { sid: hp.sid, x: tx, y: ty, w, h, dir: ui.placeDir, bad: !!why, dirArrow: hp.st.dir ? ui.placeDir : undefined };
    } else {
      ui.ghost = { tree: hp.sp, x: tx, y: ty, bad: !actions.plantable(tx, ty) };
    }
    return;
  }
  if (mouse.in && !ui.panel) {
    const [x, y] = renderer.screenToTile(mouse.x, mouse.y);
    const tg = actions.targetAt(Math.floor(x), Math.floor(y));
    if (tg) ui.highlight = { x: tg.x, y: tg.y, w: tg.w, h: tg.h, bad: !actions.inReach(tg.x, tg.y, tg.w || 1, tg.h || 1) };
    renderer.cv.style.cursor = tg ? 'pointer' : 'default';
  }
}

let storyT = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (!catchingUp) {
    // keep sim time in step with real time
    const behind = Date.now() - game.now;
    if (behind > 90 * 1000) { catchUp(behind, true); }
    else { let n = 0; while (Date.now() - game.now >= TICK * 1000 && n < 20) { sim.tick(); n++; } }
  }
  const moving = movePlayer(dt);
  if (moving) { walkAnim += dt * 9; ui.walkFrame = Math.floor(walkAnim) % 4; } else ui.walkFrame = 0;
  updateFlitters(dt);
  updateNPCs(dt);
  updateGhost();
  const hp = heldPlaceable();
  const tg = nearestTarget();
  ui.updatePrompt(tg, hp ? (hp.kind === 'place' ? 'place ' + hp.st.name : 'plant ' + SPECIES[hp.sp].name) : null);
  if (!mouse.in && tg && !ui.panel) ui.highlight = { x: tg.x, y: tg.y, w: tg.w, h: tg.h };
  ui.update(dt);
  const region = game.regionAt(game.state.player.x, game.state.player.y);
  const mood = region === 'hollow' ? 'dark' : T.isNight(game.now) ? 'night' : region === 'rimeback' ? 'cold' : region === 'sunscar' || region === 'ashvent' ? 'hot' : 'day';
  audio.update(dt, mood);
  renderer.draw(ui);
  requestAnimationFrame(frame);
}

boot().catch((e) => {
  console.error(e);
  $('load-text').textContent = 'Something went wrong starting the game: ' + e.message;
});
