import raw from "@/config/room-styles.json";
import { ITEMS } from "@/items/registry";
import { FINISHES, finishType } from "./options";

// config/room-styles.json: per room style, which variant and finishes each item uses by default.
// Resolution: the user's own choice in edit mode → this file → the item's first variant.
export type ItemMapping = { variant?: string; finishes?: Record<string, string> };
export type RoomStylesConfig = { default: string; styles: Record<string, { items: Record<string, ItemMapping> }> };
export const ROOM_STYLES = raw as RoomStylesConfig;

// Everything the config refers to must exist: a typo fails `npm test` instead of the room.
export function validateConfig(c: RoomStylesConfig, styleIds: string[]): string[] {
  const errors: string[] = [];
  if (!c.styles[c.default]) errors.push(`default style "${c.default}" isn't defined`);
  for (const id of styleIds) if (!c.styles[id]) errors.push(`style "${id}" has no entry`);
  for (const [style, s] of Object.entries(c.styles)) {
    if (!styleIds.includes(style)) errors.push(`unknown style "${style}"`);
    for (const [item, m] of Object.entries(s.items ?? {})) {
      const def = ITEMS[item];
      if (!def) { errors.push(`${style}: unknown item "${item}"`); continue; }
      if (m.variant && !def.variants.includes(m.variant)) errors.push(`${style}.${item}: unknown variant "${m.variant}" (has ${def.variants.join(", ")})`);
      for (const [slot, choice] of Object.entries(m.finishes ?? {})) {
        const choices = FINISHES[finishType(slot)];
        if (!choices) errors.push(`${style}.${item}: unknown part "${slot}"`);
        else if (!(choice in choices)) errors.push(`${style}.${item}.${slot}: unknown choice "${choice}"`);
      }
    }
  }
  return errors;
}

export const itemDefaults = (style: string, item: string): ItemMapping => ROOM_STYLES.styles[style]?.items?.[item] ?? {};
