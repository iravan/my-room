// Daytime views for the window (countryside and sea), painted onto the same three layer planes as the city
// (60 m, 180 m, 520 m away) plus a ground plane 30 m below eye level (fields or water) that runs to the horizon.
// Shapes stand on the ground line of each layer, so near hills slide over far mountains as you move.
import * as THREE from "three";
import { rng } from "@/lib/paint";

export type LayerBox = { depth: number; halfWidth: number; below: number; above: number; pxPerM: number };
export const GROUND = 30; // metres below eye level

const rgb = (c: number[], a = 1) => `rgba(${c.map((v) => Math.round(Math.min(255, Math.max(0, v)))).join(",")},${a})`;
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

function canvasFor(L: LayerBox) {
  const w = Math.min(2048, Math.round(L.halfWidth * 2 * L.pxPerM)), k = w / (L.halfWidth * 2), h = Math.round((L.below + L.above) * k);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")!, w, h, k, groundY: (L.above + GROUND) * k };
}
function texture(c: HTMLCanvasElement, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// A ridge line: height above the ground (metres) along x, from a few sines.
function ridge(seed: number, base: number, amp: number) {
  const r = rng(seed), ph = [r() * 9, r() * 9, r() * 9], fq = [1 + r(), 2.5 + r() * 2, 6 + r() * 4];
  return (x: number) => base + amp * (0.55 * Math.sin(x * 0.004 * fq[0] + ph[0]) + 0.3 * Math.sin(x * 0.004 * fq[1] + ph[1]) + 0.15 * Math.sin(x * 0.004 * fq[2] + ph[2]) + 0.5);
}
function fillRidge(g: CanvasRenderingContext2D, w: number, h: number, k: number, groundY: number, hw: number, f: (x: number) => number, top: number[], bottom: number[]) {
  const grad = g.createLinearGradient(0, groundY - 80 * k, 0, groundY);
  grad.addColorStop(0, rgb(top));
  grad.addColorStop(1, rgb(bottom));
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(0, h);
  for (let px = 0; px <= w; px += 2) g.lineTo(px, groundY - f(px / k - hw) * k);
  g.lineTo(w, h);
  g.fill();
}
function tree(g: CanvasRenderingContext2D, x: number, base: number, size: number, leaf: number[], trunk: number[], pine: boolean) {
  g.fillStyle = rgb(trunk);
  g.fillRect(x - size * 0.06, base - size * 0.45, size * 0.12, size * 0.45);
  g.fillStyle = rgb(leaf);
  g.beginPath();
  if (pine) { g.moveTo(x, base - size * 1.25); g.lineTo(x - size * 0.4, base - size * 0.25); g.lineTo(x + size * 0.4, base - size * 0.25); }
  else { g.ellipse(x, base - size * 0.75, size * 0.42, size * 0.5, 0, 0, Math.PI * 2); }
  g.fill();
}

// Countryside: far blue mountains; mid rolling hills with fields, tree clumps and a farmhouse; near trees and a fence.
export function countryLayer(L: LayerBox, i: number, pines: boolean) {
  const { c, g, w, h, k, groundY } = canvasFor(L), r = rng(40 + i), hw = L.halfWidth;
  if (i === 2) {
    const f = ridge(41, 50, 110);
    fillRidge(g, w, h, k, groundY, hw, f, [120, 140, 175], [150, 165, 180]);
    fillRidge(g, w, h, k, groundY, hw, ridge(42, 15, 45), [95, 120, 120], [130, 150, 135]);
  } else if (i === 1) {
    const f = ridge(43, 6, 30);
    fillRidge(g, w, h, k, groundY, hw, f, [92, 130, 70], [120, 150, 80]);
    // field stripes following the hills
    for (let px = 0; px < w; px += 3) {
      const top = groundY - f(px / k - hw) * k;
      for (let band = 0; band < 5; band++) {
        const y0 = top + (groundY - top) * (band / 5), shade = (Math.floor(px / k / 70) + band) % 2 ? 1.08 : 0.92;
        g.fillStyle = rgb([110 * shade, 145 * shade, 75 * shade], 0.35);
        g.fillRect(px, y0, 3, (groundY - top) / 5);
      }
    }
    for (let n = 0; n < 40; n++) {
      const x = r() * w, base = groundY - f(x / k - hw) * k + 2;
      tree(g, x, base, (6 + r() * 6) * k, pines ? [40, 70, 50] : [55, 90, 45], [70, 50, 35], pines && r() < 0.7);
    }
    // farmhouse and barn near the middle, with warm windows
    const fx = w / 2 + 40 * k, fb = groundY - f(40) * k + 3;
    g.fillStyle = rgb([235, 225, 205]); g.fillRect(fx, fb - 7 * k, 12 * k, 7 * k);
    g.fillStyle = rgb([120, 60, 45]); g.beginPath(); g.moveTo(fx - k, fb - 7 * k); g.lineTo(fx + 6 * k, fb - 11 * k); g.lineTo(fx + 13 * k, fb - 7 * k); g.fill();
    g.fillStyle = rgb([255, 205, 120]); for (const dx of [2, 5, 8.5]) g.fillRect(fx + dx * k, fb - 5 * k, 1.4 * k, 1.6 * k);
    g.fillStyle = rgb([150, 45, 40]); g.fillRect(fx + 18 * k, fb - 9 * k, 14 * k, 9 * k);
    g.beginPath(); g.moveTo(fx + 17 * k, fb - 9 * k); g.lineTo(fx + 25 * k, fb - 14 * k); g.lineTo(fx + 33 * k, fb - 9 * k); g.fill();
  } else {
    const f = ridge(44, 0, 6);
    fillRidge(g, w, h, k, groundY, hw, f, [80, 115, 60], [95, 125, 65]);
    for (let n = 0; n < 26; n++) {
      const xm = (r() - 0.5) * 2 * hw;
      if (Math.abs(xm) < 20) continue; // keep the view open straight ahead
      const x = (xm + hw) * k;
      tree(g, x, groundY - f(xm) * k + 2, (9 + r() * 8) * k, pines ? [30, 60, 42] : [50, 85, 40], [65, 45, 30], pines && r() < 0.8);
    }
    // wooden fence along the near field
    g.strokeStyle = rgb([120, 95, 70]); g.lineWidth = Math.max(1, 0.25 * k);
    const fy = groundY - 1.2 * k;
    g.beginPath(); g.moveTo(0, fy); g.lineTo(w, fy); g.moveTo(0, fy + 0.6 * k); g.lineTo(w, fy + 0.6 * k); g.stroke();
    for (let x = 0; x < w; x += 3 * k) g.fillRect(x, fy - 0.3 * k, 0.25 * k, 1.5 * k);
  }
  return texture(c);
}

// Sea: far islands on the horizon; mid a lighthouse on its rock and a sailboat; near dunes and beach grass.
export function seaLayer(L: LayerBox, i: number) {
  const { c, g, w, k, groundY } = canvasFor(L), r = rng(60 + i), hw = L.halfWidth;
  if (i === 2) {
    for (let n = 0; n < 4; n++) {
      const cx = (r() - 0.3) * w, iw = (60 + r() * 160) * k, ih = (8 + r() * 30) * k;
      g.fillStyle = rgb(mix([110, 130, 150], [150, 170, 185], r()));
      g.beginPath(); g.ellipse(cx, groundY, iw / 2, ih, 0, Math.PI, 0); g.fill();
    }
  } else if (i === 1) {
    const lx = w / 2 + 120 * k; // lighthouse on a rock
    g.fillStyle = rgb([90, 90, 95]); g.beginPath(); g.ellipse(lx, groundY, 16 * k, 5 * k, 0, Math.PI, 0); g.fill();
    for (let s = 0; s < 4; s++) { g.fillStyle = rgb(s % 2 ? [190, 40, 40] : [240, 240, 235]); g.fillRect(lx - 2 * k, groundY - (4 + 4 * (s + 1)) * k, 4 * k, 4 * k); }
    g.fillStyle = rgb([255, 230, 150]); g.fillRect(lx - 1.6 * k, groundY - 22 * k, 3.2 * k, 2.5 * k);
    const bx = w / 2 - 60 * k, by = groundY; // sailboat
    g.fillStyle = rgb([60, 70, 90]); g.beginPath(); g.moveTo(bx - 5 * k, by - 1.5 * k); g.lineTo(bx + 5 * k, by - 1.5 * k); g.lineTo(bx + 3.5 * k, by); g.lineTo(bx - 3.5 * k, by); g.fill();
    g.fillStyle = rgb([245, 245, 240]); g.beginPath(); g.moveTo(bx, by - 13 * k); g.lineTo(bx, by - 2 * k); g.lineTo(bx + 4.5 * k, by - 2 * k); g.fill();
  } else {
    const f = ridge(61, 2, 6);
    fillRidge(g, w, canvasFor(L).h, k, groundY + 4 * k, hw, f, [215, 195, 150], [200, 180, 140]);
    for (let n = 0; n < 400; n++) {
      const xm = (r() - 0.5) * 2 * hw, x = (xm + hw) * k, base = groundY + 4 * k - f(xm) * k;
      g.strokeStyle = rgb([120, 140, 80], 0.8); g.lineWidth = Math.max(1, 0.15 * k);
      g.beginPath(); g.moveTo(x, base); g.lineTo(x + (r() - 0.5) * 1.5 * k, base - (1 + r() * 1.5) * k); g.stroke();
    }
  }
  return texture(c);
}

// Daytime sky dome (equirectangular): blue above, warm haze at the horizon, the sun low toward the window, soft clouds.
export function daySky(warm: boolean) {
  const w = 2048, h = 1024, c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!, el = (deg: number) => h / 2 - (deg / 180) * h;
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgb(40,85,170)");
  grad.addColorStop(el(30) / h, "rgb(90,140,210)");
  grad.addColorStop(el(6) / h, warm ? "rgb(240,205,160)" : "rgb(190,215,235)");
  grad.addColorStop(0.5, warm ? "rgb(250,215,170)" : "rgb(215,228,238)");
  grad.addColorStop(1, "rgb(120,130,140)");
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const r = rng(5);
  for (let n = 0; n < 60; n++) {
    const x = r() * w, y = el(8 + r() * 30), rw = 30 + r() * 90;
    g.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.25})`;
    g.beginPath(); g.ellipse(x, y, rw, rw * 0.25, 0, 0, Math.PI * 2); g.fill();
  }
  const sx = 0.76 * w, sy = el(14), halo = g.createRadialGradient(sx, sy, 0, sx, sy, 140);
  halo.addColorStop(0, warm ? "rgba(255,230,180,0.9)" : "rgba(255,250,235,0.8)");
  halo.addColorStop(1, "rgba(255,230,180,0)");
  g.fillStyle = halo;
  g.fillRect(sx - 140, sy - 140, 280, 280);
  g.fillStyle = "rgb(255,250,235)";
  g.beginPath(); g.arc(sx, sy, 14, 0, Math.PI * 2); g.fill();
  return texture(c);
}

// The ground from below the window to the horizon: a patchwork of fields, or the sea with sun glitter.
export function groundTexture(kind: "country" | "sea") {
  const n = 512, c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d")!, r = rng(kind === "sea" ? 70 : 71);
  if (kind === "sea") {
    g.fillStyle = "rgb(40,95,140)"; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,240" : "20,60,100"},${0.15 + r() * 0.3})`; g.fillRect(r() * n, r() * n, 2 + r() * 10, 1); }
  } else {
    for (let y = 0; y < n; y += 64) for (let x = 0; x < n; x += 64) {
      g.fillStyle = rgb(mix([95, 130, 65], [170, 160, 90], r() * 0.6));
      g.fillRect(x, y, 64, 64);
      g.fillStyle = "rgba(60,80,40,0.5)"; g.fillRect(x, y, 64, 2); g.fillRect(x, y, 2, 64); // hedgerows
    }
  }
  const t = texture(c, true);
  t.repeat.set(kind === "sea" ? 40 : 12, kind === "sea" ? 40 : 12);
  return t;
}
