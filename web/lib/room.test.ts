// Layout: untrusted poses are cleaned, and moving an item pivots about its own home, never the room's origin.
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { itemMatrix, normalizeLayout } from "./room";

describe("layout", () => {
  it("keeps good poses and clamps them inside the room", () => {
    const l = normalizeLayout({ bed: { position: [9, -1, 0.5], rotationY: 1, scale: 99 } });
    expect(l.bed).toEqual({ position: [2, 0, 0.5], rotationY: 1, scale: 4 });
  });

  it("drops junk: bad ids, missing or non-numeric positions, non-objects", () => {
    const l = normalizeLayout({ "../x": { position: [0, 0, 0] }, a: { position: [0, 0] }, b: "nope", c: { position: ["1", 0, 0] }, ok: { position: [0, 0, 0] } });
    expect(Object.keys(l)).toEqual(["c", "ok"]);
    expect(l.c.position).toEqual([0, 0, 0]); // non-numbers fall back, finite only
    expect(normalizeLayout(null)).toEqual({});
    expect(normalizeLayout([1, 2])).toEqual({});
  });

  it("is the identity at home and rotates about the item's own home point", () => {
    const home = { position: [-1.45, 0, -0.9] as [number, number, number] };
    expect(itemMatrix(home, undefined).equals(new THREE.Matrix4())).toBe(true);
    expect(itemMatrix(home, { position: home.position, rotationY: 0, scale: 1 }).equals(new THREE.Matrix4())).toBe(true);
    // turn the bed 90° in place: its home point stays put, a point 1 m toward +x ends up 1 m toward −z
    const m = itemMatrix(home, { position: home.position, rotationY: Math.PI / 2, scale: 1 });
    const p = new THREE.Vector3(...home.position).applyMatrix4(m);
    expect(p.distanceTo(new THREE.Vector3(...home.position))).toBeLessThan(1e-9);
    const q = new THREE.Vector3(-0.45, 0, -0.9).applyMatrix4(m);
    expect(q.distanceTo(new THREE.Vector3(-1.45, 0, -1.9))).toBeLessThan(1e-9);
  });

  it("respects a home yaw (the desk faces +x by default)", () => {
    const home = { position: [-1.68, 0, 1.35] as [number, number, number], rotationY: Math.PI / 2 };
    expect(itemMatrix(home, { position: home.position, rotationY: Math.PI / 2, scale: 1 }).equals(new THREE.Matrix4())).toBe(true);
  });
});
