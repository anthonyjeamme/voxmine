export class Inventory {
  constructor() {
    this.gridCols = 9;
    this.gridRows = 3;
    this.slots = new Array(this.gridCols * this.gridRows).fill(null);
    this.activeIndex = 0; // first row is the hotbar
    this.listeners = [];
  }
  addListener(fn) {
    if (typeof fn === "function") this.listeners.push(fn);
  }
  emitChange() {
    for (const fn of this.listeners) {
      try {
        fn(this);
      } catch {}
    }
  }
  addItem(id, count = 1) {
    const total = this.gridCols * this.gridRows;
    const invStart = this.gridCols; // start after hotbar
    const hotStart = 0,
      hotEnd = this.gridCols; // hotbar range
    const tryMerge = (start, end) => {
      for (let i = start; i < end && count > 0; i++) {
        const s = this.slots[i];
        if (s && s.id === id) {
          s.count += count;
          count = 0;
        }
      }
    };
    const tryPlaceEmpty = (start, end) => {
      for (let i = start; i < end && count > 0; i++) {
        const s = this.slots[i];
        if (!s) {
          this.slots[i] = { id, count };
          count = 0;
        }
      }
    };
    tryMerge(hotStart, hotEnd);
    tryPlaceEmpty(hotStart, hotEnd);
    if (count > 0) tryMerge(invStart, total);
    if (count > 0) tryPlaceEmpty(invStart, total);
    this.emitChange();
  }
  removeFromActive(count = 1) {
    const s = this.slots[this.activeIndex];
    if (!s) return false;
    s.count -= count;
    if (s.count <= 0) this.slots[this.activeIndex] = null;
    this.emitChange();
    return true;
  }
  getActive() {
    return this.slots[this.activeIndex];
  }
  setActiveIndex(i) {
    this.activeIndex = Math.max(0, Math.min(this.gridCols - 1, i));
  }
}
