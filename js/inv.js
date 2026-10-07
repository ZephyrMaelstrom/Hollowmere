// Item stacks and slot helpers.
import { ITEMS } from './data/items.js';
import { genomeKey, species, expressedId, isPure } from './genetics.js';

export function maxStack(id) {
  const d = ITEMS[id];
  if (!d) return 99;
  return d.stack || 99;
}

export function stackKey(s) {
  if (!s) return '';
  if (s.g) return s.id + '#' + genomeKey(s.g) + '#' + (s.pristine === false ? 'w' : 'p') + '#' + (s.gen || 0);
  return s.id;
}

export function canMerge(a, b) {
  if (!a || !b || a.id !== b.id) return false;
  if (a.g || b.g) {
    if (!a.g || !b.g) return false;
    if (genomeKey(a.g) !== genomeKey(b.g)) return false;
    if ((a.pristine !== false) !== (b.pristine !== false)) return false;
    return true;
  }
  return true;
}

export function mk(id, n = 1) { return { id, n }; }

export function mkSpecimen(id, g, extra = {}) {
  const s = { id, n: 1, g, sp: expressedId(g, 'lineage') };
  if (id === 'heiress' || id === 'matron') { s.pristine = extra.pristine !== false; s.gen = extra.gen || 0; }
  if (extra.an) s.an = true;
  if (id === 'matron') { s.mate = extra.mate; s.life = extra.life; }
  return s;
}

export function cloneStack(s) {
  if (!s) return null;
  const o = { ...s };
  if (s.g) o.g = JSON.parse(JSON.stringify(s.g));
  if (s.mate) o.mate = JSON.parse(JSON.stringify(s.mate));
  return o;
}

// Add a stack into slot array. Returns number that did not fit.
export function addToSlots(slots, stack) {
  let n = stack.n;
  const max = maxStack(stack.id);
  for (let i = 0; i < slots.length && n > 0; i++) {
    const s = slots[i];
    if (s && canMerge(s, stack) && s.n < max) {
      const k = Math.min(n, max - s.n);
      s.n += k; n -= k;
      if (stack.an) s.an = true;
    }
  }
  for (let i = 0; i < slots.length && n > 0; i++) {
    if (!slots[i]) {
      const k = Math.min(n, max);
      const ns = cloneStack(stack); ns.n = k;
      slots[i] = ns; n -= k;
    }
  }
  return n;
}

export function roomFor(slots, stack) {
  let room = 0;
  const max = maxStack(stack.id);
  for (const s of slots) {
    if (!s) room += max;
    else if (canMerge(s, stack)) room += max - s.n;
  }
  return room;
}

export function matchesTag(id, tag) {
  if (tag === '#fruit') return !!ITEMS[id]?.fruit;
  if (tag === '#nut') return !!ITEMS[id]?.nut;
  return id === tag;
}

export function countIn(slots, idOrTag) {
  let n = 0;
  for (const s of slots) if (s && !s.g && matchesTag(s.id, idOrTag)) n += s.n;
  return n;
}

// Remove n plain (non-specimen) items matching id or tag. Returns removed count.
export function removeFrom(slots, idOrTag, n) {
  let left = n;
  for (let i = slots.length - 1; i >= 0 && left > 0; i--) {
    const s = slots[i];
    if (!s || s.g || !matchesTag(s.id, idOrTag)) continue;
    const k = Math.min(left, s.n);
    s.n -= k; left -= k;
    if (s.n <= 0) slots[i] = null;
  }
  return n - left;
}

export function totalItems(list) { let n = 0; for (const s of list) if (s) n += s.n; return n; }

// Output buffers are simple arrays of stacks (no fixed size); merge where possible.
export function pushOut(list, stack) {
  for (const s of list) if (canMerge(s, stack) && s.n < maxStack(s.id)) {
    const k = Math.min(stack.n, maxStack(s.id) - s.n);
    s.n += k; stack = { ...stack, n: stack.n - k };
    if (stack.n <= 0) return;
  }
  list.push(cloneStack(stack));
}

export function takeOneFrom(list, i) {
  const s = list[i];
  if (!s) return null;
  const one = cloneStack(s); one.n = 1;
  s.n -= 1;
  if (s.n <= 0) list.splice(i, 1);
  return one;
}

export function describeStack(s) {
  const d = ITEMS[s.id];
  if (!d) return s.id;
  if (s.g) {
    const sp = species(s.g);
    const role = d.name;
    return `${sp.name} ${role}`;
  }
  return d.name;
}

export function isPureStack(s) { return s && s.g && isPure(s.g); }
