import * as THREE from "three";
import { srgb } from "./lighting";

// Room styles. A style sets the room's own surfaces, its three lighting moods (cycled by clicking the window),
// the lamp, what the neon strips become, the rug, the duvet colours, the view outside, and the default finish of
// every customisable part (an item's own choices in edit mode still win).
export type Outside = "city" | "country" | "sea";
export type Preset = { name: string; ambient: THREE.Color; sun: number; window: THREE.Color };
export type Style = {
  name: string;
  blurb: string;
  swatch: [string, string, string]; // CSS colours for the picker
  walls: THREE.Color;
  ceiling: THREE.Color;
  floor: { set: "dark_wooden_planks" | "grey_plaster" | "coated_pine"; tint: THREE.Color; tile: number };
  paintedWalls: boolean; // smooth paint (the plaster's relief, not its blotches) instead of raw plaster
  presets: [Preset, Preset, Preset];
  sunColor: THREE.Color;
  windowLight: THREE.Color; // colour of the daylight / city glow coming through the window
  fill: THREE.Color;
  lamp: { light: THREE.Color; shade: THREE.Color };
  // Neon strips: glowing accents (cyber), or plain trim in the given colour.
  neon: { a: THREE.Color; b: THREE.Color; glow: boolean };
  rug: { kind: "grid" | "woven"; a: [number, number, number]; b: [number, number, number] };
  covers: THREE.Color[];
  finishes: Record<string, string>; // finish slot or part type → choice (see FINISHES in options.ts)
  outside: Outside;
  // Light levels were tuned for the dark cyber walls; pale rooms reflect up to 20× more, so each style scales them.
  exposure: number;
};

const p = (name: string, ambient: THREE.Color, sun: number, window: THREE.Color): Preset => ({ name, ambient, sun, window });
const MAGENTA = srgb(1, 0.15, 0.75), CYAN = srgb(0.1, 0.9, 1);

export const STYLES = {
  cyber: {
    name: "Cyber Neon", blurb: "Magenta and cyan neon, a night city outside.", swatch: ["#38305c", "#ff40c0", "#1ae6ff"],
    walls: srgb(0.22, 0.2, 0.36), ceiling: srgb(0.22, 0.2, 0.36, 0.7), paintedWalls: false, floor: { set: "dark_wooden_planks", tint: srgb(0.6, 0.55, 0.7), tile: 2 },
    presets: [p("Neon Night", srgb(0.22, 0.17, 0.34), 0.3, srgb(1, 1, 1)), p("Synthwave Dusk", srgb(0.3, 0.16, 0.28), 0.7, srgb(1, 0.75, 0.85)), p("Blackout", srgb(0.1, 0.085, 0.17), 0, srgb(0.35, 0.3, 0.45))],
    sunColor: srgb(0.6, 0.5, 1), windowLight: srgb(0.6, 0.45, 1), fill: CYAN, lamp: { light: srgb(1, 0.3, 0.8), shade: MAGENTA },
    neon: { a: MAGENTA, b: CYAN, glow: true }, rug: { kind: "grid", a: [1, 0.15, 0.75], b: [0.02, 0, 0.05] },
    covers: [srgb(0.38, 0.24, 0.62), srgb(0.16, 0.46, 0.56), srgb(0.6, 0.16, 0.44), srgb(0.26, 0.26, 0.32)], finishes: {}, outside: "city", exposure: 1,
  },
  countryside: {
    name: "Countryside", blurb: "Farmhouse pine and cream, fields and hills outside.", swatch: ["#ebdcbc", "#8fae7c", "#c76b5a"],
    walls: srgb(0.92, 0.86, 0.74), ceiling: srgb(0.95, 0.92, 0.86), paintedWalls: true, floor: { set: "coated_pine", tint: srgb(1, 0.9, 0.78), tile: 1.2 },
    presets: [p("Golden Hour", srgb(0.52, 0.44, 0.36), 1.2, srgb(1, 0.92, 0.78)), p("Evening", srgb(0.3, 0.26, 0.3), 0.4, srgb(0.6, 0.55, 0.72)), p("Night", srgb(0.12, 0.11, 0.16), 0, srgb(0.28, 0.3, 0.45))],
    sunColor: srgb(1, 0.85, 0.65), windowLight: srgb(1, 0.85, 0.65), fill: srgb(1, 0.85, 0.65), lamp: { light: srgb(1, 0.75, 0.45), shade: srgb(1, 0.82, 0.58) },
    neon: { a: srgb(0.55, 0.42, 0.3), b: srgb(0.85, 0.8, 0.7), glow: false }, rug: { kind: "woven", a: [0.62, 0.18, 0.15], b: [0.9, 0.85, 0.74] },
    covers: [srgb(0.45, 0.58, 0.42), srgb(0.88, 0.82, 0.7), srgb(0.75, 0.4, 0.42), srgb(0.78, 0.6, 0.25)],
    finishes: { wood: "pine", "fabric:Headboard": "cream", "fabric:Sheets": "cream", "fabric:Throw": "rose", leather: "tan", metal: "white" }, outside: "country", exposure: 0.13,
  },
  vintage: {
    name: "Vintage 70s", blurb: "Mustard, rust and walnut, sunset over the city.", swatch: ["#bf8c52", "#8a4b2a", "#6f7a3a"],
    walls: srgb(0.75, 0.56, 0.34), ceiling: srgb(0.9, 0.84, 0.7), paintedWalls: true, floor: { set: "dark_wooden_planks", tint: srgb(0.9, 0.66, 0.46), tile: 2 },
    presets: [p("Sunset", srgb(0.5, 0.36, 0.26), 0.8, srgb(1, 0.72, 0.5)), p("Lamp Light", srgb(0.24, 0.18, 0.14), 0.2, srgb(0.7, 0.55, 0.5)), p("Late Night", srgb(0.1, 0.08, 0.08), 0, srgb(0.35, 0.3, 0.38))],
    sunColor: srgb(1, 0.7, 0.45), windowLight: srgb(1, 0.65, 0.4), fill: srgb(1, 0.7, 0.45), lamp: { light: srgb(1, 0.6, 0.3), shade: srgb(1, 0.65, 0.3) },
    neon: { a: srgb(0.35, 0.22, 0.14), b: srgb(0.6, 0.45, 0.25), glow: false }, rug: { kind: "woven", a: [0.55, 0.3, 0.15], b: [0.85, 0.6, 0.25] },
    covers: [srgb(0.78, 0.56, 0.16), srgb(0.62, 0.3, 0.16), srgb(0.42, 0.45, 0.2), srgb(0.86, 0.8, 0.68)],
    finishes: { "fabric:Headboard": "mustard", "fabric:Throw": "rust", leather: "tan", metal: "brass" }, outside: "city", exposure: 0.25,
  },
  scandinavian: {
    name: "Scandinavian", blurb: "White walls, pale wood, soft greys, a forest view.", swatch: ["#e6e6e0", "#c9b9a0", "#4a4a50"],
    walls: srgb(0.9, 0.9, 0.88), ceiling: srgb(0.95, 0.95, 0.94), paintedWalls: true, floor: { set: "coated_pine", tint: srgb(1.05, 1.02, 0.98), tile: 1.2 },
    presets: [p("Daylight", srgb(0.72, 0.72, 0.75), 1.5, srgb(1, 1, 1)), p("Overcast", srgb(0.48, 0.5, 0.54), 0.6, srgb(0.8, 0.84, 0.9)), p("Evening", srgb(0.17, 0.16, 0.19), 0.1, srgb(0.35, 0.38, 0.5))],
    sunColor: srgb(1, 0.97, 0.9), windowLight: srgb(0.9, 0.95, 1), fill: srgb(1, 0.95, 0.88), lamp: { light: srgb(1, 0.88, 0.7), shade: srgb(1, 0.95, 0.85) },
    neon: { a: srgb(0.85, 0.85, 0.83), b: srgb(0.85, 0.85, 0.83), glow: false }, rug: { kind: "woven", a: [0.3, 0.3, 0.32], b: [0.9, 0.9, 0.88] },
    covers: [srgb(0.86, 0.8, 0.68), srgb(0.14, 0.14, 0.16), srgb(0.5, 0.6, 0.5), srgb(0.7, 0.72, 0.76)],
    finishes: { wood: "pine", "fabric:Headboard": "charcoal", "fabric:Sheets": "cream", leather: "white", metal: "black" }, outside: "country", exposure: 0.15,
  },
  industrial: {
    name: "Industrial Loft", blurb: "Concrete, black steel, tan leather, warm bulbs.", swatch: ["#5e5d5c", "#1a1a1c", "#b06a35"],
    walls: srgb(0.42, 0.41, 0.4), ceiling: srgb(0.32, 0.32, 0.32), paintedWalls: false, floor: { set: "grey_plaster", tint: srgb(0.6, 0.6, 0.6), tile: 2 },
    presets: [p("City Night", srgb(0.2, 0.18, 0.18), 0.3, srgb(1, 0.85, 0.7)), p("Morning", srgb(0.48, 0.48, 0.5), 1, srgb(1, 1, 1)), p("Blackout", srgb(0.07, 0.07, 0.08), 0, srgb(0.3, 0.3, 0.35))],
    sunColor: srgb(0.9, 0.9, 1), windowLight: srgb(1, 0.8, 0.6), fill: srgb(1, 0.7, 0.4), lamp: { light: srgb(1, 0.62, 0.3), shade: srgb(1, 0.6, 0.25) },
    neon: { a: srgb(1, 0.55, 0.2), b: srgb(1, 0.65, 0.3), glow: true }, rug: { kind: "woven", a: [0.18, 0.18, 0.2], b: [0.6, 0.32, 0.18] },
    covers: [srgb(0.14, 0.14, 0.16), srgb(0.62, 0.3, 0.16), srgb(0.12, 0.16, 0.38), srgb(0.86, 0.8, 0.68)],
    finishes: { wood: "black", "fabric:Headboard": "charcoal", leather: "tan", metal: "black" }, outside: "city", exposure: 0.5,
  },
  japandi: {
    name: "Japandi", blurb: "Warm beige, light wood, paper-lantern glow, quiet hills.", swatch: ["#d1c2a8", "#8c9a7a", "#2e2e2e"],
    walls: srgb(0.82, 0.76, 0.66), ceiling: srgb(0.88, 0.84, 0.76), paintedWalls: true, floor: { set: "coated_pine", tint: srgb(1, 0.92, 0.8), tile: 1.2 },
    presets: [p("Morning", srgb(0.58, 0.56, 0.5), 1.2, srgb(1, 0.97, 0.9)), p("Dusk", srgb(0.32, 0.28, 0.3), 0.5, srgb(1, 0.8, 0.7)), p("Night", srgb(0.12, 0.11, 0.12), 0, srgb(0.3, 0.32, 0.42))],
    sunColor: srgb(1, 0.93, 0.8), windowLight: srgb(1, 0.92, 0.8), fill: srgb(1, 0.9, 0.75), lamp: { light: srgb(1, 0.8, 0.55), shade: srgb(1, 0.88, 0.7) },
    neon: { a: srgb(0.4, 0.33, 0.26), b: srgb(0.5, 0.42, 0.32), glow: false }, rug: { kind: "woven", a: [0.8, 0.72, 0.55], b: [0.25, 0.25, 0.24] },
    covers: [srgb(0.82, 0.74, 0.6), srgb(0.5, 0.58, 0.46), srgb(0.14, 0.14, 0.16), srgb(0.86, 0.8, 0.68)],
    finishes: { wood: "pine", "fabric:Headboard": "sand", "fabric:Sheets": "cream", leather: "black", metal: "black" }, outside: "country", exposure: 0.15,
  },
  coastal: {
    name: "Coastal", blurb: "Whitewashed wood, navy and sand, the sea outside.", swatch: ["#dae6f2", "#1f3a66", "#d8c6a0"],
    walls: srgb(0.86, 0.9, 0.95), ceiling: srgb(0.95, 0.96, 0.97), paintedWalls: true, floor: { set: "coated_pine", tint: srgb(1.1, 1.08, 1.05), tile: 1.2 },
    presets: [p("Sunny", srgb(0.74, 0.78, 0.86), 1.6, srgb(1, 1, 1)), p("Sunset", srgb(0.55, 0.42, 0.4), 0.7, srgb(1, 0.75, 0.6)), p("Night", srgb(0.1, 0.12, 0.18), 0, srgb(0.25, 0.3, 0.45))],
    sunColor: srgb(1, 0.97, 0.9), windowLight: srgb(0.85, 0.92, 1), fill: srgb(0.85, 0.92, 1), lamp: { light: srgb(1, 0.9, 0.75), shade: srgb(1, 0.95, 0.85) },
    neon: { a: srgb(0.9, 0.92, 0.95), b: srgb(0.9, 0.92, 0.95), glow: false }, rug: { kind: "woven", a: [0.12, 0.2, 0.4], b: [0.92, 0.9, 0.85] },
    covers: [srgb(0.2, 0.42, 0.62), srgb(0.84, 0.76, 0.6), srgb(0.9, 0.88, 0.82), srgb(0.12, 0.16, 0.38)],
    finishes: { wood: "white", "fabric:Headboard": "navy", "fabric:Sheets": "cream", "fabric:Throw": "sand", leather: "white", metal: "white" }, outside: "sea", exposure: 0.14,
  },
  academia: {
    name: "Dark Academia", blurb: "Deep green, walnut, burgundy and brass by candlelight.", swatch: ["#283d33", "#6b1f2a", "#b8954a"],
    walls: srgb(0.16, 0.25, 0.2), ceiling: srgb(0.2, 0.22, 0.2), paintedWalls: true, floor: { set: "dark_wooden_planks", tint: srgb(0.55, 0.42, 0.34), tile: 2 },
    presets: [p("Candlelight", srgb(0.17, 0.14, 0.12), 0.1, srgb(0.5, 0.55, 0.7)), p("Rainy Afternoon", srgb(0.36, 0.37, 0.39), 0.5, srgb(0.78, 0.82, 0.88)), p("Midnight", srgb(0.08, 0.08, 0.1), 0, srgb(0.3, 0.3, 0.4))],
    sunColor: srgb(0.8, 0.85, 1), windowLight: srgb(0.7, 0.75, 0.9), fill: srgb(1, 0.65, 0.35), lamp: { light: srgb(1, 0.62, 0.3), shade: srgb(1, 0.7, 0.35) },
    neon: { a: srgb(0.6, 0.48, 0.25), b: srgb(0.6, 0.48, 0.25), glow: false }, rug: { kind: "woven", a: [0.4, 0.08, 0.12], b: [0.7, 0.55, 0.28] },
    covers: [srgb(0.4, 0.08, 0.12), srgb(0.14, 0.32, 0.2), srgb(0.12, 0.16, 0.38), srgb(0.86, 0.8, 0.68)],
    finishes: { "fabric:Headboard": "forest", "fabric:Throw": "burgundy", leather: "red", metal: "brass" }, outside: "city", exposure: 1,
  },
} satisfies Record<string, Style>;

export type StyleId = keyof typeof STYLES;
export const STYLE_IDS = Object.keys(STYLES) as StyleId[];
export const styleOf = (id: string | undefined): Style => STYLES[(id ?? "cyber") as StyleId] ?? STYLES.cyber;
