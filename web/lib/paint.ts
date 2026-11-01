import * as THREE from "three";

export type RGBA = [number, number, number, number?];

// Port of Unity's Paint(): f(u, v) per texel with v = 0 at the bottom, colours in gamma (sRGB) 0..1.
export function paint(w: number, h: number, f: (u: number, v: number) => RGBA, { nearest = false, repeat = false, linear = false } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b, a = 1] = f(x / (w - 1), y / (h - 1));
      img.data.set([r * 255, g * 255, b * 255, a * 255], ((h - 1 - y) * w + x) * 4);
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = linear ? THREE.NoColorSpace : THREE.SRGBColorSpace; // linear: data such as normal maps
  if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; }
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export const lerp = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * Math.min(1, Math.max(0, t)));

// Unity's Color.HSVToRGB (gamma-space RGB).
export function hsv(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number) => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [f(5), f(3), f(1)];
}

// 3×5 pixel digits, top row first; draws into a painted texture's canvas (x, y from the bottom-left like Unity).
const DIGITS = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001",
  "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];
export function drawText(t: THREE.CanvasTexture, s: string, x: number, y: number, scale: number, [r, g, b]: number[]) {
  const canvas = t.image as HTMLCanvasElement, ctx = canvas.getContext("2d")!;
  ctx.fillStyle = `rgb(${r * 255},${g * 255},${b * 255})`;
  const dot = (px: number, py: number) => ctx.fillRect(px, canvas.height - py - scale, scale, scale);
  for (const ch of s) {
    if (ch === ":") { dot(x, y + scale); dot(x, y + 3 * scale); x += 2 * scale; continue; }
    const glyph = DIGITS[+ch];
    for (let row = 0; row < 5; row++) for (let col = 0; col < 3; col++) if (glyph[row * 3 + col] === "1") dot(x + col * scale, y + (4 - row) * scale);
    x += 4 * scale;
  }
  t.needsUpdate = true;
}

// Deterministic PRNG for seeded textures (posters).
export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Classic 2D Perlin noise in 0..1 (like Unity's Mathf.PerlinNoise), fixed permutation.
const PERM = (() => {
  const r = rng(1), p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  return [...p, ...p];
})();
export function perlin(x: number, y: number) {
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h: number, dx: number, dy: number) => ((h & 1) ? -dx : dx) + ((h & 2) ? -dy : dy);
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, fx = x - Math.floor(x), fy = y - Math.floor(y), u = fade(fx), v = fade(fy);
  const a = PERM[X] + Y, b = PERM[X + 1] + Y;
  const l1 = grad(PERM[a], fx, fy) + u * (grad(PERM[b], fx - 1, fy) - grad(PERM[a], fx, fy));
  const l2 = grad(PERM[a + 1], fx, fy - 1) + u * (grad(PERM[b + 1], fx - 1, fy - 1) - grad(PERM[a + 1], fx, fy - 1));
  return Math.min(1, Math.max(0, (l1 + v * (l2 - l1)) * 0.7 + 0.5));
}

// Stable 32-bit hash of a string (FNV-1a): per-album hues and seeds.
export function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}
