export function createPointerLock(targetElement, player) {
  let isLocked = false;
  let escDownAt = 0;
  const ESC_HOLD_MS = 600;
  function onMouseMove(e) {
    if (!isLocked) return;
    player.addLookDeltas(e.movementX, e.movementY);
  }
  function onPointerLockChange() {
    isLocked = document.pointerLockElement === targetElement;
    const help = document.getElementById("help");
    if (help) help.style.display = isLocked ? "none" : "flex";
  }
  function onPointerLockError() {}
  function requestLock() {
    targetElement.requestPointerLock();
  }
  function onMouseDown(e) {
    if (!isLocked) return;
    if (e.button === 0) player.setMouseLeft(true);
    if (e.button === 2) player.startPlaceDrag();
  }
  function onMouseUp(e) {
    if (!isLocked) return;
    if (e.button === 0) player.setMouseLeft(false);
    if (e.button === 2) player.endPlaceDrag();
  }
  function onContextMenu(e) {
    if (isLocked) e.preventDefault();
  }
  function onKeyDown(e) {
    if (e.code === "Escape") {
      escDownAt = performance.now();
    }
  }
  function onKeyUp(e) {
    if (e.code === "Escape") {
      const held = performance.now() - escDownAt;
      if (held < ESC_HOLD_MS) {
        queueMicrotask(() => {
          if (!document.pointerLockElement) requestLock();
        });
      } else {
        try {
          document.exitPointerLock?.();
        } catch {}
      }
    }
  }
  window.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onPointerLockChange);
  document.addEventListener("pointerlockerror", onPointerLockError);
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("contextmenu", onContextMenu);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  return { requestLock };
}
