import "./style.css";
import * as THREE from "three";
import { World } from "./voxel/world.js";
import { Player } from "./voxel/player.js";
import { createPointerLock } from "./voxel/pointer.js";
import { createAtlasTexture } from "./voxel/textures.js";
import { createHighlighter } from "./voxel/highlight.js";
import { ParticleSystem } from "./voxel/particles.js";
import { Inventory } from "./voxel/inventory.js";
import { InventoryUI } from "./voxel/ui.js";
import { DropsManager } from "./voxel/drops.js";
import { ItemId, blockTypeToItemId } from "./voxel/items.js";
import { createAudioEngine } from "./audio.js";
import { createGhostLine } from "./voxel/ghosts.js";

const appContainer = document.getElementById("app");
const statsEl = document.getElementById("stats");
const clockEl = document.getElementById("clock");
const playButton = document.getElementById("play");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
appContainer.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 30, 0);

const ambientLight = new THREE.HemisphereLight(0xbfd4ff, 0x3f3f3f, 0.9);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
sunLight.position.set(100, 200, 100);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
scene.add(sunLight);

const world = new World(scene);
const player = new Player(camera, world);
const atlas = createAtlasTexture(renderer);
world.setAtlas(atlas);
const highlighter = createHighlighter(scene, atlas);
const particles = new ParticleSystem(scene);
const inventory = new Inventory();
const invUI = new InventoryUI(inventory, player);
const drops = new DropsManager(scene, inventory, world);
const ghosts = createGhostLine(scene);
const services = { highlighter, particles, drops, ghosts };
world.setServices(services);
scene.__particles = particles; // TEMP: compat
scene.__drops = drops; // TEMP: compat
scene.__ghosts = ghosts; // TEMP: compat
scene.__highlighter = highlighter; // TEMP: compat
scene.__highlighter = highlighter;

const audio = createAudioEngine();

function findSafeSpawn(world, centerX = 0, centerZ = 0) {
  const candidates = [];
  candidates.push([centerX, centerZ]);
  const radii = [8, 16, 24, 32, 48, 64];
  for (const r of radii) {
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      const x = Math.round(centerX + Math.cos(ang) * r);
      const z = Math.round(centerZ + Math.sin(ang) * r);
      candidates.push([x, z]);
    }
  }
  function safeY(x, z) {
    const gen = world.generator;
    // cherche un solide avec au moins 3 blocs d'air au-dessus
    for (let y = 60; y >= 1; y--) {
      const solid = gen.density(x, y, z) > 0;
      const air1 = gen.density(x, y + 1, z) <= 0;
      const air2 = gen.density(x, y + 2, z) <= 0;
      const air3 = gen.density(x, y + 3, z) <= 0;
      if (solid && air1 && air2 && air3) return y + 2; // place les pieds sur y+1
    }
    const h = gen.getHeightAt(x, z);
    return h + 3;
  }
  for (const [x, z] of candidates) {
    const y = safeY(x, z);
    if (y > 2 && y < 62) return { x, y, z };
  }
  const h0 = world.generator.getHeightAt(centerX, centerZ);
  return { x: centerX, y: h0 + 3, z: centerZ };
}

const skyPresets = [
  {
    name: "day",
    bg: 0x87ceeb,
    hemiTop: 0xbfd4ff,
    hemiBottom: 0x3f3f3f,
    hemiInt: 0.9,
    sunInt: 0.9,
  },
  {
    name: "sunset",
    bg: 0xffb36b,
    hemiTop: 0xffc98a,
    hemiBottom: 0x4b2a2a,
    hemiInt: 0.6,
    sunInt: 0.6,
  },
  {
    name: "night",
    bg: 0x0a0f1a,
    hemiTop: 0x3b4a6b,
    hemiBottom: 0x060607,
    hemiInt: 0.25,
    sunInt: 0.15,
  },
  {
    name: "dawn",
    bg: 0xf3d7a7,
    hemiTop: 0xffe6b3,
    hemiBottom: 0x2c2a24,
    hemiInt: 0.7,
    sunInt: 0.5,
  },
];
let skyIndex = 0;
function applySky(i) {
  const p = skyPresets[i % skyPresets.length];
  scene.background = new THREE.Color(p.bg);
  ambientLight.color.setHex(p.hemiTop);
  ambientLight.groundColor.setHex(p.hemiBottom);
  ambientLight.intensity = p.hemiInt;
  sunLight.intensity = p.sunInt;
}
applySky(skyIndex);
function onToggleSky(e) {
  const isM = e.code === "KeyM" || e.key === "m" || e.key === "M";
  if (!isM) return;
  skyIndex = (skyIndex + 1) % skyPresets.length;
  applySky(skyIndex);
}
document.addEventListener("keydown", onToggleSky, true);

function onToggleMusic(e) {
  const isO = e.code === "KeyO" || e.key === "o" || e.key === "O";
  if (!isO) return;
  audio.toggleEnabled();
  const px = player.position.x;
  const pz = player.position.z;
  const biome = world.generator.getBiomeAt(px, pz);
  audio.setThemeForBiome(biome);
}
document.addEventListener("keydown", onToggleMusic, true);

const pointer = createPointerLock(renderer.domElement, player);
const spawn = findSafeSpawn(world, 0, 0);
player.position.set(spawn.x + 0.5, spawn.y, spawn.z + 0.5);
camera.position.set(spawn.x + 0.5, spawn.y + 1.62, spawn.z + 0.5);
playButton.addEventListener("click", () => {
  pointer.requestLock();
  const px = player.position.x;
  const pz = player.position.z;
  const biome = world.generator.getBiomeAt(px, pz);
  audio.setThemeForBiome(biome);
});

let previousTimeMs = performance.now();
let frameCounter = 0;
let lastFpsUpdateMs = previousTimeMs;
const DAY_LENGTH_MS = 600000;
let gameTimeMs = DAY_LENGTH_MS * (8 / 24);

function lerpColor(a, b, t) {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return ca.lerp(cb, t);
}

function applyDayNight(time01) {
  const hour = time01 * 24;
  let daylight = 0;
  let theta = null;
  if (hour >= 6 && hour < 8) {
    const u = (hour - 6) / 2;
    const s = u * u * (3 - 2 * u);
    daylight = s;
    theta = s * (Math.PI * 0.5);
  } else if (hour >= 8 && hour < 18) {
    daylight = 1;
    theta = Math.PI * 0.5;
  } else if (hour >= 18 && hour < 22) {
    const u = (hour - 18) / 4;
    const s = u * u * (3 - 2 * u);
    daylight = 1 - s;
    theta = Math.PI * 0.5 + s * (Math.PI * 0.5);
  } else {
    daylight = 0;
    theta = null;
  }
  const skyDay = 0x87ceeb;
  const skyNight = 0x020307;
  const bg = lerpColor(skyNight, skyDay, daylight);
  scene.background = bg;
  const hemiTopDay = 0xbfd4ff;
  const hemiTopNight = 0x3b4a6b;
  const hemiBotDay = 0x3f3f3f;
  const hemiBotNight = 0x060607;
  const top = lerpColor(hemiTopNight, hemiTopDay, daylight);
  const bottom = lerpColor(hemiBotNight, hemiBotDay, daylight);
  ambientLight.color.copy(top);
  ambientLight.groundColor.copy(bottom);
  ambientLight.intensity = 0.02 + 0.98 * daylight;
  sunLight.intensity = 1.0 * daylight;
  const r = 300;
  if (theta !== null) {
    sunLight.position.set(Math.cos(theta) * r, Math.sin(theta) * r, 0);
  } else {
    sunLight.position.set(-r * 0.2, -50, 0);
  }
}

function updateClock() {
  const t01 = (gameTimeMs % DAY_LENGTH_MS) / DAY_LENGTH_MS;
  const hFloat = t01 * 24;
  const h = Math.floor(hFloat);
  const m = Math.floor((hFloat - h) * 60);
  const hs = String(h).padStart(2, "0");
  const ms = String(m).padStart(2, "0");
  if (clockEl) clockEl.textContent = `${hs}:${ms}`;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onWindowResize);

function updateHud(nowMs) {
  frameCounter += 1;
  if (nowMs - lastFpsUpdateMs > 500) {
    const fps = Math.round((frameCounter * 1000) / (nowMs - lastFpsUpdateMs));
    frameCounter = 0;
    lastFpsUpdateMs = nowMs;
    const chunkCount = world.getLoadedChunkCount();
    statsEl.textContent = `FPS ${fps} | Chunks ${chunkCount}`;
  }
}

function tick() {
  const now = performance.now();
  const deltaSeconds = Math.min(0.05, (now - previousTimeMs) / 1000);
  previousTimeMs = now;

  world.updateStreaming(player.getPosition());

  const px = player.position.x;
  const pz = player.position.z;
  const biome = "plains";
  if (scene.fog) scene.fog = null;
  gameTimeMs = (gameTimeMs + deltaSeconds * 1000) % DAY_LENGTH_MS;
  const t01 = (gameTimeMs % DAY_LENGTH_MS) / DAY_LENGTH_MS;
  applyDayNight(t01);
  audio.setThemeForBiome(biome);
  audio.update();

  player.update(deltaSeconds);
  player.updatePlaceDragPreview();
  particles.update(deltaSeconds);
  drops.update(deltaSeconds, player.getPosition());
  const aim = player.getAimHit(8);
  if (aim && aim.hit)
    highlighter.showAtVoxel(aim.voxel.x, aim.voxel.y, aim.voxel.z);
  else highlighter.hide();

  renderer.render(scene, camera);
  updateHud(now);
  updateClock();
  requestAnimationFrame(tick);
}

tick();
