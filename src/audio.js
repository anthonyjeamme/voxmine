export function createAudioEngine() {
  function clamp01(x) {
    return Math.max(0, Math.min(1, x));
  }
  function easeInQuad(t) {
    return t * t;
  }
  function easeOutQuad(t) {
    return t * (2 - t);
  }
  const themes = new Map();
  const themeNames = {
    overworld: "/musics/music1.mp3",
    dark_forest: "/musics/dark-forest.mp3",
  };
  let enabled = true;
  let baseVolume = 0.3;
  let currentName = null;
  let currentAudio = null;
  let targetName = null;
  let targetAudio = null;
  let fadeStartMs = 0;
  let fadeOutMs = 4000;
  let fadeInMs = 4000;
  let phase = "idle"; // idle | fading_out | fading_in

  function getAudioFor(name) {
    if (!themes.has(name)) {
      const a = new Audio(themeNames[name] || "");

      a.loop = true;
      a.volume = 0;
      themes.set(name, a);
    }
    return themes.get(name);
  }

  function setEnabled(v) {
    enabled = v;
    if (!enabled) {
      if (currentAudio) currentAudio.pause();
      if (targetAudio) targetAudio.pause();
      currentAudio = null;
      currentName = null;
      targetAudio = null;
      targetName = null;
      phase = "idle";
    }
  }

  function toggleEnabled() {
    setEnabled(!enabled);
  }

  function setTheme(name) {
    if (!enabled) return;
    if (currentName === name && phase === "idle") return;
    targetName = name;
    targetAudio = null; // will be created when needed
    const now = performance.now();
    if (!currentAudio) {
      targetAudio = getAudioFor(targetName);
      if (!targetAudio) return;
      targetAudio.volume = 0;
      targetAudio.play().catch(() => {});
      phase = "fading_in";
      fadeStartMs = now;
      return;
    }
    if (phase !== "fading_out") {
      phase = "fading_out";
      fadeStartMs = now;
    }
  }

  function setThemeForBiome(biome) {
    const target = biome === "dark_forest" ? "dark_forest" : "overworld";
    setTheme(target);
  }

  function setBaseVolume(v) {
    baseVolume = Math.max(0, Math.min(1, v));
    if (currentAudio) currentAudio.volume = baseVolume;
  }

  function update() {
    if (!enabled) return;
    const now = performance.now();
    if (phase === "fading_out" && currentAudio) {
      const k = clamp01((now - fadeStartMs) / fadeOutMs);
      const vol = baseVolume * (1 - easeOutQuad(k));
      currentAudio.volume = vol;
      if (k >= 1) {
        currentAudio.pause();
        try {
          currentAudio.currentTime = 0;
        } catch {}
        currentAudio = null;
        const desired = targetName || currentName;
        if (desired) {
          targetAudio = getAudioFor(desired);
          if (targetAudio) {
            targetAudio.volume = 0;
            targetAudio.play().catch(() => {});
            phase = "fading_in";
            fadeStartMs = now;
          } else {
            phase = "idle";
            currentName = desired;
          }
        } else {
          phase = "idle";
        }
      }
    } else if (
      phase === "fading_in" &&
      (targetAudio || currentAudio === null)
    ) {
      const k = clamp01((now - fadeStartMs) / fadeInMs);
      if (targetAudio) targetAudio.volume = baseVolume * easeInQuad(k);
      if (k >= 1) {
        currentAudio = targetAudio || currentAudio;
        currentName = targetName || currentName;
        targetAudio = null;
        targetName = null;
        phase = "idle";
      }
    }
  }

  return {
    setEnabled,
    toggleEnabled,
    setTheme,
    setThemeForBiome,
    setBaseVolume,
    update,
  };
}
