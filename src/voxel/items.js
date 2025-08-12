import * as THREE from "three";
import {
  BLOCK_GRASS,
  BLOCK_DIRT,
  BLOCK_STONE,
  BLOCK_LOG,
  BLOCK_LOG_DARK,
} from "./constants.js";

export const ItemId = {
  Grass: "grass",
  Dirt: "dirt",
  Stone: "stone",
  Log: "log",
  DarkLog: "dark_log",
};

export function blockTypeToItemId(blockType) {
  if (blockType === BLOCK_GRASS) return ItemId.Dirt;
  if (blockType === BLOCK_DIRT) return ItemId.Dirt;
  if (blockType === BLOCK_STONE) return ItemId.Stone;
  if (blockType === BLOCK_LOG) return ItemId.Log;
  if (blockType === BLOCK_LOG_DARK) return ItemId.DarkLog;
  return null;
}

export function itemIdToBlockType(id) {
  if (id === ItemId.Dirt) return BLOCK_DIRT;
  if (id === ItemId.Stone) return BLOCK_STONE;
  if (id === ItemId.Grass) return BLOCK_GRASS;
  if (id === ItemId.Log) return BLOCK_LOG;
  if (id === ItemId.DarkLog) return BLOCK_LOG_DARK;
  return null;
}

export function createItemMesh(id) {
  const geo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
  let color = 0xffffff;
  if (id === ItemId.Dirt) color = 0x6a442c;
  else if (id === ItemId.Stone) color = 0x9a9a9a;
  else if (id === ItemId.Grass) color = 0x3d8b2f;
  else if (id === ItemId.Log) color = 0x6b4a2a;
  else if (id === ItemId.DarkLog) color = 0x3a2a18;
  const mat = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function getItemIcon(id) {
  const size = 32;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  if (id === ItemId.Dirt) {
    ctx.fillStyle = "#6a442c";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#8a5a3b";
    for (let i = 0; i < 40; i++)
      ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  } else if (id === ItemId.Stone) {
    ctx.fillStyle = "#9a9a9a";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#7d7d7d";
    for (let i = 0; i < 50; i++)
      ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  } else if (id === ItemId.Grass) {
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, "#6bc357");
    g.addColorStop(1, "#3d8b2f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  } else if (id === ItemId.Log) {
    ctx.fillStyle = "#6b4a2a";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#5b3f24";
    for (let i = 0; i < size; i += 4) ctx.fillRect(i, 0, 1, size);
  } else if (id === ItemId.DarkLog) {
    ctx.fillStyle = "#3a2a18";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#2c2014";
    for (let i = 0; i < size; i += 3) ctx.fillRect(i, 0, 1, size);
  } else {
    ctx.fillStyle = "#555";
    ctx.fillRect(0, 0, size, size);
  }
  return c.toDataURL();
}
