import * as THREE from "three";
import {
  CHUNK_SIZE,
  CHUNK_HEIGHT,
  BLOCK_AIR,
  BLOCK_COLORS,
  BLOCK_TILE_INDEX,
  GRASS_SIDE_TILE,
  GRASS_TOP_TILE,
  GRASS_BOTTOM_TILE,
  BLOCK_GRASS_PLANT,
  isSolidBlock,
} from "./constants.js";
import { getTileUV } from "./textures.js";

const directions = [
  {
    // +X
    dir: [1, 0, 0],
    norm: [1, 0, 0],
    uAxis: [0, 1, 0], // Y
    vAxis: [0, 0, 1], // Z
    uIndex: 1, // corner component for u
    vIndex: 2, // corner component for v
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
  },
  {
    // -X
    dir: [-1, 0, 0],
    norm: [-1, 0, 0],
    uAxis: [0, 1, 0],
    vAxis: [0, 0, 1],
    uIndex: 1,
    vIndex: 2,
    corners: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
  },
  {
    // +Y
    dir: [0, 1, 0],
    norm: [0, 1, 0],
    uAxis: [1, 0, 0], // X
    vAxis: [0, 0, 1], // Z
    uIndex: 0,
    vIndex: 2,
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  {
    // -Y
    dir: [0, -1, 0],
    norm: [0, -1, 0],
    uAxis: [1, 0, 0],
    vAxis: [0, 0, 1],
    uIndex: 0,
    vIndex: 2,
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
  },
  {
    // +Z
    dir: [0, 0, 1],
    norm: [0, 0, 1],
    uAxis: [1, 0, 0], // X
    vAxis: [0, 1, 0], // Y
    uIndex: 0,
    vIndex: 1,
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
  },
  {
    // -Z
    dir: [0, 0, -1],
    norm: [0, 0, -1],
    uAxis: [1, 0, 0],
    vAxis: [0, 1, 0],
    uIndex: 0,
    vIndex: 1,
    corners: [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
      [0, 0, 0],
    ],
  },
];

export class Chunk {
  constructor(chunkX, chunkZ, generator) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.generator = generator;
    this.data = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    this.mesh = null;
    this.isDirty = true;
    this.populate();
  }

  getIndex(x, y, z) {
    return y * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x;
  }

  getBlockLocal(x, y, z) {
    if (
      x < 0 ||
      y < 0 ||
      z < 0 ||
      x >= CHUNK_SIZE ||
      y >= CHUNK_HEIGHT ||
      z >= CHUNK_SIZE
    )
      return BLOCK_AIR;
    return this.data[this.getIndex(x, y, z)];
  }

  setBlockLocal(x, y, z, type) {
    if (
      x < 0 ||
      y < 0 ||
      z < 0 ||
      x >= CHUNK_SIZE ||
      y >= CHUNK_HEIGHT ||
      z >= CHUNK_SIZE
    )
      return;
    this.data[this.getIndex(x, y, z)] = type;
    this.isDirty = true;
  }

  populate() {
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = this.chunkX * CHUNK_SIZE + x;
        const worldZ = this.chunkZ * CHUNK_SIZE + z;
        const columnHeight = this.generator.getHeightAt(worldX, worldZ);
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          const blockType = this.generator.getBlockAt(
            worldX,
            y,
            worldZ,
            columnHeight
          );
          this.data[this.getIndex(x, y, z)] = blockType;
        }
      }
    }
    this.isDirty = true;
  }

  buildMesh(atlas) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const indices = [];
    let indexOffset = 0;

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const type = this.getBlockLocal(x, y, z);
          if (type === BLOCK_AIR) continue;
          const color = BLOCK_COLORS[type];
          if (type === BLOCK_GRASS_PLANT) {
            const { u0, v0, u1, v1 } = getTileUV(BLOCK_TILE_INDEX[type], atlas);
            const cross = [
              // plane 1 (vertical diag: (0,*,0) -> (1,*,1))
              [
                [0, 0, 0],
                [1, 0, 1],
                [1, 1, 1],
                [0, 1, 0],
              ],
              // plane 2 (vertical diag: (1,*,0) -> (0,*,1))
              [
                [1, 0, 0],
                [0, 0, 1],
                [0, 1, 1],
                [1, 1, 0],
              ],
            ];
            for (const plane of cross) {
              const uvOrder = [
                [u0, v1],
                [u1, v1],
                [u1, v0],
                [u0, v0],
              ];
              for (let i = 0; i < 4; i++) {
                const c = plane[i];
                positions.push(x + c[0], y + c[1], z + c[2]);
                normals.push(0, 1, 0);
                const uv = uvOrder[i];
                uvs.push(uv[0], uv[1]);
                colors.push(1, 1, 1);
              }
              indices.push(
                indexOffset,
                indexOffset + 1,
                indexOffset + 2,
                indexOffset,
                indexOffset + 2,
                indexOffset + 3
              );
              indexOffset += 4;
            }
            continue;
          }
          for (const face of directions) {
            const nx = x + face.dir[0];
            const ny = y + face.dir[1];
            const nz = z + face.dir[2];
            const neighbor = this.getBlockLocal(nx, ny, nz);
            if (!isSolidBlock(neighbor)) {
              let tile = BLOCK_TILE_INDEX[type] ?? 0;
              if (type !== BLOCK_AIR && type === 1) {
                if (face.norm[1] === 1) tile = GRASS_TOP_TILE;
                else if (face.norm[1] === -1) tile = GRASS_BOTTOM_TILE;
                else tile = GRASS_SIDE_TILE;
              }
              if (type === 5) {
                // LOG
                if (face.norm[1] !== 0) tile = BLOCK_TILE_INDEX["log_top"];
                else tile = BLOCK_TILE_INDEX["log_side"];
              }
              if (type === 6) {
                // LEAVES
                tile = BLOCK_TILE_INDEX[6];
              }
              const { u0, v0, u1, v1 } = getTileUV(tile, atlas);
              const uvOrder = [
                [u0, v0],
                [u1, v0],
                [u1, v1],
                [u0, v1],
              ];
              const aoForCorner = (cornerIndex) => {
                const uFlag =
                  face.corners[cornerIndex][face.uIndex] === 1 ? 1 : -1;
                const vFlag =
                  face.corners[cornerIndex][face.vIndex] === 1 ? 1 : -1;
                const px = x + face.dir[0];
                const py = y + face.dir[1];
                const pz = z + face.dir[2];
                const sux = px + face.uAxis[0] * uFlag;
                const suy = py + face.uAxis[1] * uFlag;
                const suz = pz + face.uAxis[2] * uFlag;
                const svx = px + face.vAxis[0] * vFlag;
                const svy = py + face.vAxis[1] * vFlag;
                const svz = pz + face.vAxis[2] * vFlag;
                const cx2 = px + face.uAxis[0] * uFlag + face.vAxis[0] * vFlag;
                const cy2 = py + face.uAxis[1] * uFlag + face.vAxis[1] * vFlag;
                const cz2 = pz + face.uAxis[2] * uFlag + face.vAxis[2] * vFlag;
                const side1 = isSolidBlock(this.getBlockLocal(sux, suy, suz))
                  ? 1
                  : 0;
                const side2 = isSolidBlock(this.getBlockLocal(svx, svy, svz))
                  ? 1
                  : 0;
                const cornerSolid = isSolidBlock(
                  this.getBlockLocal(cx2, cy2, cz2)
                )
                  ? 1
                  : 0;
                const ao =
                  side1 && side2 ? 0 : 3 - (side1 + side2 + cornerSolid);
                return ao / 3; // 0..1
              };
              for (let i = 0; i < 4; i++) {
                const c = face.corners[i];
                positions.push(x + c[0], y + c[1], z + c[2]);
                normals.push(face.norm[0], face.norm[1], face.norm[2]);
                const uv = uvOrder[i];
                uvs.push(uv[0], uv[1]);
                const ao = aoForCorner(i);
                colors.push(ao, ao, ao);
              }
              indices.push(
                indexOffset,
                indexOffset + 1,
                indexOffset + 2,
                indexOffset,
                indexOffset + 2,
                indexOffset + 3
              );
              indexOffset += 4;
            }
          }
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array(positions), 3)
    );
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(new Float32Array(normals), 3)
    );
    geometry.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(new Float32Array(uvs), 2)
    );
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(new Float32Array(colors), 3)
    );
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();

    const material = new THREE.MeshLambertMaterial({
      map: atlas.texture,
      vertexColors: true,
      transparent: true,
      alphaTest: 0.5,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.position.set(this.chunkX * CHUNK_SIZE, 0, this.chunkZ * CHUNK_SIZE);
    this.mesh = mesh;
    this.isDirty = false;
    return mesh;
  }
}
