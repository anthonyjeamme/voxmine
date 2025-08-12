export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;
export const WORLD_HEIGHT_MIN = 0;
export const WORLD_HEIGHT_MAX = CHUNK_HEIGHT - 1;
export const LOAD_DISTANCE_CHUNKS = 12;
export const UNLOAD_DISTANCE_CHUNKS = 18;
export const BLOCK_AIR = 0;
export const BLOCK_GRASS = 1;
export const BLOCK_DIRT = 2;
export const BLOCK_STONE = 3;
export const BLOCK_GRASS_PLANT = 4;
export const BLOCK_LOG = 5;
export const BLOCK_LEAVES = 6;
export const BLOCK_TYPES = [
  BLOCK_AIR,
  BLOCK_GRASS,
  BLOCK_DIRT,
  BLOCK_STONE,
  BLOCK_GRASS_PLANT,
  BLOCK_LOG,
  BLOCK_LEAVES,
];
export const BLOCK_COLORS = {
  [BLOCK_AIR]: new Float32Array([0, 0, 0]),
  [BLOCK_GRASS]: new Float32Array([0.36, 0.71, 0.29]),
  [BLOCK_DIRT]: new Float32Array([0.55, 0.38, 0.24]),
  [BLOCK_STONE]: new Float32Array([0.6, 0.6, 0.62]),
  [BLOCK_GRASS_PLANT]: new Float32Array([0.4, 0.7, 0.35]),
  [BLOCK_LOG]: new Float32Array([0.45, 0.29, 0.18]),
  [BLOCK_LEAVES]: new Float32Array([0.28, 0.6, 0.3]),
};
export const BLOCK_TILE_INDEX = {
  [BLOCK_GRASS]: 0,
  [BLOCK_DIRT]: 1,
  [BLOCK_STONE]: 2,
  [BLOCK_GRASS_PLANT]: 3,
  // wood
  log_side: 4,
  log_top: 5,
  [BLOCK_LEAVES]: 6,
};
export const GRASS_SIDE_TILE = 1;
export const GRASS_TOP_TILE = 0;
export const GRASS_BOTTOM_TILE = 1;
export const PLAYER_SETTINGS = {
  width: 0.6,
  depth: 0.6,
  height: 1.8,
  eyeHeight: 1.62,
  speed: 36,
  jumpSpeed: 9,
  gravity: 24,
  damping: 10,
  sprintMultiplier: 1.3,
};

export function isSolidBlock(t) {
  return (
    t === BLOCK_GRASS ||
    t === BLOCK_DIRT ||
    t === BLOCK_STONE ||
    t === BLOCK_LOG ||
    t === BLOCK_LEAVES
  );
}
