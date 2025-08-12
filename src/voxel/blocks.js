import {
  BLOCK_AIR,
  BLOCK_GRASS,
  BLOCK_DIRT,
  BLOCK_STONE,
  BLOCK_GRASS_PLANT,
  BLOCK_LOG,
  BLOCK_LEAVES,
  BLOCK_LOG_DARK,
  BLOCK_LEAVES_DARK,
  GRASS_TOP_TILE,
  GRASS_SIDE_TILE,
  GRASS_BOTTOM_TILE,
  BLOCK_TILE_INDEX,
} from "./constants.js";

export const RenderKind = {
  Cube: "cube",
  Cross: "cross",
  CutoutCube: "cutoutCube",
};

const registry = {
  [BLOCK_AIR]: { solid: false, kind: RenderKind.Cube, faceTile: () => 0 },
  [BLOCK_GRASS]: {
    solid: true,
    kind: RenderKind.Cube,
    faceTile: (n) =>
      n[1] === 1
        ? GRASS_TOP_TILE
        : n[1] === -1
        ? GRASS_BOTTOM_TILE
        : GRASS_SIDE_TILE,
  },
  [BLOCK_DIRT]: {
    solid: true,
    kind: RenderKind.Cube,
    faceTile: () => BLOCK_TILE_INDEX[BLOCK_DIRT] ?? 1,
  },
  [BLOCK_STONE]: {
    solid: true,
    kind: RenderKind.Cube,
    faceTile: () => BLOCK_TILE_INDEX[BLOCK_STONE] ?? 2,
  },
  [BLOCK_GRASS_PLANT]: {
    solid: false,
    kind: RenderKind.Cross,
    faceTile: () => BLOCK_TILE_INDEX[BLOCK_GRASS_PLANT] ?? 3,
  },
  [BLOCK_LOG]: {
    solid: true,
    kind: RenderKind.Cube,
    faceTile: (n) =>
      n[1] !== 0 ? BLOCK_TILE_INDEX["log_top"] : BLOCK_TILE_INDEX["log_side"],
  },
  [BLOCK_LEAVES]: {
    solid: true,
    kind: RenderKind.CutoutCube,
    faceTile: () => BLOCK_TILE_INDEX[BLOCK_LEAVES] ?? 6,
  },
  [BLOCK_LOG_DARK]: {
    solid: true,
    kind: RenderKind.Cube,
    faceTile: (n) =>
      n[1] !== 0
        ? BLOCK_TILE_INDEX["log_dark_top"]
        : BLOCK_TILE_INDEX["log_dark_side"],
  },
  [BLOCK_LEAVES_DARK]: {
    solid: true,
    kind: RenderKind.CutoutCube,
    faceTile: () => BLOCK_TILE_INDEX["leaves_dark"] ?? 9,
  },
};

export function isSolid(type) {
  const e = registry[type];
  return !!(e && e.solid);
}

export function renderKind(type) {
  const e = registry[type];
  return e ? e.kind : RenderKind.Cube;
}

export function faceTile(type, normal) {
  const e = registry[type];
  return e ? e.faceTile(normal) : 0;
}

export function usesAlphaTest(type) {
  return renderKind(type) !== RenderKind.Cube;
}
