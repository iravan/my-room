import * as THREE from "three";

// Unity's colours were picked in gamma space: read as sRGB so the same numbers give the same look.
export const srgb = (r: number, g: number, b: number, k = 1) => new THREE.Color().setRGB(r * k, g * k, b * k, THREE.SRGBColorSpace);

export const CYAN = srgb(0.1, 0.9, 1);
export const MAGENTA = srgb(1, 0.15, 0.75);

type Preset = { name: string; ambient: THREE.Color; sun: number; window: THREE.Color };
export const PRESETS: Preset[] = [
  { name: "Neon Night", ambient: srgb(0.22, 0.17, 0.34), sun: 0.3, window: srgb(1, 1, 1) },
  { name: "Synthwave Dusk", ambient: srgb(0.3, 0.16, 0.28), sun: 0.7, window: srgb(1, 0.75, 0.85) },
  { name: "Blackout", ambient: srgb(0.1, 0.085, 0.17), sun: 0, window: srgb(0.35, 0.3, 0.45) }, // lights-out, but the room still reads
];
