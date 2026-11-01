import * as THREE from "three";
import raw from "@/config/room-styles.json";
import { srgb } from "./lighting";
import type { RGBIn, RoomStylesConfig, StyleConfig } from "./config";

// Room styles, defined in config/room-styles.json. A style sets the room's own surfaces, its three lighting moods
// (cycled by clicking the window), the lamp, what the neon strips become, the rug colours, the duvet colours, the
// view outside, and — per item — which look and finishes it uses by default (an item's own choices in edit mode win).
// Colours in the file are sRGB 0–1 (`[r, g, b]`, or `[r, g, b, k]` scaled by k); this turns them into three.js colours.
export type Outside = "city" | "country" | "sea";
export type FloorSet = "dark_wooden_planks" | "grey_plaster" | "coated_pine";
export const OUTSIDES: Outside[] = ["city", "country", "sea"];
export const FLOOR_SETS: FloorSet[] = ["dark_wooden_planks", "grey_plaster", "coated_pine"];
export type Preset = { name: string; ambient: THREE.Color; sun: number; window: THREE.Color };
export type Style = {
  name: string;
  blurb: string;
  swatch: string[]; // CSS colours for the picker
  walls: THREE.Color;
  ceiling: THREE.Color;
  floor: { set: FloorSet; tint: THREE.Color; tile: number };
  paintedWalls: boolean; // smooth paint (the plaster's relief, not its blotches) instead of raw plaster
  presets: Preset[];
  sunColor: THREE.Color;
  windowLight: THREE.Color; // colour of the daylight / city glow coming through the window
  fill: THREE.Color;
  lamp: { light: THREE.Color; shade: THREE.Color };
  // Neon strips: glowing accents (cyber), or plain trim in the given colour.
  neon: { a: THREE.Color; b: THREE.Color; glow: boolean };
  rug: { a: [number, number, number]; b: [number, number, number] };
  covers: THREE.Color[];
  outside: Outside;
  // Light levels were tuned for the dark cyber walls; pale rooms reflect up to 20× more, so each style scales them.
  exposure: number;
};

const col = (c: RGBIn) => srgb(c[0], c[1], c[2], c[3] ?? 1);
const rgb3 = (c: RGBIn): [number, number, number] => [c[0], c[1], c[2]];

function toStyle(c: StyleConfig): Style {
  const { room, light } = c;
  return {
    name: c.name, blurb: c.blurb, swatch: c.swatch,
    walls: col(room.walls), ceiling: col(room.ceiling), paintedWalls: room.paintedWalls,
    floor: { set: room.floor.set as FloorSet, tint: col(room.floor.tint), tile: room.floor.tile },
    outside: room.outside as Outside, exposure: room.exposure,
    presets: light.presets.map((p) => ({ name: p.name, ambient: col(p.ambient), sun: p.sun, window: col(p.window) })),
    sunColor: col(light.sun), windowLight: col(light.window), fill: col(light.fill), lamp: { light: col(light.lamp.light), shade: col(light.lamp.shade) },
    neon: { a: col(c.neon.a), b: col(c.neon.b), glow: c.neon.glow }, rug: { a: rgb3(c.rug.a), b: rgb3(c.rug.b) },
    covers: c.covers.map(col),
  };
}

const CONFIG = raw as RoomStylesConfig;
export type StyleId = string;
export const DEFAULT_STYLE: StyleId = CONFIG.default;
export const STYLES: Record<StyleId, Style> = Object.fromEntries(Object.entries(CONFIG.styles).map(([id, c]) => [id, toStyle(c)]));
export const STYLE_IDS: StyleId[] = Object.keys(STYLES);
export const styleOf = (id: string | undefined): Style => STYLES[id ?? DEFAULT_STYLE] ?? STYLES[DEFAULT_STYLE];
