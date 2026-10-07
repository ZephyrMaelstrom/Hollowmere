// Saving to localStorage and backup codes.
const KEY = 'hollowmere-save-v1';

export class Saver {
  constructor() { this.game = null; }
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Save could not be read', e);
      return null;
    }
  }
  save() {
    if (!this.game) return;
    const s = this.game.state;
    s.savedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { console.warn('Save failed', e); }
  }
  wipe() { localStorage.removeItem(KEY); this.game = null; }
  exportCode() {
    this.save();
    const json = localStorage.getItem(KEY) || '';
    return 'HM1:' + btoa(unescape(encodeURIComponent(json)));
  }
  importCode(code) {
    try {
      if (!code.startsWith('HM1:')) return false;
      const json = decodeURIComponent(escape(atob(code.slice(4))));
      const obj = JSON.parse(json);
      if (!obj || !obj.ents || !obj.inv) return false;
      localStorage.setItem(KEY, json);
      this.game = null;
      return true;
    } catch { return false; }
  }
}
