import { NoiseSuite, fbm2, ridged2 } from "./noise.js";

export class TerrainPipeline {
  constructor(seedRng) {
    this.noise = new NoiseSuite(seedRng);
  }
  terrainHeight(x, z) {
    const cont = fbm2(this.noise, x, z, { scale: 0.0018, octaves: 3, gain: 0.5, lac: 2.2, which: "a" });
    const ridg = ridged2(this.noise, x, z, { scale: 0.008, octaves: 2, gain: 0.6, lac: 2.3, which: "b" });
    const eros = this.noise.n2(x, z, 0.003, "c");
    const base = 24;
    const h = base + cont * 18 + Math.abs(ridg) * (6 + 6 * Math.max(0, eros));
    return Math.max(4, Math.min(62, h));
  }
  density(x, y, z) {
    const th = this.terrainHeight(x, z);
    const depth = (y - th) / 6;
    const cheese = this.noise.n3(x, y, z, 0.05, "a");
    const caves = cheese - 0.3;
    return -depth - caves;
  }
}


