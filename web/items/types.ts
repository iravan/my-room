import type { ComponentType } from "react";
import type { Vec3 } from "@/lib/store";

// An item: something in the room with a place and behaviour. Its looks (variants) are interchangeable because they
// share the item's contract: where it stands, which walls it follows, what can rest on it, which parts take finishes.
export type ItemDef = {
  id: string;
  name: string;
  category: "furniture" | "gadget" | "decor" | "fixture" | "clutter" | "lighting";
  // Where it stands in the default 4 × 4 × 2.8 m room; null = rolled per load (clutter).
  home: { position: Vec3; rotationY?: number } | null;
  // Walls it follows when the room is resized (−1 left/back, +1 right/front). Clutter without walls follows the
  // nearest wall if it lands within 0.5 m of one.
  walls?: { x?: -1 | 1; z?: -1 | 1 };
  // Mounted on a wall: slides along it only (the axis held fixed).
  onWall?: "x" | "z";
  // Named points its variants must provide, e.g. "surface" (top things rest on), "platter", "screen".
  anchors?: string[];
  // Customisable parts (finish slots), e.g. "wood", "fabric:Duvet".
  parts?: string[];
  // Variant ids, first = the item's own default. Filled in as looks are added.
  variants: string[];
};

export type VariantDef = {
  item: string;
  id: string;
  name: string;
  anchors?: Record<string, number | Vec3>;
  Component: ComponentType;
};

export const defineItem = (d: ItemDef) => d;
export const defineVariant = (d: VariantDef) => d;
