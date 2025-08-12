import * as THREE from "three";

export function createAtlasTexture(renderer) {
  const tileSize = 32;
  const cols = 11; // étendu pour accueillir dark forest + grass_side
  const rows = 2;
  const canvas = document.createElement("canvas");
  canvas.width = cols * tileSize;
  canvas.height = rows * tileSize;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  function drawGrass(x, y) {
    ctx.fillStyle = "#74d14c";
    ctx.fillRect(x, y, tileSize, tileSize);
    ctx.fillStyle = "#59bf3a";
    for (let i = 0; i < 80; i++) {
      const rx = x + Math.floor(Math.random() * tileSize);
      const ry = y + Math.floor(Math.random() * tileSize);
      ctx.fillRect(rx, ry, 1, 1);
    }
    ctx.fillStyle = "#93e96a";
    for (let i = 0; i < 60; i++) {
      const rx = x + Math.floor(Math.random() * tileSize);
      const ry = y + Math.floor(Math.random() * tileSize);
      ctx.fillRect(rx, ry, 1, 1);
    }
  }
  function drawDirt(x, y) {
    ctx.fillStyle = "#b0723c";
    ctx.fillRect(x, y, tileSize, tileSize);
    ctx.fillStyle = "#9a5e2e";
    for (let i = 0; i < 60; i++) {
      const rx = x + Math.random() * tileSize;
      const ry = y + Math.random() * tileSize;
      ctx.fillRect(rx, ry, 1, 1);
    }
  }
  function drawStone(x, y) {
    ctx.fillStyle = "#aeb2b8";
    ctx.fillRect(x, y, tileSize, tileSize);
    ctx.fillStyle = "#8e959c";
    for (let i = 0; i < 80; i++) {
      const rx = x + Math.random() * tileSize;
      const ry = y + Math.random() * tileSize;
      ctx.fillRect(rx, ry, 1, 1);
    }
  }

  drawGrass(0, 0);
  drawDirt(tileSize, 0);
  drawStone(tileSize * 2, 0);
  // grass plant tile
  (function drawGrassPlant() {
    const x = tileSize * 3,
      y = 0;
    ctx.clearRect(x, y, tileSize, tileSize);
    const cDark = "#3ca83a";
    const cMid = "#69d14c";
    const cLight = "#9aef71";
    function drawBlade(cx, base, h, w, tilt, colorTop, colorMid) {
      let off = 0;
      for (let r = 0; r < h; r++) {
        const t = r / h;
        const col = t < 0.6 ? colorMid : colorTop;
        ctx.fillStyle = col;
        off += tilt;
        const px = Math.round(cx + off);
        const py = y + tileSize - 1 - (base + r);
        const ww = Math.max(1, Math.round(w * (1 - t * 0.7)));
        ctx.fillRect(x + px - Math.floor(ww / 2), py, ww, 1);
        if (r % 6 === 0 && r > 2 && r < h - 3) {
          const len = 2 + Math.floor(3 * (1 - t));
          ctx.fillRect(x + px + ww, py, len, 1);
          ctx.fillRect(x + px - ww - len, py, len, 1);
        }
      }
    }
    const base = 0;
    drawBlade(8, base, 22, 2, -0.15, cLight, cMid);
    drawBlade(16, base + 1, 24, 2, 0.05, cLight, cMid);
    drawBlade(24, base, 20, 2, 0.18, cLight, cMid);
    drawBlade(12, base + 1, 18, 2, -0.08, cLight, cDark);
    drawBlade(20, base + 2, 17, 2, 0.12, cLight, cDark);
    // dense footer to ensure contact with ground
    ctx.fillStyle = cDark;
    for (let c = 6; c < 26; c++) {
      if (Math.random() < 0.7) ctx.fillRect(x + c, y + tileSize - 1, 1, 1);
      if (Math.random() < 0.4) ctx.fillRect(x + c, y + tileSize - 2, 1, 1);
    }
  })();

  // wood log side (tile 4) and top (tile 5)
  (function drawLog() {
    const x = tileSize * 4,
      y = 0;
    // side
    ctx.fillStyle = "#6b4a2a";
    ctx.fillRect(x, y, tileSize, tileSize);
    ctx.fillStyle = "#5b3f24";
    for (let i = 0; i < tileSize; i += 4) ctx.fillRect(x + i, y, 1, tileSize);
    // top (rings)
    const x2 = tileSize * 5;
    ctx.fillStyle = "#8c5a32";
    ctx.fillRect(x2, y, tileSize, tileSize);
    ctx.strokeStyle = "#6b4a2a";
    for (let r = 4; r < tileSize / 2; r += 3) {
      ctx.beginPath();
      ctx.ellipse(
        x2 + tileSize / 2,
        y + tileSize / 2,
        r,
        r * 0.85,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
  })();

  // leaves (tile 6) alpha mask
  (function drawLeaves() {
    const x = tileSize * 6,
      y = 0;
    ctx.clearRect(x, y, tileSize, tileSize);
    const base = "#37a24a",
      light = "#4fd964";
    for (let r = 0; r < tileSize; r++) {
      for (let c = 0; c < tileSize; c++) {
        if (Math.random() < 0.6) {
          ctx.fillStyle = Math.random() < 0.5 ? base : light;
          ctx.fillRect(x + c, y + r, 1, 1);
        }
      }
    }
  })();

  // dark log side/top (tiles 7,8) and dark leaves (9)
  (function drawDark() {
    const x = tileSize * 7,
      y = 0;
    // dark log side
    ctx.fillStyle = "#3a2a18";
    ctx.fillRect(x, y, tileSize, tileSize);
    ctx.fillStyle = "#2c2014";
    for (let i = 0; i < tileSize; i += 3) ctx.fillRect(x + i, y, 1, tileSize);
    // dark log top
    const x2 = tileSize * 8;
    ctx.fillStyle = "#5a3c22";
    ctx.fillRect(x2, y, tileSize, tileSize);
    ctx.strokeStyle = "#3a2a18";
    for (let r = 4; r < tileSize / 2; r += 2) {
      ctx.beginPath();
      ctx.ellipse(
        x2 + tileSize / 2,
        y + tileSize / 2,
        r,
        r * 0.9,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    // dark leaves
    const x3 = tileSize * 9;
    ctx.clearRect(x3, y, tileSize, tileSize);
    const base = "#0f2512",
      light = "#18351b";
    for (let r = 0; r < tileSize; r++)
      for (let c = 0; c < tileSize; c++)
        if (Math.random() < 0.55) {
          ctx.fillStyle = Math.random() < 0.5 ? base : light;
          ctx.fillRect(x3 + c, y + r, 1, 1);
        }
  })();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.flipY = false;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  // Optional: inject real textures from public/textures if available
  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }
  async function loadFirst(paths) {
    for (const p of paths) {
      const img = await loadImage(p);
      if (img) return img;
    }
    return null;
  }
  (async () => {
    const grassTop = await loadFirst([
      "/textures/block/grass_block_top.png",
      "/textures/block/grass_block/grass_block_top.png",
    ]);
    const grassSide = await loadFirst([
      "/textures/block/grass_block_side.png",
      "/textures/block/grass_block/grass_block_flowers1.png",
      "/textures/block/grass_block/grass_block_flowers2.png",
      "/textures/block/grass_block/grass_block_flowers3.png",
      "/textures/block/grass_block/grass_block_flowers4.png",
    ]);
    if (grassTop) {
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.drawImage(
        grassTop,
        0,
        0,
        grassTop.width,
        grassTop.height,
        0,
        0,
        tileSize,
        tileSize
      );
      texture.needsUpdate = true;
    }
    if (grassSide) {
      ctx.clearRect(tileSize * 10, 0, tileSize, tileSize);
      ctx.drawImage(
        grassSide,
        0,
        0,
        grassSide.width,
        grassSide.height,
        tileSize * 10,
        0,
        tileSize,
        tileSize
      );
      texture.needsUpdate = true;
    }
    const dirtImg = await loadFirst([
      "/textures/block/dirt.png",
      "/textures/block/dirt/dirt_0.png",
      "/textures/block/dirt/dirt_1.png",
      "/textures/block/dirt/dirt_2.png",
      "/textures/dirt.png",
    ]);
    if (dirtImg) {
      ctx.clearRect(tileSize * 1, 0, tileSize, tileSize);
      ctx.drawImage(
        dirtImg,
        0,
        0,
        dirtImg.width,
        dirtImg.height,
        tileSize * 1,
        0,
        tileSize,
        tileSize
      );
      texture.needsUpdate = true;
    }
    const stoneImg = await loadFirst([
      "/textures/block/stone.png",
      "/textures/block/stone/stone_0.png",
      "/textures/block/stone/stone_1.png",
      "/textures/block/stone/stone_2.png",
      "/textures/stone.png",
    ]);
    if (stoneImg) {
      ctx.clearRect(tileSize * 2, 0, tileSize, tileSize);
      ctx.drawImage(
        stoneImg,
        0,
        0,
        stoneImg.width,
        stoneImg.height,
        tileSize * 2,
        0,
        tileSize,
        tileSize
      );
      texture.needsUpdate = true;
    }
    const side = await loadFirst([
      "/textures/block/oak_log.png",
      "/textures/oak_log.png",
      "/textures/log_oak.png",
      "/textures/log.png",
      "/textures/blocks/oak_log.png",
      "/textures/blocks/log_oak.png",
    ]);
    const top = await loadFirst([
      "/textures/block/oak_log_top.png",
      "/textures/oak_log_top.png",
      "/textures/log_oak_top.png",
      "/textures/log_top.png",
      "/textures/blocks/oak_log_top.png",
      "/textures/blocks/log_oak_top.png",
    ]);
    const leaves = await loadFirst([
      "/textures/block/oak_leaves.png",
      "/textures/oak_leaves.png",
      "/textures/leaves_oak.png",
      "/textures/leaves.png",
      "/textures/blocks/oak_leaves.png",
      "/textures/blocks/leaves_oak.png",
    ]);
    if (side) {
      ctx.clearRect(tileSize * 4, 0, tileSize, tileSize);
      ctx.drawImage(
        side,
        0,
        0,
        side.width,
        side.height,
        tileSize * 4,
        0,
        tileSize,
        tileSize
      );
      texture.needsUpdate = true;
    }
    if (top) {
      ctx.clearRect(tileSize * 5, 0, tileSize, tileSize);
      ctx.drawImage(
        top,
        0,
        0,
        top.width,
        top.height,
        tileSize * 5,
        0,
        tileSize,
        tileSize
      );
      texture.needsUpdate = true;
    }
    if (leaves) {
      ctx.clearRect(tileSize * 6, 0, tileSize, tileSize);
      ctx.drawImage(
        leaves,
        0,
        0,
        leaves.width,
        leaves.height,
        tileSize * 6,
        0,
        tileSize,
        tileSize
      );
      texture.needsUpdate = true;
    }

    const dSide = await loadFirst([
      "/textures/block/dark_oak_log.png",
      "/textures/dark_oak_log.png",
      "/textures/log_big_oak.png",
      "/textures/blocks/dark_oak_log.png",
    ]);
    const dTop = await loadFirst([
      "/textures/block/dark_oak_log_top.png",
      "/textures/dark_oak_log_top.png",
      "/textures/blocks/dark_oak_log_top.png",
    ]);
    const dLeaves = await loadFirst([
      "/textures/block/dark_oak_leaves.png",
      "/textures/dark_oak_leaves.png",
      "/textures/leaves_big_oak.png",
      "/textures/blocks/dark_oak_leaves.png",
    ]);
    if (dSide) {
      ctx.clearRect(tileSize * 7, 0, tileSize, tileSize);
      ctx.drawImage(
        dSide,
        0,
        0,
        dSide.width,
        dSide.height,
        tileSize * 7,
        0,
        tileSize,
        tileSize
      );
      texture.needsUpdate = true;
    }
    if (dTop) {
      ctx.clearRect(tileSize * 8, 0, tileSize, tileSize);
      ctx.drawImage(
        dTop,
        0,
        0,
        dTop.width,
        dTop.height,
        tileSize * 8,
        0,
        tileSize,
        tileSize
      );
      texture.needsUpdate = true;
    }
    if (dLeaves) {
      ctx.clearRect(tileSize * 9, 0, tileSize, tileSize);
      ctx.drawImage(
        dLeaves,
        0,
        0,
        dLeaves.width,
        dLeaves.height,
        tileSize * 9,
        0,
        tileSize,
        tileSize
      );
      texture.needsUpdate = true;
    }
  })();

  return { texture, tileSize, cols, rows };
}

export function getTileUV(tileIndex, atlas) {
  const { cols, tileSize, texture } = atlas;
  const col = tileIndex % cols;
  const row = Math.floor(tileIndex / cols);
  const u0 = (col * tileSize) / texture.image.width;
  const v0 = (row * tileSize) / texture.image.height;
  const u1 = ((col + 1) * tileSize) / texture.image.width;
  const v1 = ((row + 1) * tileSize) / texture.image.height;
  return { u0, v0, u1, v1 };
}
