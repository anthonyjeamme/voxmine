import * as THREE from "three";

export function createGhostLine(scene) {
  const pool = [];
  const max = 10;
  const geo = new THREE.BoxGeometry(1.001, 1.001, 1.001);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x00ff99,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
  function ensure(n) {
    while (pool.length < n && pool.length < max) {
      const m = new THREE.Mesh(geo, mat.clone());
      m.visible = false;
      scene.add(m);
      pool.push(m);
    }
  }
  function hideAll() {
    for (const m of pool) m.visible = false;
  }
  function showPositions(positions) {
    ensure(positions.length);
    for (let i = 0; i < pool.length; i++) {
      const m = pool[i];
      if (i < positions.length) {
        const p = positions[i];
        m.position.set(p.x + 0.5, p.y + 0.5, p.z + 0.5);
        m.visible = true;
      } else {
        m.visible = false;
      }
    }
  }
  return { hideAll, showPositions };
}
