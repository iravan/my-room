import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import type { Album } from "./collection";
import { getImage } from "./images";
import { hash, hsv, lerp, paint, perlin } from "./paint";

// Album artwork as textures: uploaded images (IndexedDB) when present, otherwise generated placeholders,
// so every album looks like something. Ports of Unity's Collection.Cover / Disc and the sleeve wear map.

const MAX = 2048; // huge images exhaust WebGL memory: downscale on load
const images = new Map<string, Promise<HTMLCanvasElement | null>>();

// Stored image → canvas (≤ 2048 px), cached per name; null if missing or unreadable.
function loadImage(name: string) {
  if (!images.has(name))
    images.set(name, getImage(name).then(async (blob) => {
      if (!blob) return null;
      const bmp = await createImageBitmap(blob);
      const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * k);
      c.height = Math.round(bmp.height * k);
      c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
      bmp.close();
      return c;
    }).catch(() => null));
  return images.get(name)!;
}

// Handled sleeve: a lighter ring where the record inside rubs, scuffed edges, faint fibre grain (0.5 = untouched;
// Unity applied it as a ×2 detail map, here it's baked into the sleeve texture).
function wear(u: number, v: number) {
  const r = Math.hypot(u - 0.5, v - 0.5) * 2;
  const ring = Math.exp(-(((r - 0.93) / 0.025) ** 2)) * 0.1;
  const edge = Math.exp(-Math.min(u, 1 - u, v, 1 - v) / 0.015) * 0.12;
  return 2 * (0.5 + ring + edge + (perlin(u * 40, v * 40) - 0.5) * 0.04);
}

function sample(img: ImageData, u: number, v: number) {
  const x = Math.min(img.width - 1, Math.max(0, Math.round(u * (img.width - 1))));
  const y = Math.min(img.height - 1, Math.max(0, Math.round((1 - v) * (img.height - 1))));
  const i = (y * img.width + x) * 4, d = img.data;
  return [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255];
}

function pixels(src: HTMLCanvasElement, size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(src, 0, 0, size, size);
  return ctx.getImageData(0, 0, size, size);
}

const cache = new Map<string, THREE.Texture>();
const cached = (key: string, make: () => THREE.Texture) => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key)!;
};

// Drop every decoded image / texture that came from a visited room (or a re-imported name).
export function forgetImages(match: (key: string) => boolean) {
  for (const k of [...images.keys()]) if (match(k)) images.delete(k);
  for (const [k, t] of [...cache]) if (match(k)) { t.dispose(); cache.delete(k); }
}

const hueOf = (a: Album) => (hash(a.id) & 0xffff) / 65535;

// Generated cover: a gradient with a sun (front) or fake tracklist lines (back).
function placeholder(a: Album, back: boolean, worn: boolean) {
  const hue = hueOf(a);
  return paint(128, 128, (u, v) => {
    const x = u * 127, y = v * 127, d = Math.hypot(x - 64, y - (back ? 64 : 80)) / 64;
    let c: number[] = hsv(hue, 0.55, 0.85 - y / 400);
    if (!back && d < 0.45) c = hsv((hue + 0.5) % 1, 0.5, 0.95);
    if (back) c = lerp(c, [0, 0, 0], 0.4 + (Math.floor(y / 12) % 2) * 0.1);
    const k = worn ? wear(u, v) : 1;
    return [c[0] * k, c[1] * k, c[2] * k];
  });
}

function fromImage(src: HTMLCanvasElement, worn: boolean) {
  if (!worn) {
    const t = new THREE.CanvasTexture(src);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const img = pixels(src, 512);
  return paint(512, 512, (u, v) => { const c = sample(img, u, v), k = wear(u, v); return [c[0] * k, c[1] * k, c[2] * k]; });
}

// Stored image `name` as a texture once it loads, `fallback` until then (or if there is none).
function useImageOr(name: string, fallback: THREE.Texture, worn: boolean) {
  const [loaded, setLoaded] = useState<{ name: string; tex: THREE.Texture }>();
  useEffect(() => {
    if (!name) return;
    let live = true;
    loadImage(name).then((c) => { if (live && c) setLoaded({ name, tex: cached(`img/${name}/${worn}`, () => fromImage(c, worn)) }); });
    return () => { live = false; };
  }, [name, worn]);
  return loaded && loaded.name === name ? loaded.tex : fallback;
}

// Front or back cover; `worn` for sleeves (ring wear), plain for spines.
export function useCover(a: Album, back = false, worn = true) {
  const generated = useMemo(() => cached(`${a.id}/${back}/${worn}`, () => placeholder(a, back, worn)), [a, back, worn]);
  return useImageOr(back ? a.backCover : a.frontCover, generated, worn);
}

// Gatefold inner art, or the back cover when there's none (as in Unity).
export function useGatefold(a: Album) {
  return useImageOr(a.gatefold, useCover(a, true), true);
}

// Vinyl: spindle hole, centre label (uploaded or the album's colour), then the disc colour, a splatter pattern,
// or the cover art (picture disc); fine groove shading; translucent discs carry alpha.
function discTexture(a: Album, label: HTMLCanvasElement | null, picture: HTMLCanvasElement | null) {
  const n = 256, seed = (hash(a.id) & 0xff) * 0.37, labelColor = hsv(hueOf(a), 0.4, 0.9);
  const lab = label && pixels(label, 128), pic = picture && pixels(picture, n);
  return paint(n, n, (u, v) => {
    const r = Math.hypot(u - 0.5, v - 0.5) * 2;
    if (r < 0.025) return [0, 0, 0, 1];
    if (r < 0.34) return [...(lab ? sample(lab, (u - 0.5) / 0.34 + 0.5, (v - 0.5) / 0.34 + 0.5) : labelColor), 1] as [number, number, number, number];
    let c: number[] = pic ? sample(pic, u, v) : a.discColor;
    if (a.discStyle === "splatter" && perlin(u * 9 + seed, v * 9 + seed) > 0.62) c = a.splatterColor;
    const g = 0.92 + 0.08 * Math.sin(r * 400);
    return [c[0] * g, c[1] * g, c[2] * g, a.discStyle === "translucent" ? 0.55 : 1];
  });
}

export function useDisc(a: Album) {
  const pictureName = a.discStyle === "picture" ? a.frontCover : ""; // generated covers don't make picture discs (as in Unity)
  const key = `${a.id}/${a.discStyle}/${a.discColor}/${a.splatterColor}`;
  const plain = useMemo(() => cached(`disc/${key}`, () => discTexture(a, null, null)), [a, key]);
  const [withImages, setWithImages] = useState<{ key: string; tex: THREE.Texture }>();
  useEffect(() => {
    if (!a.centerLabel && !pictureName) return;
    let live = true;
    const k = `${key}/${a.centerLabel}/${pictureName}`;
    Promise.all([a.centerLabel ? loadImage(a.centerLabel) : null, pictureName ? loadImage(pictureName) : null]).then(([l, p]) => {
      if (live) setWithImages({ key: k, tex: cached(`disc/${k}`, () => discTexture(a, l, p)) });
    });
    return () => { live = false; };
  }, [a, key, pictureName]);
  return withImages && withImages.key === `${key}/${a.centerLabel}/${pictureName}` ? withImages.tex : plain;
}

// Concentric grooves as a normal map: radial ripple, smooth gaps between tracks, flat label and rim.
let grooves: THREE.Texture | undefined;
export const grooveTexture = () => (grooves ??= paint(256, 256, (u, v) => {
  const dx = (u - 0.5) * 2, dy = (v - 0.5) * 2, r = Math.hypot(dx, dy);
  const flat = r < 0.36 || r > 0.97 || Math.abs(r - 0.55) < 0.012 || Math.abs(r - 0.7) < 0.012 || Math.abs(r - 0.84) < 0.012;
  const k = flat || r === 0 ? 0 : (Math.sin(r * Math.PI * 2 * 45) * 0.35) / r;
  return [dx * k * 0.5 + 0.5, dy * k * 0.5 + 0.5, 1];
}, { linear: true }));
