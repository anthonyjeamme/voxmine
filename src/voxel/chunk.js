import * as THREE from "three";
import {
  CHUNK_SIZE,
  CHUNK_HEIGHT,
  BLOCK_AIR,
  BLOCK_COLORS,
  BLOCK_TILE_INDEX,
} from "./constants.js";
import {
  renderKind,
  faceTile,
  isSolid,
  usesAlphaTest,
  RenderKind,
} from "./blocks.js";
import { getTileUV } from "./textures.js";

const directions = [
  {
    // +X
    dir: [1, 0, 0],
    norm: [1, 0, 0],
    uAxis: [0, 0, 1], // Z (horizontal)
    vAxis: [0, 1, 0], // Y (vertical)
    uIndex: 2,
    vIndex: 1,
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
    uAxis: [0, 0, 1], // Z (horizontal)
    vAxis: [0, 1, 0], // Y (vertical)
    uIndex: 2,
    vIndex: 1,
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
    const opaque = {
      positions: [],
      normals: [],
      uvs: [],
      colors: [],
      indices: [],
      indexOffset: 0,
    };
    const cutout = {
      positions: [],
      normals: [],
      uvs: [],
      colors: [],
      indices: [],
      indexOffset: 0,
    };
    const pushFace = (bucket, face, x, y, z, uvOrder, aoFunc) => {
      for (let i = 0; i < 4; i++) {
        const c = face.corners[i];
        bucket.positions.push(x + c[0], y + c[1], z + c[2]);
        bucket.normals.push(face.norm[0], face.norm[1], face.norm[2]);
        const uv = uvOrder[i];
        bucket.uvs.push(uv[0], uv[1]);
        const ao = aoFunc ? aoFunc(i) : 1;
        bucket.colors.push(ao, ao, ao);
      }
      bucket.indices.push(
        bucket.indexOffset,
        bucket.indexOffset + 1,
        bucket.indexOffset + 2,
        bucket.indexOffset,
        bucket.indexOffset + 2,
        bucket.indexOffset + 3
      );
      bucket.indexOffset += 4;
    };

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const type = this.getBlockLocal(x, y, z);
          if (type === BLOCK_AIR) continue;
          const color = BLOCK_COLORS[type];
          if (renderKind(type) === RenderKind.Cross) {
            const { u0, v0, u1, v1 } = getTileUV(
              faceTile(type, [0, 1, 0]),
              atlas
            );
            const cross = [
              [
                [0, 0, 0],
                [1, 0, 1],
                [1, 1, 1],
                [0, 1, 0],
              ],
              [
                [1, 0, 0],
                [0, 0, 1],
                [0, 1, 1],
                [1, 1, 0],
              ],
              // duplicate backfaces so la plante est visible des deux côtés
              [
                [0, 1, 0],
                [1, 1, 1],
                [1, 0, 1],
                [0, 0, 0],
              ],
              [
                [1, 1, 0],
                [0, 1, 1],
                [0, 0, 1],
                [1, 0, 0],
              ],
            ];
            for (const plane of cross) {
              const uvOrder = [
                [u0, v1],
                [u1, v1],
                [u1, v0],
                [u0, v0],
              ];
              pushFace(
                cutout,
                { corners: plane, norm: [0, 1, 0] },
                x,
                y,
                z,
                uvOrder
              );
            }
            continue;
          }
          const isOpaqueBlock = (t) =>
            isSolid(t) &&
            !usesAlphaTest(t) &&
            renderKind(t) !== RenderKind.Cross;
          for (const face of directions) {
            const nx = x + face.dir[0];
            const ny = y + face.dir[1];
            const nz = z + face.dir[2];
            const neighbor = this.getBlockLocal(nx, ny, nz);
            if (!isOpaqueBlock(neighbor)) {
              let tile = faceTile(type, face.norm);
              const { u0, v0, u1, v1 } = getTileUV(tile, atlas);
              let uvOrder;
              if (face.norm[0] !== 0) {
                // X faces: make V follow Y and keep bark vertical
                if (face.norm[0] > 0) {
                  uvOrder = [
                    [u0, v0],
                    [u0, v1],
                    [u1, v1],
                    [u1, v0],
                  ];
                } else {
                  uvOrder = [
                    [u1, v0],
                    [u1, v1],
                    [u0, v1],
                    [u0, v0],
                  ];
                }
              } else {
                uvOrder = [
                  [u0, v0],
                  [u1, v0],
                  [u1, v1],
                  [u0, v1],
                ];
              }
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
                const side1 = isSolid(this.getBlockLocal(sux, suy, suz))
                  ? 1
                  : 0;
                const side2 = isSolid(this.getBlockLocal(svx, svy, svz))
                  ? 1
                  : 0;
                const cornerSolid = isSolid(this.getBlockLocal(cx2, cy2, cz2))
                  ? 1
                  : 0;
                const aoRaw =
                  side1 && side2 ? 0 : 3 - (side1 + side2 + cornerSolid);
                const table = [0.45, 0.65, 0.85, 1.0];
                return table[aoRaw];
              };
              const rk = renderKind(type);
              const bucket =
                rk === RenderKind.Cross || rk === RenderKind.CutoutCube
                  ? cutout
                  : opaque;
              pushFace(bucket, face, x, y, z, uvOrder, aoForCorner);
            }
          }
        }
      }
    }
    const group = new THREE.Group();
    const makeMesh = (b, mat) => {
      if (b.positions.length === 0) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(new Float32Array(b.positions), 3)
      );
      g.setAttribute(
        "normal",
        new THREE.Float32BufferAttribute(new Float32Array(b.normals), 3)
      );
      g.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(new Float32Array(b.uvs), 2)
      );
      g.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(new Float32Array(b.colors), 3)
      );
      g.setIndex(b.indices);
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      m.castShadow = false;
      m.receiveShadow = true;
      return m;
    };
    const matOpaque = new THREE.MeshLambertMaterial({
      map: atlas.texture,
      vertexColors: true,
      transparent: false,
    });
    const matCutout = new THREE.MeshLambertMaterial({
      map: atlas.texture,
      vertexColors: true,
      transparent: false,
      alphaTest: 0.5,
    });
    const m1 = makeMesh(opaque, matOpaque);
    if (m1) group.add(m1);
    const m2 = makeMesh(cutout, matCutout);
    if (m2) group.add(m2);
    group.position.set(this.chunkX * CHUNK_SIZE, 0, this.chunkZ * CHUNK_SIZE);
    this.mesh = group;
    this.isDirty = false;
    return group;
  }
}
