import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import {
  CHUNK_SIZE,
  CHUNK_HEIGHT,
  LOAD_DISTANCE_CHUNKS,
  UNLOAD_DISTANCE_CHUNKS,
  BLOCK_AIR,
  BLOCK_GRASS,
  BLOCK_DIRT,
  BLOCK_STONE,
  BLOCK_GRASS_PLANT,
} from "./constants.js";
import { Chunk } from "./chunk.js";
import { chunkKey, iterateNeighborhood } from "./utils.js";

function hashStringToInt(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class TerrainGenerator {
  constructor(seed) {
    const rng = mulberry32(hashStringToInt(seed));
    this.noise2d = createNoise2D(rng);
  }
  getHeightAt(x, z) {
    const scale1 = 1 / 64;
    const scale2 = 1 / 24;
    const n =
      this.noise2d(x * scale1, z * scale1) * 0.7 +
      this.noise2d(x * scale2, z * scale2) * 0.3;
    const base = 24;
    const amplitude = 18;
    let height = Math.floor(base + n * amplitude);
    if (height < 4) height = 4;
    if (height >= CHUNK_HEIGHT) height = CHUNK_HEIGHT - 1;
    return height;
  }
  getBlockAt(x, y, z, columnHeight) {
    if (y > columnHeight) {
      if (y === columnHeight + 1 && Math.random() < 0.03)
        return BLOCK_GRASS_PLANT;
      return BLOCK_AIR;
    }
    if (y === columnHeight) return BLOCK_GRASS;
    if (y >= columnHeight - 6) return BLOCK_DIRT;
    return BLOCK_STONE;
  }
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.generator = new TerrainGenerator("seed");
    this.chunks = new Map();
    this.toBuild = [];
    this.atlas = null;
  }

  plantTreesInChunk(chunk) {
    const rng =
      Math.abs(Math.sin(chunk.chunkX * 12.9898 + chunk.chunkZ * 78.233)) % 1;
    const trees = Math.floor(rng * 3); // 0..2
    const changed = new Set();
    for (let i = 0; i < trees; i++) {
      const lx =
        Math.floor(((((i + 1) * 37) % 97) / 97) * (CHUNK_SIZE - 2)) + 1;
      const lz =
        Math.floor(((((i + 11) * 73) % 97) / 97) * (CHUNK_SIZE - 2)) + 1;
      const wx = chunk.chunkX * CHUNK_SIZE + lx;
      const wz = chunk.chunkZ * CHUNK_SIZE + lz;
      const groundY = this.generator.getHeightAt(wx, wz);
      this.generateTree(wx, groundY + 1, wz, changed);
    }
    for (const key of changed) {
      const ch = this.chunks.get(key);
      if (ch) {
        ch.isDirty = true;
        if (!this.toBuild.includes(ch)) this.toBuild.push(ch);
      }
    }
  }

  generateTree(x, y, z, changed) {
    const height = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < height; i++)
      this.setBlockDeferred(x, y + i, z, 5, changed); // LOG
    const radius = 2 + Math.floor(Math.random() * 2);
    for (let dy = -1; dy <= 2; dy++) {
      const r = radius - Math.abs(dy);
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (dx * dx + dz * dz <= r * r + 1)
            this.setBlockDeferred(
              x + dx,
              y + height - 1 + dy,
              z + dz,
              6,
              changed
            ); // LEAVES
        }
      }
    }
  }

  setBlockDeferred(x, y, z, type, changed) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const key = chunkKey(cx, cz);
    const chunk = this.chunks.get(key);
    if (!chunk) return;
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    chunk.setBlockLocal(lx, y, lz, type);
    if (changed) changed.add(key);
  }

  setAtlas(atlas) {
    this.atlas = atlas;
  }

  getLoadedChunkCount() {
    return this.chunks.size;
  }

  ensureChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    if (this.chunks.has(key)) return this.chunks.get(key);
    const chunk = new Chunk(cx, cz, this.generator);
    this.chunks.set(key, chunk);
    this.toBuild.push(chunk);
    this.plantTreesInChunk(chunk);
    return chunk;
  }

  updateStreaming(playerPosition) {
    const pcx = Math.floor(playerPosition.x / CHUNK_SIZE);
    const pcz = Math.floor(playerPosition.z / CHUNK_SIZE);
    for (const [key, chunk] of this.chunks) {
      const dx = chunk.chunkX - pcx;
      const dz = chunk.chunkZ - pcz;
      if (Math.max(Math.abs(dx), Math.abs(dz)) > UNLOAD_DISTANCE_CHUNKS) {
        if (chunk.mesh) this.scene.remove(chunk.mesh);
        this.chunks.delete(key);
      }
    }
    const coords = iterateNeighborhood(LOAD_DISTANCE_CHUNKS);
    for (const [dx, dz] of coords) {
      const cx = pcx + dx;
      const cz = pcz + dz;
      const chunk = this.ensureChunk(cx, cz);
      if (chunk.isDirty && !chunk.mesh) this.toBuild.push(chunk);
    }
    let builds = 0;
    while (this.toBuild.length > 0 && builds < 2) {
      const chunk = this.toBuild.shift();
      if (chunk && chunk.isDirty) {
        if (chunk.mesh) this.scene.remove(chunk.mesh);
        const mesh = chunk.buildMesh(this.atlas);
        this.scene.add(mesh);
        builds += 1;
      }
    }
  }

  getBlock(x, y, z) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const key = chunkKey(cx, cz);
    const chunk = this.chunks.get(key);
    if (!chunk) return BLOCK_AIR;
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;
    if (y < 0 || y >= CHUNK_HEIGHT) return BLOCK_AIR;
    return chunk.getBlockLocal(lx, y, lz);
  }

  setBlock(x, y, z, type) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const key = chunkKey(cx, cz);
    const chunk = this.chunks.get(key);
    if (!chunk) return;
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    chunk.setBlockLocal(lx, y, lz, type);
    if (chunk.mesh) this.scene.remove(chunk.mesh);
    const mesh = chunk.buildMesh(this.atlas);
    this.scene.add(mesh);
  }
}
