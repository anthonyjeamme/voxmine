import { getItemIcon } from "./items.js";

export class InventoryUI {
  constructor(inventory, player) {
    this.inventory = inventory;
    this.player = player;
    this.hotbarEl = document.getElementById("hotbar");
    this.invEl = document.getElementById("inventory");
    this.gridEl = document.getElementById("inv-grid");
    this.invHotbarEl = document.getElementById("inv-hotbar");
    this.open = false;
    this.render();
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyI" || e.code === "Escape") this.toggle();
      if (e.code.startsWith("Digit")) {
        const idx = parseInt(e.code.slice(5)) - 1;
        if (!isNaN(idx)) this.inventory.setActiveIndex(idx);
        this.render();
      }
    });
  }
  toggle() {
    this.open = !this.open;
    this.invEl.classList.toggle("hidden", !this.open);
    if (this.player) this.player.setInputEnabled(!this.open);
    try {
      if (this.open) document.exitPointerLock?.();
    } catch {}
    this.render();
  }
  render() {
    if (!this.hotbarEl) return;
    this.hotbarEl.innerHTML = "";
    for (let i = 0; i < this.inventory.gridCols; i++) {
      const s = this.inventory.slots[i];
      const el = document.createElement("div");
      el.className =
        "slot" + (i === this.inventory.activeIndex ? " active" : "");
      const icon = s ? getItemIcon(s.id) : null;
      el.innerHTML = "";
      if (icon) {
        const img = document.createElement("img");
        img.src = icon;
        el.appendChild(img);
      }
      const cnt = document.createElement("span");
      cnt.className = "count";
      cnt.textContent = s ? String(s.count) : "";
      el.appendChild(cnt);
      this.hotbarEl.appendChild(el);
    }
    if (this.gridEl && this.invHotbarEl) {
      this.gridEl.innerHTML = "";
      for (
        let i = this.inventory.gridCols;
        i < this.inventory.slots.length;
        i++
      ) {
        const s = this.inventory.slots[i];
        const el = document.createElement("div");
        el.className = "slot";
        const icon = s ? getItemIcon(s.id) : null;
        el.innerHTML = "";
        if (icon) {
          const img = document.createElement("img");
          img.src = icon;
          el.appendChild(img);
        }
        const cnt = document.createElement("span");
        cnt.className = "count";
        cnt.textContent = s ? String(s.count) : "";
        el.appendChild(cnt);
        this.gridEl.appendChild(el);
      }
      this.invHotbarEl.innerHTML = "";
      for (let i = 0; i < this.inventory.gridCols; i++) {
        const s = this.inventory.slots[i];
        const el = document.createElement("div");
        el.className =
          "slot" + (i === this.inventory.activeIndex ? " active" : "");
        const icon = s ? getItemIcon(s.id) : null;
        el.innerHTML = "";
        if (icon) {
          const img = document.createElement("img");
          img.src = icon;
          el.appendChild(img);
        }
        const cnt = document.createElement("span");
        cnt.className = "count";
        cnt.textContent = s ? String(s.count) : "";
        el.appendChild(cnt);
        this.invHotbarEl.appendChild(el);
      }
    }
  }
}
