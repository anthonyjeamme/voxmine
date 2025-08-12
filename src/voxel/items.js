import * as THREE from "three";
import { BLOCK_GRASS, BLOCK_DIRT, BLOCK_STONE } from "./constants.js";

export const ItemId = {
  Grass: "grass",
  Dirt: "dirt",
  Stone: "stone",
};

export function blockTypeToItemId(blockType) {
  if (blockType === BLOCK_GRASS) return ItemId.Dirt;
  if (blockType === BLOCK_DIRT) return ItemId.Dirt;
  if (blockType === BLOCK_STONE) return ItemId.Stone;
  return null;
}

export function createItemMesh(id) {
  const geo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
  let color = 0xffffff;
  if (id === ItemId.Dirt) color = 0x6a442c;
  else if (id === ItemId.Stone) color = 0x9a9a9a;
  else if (id === ItemId.Grass) color = 0x3d8b2f;
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
  } else {
    ctx.fillStyle = "#555";
    ctx.fillRect(0, 0, size, size);
  }
  return c.toDataURL();
}
