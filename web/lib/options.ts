import * as THREE from "three";
import { srgb } from "./lighting";
import { ITEMS } from "@/items/registry";

// Per-item options. Finishes are generic: every textured material says what it is (`wood`, `fabric`, `leather`,
// `metal`, optionally a named part like `fabric:Duvet`), and an item's options panel offers a choice per part it
// has. Variants are item-specific shapes (e.g. bed size).
type Choice = { label: string; color?: THREE.Color; set?: string; paint?: boolean; metal?: number; noVertexColors?: boolean };
export const FINISHES: Record<string, Record<string, Choice>> = {
  wood: {
    original: { label: "Walnut" },
    pine: { label: "Pine", set: "coated_pine", color: srgb(0.85, 0.8, 0.75) },
    black: { label: "Black", paint: true, color: srgb(0.06, 0.06, 0.07) },
    white: { label: "White", paint: true, color: srgb(0.82, 0.8, 0.78) },
  },
  fabric: {
    original: { label: "Original" },
    charcoal: { label: "Charcoal", color: srgb(0.14, 0.14, 0.16) },
    cream: { label: "Cream", color: srgb(0.86, 0.8, 0.68) },
    navy: { label: "Navy", color: srgb(0.12, 0.16, 0.38) },
    forest: { label: "Forest", color: srgb(0.14, 0.32, 0.2) },
    rose: { label: "Rose", color: srgb(0.78, 0.36, 0.46) },
    mustard: { label: "Mustard", color: srgb(0.78, 0.56, 0.16) },
    lilac: { label: "Lilac", color: srgb(0.58, 0.46, 0.82) },
    sage: { label: "Sage", color: srgb(0.5, 0.6, 0.5) },
    sand: { label: "Sand", color: srgb(0.82, 0.74, 0.6) },
    rust: { label: "Rust", color: srgb(0.62, 0.3, 0.16) },
    olive: { label: "Olive", color: srgb(0.42, 0.45, 0.2) },
    ocean: { label: "Ocean", color: srgb(0.2, 0.42, 0.62) },
    burgundy: { label: "Burgundy", color: srgb(0.4, 0.08, 0.12) },
  },
  leather: {
    original: { label: "Original" },
    black: { label: "Black", color: srgb(0.04, 0.04, 0.045), noVertexColors: true },
    tan: { label: "Tan", color: srgb(0.45, 0.28, 0.15), noVertexColors: true },
    white: { label: "White", color: srgb(0.8, 0.78, 0.75), noVertexColors: true },
    red: { label: "Red", color: srgb(0.5, 0.06, 0.08), noVertexColors: true },
  },
  metal: {
    original: { label: "Original" },
    black: { label: "Black", color: srgb(0.05, 0.05, 0.06) },
    white: { label: "White", color: srgb(0.85, 0.85, 0.85) },
    brass: { label: "Brass", color: srgb(0.85, 0.66, 0.36), metal: 1 },
  },
};

export const VARIANTS: Record<string, Record<string, { label: string; choices: Record<string, string> }>> = {
  bed: { size: { label: "Size", choices: { single: "Single (1 m)", double: "Double (1.4 m)" } } },
};

const KIND: Record<string, string> = {
  black_walnut_veneer_01: "wood", coated_pine: "wood", cotton_jersey: "fabric", knitted_fleece: "fabric",
  fabric_leather_02: "leather", metal_plate_02: "metal",
};
export const defaultFinish = (set: string) => KIND[set];
export const finishType = (slot: string) => slot.split(":")[0];
export const finishLabel = (slot: string) => slot.split(":")[1] ?? slot[0].toUpperCase() + slot.slice(1);

export type Options = Record<string, Record<string, string>>;
// Untrusted options → only known slots and choices.
export function normalizeOptions(raw: unknown): Options {
  const out: Options = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, o] of Object.entries(raw as Record<string, unknown>).slice(0, 500)) {
    if (!/^[\w-]{1,64}$/.test(id) || !o || typeof o !== "object") continue;
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (typeof v !== "string") continue;
      if (k === "look") { if (ITEMS[id]?.variants.includes(v)) clean[k] = v; continue; }
      const variant = VARIANTS[id]?.[k];
      if (variant ? v in variant.choices : /^[a-z]+(:[A-Za-z ]{1,24})?$/.test(k) && v in (FINISHES[finishType(k)] ?? {})) clean[k] = v;
    }
    if (Object.keys(clean).length) out[id] = clean;
  }
  return out;
}

// Textures for a finish that swaps the photo set (e.g. pine), loaded once.
const sets = new Map<string, THREE.Texture[]>();
function textures(set: string) {
  if (!sets.has(set)) {
    const loader = new THREE.TextureLoader();
    const ts = ["diff", "nor", "arm"].map((k) => loader.load(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/textures/${set}_${k}.jpg`));
    for (const t of ts) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
    ts[0].colorSpace = THREE.SRGBColorSpace;
    sets.set(set, ts);
  }
  return sets.get(set)!;
}

type Orig = Pick<THREE.MeshStandardMaterial, "map" | "normalMap" | "aoMap" | "roughnessMap" | "metalnessMap" | "vertexColors" | "metalness"> & { color: THREE.Color };
// Put a material into a finish choice (or back to how it was built). Cheap to call every frame: no-op when unchanged.
export function applyFinish(m: THREE.MeshStandardMaterial, value: string | undefined) {
  const slot = m.userData.finish as string | undefined;
  if (!slot || (m.userData.applied ?? "original") === (value ?? "original")) return;
  const orig = (m.userData.orig ??= { color: m.color.clone(), map: m.map, normalMap: m.normalMap, aoMap: m.aoMap, roughnessMap: m.roughnessMap, metalnessMap: m.metalnessMap, vertexColors: m.vertexColors, metalness: m.metalness } as Orig);
  const hadMap = !!m.map, hadVc = m.vertexColors;
  Object.assign(m, { map: orig.map, normalMap: orig.normalMap, aoMap: orig.aoMap, roughnessMap: orig.roughnessMap, metalnessMap: orig.metalnessMap, vertexColors: orig.vertexColors, metalness: orig.metalness });
  m.color.copy(orig.color);
  const c = value && value !== "original" ? FINISHES[finishType(slot)]?.[value] : undefined;
  if (c) {
    if (c.set) { const [map, nor, arm] = textures(c.set); Object.assign(m, { map, normalMap: nor, aoMap: arm, roughnessMap: arm, metalnessMap: arm }); }
    if (c.paint) m.map = null;
    if (c.color) m.color.copy(c.color);
    if (c.metal !== undefined) m.metalness = c.metal;
    if (c.noVertexColors) m.vertexColors = false;
  }
  if (hadMap !== !!m.map || hadVc !== m.vertexColors) m.needsUpdate = true;
  m.userData.applied = value ?? "original";
}
