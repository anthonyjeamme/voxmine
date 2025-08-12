import * as THREE from "three";
import { createItemMesh } from "./items.js";
import { isSolid } from "./blocks.js";

export class DropsManager {
  constructor(scene, inventory, world) {
    this.scene = scene;
    this.inventory = inventory;
    this.world = world;
    this.drops = [];
  }
  spawn(itemId, position) {
    const mesh = createItemMesh(itemId);
    mesh.position.copy(position);
    mesh.userData = { itemId, vy: 2, radius: 0.2 };
    this.scene.add(mesh);
    this.drops.push(mesh);
  }
  update(dt, playerPosition) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const m = this.drops[i];
      m.userData.vy -= 9.8 * dt;
      m.position.y += m.userData.vy * dt;
      if (this.world) {
        const vx = Math.floor(m.position.x);
        const vz = Math.floor(m.position.z);
        const radius = m.userData.radius || 0.2;
        const yBelow = Math.floor(m.position.y - radius);
        const b = this.world.getBlock(vx, yBelow, vz);
        if (isSolid(b)) {
          const targetY = yBelow + 1 + radius;
          if (m.position.y < targetY) {
            m.position.y = targetY;
            m.userData.vy *= -0.25;
            if (Math.abs(m.userData.vy) < 0.5) m.userData.vy = 0;
          }
        }
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
