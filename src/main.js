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
import { createGhostLine } from "./voxel/ghosts.js";

const appContainer = document.getElementById("app");
const statsEl = document.getElementById("stats");
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
scene.__particles = particles;
const inventory = new Inventory();
const invUI = new InventoryUI(inventory, player);
const drops = new DropsManager(scene, inventory);
scene.__drops = drops;
const ghosts = createGhostLine(scene);
scene.__ghosts = ghosts;
scene.__highlighter = highlighter;

const music = new Audio("/musics/music1.mp3");
music.loop = true;
music.volume = 0.3;

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
  if (music.paused) music.play().catch(() => {});
  else music.pause();
}
document.addEventListener("keydown", onToggleMusic, true);

const pointer = createPointerLock(renderer.domElement, player);
playButton.addEventListener("click", () => {
  pointer.requestLock();
  music.play().catch(() => {});
});

let previousTimeMs = performance.now();
let frameCounter = 0;
let lastFpsUpdateMs = previousTimeMs;

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
  requestAnimationFrame(tick);
}

tick();
