// The item registry and config/room-styles.json must agree: every referenced style, item, variant and finish exists.
import { describe, expect, it } from "vitest";
import { ROOM_STYLES, validateConfig } from "./config";
import { ITEMS } from "@/items/registry";
import { STYLE_IDS } from "./styles";

describe("items + config", () => {
  it("config/room-styles.json is valid", () => {
    expect(validateConfig(ROOM_STYLES, STYLE_IDS)).toEqual([]);
  });

  it("catches typos in the config", () => {
    const bad = { default: "nope", styles: { cyber: { items: {
      bedd: {}, bed: { variant: "canopy", finishes: { wood: "oak", "glitter:Duvet": "pink" } },
    } } } };
    expect(validateConfig(bad, ["cyber", "coastal"])).toEqual([
      'default style "nope" isn\'t defined',
      'style "coastal" has no entry',
      'cyber: unknown item "bedd"',
      'cyber.bed: unknown variant "canopy" (has platform)',
      'cyber.bed.wood: unknown choice "oak"',
      'cyber.bed: unknown part "glitter:Duvet"',
    ]);
  });

  it("every item has a unique id, a name, a default variant, and wall items have a fixed home", () => {
    for (const d of Object.values(ITEMS)) {
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.variants[0]).toBeTruthy();
      if (d.onWall) expect(d.home).not.toBeNull();
    }
    expect(Object.keys(ITEMS).length).toBe(36); // jeans only appear on 70% of loads, so the in-game list may show 27
  });
});
