// Options from saves or shared rooms: only known parts, choices and variants survive.
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { applyFinish, normalizeOptions } from "./options";

describe("options", () => {
  it("keeps known finishes and variants, drops the rest", () => {
    const o = normalizeOptions({
      bed: { size: "double", "fabric:Duvet": "rose", wood: "pine", "fabric:Throw": "plaid", glow: "on" },
      desk: { size: "double", metal: "brass" },
      "../x": { wood: "pine" },
    });
    expect(o).toEqual({ bed: { size: "double", "fabric:Duvet": "rose", wood: "pine" }, desk: { metal: "brass" } });
    expect(normalizeOptions("nope")).toEqual({});
  });

  it("applies a finish and restores the original exactly", () => {
    const map = new THREE.Texture(), m = new THREE.MeshStandardMaterial({ map, color: 0x336699, metalness: 0.3 });
    m.userData.finish = "wood";
    const before = m.color.getHex();
    applyFinish(m, "black");
    expect(m.map).toBeNull();
    expect(m.color.getHex()).not.toBe(before);
    applyFinish(m, undefined);
    expect(m.map).toBe(map);
    expect(m.color.getHex()).toBe(before);
    expect(m.metalness).toBe(0.3);
  });
});
