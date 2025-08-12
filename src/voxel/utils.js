export function getChunkCoordsFromWorld(x, y, z, chunkSize) {
  const cx = Math.floor(x / chunkSize);
  const cy = Math.floor(y / chunkSize);
  const cz = Math.floor(z / chunkSize);
  return { cx, cy, cz };
}

export function getLocalVoxelCoords(x, y, z, chunkSize) {
  const lx = mod(x, chunkSize);
  const ly = mod(y, chunkSize);
  const lz = mod(z, chunkSize);
  return { lx, ly, lz };
}

export function mod(n, m) {
  return ((n % m) + m) % m;
}

export function chunkKey(cx, cz) {
  return `${cx},${cz}`;
}

export function iterateNeighborhood(radius) {
  const coords = [];
  for (let r = 0; r <= radius; r++) {
    for (let x = -r; x <= r; x++) {
      for (let z = -r; z <= r; z++) {
        if (Math.max(Math.abs(x), Math.abs(z)) === r) coords.push([x, z]);
      }
    }
  }
  return coords;
}

import * as THREE from "three";

export function ddaRaycast(origin, direction, maxDistance, getVoxel) {
  const pos = origin.clone();
  const step = new THREE.Vector3(
    Math.sign(direction.x),
    Math.sign(direction.y),
    Math.sign(direction.z)
  );
  const tDelta = new THREE.Vector3(
    direction.x !== 0 ? Math.abs(1 / direction.x) : Number.POSITIVE_INFINITY,
    direction.y !== 0 ? Math.abs(1 / direction.y) : Number.POSITIVE_INFINITY,
    direction.z !== 0 ? Math.abs(1 / direction.z) : Number.POSITIVE_INFINITY
  );
  const voxel = new THREE.Vector3(
    Math.floor(pos.x),
    Math.floor(pos.y),
    Math.floor(pos.z)
  );
  const boundX = voxel.x + (step.x > 0 ? 1 : 0);
  const boundY = voxel.y + (step.y > 0 ? 1 : 0);
  const boundZ = voxel.z + (step.z > 0 ? 1 : 0);
  const tMax = new THREE.Vector3(
    direction.x !== 0
      ? Math.abs((boundX - pos.x) / direction.x)
      : Number.POSITIVE_INFINITY,
    direction.y !== 0
      ? Math.abs((boundY - pos.y) / direction.y)
      : Number.POSITIVE_INFINITY,
    direction.z !== 0
      ? Math.abs((boundZ - pos.z) / direction.z)
      : Number.POSITIVE_INFINITY
  );
  let traveled = 0;
  while (traveled <= maxDistance) {
    const block = getVoxel(voxel.x, voxel.y, voxel.z);
    if (block && block !== 0) {
      return {
        hit: true,
        voxel: voxel.clone(),
        previous: voxel.clone().addScaledVector(step, -1),
        block,
      };
    }
    if (tMax.x < tMax.y) {
      if (tMax.x < tMax.z) {
        voxel.x += step.x;
        traveled = tMax.x;
        tMax.x += tDelta.x;
      } else {
        voxel.z += step.z;
        traveled = tMax.z;
        tMax.z += tDelta.z;
      }
    } else {
      if (tMax.y < tMax.z) {
        voxel.y += step.y;
        traveled = tMax.y;
        tMax.y += tDelta.y;
      } else {
        voxel.z += step.z;
        traveled = tMax.z;
        tMax.z += tDelta.z;
      }
    }
  }
  return { hit: false };
}
