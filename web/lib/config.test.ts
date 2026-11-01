// The item registry and config/room-styles.json must agree: every referenced style, item, variant and finish exists.
import { describe, expect, it } from "vitest";
import { finishDefaults, ROOM_STYLES, validateConfig } from "./config";
import { ITEMS } from "@/items/registry";
import { STYLE_IDS } from "./styles";

describe("items + config", () => {
  it("config/room-styles.json is valid", () => {
    expect(validateConfig(ROOM_STYLES, STYLE_IDS)).toEqual([]);
  });

  it("catches typos in the config", () => {
    const cyber = ROOM_STYLES.styles.cyber;
    const bad = { default: "nope", styles: { cyber: {
      ...cyber,
      room: { ...cyber.room, outside: "moon", floor: { ...cyber.room.floor, set: "lava" } },
      neon: { ...cyber.neon, a: [1, 0.2] },
      finishes: { metal: "unobtainium" },
      items: { bedd: {}, bed: { variant: "canopy", finishes: { wood: "oak", "glitter:Duvet": "pink" } } },
    } } };
    expect(validateConfig(bad, ["cyber", "coastal"])).toEqual([
      'default style "nope" isn\'t defined',
      'style "coastal" has no entry',
      'cyber.room.floor.set: unknown "lava" (has dark_wooden_planks, grey_plaster, coated_pine)',
      'cyber.room.outside: unknown "moon" (has city, country, sea)',
      'cyber.neon.a: colour must be [r, g, b] or [r, g, b, k], 0–2',
      'cyber.finishes.metal: unknown choice "unobtainium"',
      'cyber: unknown item "bedd"',
      'cyber.bed: unknown variant "canopy" (has platform)',
      'cyber.bed.wood: unknown choice "oak"',
      'cyber.bed: unknown part "glitter:Duvet"',
    ]);
  });

  it("an item's default finishes: the style's, then its own entry", () => {
    expect(finishDefaults("countryside", "bed")).toMatchObject({ wood: "pine", "fabric:Sheets": "cream" });
    expect(finishDefaults("cyber", "bed")).toEqual({});
  });

  it("every item has a unique id, a name, a default variant, and wall items have a fixed home", () => {
    for (const d of Object.values(ITEMS)) {
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.variants[0]).toBeTruthy();
      if (d.onWall) expect(d.home).not.toBeNull();
    }
    expect(Object.keys(ITEMS).length).toBe(40); // jeans only appear on 70% of loads, so the in-game list may show 27
  });

  it("every look an item lists is registered in items/variants.ts (items still on 'default' aren't moved yet)", async () => {
    const { VARIANTS } = await import("@/items/variants");
    for (const d of Object.values(ITEMS))
      for (const v of d.variants) if (v !== "default") expect(VARIANTS[d.id]?.[v], `${d.id}/${v}`).toBeTruthy();
  });
});
