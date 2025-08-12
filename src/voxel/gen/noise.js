import { createNoise2D, createNoise3D } from "simplex-noise";

export class NoiseSuite {
  constructor(seedRng) {
    this.n2a = createNoise2D(seedRng);
    this.n2b = createNoise2D(seedRng);
    this.n2c = createNoise2D(seedRng);
    this.n3a = createNoise3D(seedRng);
    this.n3b = createNoise3D(seedRng);
  }
  n2(x, z, scale = 1, which = "a") {
    const f = which === "b" ? this.n2b : which === "c" ? this.n2c : this.n2a;
    return f(x * scale, z * scale);
  }
  n3(x, y, z, scale = 1, which = "a") {
    const f = which === "b" ? this.n3b : this.n3a;
    return f(x * scale, y * scale, z * scale);
  }
}

export function fbm2(noise, x, z, { scale = 1, octaves = 4, lac = 2, gain = 0.5, which = "a" } = {}) {
  let amp = 1;
  let freq = scale;
  let sum = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise.n2(x, z, freq, which);
    amp *= gain;
    freq *= lac;
  }
  return sum;
}

export function ridged2(noise, x, z, { scale = 1, octaves = 4, lac = 2, gain = 0.5, which = "a" } = {}) {
  let amp = 1;
  let freq = scale;
  let sum = 0;
  for (let i = 0; i < octaves; i++) {
    const n = noise.n2(x, z, freq, which);
    sum += amp * (1 - Math.abs(n));
    amp *= gain;
    freq *= lac;
  }
  return sum * 2 - 1;
}


