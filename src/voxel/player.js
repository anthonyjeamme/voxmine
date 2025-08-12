import * as THREE from "three";
import {
  PLAYER_SETTINGS,
  CHUNK_HEIGHT,
  BLOCK_AIR,
  BLOCK_GRASS,
  BLOCK_DIRT,
  BLOCK_STONE,
} from "./constants.js";
import { isSolid, faceTile } from "./blocks.js";
import { itemIdToBlockType, blockTypeToItemId } from "./items.js";

export class Player {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.position = new THREE.Vector3(0, 40, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.moveState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
    };
    this.isOnGround = false;
    this.lookSensitivity = 0.002;
    this.blockType = BLOCK_GRASS;
    this.keys = new Set();
    this.initInput();
    this.mouseLeftDown = false;
    this.breaking = {
      active: false,
      target: null,
      progress: 0,
      timeToBreak: 0.6,
    };
    this.inputEnabled = true;
    this.placeDrag = { active: false, anchor: null, normal: null, axis: "x" };
    this.mineAudio = new Audio("/sounds/mine.ogg");
    this.mineAudio.loop = true;
    this.mineAudio.volume = 0.4;
    this.walkAudio = new Audio("/sounds/walk.ogg");
    this.walkAudio.loop = true;
    this.walkAudio.volume = 0.35;
  }

  initInput() {
    window.addEventListener("keydown", (e) => {
      if (!this.inputEnabled) {
        if (e.code === "KeyI" || e.code === "Escape") return;
        e.preventDefault?.();
        return;
      }
      this.keys.add(e.code);
      if (e.code === "KeyW") this.moveState.forward = true;
      if (e.code === "KeyS") this.moveState.backward = true;
      if (e.code === "KeyA") this.moveState.left = true;
      if (e.code === "KeyD") this.moveState.right = true;
      if (e.code === "Space") this.moveState.jump = true;
      if (e.code === "Digit1") this.blockType = BLOCK_GRASS;
      if (e.code === "Digit2") this.blockType = BLOCK_DIRT;
      if (e.code === "Digit3") this.blockType = BLOCK_STONE;
    });
    window.addEventListener("keyup", (e) => {
      if (!this.inputEnabled) return;
      this.keys.delete(e.code);
      if (e.code === "KeyW") this.moveState.forward = false;
      if (e.code === "KeyS") this.moveState.backward = false;
      if (e.code === "KeyA") this.moveState.left = false;
      if (e.code === "KeyD") this.moveState.right = false;
      if (e.code === "Space") this.moveState.jump = false;
    });
  }

  addLookDeltas(dx, dy) {
    this.yaw -= dx * this.lookSensitivity;
    this.pitch -= dy * this.lookSensitivity;
    const limit = Math.PI / 2 - 0.001;
    if (this.pitch > limit) this.pitch = limit;
    if (this.pitch < -limit) this.pitch = -limit;
  }

  getPosition() {
    return this.position;
  }

  getAimHit(maxDistance = 6) {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const origin = this.position
      .clone()
      .add(new THREE.Vector3(0, PLAYER_SETTINGS.eyeHeight, 0));
    return this.raycastVoxel(origin, dir, maxDistance);
  }

  setMouseLeft(down) {
    if (!this.inputEnabled) return;
    this.mouseLeftDown = down;
    if (!down) {
      this.breaking.active = false;
      if (this.mineAudio) {
        this.mineAudio.pause();
        try {
          this.mineAudio.currentTime = 0;
        } catch {}
      }
    }
  }

  setInputEnabled(enabled) {
    this.inputEnabled = enabled;
    if (!enabled) {
      this.moveState = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
      };
      this.keys.clear();
      this.mouseLeftDown = false;
      this.breaking.active = false;
      if (this.mineAudio) {
        this.mineAudio.pause();
        try {
          this.mineAudio.currentTime = 0;
        } catch {}
      }
      if (this.walkAudio) {
        this.walkAudio.pause();
        try {
          this.walkAudio.currentTime = 0;
        } catch {}
      }
    }
  }

  tryBreakBlock() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const hit = this.raycastVoxel(
      this.position
        .clone()
        .add(new THREE.Vector3(0, PLAYER_SETTINGS.eyeHeight, 0)),
      dir,
      6
    );
    if (hit && hit.hit) {
      this.world.setBlock(hit.voxel.x, hit.voxel.y, hit.voxel.z, BLOCK_AIR);
    }
  }

  tryPlaceBlock() {
    if (!this.inputEnabled) return;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const origin = this.position
      .clone()
      .add(new THREE.Vector3(0, PLAYER_SETTINGS.eyeHeight, 0));
    const hit = this.raycastVoxel(origin, dir, 6);
    if (hit && hit.hit) {
      const px = hit.voxel.x + hit.normal.x;
      const py = hit.voxel.y + hit.normal.y;
      const pz = hit.voxel.z + hit.normal.z;
      if (this.isInsidePlayerAABB(px, py, pz)) return;
      this.world.setBlock(px, py, pz, this.blockType);
    }
  }

  startPlaceDrag() {
    if (!this.inputEnabled) return;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const origin = this.position
      .clone()
      .add(new THREE.Vector3(0, PLAYER_SETTINGS.eyeHeight, 0));
    const hit = this.raycastVoxel(origin, dir, 6);
    if (hit && hit.hit) {
      this.placeDrag.active = true;
      this.placeDrag.normal = hit.normal.clone();
      this.placeDrag.anchor = new THREE.Vector3(
        hit.voxel.x + hit.normal.x,
        hit.voxel.y + hit.normal.y,
        hit.voxel.z + hit.normal.z
      );
      const n = this.placeDrag.normal;
      const f = dir.clone();
      let axis;
      if (Math.abs(n.x) === 1)
        axis = Math.abs(f.y) >= Math.abs(f.z) ? "y" : "z";
      else if (Math.abs(n.y) === 1)
        axis = Math.abs(f.x) >= Math.abs(f.z) ? "x" : "z";
      else axis = Math.abs(f.x) >= Math.abs(f.y) ? "x" : "y";
      this.placeDrag.axis = axis;
      const inv = this.world?.scene?.__drops?.inventory || null;
      const active = inv && inv.getActive ? inv.getActive() : null;
      if (this.world && this.world.scene && this.world.scene.__ghosts) {
        if (active && active.count > 0)
          this.world.scene.__ghosts.showPositions([
            {
              x: this.placeDrag.anchor.x,
              y: this.placeDrag.anchor.y,
              z: this.placeDrag.anchor.z,
            },
          ]);
        else this.world.scene.__ghosts.hideAll();
      }
    }
  }

  endPlaceDrag() {
    if (!this.placeDrag.active) return;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const origin = this.position
      .clone()
      .add(new THREE.Vector3(0, PLAYER_SETTINGS.eyeHeight, 0));
    const hit = this.raycastVoxel(origin, dir, 6);
    const axis = this.placeDrag.axis;
    let current;
    if (hit && hit.hit) {
      current = new THREE.Vector3(
        hit.voxel.x + hit.normal.x,
        hit.voxel.y + hit.normal.y,
        hit.voxel.z + hit.normal.z
      );
    } else {
      current = this.camera.position.clone();
    }
    const deltaCoord =
      axis === "x"
        ? current.x - this.placeDrag.anchor.x
        : axis === "y"
        ? current.y - this.placeDrag.anchor.y
        : current.z - this.placeDrag.anchor.z;
    const step = Math.sign(deltaCoord) || 1;
    const len = Math.min(10, Math.abs(Math.round(deltaCoord)));
    const positions = [];
    for (let i = 0; i <= len; i++) {
      const px = this.placeDrag.anchor.x + (axis === "x" ? i * step : 0);
      const py = this.placeDrag.anchor.y + (axis === "y" ? i * step : 0);
      const pz = this.placeDrag.anchor.z + (axis === "z" ? i * step : 0);
      positions.push({ x: px, y: py, z: pz });
    }
    if (this.world && this.world.scene && this.world.scene.__ghosts)
      this.world.scene.__ghosts.hideAll();
    // determine block type strictly from active hotbar item
    const inv = this.world?.scene?.__drops?.inventory || null;
    const active = inv && inv.getActive ? inv.getActive() : null;
    if (!active) {
      this.placeDrag.active = false;
      return;
    }
    const placeType = itemIdToBlockType(active.id);
    if (placeType == null || !active.count || active.count <= 0) {
      this.placeDrag.active = false;
      return;
    }
    const maxPlace = Math.min(positions.length, active.count);
    for (let i = 0; i < maxPlace; i++) {
      const p = positions[i];
      if (!this.isInsidePlayerAABB(p.x, p.y, p.z))
        this.world.setBlock(p.x, p.y, p.z, placeType);
    }
    inv.removeFromActive(maxPlace);
    this.placeDrag.active = false;
  }

  updatePlaceDragPreview() {
    if (!this.placeDrag.active) return;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const origin = this.position
      .clone()
      .add(new THREE.Vector3(0, PLAYER_SETTINGS.eyeHeight, 0));
    const hit = this.raycastVoxel(origin, dir, 6);
    const axis = this.placeDrag.axis;
    let current;
    if (hit && hit.hit) {
      current = new THREE.Vector3(
        hit.voxel.x + hit.normal.x,
        hit.voxel.y + hit.normal.y,
        hit.voxel.z + hit.normal.z
      );
    } else {
      current = this.camera.position.clone();
    }
    const deltaCoord =
      axis === "x"
        ? current.x - this.placeDrag.anchor.x
        : axis === "y"
        ? current.y - this.placeDrag.anchor.y
        : current.z - this.placeDrag.anchor.z;
    const step = Math.sign(deltaCoord) || 1;
    const len = Math.min(10, Math.abs(Math.round(deltaCoord)));
    const positions = [];
    for (let i = 0; i <= len; i++) {
      const px = this.placeDrag.anchor.x + (axis === "x" ? i * step : 0);
      const py = this.placeDrag.anchor.y + (axis === "y" ? i * step : 0);
      const pz = this.placeDrag.anchor.z + (axis === "z" ? i * step : 0);
      positions.push({ x: px, y: py, z: pz });
    }
    const inv = this.world?.scene?.__drops?.inventory || null;
    const active = inv && inv.getActive ? inv.getActive() : null;
    if (this.world && this.world.scene && this.world.scene.__ghosts) {
      if (active && active.count > 0)
        this.world.scene.__ghosts.showPositions(positions);
      else this.world.scene.__ghosts.hideAll();
    }
  }

  isInsidePlayerAABB(x, y, z) {
    const halfW = PLAYER_SETTINGS.width / 2;
    const min = new THREE.Vector3(
      this.position.x - halfW,
      this.position.y,
      this.position.z - halfW
    );
    const max = new THREE.Vector3(
      this.position.x + halfW,
      this.position.y + PLAYER_SETTINGS.height,
      this.position.z + halfW
    );
    return (
      x >= Math.floor(min.x) &&
      x <= Math.floor(max.x) &&
      y >= Math.floor(min.y) &&
      y <= Math.floor(max.y) &&
      z >= Math.floor(min.z) &&
      z <= Math.floor(max.z)
    );
  }

  raycastVoxel(origin, direction, maxDistance) {
    const step = new THREE.Vector3(
      Math.sign(direction.x),
      Math.sign(direction.y),
      Math.sign(direction.z)
    );
    const voxel = new THREE.Vector3(
      Math.floor(origin.x),
      Math.floor(origin.y),
      Math.floor(origin.z)
    );
    const tDelta = new THREE.Vector3(
      direction.x !== 0 ? Math.abs(1 / direction.x) : Number.POSITIVE_INFINITY,
      direction.y !== 0 ? Math.abs(1 / direction.y) : Number.POSITIVE_INFINITY,
      direction.z !== 0 ? Math.abs(1 / direction.z) : Number.POSITIVE_INFINITY
    );
    const boundX = voxel.x + (step.x > 0 ? 1 : 0);
    const boundY = voxel.y + (step.y > 0 ? 1 : 0);
    const boundZ = voxel.z + (step.z > 0 ? 1 : 0);
    const tMax = new THREE.Vector3(
      direction.x !== 0
        ? Math.abs((boundX - origin.x) / direction.x)
        : Number.POSITIVE_INFINITY,
      direction.y !== 0
        ? Math.abs((boundY - origin.y) / direction.y)
        : Number.POSITIVE_INFINITY,
      direction.z !== 0
        ? Math.abs((boundZ - origin.z) / direction.z)
        : Number.POSITIVE_INFINITY
    );
    let traveled = 0;
    while (traveled <= maxDistance) {
      let axis = 0; // 0=x,1=y,2=z
      if (tMax.x < tMax.y && tMax.x < tMax.z) axis = 0;
      else if (tMax.y < tMax.z) axis = 1;
      else axis = 2;
      if (axis === 0) {
        voxel.x += step.x;
        traveled = tMax.x;
        tMax.x += tDelta.x;
      } else if (axis === 1) {
        voxel.y += step.y;
        traveled = tMax.y;
        tMax.y += tDelta.y;
      } else {
        voxel.z += step.z;
        traveled = tMax.z;
        tMax.z += tDelta.z;
      }
      const normal = new THREE.Vector3(0, 0, 0);
      if (axis === 0) normal.set(-step.x, 0, 0);
      else if (axis === 1) normal.set(0, -step.y, 0);
      else normal.set(0, 0, -step.z);
      const b = this.world.getBlock(voxel.x, voxel.y, voxel.z);
      if (b && b !== BLOCK_AIR) {
        return { hit: true, voxel: voxel.clone(), normal, block: b };
      }
    }
    return { hit: false };
  }

  update(deltaSeconds) {
    const cos = Math.cos(this.yaw);
    const sin = Math.sin(this.yaw);
    const forward = new THREE.Vector3(-sin, 0, -cos).normalize();
    const right = new THREE.Vector3(cos, 0, -sin).normalize();
    let move = new THREE.Vector3(0, 0, 0);
    if (this.moveState.forward) move.add(forward);
    if (this.moveState.backward) move.sub(forward);
    if (this.moveState.left) move.sub(right);
    if (this.moveState.right) move.add(right);
    if (move.lengthSq() > 0) move.normalize();

    const acceleration = PLAYER_SETTINGS.speed;
    const sprint =
      this.keys.has("ShiftLeft") || this.keys.has("ShiftRight")
        ? PLAYER_SETTINGS.sprintMultiplier
        : 1;
    this.velocity.x += move.x * acceleration * sprint * deltaSeconds;
    this.velocity.z += move.z * acceleration * sprint * deltaSeconds;

    this.velocity.y -= PLAYER_SETTINGS.gravity * deltaSeconds;
    if (this.isOnGround && this.moveState.jump) {
      this.velocity.y = PLAYER_SETTINGS.jumpSpeed;
      this.isOnGround = false;
    }

    this.applyFriction(deltaSeconds);
    this.integrateWithCollisions(deltaSeconds);
    this.applyCamera();

    const wantMove =
      this.moveState.forward ||
      this.moveState.backward ||
      this.moveState.left ||
      this.moveState.right;
    if (this.isOnGround && wantMove) {
      if (this.walkAudio) this.walkAudio.play().catch(() => {});
    } else {
      if (this.walkAudio) {
        this.walkAudio.pause();
        try {
          this.walkAudio.currentTime = 0;
        } catch {}
      }
    }

    const aim = this.getAimHit(6);
    if (this.mouseLeftDown && aim && aim.hit) {
      if (!this.breaking.active || !this.sameTarget(aim)) {
        this.breaking = {
          active: true,
          target: aim.voxel.clone(),
          progress: 0,
          timeToBreak: 0.6,
        };
        if (this.mineAudio) this.mineAudio.play().catch(() => {});
        const svc = this.world.services || this.world.scene;
        if ((svc && svc.__highlighter) || (svc && svc.highlighter)) {
          const t = this.world.getBlock(aim.voxel.x, aim.voxel.y, aim.voxel.z);
          const tileIndex = faceTile(t, [0, 1, 0]);
          const hl = svc.highlighter || svc.__highlighter;
          hl.showBreakingPreview(
            aim.voxel.x,
            aim.voxel.y,
            aim.voxel.z,
            tileIndex
          );
        }
      } else {
        this.breaking.progress += deltaSeconds;
        const svc = this.world.services || this.world.scene;
        if (svc && (svc.particles || svc.__particles)) {
          const origin = new THREE.Vector3(
            aim.voxel.x + 0.5,
            aim.voxel.y + 0.5,
            aim.voxel.z + 0.5
          );
          // strong forward-biased dust while mining
          const dir = new THREE.Vector3();
          this.camera.getWorldDirection(dir);
          const ps = svc.particles || svc.__particles;
          ps.spawnDustDirected(origin, dir, 0xffffff, 90, deltaSeconds);
        }
        if (this.breaking.progress >= this.breaking.timeToBreak) {
          const blockType = this.world.getBlock(
            aim.voxel.x,
            aim.voxel.y,
            aim.voxel.z
          );
          this.world.setBlock(aim.voxel.x, aim.voxel.y, aim.voxel.z, BLOCK_AIR);
          this.spawnBreakParticles(
            aim.voxel.x + 0.5,
            aim.voxel.y + 0.5,
            aim.voxel.z + 0.5
          );
          const svc2 = this.world.services || this.world.scene;
          if (svc2 && (svc2.drops || svc2.__drops)) {
            const itemId = blockTypeToItemId
              ? blockTypeToItemId(blockType)
              : null;
            if (itemId)
              (svc2.drops || svc2.__drops).spawn(
                itemId,
                new THREE.Vector3(
                  aim.voxel.x + 0.5,
                  aim.voxel.y + 0.6,
                  aim.voxel.z + 0.5
                )
              );
          }
          this.breaking.active = false;
          if (this.mineAudio) {
            this.mineAudio.pause();
            try {
              this.mineAudio.currentTime = 0;
            } catch {}
          }
        }
      }
    } else {
      this.breaking.active = false;
      if (this.mineAudio) {
        this.mineAudio.pause();
        try {
          this.mineAudio.currentTime = 0;
        } catch {}
      }
      const svc = this.world.services || this.world.scene;
      if (svc && (svc.highlighter || svc.__highlighter))
        (svc.highlighter || svc.__highlighter).hide();
    }
  }

  sameTarget(aim) {
    const t = this.breaking.target;
    return (
      t && aim.voxel.x === t.x && aim.voxel.y === t.y && aim.voxel.z === t.z
    );
  }

  spawnBreakParticles(x, y, z) {
    if (this.world && this.world.scene && this.world.scene.__particles) {
      const c = 0xffffff;
      this.world.scene.__particles.spawnBurst(
        new THREE.Vector3(x, y, z),
        c,
        24
      );
    }
  }

  applyFriction(deltaSeconds) {
    const damping = Math.exp(-PLAYER_SETTINGS.damping * deltaSeconds);
    this.velocity.x *= damping;
    this.velocity.z *= damping;
  }

  integrateWithCollisions(deltaSeconds) {
    const halfW = PLAYER_SETTINGS.width / 2;
    this.position.y = Math.min(
      this.position.y,
      CHUNK_HEIGHT - PLAYER_SETTINGS.height - 0.001
    );
    this.position.x += this.velocity.x * deltaSeconds;
    if (this.intersectsSolid()) {
      this.position.x -= this.velocity.x * deltaSeconds;
      this.velocity.x = 0;
    }
    this.position.z += this.velocity.z * deltaSeconds;
    if (this.intersectsSolid()) {
      this.position.z -= this.velocity.z * deltaSeconds;
      this.velocity.z = 0;
    }
    this.position.y += this.velocity.y * deltaSeconds;
    const wasFalling = this.velocity.y < 0;
    if (this.intersectsSolid()) {
      this.position.y -= this.velocity.y * deltaSeconds;
      if (wasFalling) this.isOnGround = true;
      this.velocity.y = 0;
    } else {
      this.isOnGround = false;
    }
  }

  intersectsSolid() {
    const halfW = PLAYER_SETTINGS.width / 2;
    const minX = Math.floor(this.position.x - halfW);
    const maxX = Math.floor(this.position.x + halfW);
    const minY = Math.floor(this.position.y);
    const maxY = Math.floor(this.position.y + PLAYER_SETTINGS.height);
    const minZ = Math.floor(this.position.z - halfW);
    const maxZ = Math.floor(this.position.z + halfW);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const b = this.world.getBlock(x, y, z);
          if (isSolid(b)) return true;
        }
      }
    }
    return false;
  }

  applyCamera() {
    const eye = new THREE.Vector3(
      this.position.x,
      this.position.y + PLAYER_SETTINGS.eyeHeight,
      this.position.z
    );
    this.camera.position.copy(eye);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(this.yaw);
    this.camera.rotateX(this.pitch);
  }
}
