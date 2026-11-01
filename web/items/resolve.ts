import { useLayout } from "@/lib/room";
import { itemDefaults } from "@/lib/config";
import { ITEMS } from "./registry";
import { VARIANTS } from "./variants";
import type { VariantDef } from "./types";

// Which look an item shows: the user's pick in edit mode (option "look") → the room style's entry in
// config/room-styles.json → the item's first variant. Unknown ids fall through to the next.
export function variantId(item: string, s: { style: string; options: Record<string, Record<string, string>> } = useLayout.getState()) {
  const have = VARIANTS[item] ?? {};
  for (const id of [s.options[item]?.look, itemDefaults(s.style, item).variant, ITEMS[item]?.variants[0]]) if (id && have[id]) return id;
  return Object.keys(have)[0];
}
export const variantOf = (item: string): VariantDef | undefined => VARIANTS[item]?.[variantId(item)];

// React: the current look, re-rendering when the pick or the style changes.
export function useVariant(item: string): VariantDef | undefined {
  const pick = useLayout((s) => s.options[item]?.look), style = useLayout((s) => s.style);
  return VARIANTS[item]?.[variantId(item, { style, options: { [item]: { look: pick ?? "" } } })];
}
