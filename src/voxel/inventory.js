export class Inventory {
  constructor() {
    this.gridCols = 9;
    this.gridRows = 3;
    this.slots = new Array(this.gridCols * this.gridRows).fill(null);
    this.activeIndex = 0; // first row is the hotbar
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
    // Prefer main inventory (top-left to right, then down)
    tryMerge(invStart, total);
    tryPlaceEmpty(invStart, total);
    // If still remaining, fallback to hotbar
    if (count > 0) tryMerge(hotStart, hotEnd);
    if (count > 0) tryPlaceEmpty(hotStart, hotEnd);
  }
  removeFromActive(count = 1) {
    const s = this.slots[this.activeIndex];
    if (!s) return false;
    s.count -= count;
    if (s.count <= 0) this.slots[this.activeIndex] = null;
    return true;
  }
  getActive() {
    return this.slots[this.activeIndex];
  }
  setActiveIndex(i) {
    this.activeIndex = Math.max(0, Math.min(this.gridCols - 1, i));
  }
}
