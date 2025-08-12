import * as THREE from "three";
import { createNoise2D, createNoise3D } from "simplex-noise";
import { hashStringToInt, mulberry32 } from "./gen/rng.js";
import { TerrainPipeline } from "./gen/terrain.js";
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
import { BLOCK_SAND, BLOCK_SNOW } from "./constants.js";
import { chunkKey, iterateNeighborhood } from "./utils.js";

export class TerrainGenerator {
  constructor(seed) {
    const rng = mulberry32(hashStringToInt(seed));
    this.pipeline = new TerrainPipeline(rng);
  }
  sampleBiomeField(x, z) {
    return 0;
  }
  getBiomeAt(x, z) {
    const h = this.terrainHeight(x, z);
    if (h <= 18) return "desert";
    if (h >= 42) return "snowy";
    return "plains";
  }
  terrainHeight(x, z) {
    return this.pipeline.terrainHeight(x, z);
  }
  getHeightAt(x, z) {
    return Math.floor(this.terrainHeight(x, z));
  }
  surfaceY(x, z) {
    for (let y = CHUNK_HEIGHT - 2; y >= 1; y--) {
      const solid = this.density(x, y, z) > 0;
      const airAbove =
        this.density(x, y + 1, z) <= 0 && this.density(x, y + 2, z) <= 0;
      if (solid && airAbove) return y;
    }
    return null;
  }
  density(x, y, z) {
    return this.pipeline.density(x, y, z);
  }
  getBlockAt(x, y, z, columnHeight) {
    const dens = this.density(x, y, z);
    if (dens <= 0) return BLOCK_AIR;
    const sy = this.surfaceY(x, z);
    if (sy != null) {
      const biome = this.getBiomeAt(x, z);
      if (y === sy) {
        if (biome === "desert") return BLOCK_SAND;
        if (biome === "snowy") return BLOCK_SNOW;
        return BLOCK_GRASS;
      }
      if (y > sy - 4) {
        if (biome === "desert") return BLOCK_SAND;
        return BLOCK_DIRT;
      }
      return BLOCK_STONE;
    }
    // fallback if surfaceY failed: use air-above test
    const airAbove = this.density(x, y + 1, z) <= 0;
    if (airAbove) return BLOCK_GRASS;
    // shallow layer as dirt
    let d = 0;
    for (let i = 1; i <= 4; i++) {
      if (this.density(x, y - i, z) > 0) d++;
      else break;
    }
    return d > 0 ? BLOCK_DIRT : BLOCK_STONE;
  }
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.generator = new TerrainGenerator("seed");
    this.chunks = new Map();
    this.toBuild = [];
    this.atlas = null;
    this.services = null;
  }

  plantTreesInChunk(chunk) {
    // densité dépend du biome
    const centerX = chunk.chunkX * CHUNK_SIZE + CHUNK_SIZE / 2;
    const centerZ = chunk.chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2;
    const biome = this.generator.getBiomeAt(centerX, centerZ);
    const baseDensity = biome === "dark_forest" ? 6 : 2; // arbres/chunk approx
    const trees = baseDensity;
    const changed = new Set();
    for (let i = 0; i < trees; i++) {
      const lx =
        Math.floor(((((i + 1) * 37) % 97) / 97) * (CHUNK_SIZE - 2)) + 1;
      const lz =
        Math.floor(((((i + 11) * 73) % 97) / 97) * (CHUNK_SIZE - 2)) + 1;
      const wx = chunk.chunkX * CHUNK_SIZE + lx;
      const wz = chunk.chunkZ * CHUNK_SIZE + lz;
      const sy = this.generator.surfaceY(wx, wz);
      if (sy == null) continue;
      // slope check
      const s1 = this.generator.surfaceY(wx + 1, wz);
      const s2 = this.generator.surfaceY(wx - 1, wz);
      const s3 = this.generator.surfaceY(wx, wz + 1);
      const s4 = this.generator.surfaceY(wx, wz - 1);
      const neigh = [s1, s2, s3, s4].filter((v) => v != null);
      const maxDiff = neigh.length
        ? Math.max(...neigh.map((v) => Math.abs(v - sy)))
        : 0;
      if (maxDiff > 2) continue; // too steep
      const biomeLocal = this.generator.getBiomeAt(wx, wz);
      if (biomeLocal !== "plains") continue; // arbres uniquement en plaine
      this.generateTree(wx, sy + 1, wz, changed);
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
    const cap = 1 + Math.floor(Math.random() * 2);
    for (let i = 1; i <= cap; i++)
      this.setBlockDeferred(x, y + height - 1 + i, z, 5, changed);
  }

  generateDarkTree(x, y, z, changed) {
    const height = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < height; i++)
      this.setBlockDeferred(x, y + i, z, 7, changed); // LOG_DARK
    const radius = 3 + Math.floor(Math.random() * 2);
    for (let dy = -1; dy <= 3; dy++) {
      const r = radius - Math.floor(Math.abs(dy) * 0.6);
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (dx * dx + dz * dz <= r * r + 1)
            this.setBlockDeferred(
              x + dx,
              y + height - 1 + dy,
              z + dz,
              8,
              changed
            ); // LEAVES_DARK
        }
      }
    }
    const cap = 1 + Math.floor(Math.random() * 2);
    for (let i = 1; i <= cap; i++)
      this.setBlockDeferred(x, y + height - 1 + i, z, 7, changed);
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

  setServices(services) {
    this.services = services;
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
    while (this.toBuild.length > 0 && builds < 1) {
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
