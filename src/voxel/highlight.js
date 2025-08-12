import * as THREE from "three";

export function createHighlighter(scene, atlas) {
  const group = new THREE.Group();
  group.visible = false;
  const boxGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
  const overlayMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
  const overlay = new THREE.Mesh(boxGeo, overlayMat);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.001, 1.001, 1.001)),
    new THREE.LineBasicMaterial({ color: 0xffffff })
  );
  const previewGeo = new THREE.BoxGeometry(0.92, 0.92, 0.92);
  const preview = new THREE.Mesh(
    previewGeo,
    new THREE.MeshLambertMaterial({ transparent: true, alphaTest: 0.5 })
  );
  preview.visible = false;
  group.add(overlay);
  group.add(edges);
  group.add(preview);
  scene.add(group);
  const materialCache = new Map();
  function getTileMaterial(tileIndex) {
    if (materialCache.has(tileIndex)) return materialCache.get(tileIndex);
    const tex = atlas.texture.clone();
    const tw = atlas.texture.image.width;
    const th = atlas.texture.image.height;
    const ts = atlas.tileSize;
    const cols = atlas.cols;
    const col = tileIndex % cols;
    const row = Math.floor(tileIndex / cols);
    tex.repeat.set(ts / tw, ts / th);
    tex.offset.set((col * ts) / tw, (row * ts) / th);
    tex.needsUpdate = true;
    const mat = new THREE.MeshLambertMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.5,
    });
    materialCache.set(tileIndex, mat);
    return mat;
  }

  function showAtVoxel(x, y, z) {
    group.position.set(x + 0.5, y + 0.5, z + 0.5);
    group.visible = true;
    overlay.material.opacity = 0.25;
    preview.visible = false;
  }
  function hide() {
    group.visible = false;
  }
  function showBreakingPreview(x, y, z, tileIndex) {
    group.position.set(x + 0.5, y + 0.5, z + 0.5);
    group.visible = true;
    overlay.material.opacity = 0.0;
    preview.visible = true;
    preview.material = getTileMaterial(tileIndex);
  }
  return { showAtVoxel, hide, showBreakingPreview };
}
