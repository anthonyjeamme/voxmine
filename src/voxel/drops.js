import * as THREE from "three";
import { createItemMesh } from "./items.js";

export class DropsManager {
  constructor(scene, inventory) {
    this.scene = scene;
    this.inventory = inventory;
    this.drops = [];
  }
  spawn(itemId, position) {
    const mesh = createItemMesh(itemId);
    mesh.position.copy(position);
    mesh.userData = { itemId, vy: 2 };
    this.scene.add(mesh);
    this.drops.push(mesh);
  }
  update(dt, playerPosition) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const m = this.drops[i];
      m.userData.vy -= 9.8 * dt;
      m.position.y += m.userData.vy * dt;
      if (m.position.y < 0.2) {
        m.position.y = 0.2;
        m.userData.vy *= -0.3;
      }
      const dx = m.position.x - playerPosition.x;
      const dy = m.position.y - (playerPosition.y + 1.0);
      const dz = m.position.z - playerPosition.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 2.0) {
        const dir = new THREE.Vector3(-dx, -dy, -dz).multiplyScalar(6 * dt);
        m.position.add(dir);
      }
      if (dist < 0.9) {
        this.inventory.addItem(m.userData.itemId, 1);
        this.scene.remove(m);
        this.drops.splice(i, 1);
      }
    }
  }
}
