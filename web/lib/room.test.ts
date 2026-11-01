// Layout: untrusted poses are cleaned, and moving an item pivots about its own home, never the room's origin.
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { itemMatrix, normalizeLayout, normalizeRoom, normalizeSize, placePoint, poseOf, restPosition, useLayout, HOMES } from "./room";

// The layout store saves to localStorage; tests get an in-memory one.
const mem = new Map<string, string>();
globalThis.localStorage ??= { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: () => null, length: 0 } as Storage;

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

  it("keeps wall fixtures on their wall, facing the room, and the window inside the wall", () => {
    const l = normalizeLayout({
      window: { position: [3, 1.6, 0.5], rotationY: 1, scale: 1.5 },
      "socket-desk": { position: [0, 0.4, -1], rotationY: 2, scale: 1 },
      door: { position: [0.4, 0, -1], rotationY: 0, scale: 1 },
    });
    expect(l.window.position[2]).toBe(-2); // stays in the back wall
    expect(l.window.rotationY).toBe(0);
    expect(l.window.position[0]).toBeCloseTo(2 - 0.7 * 1.5 - 0.05); // opening stays inside the wall
    expect(l["socket-desk"].position).toEqual([-2, 0.4, -1]); // slides along the left wall
    expect(l["socket-desk"].rotationY).toBe(0);
    expect(l.door.position).toEqual([0.4, 0, 2]);
  });

  it("moves a cable end with the socket it plugs into, and leaves other ends alone", () => {
    const items = normalizeLayout({ "socket-desk": { position: [-2, 0.3, 0.2], rotationY: 0, scale: 1 } });
    const plug = placePoint("socket-desk", [-1.99, 0.3, 1.2], items); // plug end, modelled at the socket's home
    expect(plug.toArray().map((v) => +v.toFixed(6))).toEqual([-1.99, 0.3, 0.2]);
    const pc = placePoint("desk", [-1.92, 0.35, 0.95], items); // desk not moved
    expect(pc.toArray()).toEqual([-1.92, 0.35, 0.95]);
  });

  it("cleans replaced looks: built-in items only, stored model names only, quarter turns", () => {
    const r = normalizeRoom({ shells: {
      desk: { asset: "1234abcd.glb", name: "My desk", yaw: 1 },
      bed: { asset: "../../evil.glb", name: "x" },
      "model-12345678": { asset: "1234abcd.glb" },
      chair: { asset: "abcd1234.glb", yaw: 7 },
    } }, "visit:");
    expect(r.shells).toEqual({ desk: { asset: "visit:1234abcd.glb", name: "My desk", yaw: 1 }, chair: { asset: "visit:abcd1234.glb", name: "Model", yaw: 0 } });
  });

  it("resizes the room: sizes clamped, furniture follows its walls, everything stays inside", () => {
    expect(normalizeSize({ w: 99, d: "x", h: 1 })).toEqual({ w: 8, d: 4, h: 2.4 });
    const big = { w: 6, d: 5, h: 3.2 };
    expect(restPosition("bed", HOMES.bed, big)).toEqual([-2.45, 0, -1.4]); // left + back walls moved out by 1 and 0.5
    expect(restPosition("closet", HOMES.closet, big)).toEqual([0.1, 0, 2.5]); // front wall only
    useLayout.setState({ size: { w: 4, d: 4, h: 2.8 }, items: {
      "poster-1": { position: [2, 1.65, 0.5], rotationY: 0, scale: 1 },  // on the right wall
      "model-0000aaaa": { position: [0, 0, 0], rotationY: 0, scale: 1 },  // middle of the room
      jeans: { position: [1.9, 0, -1.9], rotationY: 0, scale: 1 },        // in the back-right corner
    } });
    useLayout.getState().setSize(big);
    const it = useLayout.getState().items;
    expect(it["poster-1"].position).toEqual([2.995, 1.65, 0.5]); // stays 5 mm off the right wall, which moved out 1 m
    expect(it["model-0000aaaa"].position).toEqual([0, 0, 0]);
    expect(it.jeans.position).toEqual([2.9, 0, -2.4]);
    useLayout.getState().setSize({ w: 3, d: 3, h: 2.4 }); // shrinking keeps them inside
    const s = useLayout.getState().items;
    expect(s["poster-1"].position[0]).toBeCloseTo(1.495);
    expect(Math.abs(s.jeans.position[0]) <= 1.5 && Math.abs(s.jeans.position[2]) <= 1.5).toBe(true);
    useLayout.setState({ size: { w: 4, d: 4, h: 2.8 }, items: {} });
  });

  it("keeps a known style and falls back to cyber for anything else", () => {
    expect(normalizeRoom({ style: "coastal" }).style).toBe("coastal");
    expect(normalizeRoom({ style: "<script>" }).style).toBe("cyber");
    expect(normalizeRoom({}).style).toBe("cyber");
  });

  it("hides and shows items: ids only, undoable, deselects what it hides", () => {
    expect(normalizeRoom({ hidden: ["rug", "rug", "../x", 5, "desk"] }).hidden).toEqual(["desk", "rug"]);
    useLayout.setState({ hidden: [], selected: "bed", past: [] });
    useLayout.getState().setHidden("bed", true);
    expect(useLayout.getState()).toMatchObject({ hidden: ["bed"], selected: null });
    useLayout.getState().setHidden("rug", true);
    useLayout.getState().undo();
    expect(useLayout.getState().hidden).toEqual(["bed"]);
    useLayout.getState().showAll();
    expect(useLayout.getState().hidden).toEqual([]);
  });

  it("an item standing on another follows it until moved itself", () => {
    const size = { w: 4, d: 4, h: 2.8 };
    expect(poseOf("lamp", HOMES.lamp, { items: {}, size }).position).toEqual([-1.7, 0.54, 0.45]);
    // nightstand moved 1 m right and turned 90°: the lamp (at the nightstand's centre) goes with it
    const items = { nightstand: { position: [-0.7, 0, 0.45] as [number, number, number], rotationY: Math.PI / 2, scale: 1 } };
    const p = poseOf("lamp", HOMES.lamp, { items, size });
    expect(p.position.map((v) => +v.toFixed(6))).toEqual([-0.7, 0.54, 0.45]);
    expect(p.rotationY).toBeCloseTo(Math.PI / 2);
    // moved itself: stays put
    const own = { position: [0, 0.75, 1] as [number, number, number], rotationY: 0, scale: 1 };
    expect(poseOf("lamp", HOMES.lamp, { items: { ...items, lamp: own }, size })).toBe(own);
  });
});
