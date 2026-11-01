import raw from "@/config/room-styles.json";
import { ITEMS } from "@/items/registry";
import { FINISHES, finishType } from "./options";
import { FLOOR_SETS, OUTSIDES } from "./styles";

// config/room-styles.json: the room styles — surfaces, light, view — and, per style, which look and finishes each
// item uses by default. Resolution: the user's own choice in edit mode → the item's entry here → the style's
// `finishes` (every item with that part) → the item's first look.
export type RGBIn = number[]; // sRGB 0–1: [r, g, b] or [r, g, b, k]
export type ItemMapping = { variant?: string; finishes?: Record<string, string> };
export type StyleConfig = {
  name: string; blurb: string; swatch: string[];
  room: { walls: RGBIn; ceiling: RGBIn; paintedWalls: boolean; floor: { set: string; tint: RGBIn; tile: number }; outside: string; exposure: number };
  light: { presets: { name: string; ambient: RGBIn; sun: number; window: RGBIn }[]; sun: RGBIn; window: RGBIn; fill: RGBIn; lamp: { light: RGBIn; shade: RGBIn } };
  neon: { a: RGBIn; b: RGBIn; glow: boolean };
  rug: { a: RGBIn; b: RGBIn };
  covers: RGBIn[];
  finishes?: Record<string, string>;
  items?: Record<string, ItemMapping>;
};
export type RoomStylesConfig = { default: string; styles: Record<string, StyleConfig> };
export const ROOM_STYLES = raw as RoomStylesConfig;

// Everything the config refers to must exist and every value must make sense: a typo fails `npm test`, not the room.
export function validateConfig(c: RoomStylesConfig, styleIds: string[]): string[] {
  const errors: string[] = [];
  if (!c.styles[c.default]) errors.push(`default style "${c.default}" isn't defined`);
  for (const id of styleIds) if (!c.styles[id]) errors.push(`style "${id}" has no entry`);
  const finishes = (where: string, f: Record<string, string> | undefined) => {
    for (const [slot, choice] of Object.entries(f ?? {})) {
      const choices = FINISHES[finishType(slot)];
      if (!choices) errors.push(`${where}: unknown part "${slot}"`);
      else if (!(choice in choices)) errors.push(`${where}.${slot}: unknown choice "${choice}"`);
    }
  };
  for (const [style, s] of Object.entries(c.styles)) {
    if (!styleIds.includes(style)) errors.push(`unknown style "${style}"`);
    const colour = (name: string, v: unknown) => {
      if (!Array.isArray(v) || (v.length !== 3 && v.length !== 4) || !v.every((x) => typeof x === "number" && x >= 0 && x <= 2))
        errors.push(`${style}.${name}: colour must be [r, g, b] or [r, g, b, k], 0–2`);
    };
    const { room, light } = s;
    if (!room || !light || !s.neon || !s.rug) { errors.push(`${style}: needs room, light, neon and rug`); continue; }
    if (typeof s.name !== "string" || typeof s.blurb !== "string") errors.push(`${style}: needs a name and a blurb`);
    if (!Array.isArray(s.swatch) || s.swatch.length !== 3) errors.push(`${style}.swatch: three CSS colours`);
    colour("room.walls", room.walls);
    colour("room.ceiling", room.ceiling);
    colour("room.floor.tint", room.floor?.tint);
    if (!FLOOR_SETS.includes(room.floor?.set as never)) errors.push(`${style}.room.floor.set: unknown "${room.floor?.set}" (has ${FLOOR_SETS.join(", ")})`);
    if (!(room.floor?.tile > 0)) errors.push(`${style}.room.floor.tile: must be > 0`);
    if (!OUTSIDES.includes(room.outside as never)) errors.push(`${style}.room.outside: unknown "${room.outside}" (has ${OUTSIDES.join(", ")})`);
    if (!(room.exposure > 0)) errors.push(`${style}.room.exposure: must be > 0`);
    if (light.presets?.length !== 3) errors.push(`${style}.light.presets: exactly three moods`);
    light.presets?.forEach((p, i) => { colour(`light.presets[${i}].ambient`, p.ambient); colour(`light.presets[${i}].window`, p.window); });
    for (const k of ["sun", "window", "fill"] as const) colour(`light.${k}`, light[k]);
    colour("light.lamp.light", light.lamp?.light);
    colour("light.lamp.shade", light.lamp?.shade);
    colour("neon.a", s.neon.a);
    colour("neon.b", s.neon.b);
    colour("rug.a", s.rug.a);
    colour("rug.b", s.rug.b);
    if (!s.covers?.length) errors.push(`${style}.covers: at least one duvet colour`);
    s.covers?.forEach((v, i) => colour(`covers[${i}]`, v));
    finishes(`${style}.finishes`, s.finishes);
    for (const [item, m] of Object.entries(s.items ?? {})) {
      const def = ITEMS[item];
      if (!def) { errors.push(`${style}: unknown item "${item}"`); continue; }
      if (m.variant && !def.variants.includes(m.variant)) errors.push(`${style}.${item}: unknown variant "${m.variant}" (has ${def.variants.join(", ")})`);
      finishes(`${style}.${item}`, m.finishes);
    }
  }
  return errors;
}

export const itemDefaults = (style: string, item: string): ItemMapping => ROOM_STYLES.styles[style]?.items?.[item] ?? {};

// Default finishes for an item in a style: the style's own, then the item's entry. Cached (read every frame).
const finishCache = new Map<string, Record<string, string>>();
export function finishDefaults(style: string, item: string): Record<string, string> {
  const key = `${style}/${item}`;
  let f = finishCache.get(key);
  if (!f) finishCache.set(key, (f = { ...ROOM_STYLES.styles[style]?.finishes, ...itemDefaults(style, item).finishes }));
  return f;
}
