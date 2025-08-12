import * as THREE from "three";

export function createAtlasTexture(renderer) {
  const tileSize = 32;
  const cols = 8; // étendu pour accueillir les tuiles bois/feuilles
  const rows = 2;
  const canvas = document.createElement("canvas");
  canvas.width = cols * tileSize;
  canvas.height = rows * tileSize;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  function drawGrass(x, y) {
    ctx.fillStyle = "#4ea63b";
    ctx.fillRect(x, y, tileSize, tileSize);
    ctx.fillStyle = "#3f8a2f";
    for (let i = 0; i < 80; i++) {
      const rx = x + Math.floor(Math.random() * tileSize);
      const ry = y + Math.floor(Math.random() * tileSize);
      ctx.fillRect(rx, ry, 1, 1);
    }
    ctx.fillStyle = "#62c04d";
    for (let i = 0; i < 60; i++) {
      const rx = x + Math.floor(Math.random() * tileSize);
      const ry = y + Math.floor(Math.random() * tileSize);
      ctx.fillRect(rx, ry, 1, 1);
    }
  }
  function drawDirt(x, y) {
    ctx.fillStyle = "#8a5a3b";
    ctx.fillRect(x, y, tileSize, tileSize);
    ctx.fillStyle = "#6a442c";
    for (let i = 0; i < 60; i++) {
      const rx = x + Math.random() * tileSize;
      const ry = y + Math.random() * tileSize;
      ctx.fillRect(rx, ry, 1, 1);
    }
  }
  function drawStone(x, y) {
    ctx.fillStyle = "#9a9a9a";
    ctx.fillRect(x, y, tileSize, tileSize);
    ctx.fillStyle = "#7d7d7d";
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
    const cDark = "#3c7f2a";
    const cMid = "#4ea63b";
    const cLight = "#6ecb52";
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
    const base = "#2f6b36",
      light = "#3f8b47";
    for (let r = 0; r < tileSize; r++) {
      for (let c = 0; c < tileSize; c++) {
        if (Math.random() < 0.6) {
          ctx.fillStyle = Math.random() < 0.5 ? base : light;
          ctx.fillRect(x + c, y + r, 1, 1);
        }
      }
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
