"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useGame } from "@/lib/store";
import { CYAN, PRESETS } from "@/lib/lighting";
import { rng } from "@/lib/paint";
import { Metal, Neon } from "./Lighting";

// The view out of the window is real geometry, so it has depth and parallax: a sky dome, then three skyline
// layers at street, district and horizon distance, hazier the farther they are. The room is on a high floor:
// eye level (y 1.5) is ~30 m above the street. Opening in the back wall: x −1…0.4, y 1.05…2.05 (Room.tsx).
export const OPENING = { x0: -1, x1: 0.4, y0: 1.05, y1: 2.05 };
const EYE = 1.5, WALL = -2.1; // outer face of the back wall
const SKY_R = 900;

type Layer = {
  depth: number; halfWidth: number; below: number; above: number; // metres: distance behind the wall, extent around eye level
  pxPerM: number; width: [number, number]; gap: [number, number]; top: [number, number]; // building sizes, tops relative to eye
  haze: number; lit: number; signs: number;
  clear?: number; // metres either side of straight ahead kept low, so the view opens past the near block
};
const LAYERS: Layer[] = [
  { depth: 60, halfWidth: 150, below: 50, above: 35, pxPerM: 4, width: [16, 40], gap: [4, 14], top: [-28, 16], haze: 0.1, lit: 0.45, signs: 0.35, clear: 22 },
  { depth: 180, halfWidth: 360, below: 70, above: 90, pxPerM: 2.4, width: [18, 50], gap: [2, 14], top: [-30, 70], haze: 0.35, lit: 0.4, signs: 0.2 },
  { depth: 520, halfWidth: 1100, below: 160, above: 160, pxPerM: 0.93, width: [25, 70], gap: [0, 18], top: [-50, 130], haze: 0.62, lit: 0.35, signs: 0.1 },
];

const HAZE = [82, 26, 82]; // magenta city glow, rgb 0..255
const rgb = (c: number[], k = 1) => `rgb(${c.map((v) => Math.round(Math.min(255, v * k))).join(",")})`;
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
const LIGHTS = [[255, 205, 140], [255, 225, 170], [235, 240, 255], [120, 230, 255], [255, 80, 200]]; // warm mostly, some cool and neon

function texture(canvas: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// One skyline layer: buildings standing on the plane's bottom edge, floors of windows, some lit, rooftop neon
// and red aircraft lights; transparent above and between buildings so the farther layers show through.
function skyline(L: Layer, seed: number) {
  const r = rng(seed), R = (a: number, b: number) => a + r() * (b - a);
  const w = Math.min(2048, Math.round(L.halfWidth * 2 * L.pxPerM)), k = w / (L.halfWidth * 2), h = Math.round((L.below + L.above) * k);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const eyeY = L.above * k; // canvas y of eye level
  for (let x = R(0, 4) * k; x < w; ) {
    const bw = R(...L.width) * k, mid = (x + bw / 2) / k - L.halfWidth;
    const top = eyeY - (L.clear && Math.abs(mid) < L.clear ? R(-40, -22) : R(...L.top)) * k; // low-rise in the gap
    const body = mix(mix([18, 10, 30], [40, 22, 58], r()), HAZE, L.haze);
    g.fillStyle = rgb(body);
    g.fillRect(x, top, bw, h - top);
    // Windows: a grid per floor (3.2 m), ~1.3 m wide; a lit share, the rest dark glass, whole floors sometimes off.
    const floor = 3.2 * k, col = 2.6 * k, ww = Math.max(1, 1.3 * k), wh = Math.max(1, 1.6 * k);
    for (let fy = top + floor * 0.6; fy + wh < h; fy += floor) {
      const floorLit = r() < 0.8;
      for (let fx = x + col * 0.4; fx + ww < x + bw - col * 0.2; fx += col) {
        if (!floorLit || r() > L.lit) {
          g.fillStyle = rgb(mix(mix(body, [70, 80, 140], 0.35), HAZE, L.haze * 0.5)); // dark glass reflecting the sky
          g.fillRect(fx, fy, ww, wh);
          continue;
        }
        const light = LIGHTS[r() < 0.75 ? Math.floor(r() * 3) : 3 + Math.floor(r() * 2)];
        g.fillStyle = rgb(mix(light, HAZE, L.haze * 0.8), 0.55 + r() * 0.45);
        g.fillRect(fx, fy, ww, wh);
      }
    }
    if (r() < L.signs) { // rooftop neon sign
      g.fillStyle = rgb(mix(r() < 0.5 ? [40, 230, 255] : [255, 50, 190], HAZE, L.haze * 0.6));
      g.fillRect(x + bw * 0.15, top - Math.max(2, 1.2 * k), bw * 0.7, Math.max(1.5, 0.8 * k));
    }
    if (bw > 22 * k && r() < 0.5) { // antenna with a red light
      g.fillStyle = rgb(body);
      g.fillRect(x + bw / 2, top - 8 * k, Math.max(1, 0.4 * k), 8 * k);
      g.fillStyle = rgb(mix([255, 40, 40], HAZE, L.haze * 0.5));
      g.fillRect(x + bw / 2 - k * 0.4, top - 8.6 * k, Math.max(2, 1.2 * k), Math.max(2, 1.2 * k));
    }
    x += bw + R(...L.gap) * k;
  }
  // Haze thickens toward the bottom (street glow, distance)
  const fog = g.createLinearGradient(0, eyeY, 0, h);
  fog.addColorStop(0, `rgba(${HAZE},0)`);
  fog.addColorStop(1, `rgba(${HAZE},${0.35 + L.haze * 0.4})`);
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = fog;
  g.fillRect(0, 0, w, h);
  return texture(c);
}

// Equirectangular night sky: magenta city glow at the horizon fading to deep blue, stars, and the moon
// above the skyline in the window's direction.
function sky() {
  const w = 2048, h = 1024, c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!, el = (deg: number) => h / 2 - (deg / 180) * h; // canvas y of an elevation
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgb(3,3,14)");
  grad.addColorStop(el(55) / h, "rgb(8,6,26)");
  grad.addColorStop(el(18) / h, "rgb(34,12,58)");
  grad.addColorStop(el(4) / h, "rgb(120,30,110)");
  grad.addColorStop(0.5, "rgb(150,42,120)");
  grad.addColorStop(el(-8) / h, "rgb(60,18,70)");
  grad.addColorStop(1, "rgb(14,6,24)");
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const r = rng(3);
  for (let i = 0; i < 900; i++) {
    const y = el(12 + r() * 75), a = 0.25 + r() * 0.6;
    g.fillStyle = `rgba(230,225,255,${a})`;
    g.fillRect(r() * w, y, 1 + (r() < 0.1 ? 1 : 0), 1 + (r() < 0.1 ? 1 : 0));
  }
  // Moon toward −z (u ≈ 0.75 on three's sphere), 24° up, with a soft halo
  const mx = 0.73 * w, my = el(24);
  const halo = g.createRadialGradient(mx, my, 0, mx, my, 70);
  halo.addColorStop(0, "rgba(220,210,255,0.35)");
  halo.addColorStop(1, "rgba(220,210,255,0)");
  g.fillStyle = halo;
  g.fillRect(mx - 70, my - 70, 140, 140);
  g.fillStyle = "rgb(240,236,255)";
  g.beginPath();
  g.arc(mx, my, 9, 0, Math.PI * 2);
  g.fill();
  return texture(c);
}

function Outside() {
  const preset = useGame((s) => s.preset);
  const tint = PRESETS[preset].window;
  const [skyMap, layers] = useMemo(() => [sky(), LAYERS.map((L, i) => ({ L, map: skyline(L, 11 + i) }))], []);
  return (
    <>
      <mesh position={[-0.3, EYE, WALL]}>
        <sphereGeometry args={[SKY_R, 48, 24]} />
        <meshBasicMaterial map={skyMap} color={tint} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {layers.map(({ L, map }) => (
        <mesh key={L.depth} position={[-0.3, EYE + (L.above - L.below) / 2, WALL - L.depth]}>
          <planeGeometry args={[L.halfWidth * 2, L.above + L.below]} />
          <meshBasicMaterial map={map} color={tint} transparent alphaTest={0.02} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

// Frame round the opening on the room side, and the cyan sill strip.
export function CityWindow() {
  const { x0, x1, y0, y1 } = OPENING, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, wdt = x1 - x0, hgt = y1 - y0, z = -1.985;
  return (
    <>
      <Outside />
      <Metal position={[x0 - 0.025, cy, z]} size={[0.05, hgt + 0.1, 0.03]} />
      <Metal position={[x1 + 0.025, cy, z]} size={[0.05, hgt + 0.1, 0.03]} />
      <Metal position={[cx, y1 + 0.025, z]} size={[wdt, 0.05, 0.03]} />
      <Metal position={[cx, y0 - 0.025, z]} size={[wdt, 0.05, 0.03]} />
      <Metal position={[cx, cy, -2.05]} size={[0.03, hgt, 0.04]} />
      <Neon position={[cx, 1, -1.97]} size={[1.5, 0.02, 0.05]} color={CYAN} />
    </>
  );
}
