import { describe, expect, it } from "vitest";
import { applyLook, kindOf, normalizeLibrary, useLibrary } from "./library";
import { useLayout } from "./room";

// The stores save to localStorage; tests get an in-memory one.
const mem = new Map<string, string>();
globalThis.localStorage ??= { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: () => null, length: 0 } as Storage;

describe("your library of looks", () => {
  it("saves an item's look and puts it on another item of the same kind, in one undo step", async () => {
    const L = useLayout.getState;
    L().setShell("poster-1", { asset: "abcd1234.glb", name: "Framed print", yaw: 1 });
    L().setOption("poster-1", "look", "print");
    const e = await useLibrary.getState().save("poster-1", "Framed print");
    expect(e).toMatchObject({ kind: "poster", options: { look: "print" }, model: { asset: "abcd1234.glb", yaw: 1 } });
    expect(kindOf("poster-2")).toBe(kindOf("poster-1"));
    const before = L().past.length;
    applyLook(e, "poster-2");
    expect(L().shells["poster-2"]?.name).toBe("Framed print");
    expect(L().options["poster-2"]).toEqual({ look: "print" });
    expect(L().past.length).toBe(before + 1);
    L().undo();
    expect(L().shells["poster-2"]).toBeUndefined();
  });

  it("cleans what's read back: bad entries dropped, visit-only models not kept", () => {
    expect(normalizeLibrary([
      { id: "0123abcd", name: "Mine", kind: "bed", options: { wood: "pine", "../x": "y" }, model: { asset: "visit:abcd1234.glb", name: "M", yaw: 0 } },
      { id: "nope", kind: "bed" },
      "junk",
    ])).toEqual([{ id: "0123abcd", name: "Mine", kind: "bed", options: { wood: "pine" } }]);
  });
});
