import * as THREE from "three";

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.active = [];
  }
  spawnDust(position, color, rate = 12, dt = 1 / 60) {
    const count = Math.max(1, Math.floor(rate * dt));
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = position.x + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.4;
      velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.8;
      velocities[i * 3 + 1] = Math.random() * 1.6;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("velocity", new THREE.BufferAttribute(velocities, 3));
    const material = new THREE.PointsMaterial({
      color,
      size: 0.04,
      transparent: true,
      opacity: 0.8,
    });
    const points = new THREE.Points(geometry, material);
    points.userData = { life: 0.3 };
    this.scene.add(points);
    this.active.push(points);
  }
  spawnDustDirected(position, normal, color, rate = 180, dt = 1 / 60) {
    const count = Math.max(1, Math.floor(rate * dt));
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const n = new THREE.Vector3(
      normal.x || 0,
      normal.y || 0,
      normal.z || 0
    ).normalize();
    const origin = new THREE.Vector3(
      position.x,
      position.y,
      position.z
    ).addScaledVector(n, 0.52);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = origin.x + (Math.random() - 0.5) * 1.8;
      positions[i * 3 + 1] = origin.y + (Math.random() - 0.5) * 1.8;
      positions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 1.8;
      const jitter = new THREE.Vector3(
        (Math.random() - 0.5) * 9.0,
        Math.random() * 6.6,
        (Math.random() - 0.5) * 9.0
      );
      const bias = n.clone().multiplyScalar(24 + Math.random() * 18);
      const v = bias.add(jitter);
      velocities[i * 3 + 0] = v.x;
      velocities[i * 3 + 1] = v.y;
      velocities[i * 3 + 2] = v.z;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("velocity", new THREE.BufferAttribute(velocities, 3));
    const material = new THREE.PointsMaterial({
      color,
      size: 0.08,
      transparent: true,
      opacity: 0.9,
    });
    const points = new THREE.Points(geometry, material);
    points.userData = { life: 0.6 };
    this.scene.add(points);
    this.active.push(points);
  }
  spawnBurst(position, color, count = 80) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = position.x + (Math.random() - 0.5) * 0.8;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.8;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 6 + Math.random() * 6;
      velocities[i * 3 + 0] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.cos(phi) * speed;
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("velocity", new THREE.BufferAttribute(velocities, 3));
    const material = new THREE.PointsMaterial({
      color,
      size: 0.1,
      transparent: true,
      opacity: 0.95,
    });
    const points = new THREE.Points(geometry, material);
    points.userData = { life: 0.9 };
    this.scene.add(points);
    this.active.push(points);
  }
  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      const pos = p.geometry.getAttribute("position");
      const vel = p.geometry.getAttribute("velocity");
      for (let j = 0; j < pos.count; j++) {
        vel.array[j * 3 + 1] -= 9.8 * dt;
        pos.array[j * 3 + 0] += vel.array[j * 3 + 0] * dt;
        pos.array[j * 3 + 1] += vel.array[j * 3 + 1] * dt;
        pos.array[j * 3 + 2] += vel.array[j * 3 + 2] * dt;
      }
      pos.needsUpdate = true;
      p.userData.life -= dt;
      p.material.opacity = Math.max(0, p.userData.life / 0.6);
      p.material.transparent = true;
      if (p.userData.life <= 0) {
        this.scene.remove(p);
        this.active.splice(i, 1);
      }
    }
  }
}
