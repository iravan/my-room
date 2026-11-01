// Port of Unity's CollectionChecks: saving, broken saves, image limits, sharing, hostile files, visitor mode.
import { beforeEach, describe, expect, it, vi } from "vitest";

// IndexedDB stand-in: images.ts keeps its real logic (size check, visit images) over an in-memory map.
const stored = new Map<string, Blob>();
vi.mock("./images", async (orig) => {
  const real = await orig<typeof import("./images")>();
  return {
    ...real,
    getImage: async (n: string) => (n.startsWith(real.VISIT) ? real.visitImages.get(n) : stored.get(n)),
    putImage: async (n: string, b: Blob) => void stored.set(n, b),
  };
});
vi.mock("sonner", () => ({ toast: Object.assign(() => {}, { success() {}, error() {}, warning() {} }) }));

const mem = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: () => null, length: 0,
} as Storage;

const { loadCollection, normalizeAlbum, useCollection, SAVE_KEY } = await import("./collection");
const { checkSize, MAX_IMAGE_BYTES } = await import("./images");
const { exportCollection, importShare, parseShare, visit, leaveVisit } = await import("./share");
const { useLayout } = await import("./room");
const { glb } = await import("./glb.fixture");
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));

beforeEach(() => {
  leaveVisit();
  mem.clear();
  stored.clear();
  useLayout.setState({ items: {}, options: {}, models: {}, past: [] });
  useCollection.setState({ albums: [], spinningId: "", visiting: false });
});
const load = () => useCollection.getState().load();
const albums = () => useCollection.getState().albums;

describe("collection", () => {
  it("first load seeds three albums, the first one spinning", () => {
    expect(load()).toBe("");
    expect(albums()).toHaveLength(3);
    expect(useCollection.getState().spinningId).toBe(albums()[0].id);
  });

  it("save/load round-trip keeps fields", () => {
    load();
    useCollection.getState().upsert({ ...albums()[0], language: "Cantonese", discColor: [1, 0, 0] });
    useCollection.setState({ albums: [] });
    load();
    expect(albums()[0]).toMatchObject({ language: "Cantonese", discColor: [1, 0, 0] });
  });

  it("a broken save is kept as .bak, replaced, and the user is warned", () => {
    mem.set(SAVE_KEY, "{ not json");
    expect(load()).toMatch(/couldn't be read/);
    expect(albums()).toHaveLength(3);
    expect(mem.get(SAVE_KEY + ".bak")).toBe("{ not json");
    expect(loadCollection(localStorage).warning).toBe(""); // the replacement save reads fine
  });

  it("Unity-format albums load (int disc style, {r,g,b,a} colours)", () => {
    const a = normalizeAlbum({ id: "u1", title: "From Unity", discStyle: 2, discColor: { r: 1, g: 0.5, b: 0, a: 1 } });
    expect(a).toMatchObject({ discStyle: "splatter", discColor: [1, 0.5, 0], artist: "Unknown Artist" });
  });

  it("oversized images are rejected", () => {
    expect(() => checkSize(MAX_IMAGE_BYTES + 1)).toThrow(/limit is 10 MB/);
    expect(() => checkSize(MAX_IMAGE_BYTES)).not.toThrow();
  });
});

describe("sharing", () => {
  it("export/import round-trip with images, merged by id", async () => {
    load();
    stored.set("cover.img", new Blob([new Uint8Array([1, 2, 3])]));
    useCollection.getState().upsert({ ...albums()[0], frontCover: "cover.img" });
    const json = await exportCollection();
    stored.clear();
    expect(await importShare(json)).toBe(3);
    expect(albums()).toHaveLength(3); // same ids replaced, not duplicated
    expect(new Uint8Array(await stored.get("cover.img")!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("hostile share files are neutralised", async () => {
    load();
    const json = JSON.stringify({
      albums: [{ id: "x", title: "Evil", frontCover: "/etc/passwd", backCover: "..\\..\\boot.ini" }, { id: "../../y" }],
      images: [{ name: "../escape.png", data: "AAAA" }, { name: "/abs.png", data: "AAAA" }, { name: "..", data: "AAAA" }, { name: "ok.png", data: "AAAA" }],
    });
    await importShare(json);
    expect([...stored.keys()]).toEqual(["ok.png"]);
    const x = albums().find((a) => a.id === "x")!;
    expect([x.frontCover, x.backCover]).toEqual(["passwd", "boot.ini"]);
    expect(albums().some((a) => a.id.includes("/"))).toBe(false);
    await expect(importShare("garbage")).rejects.toThrow();
    await expect(importShare('{"albums":[]}')).rejects.toThrow();
    expect(() => parseShare(JSON.stringify({ albums: [{}], images: [{ name: "big.png", data: "A".repeat(15 * 1024 * 1024) }] }))).toThrow(/limit is 10 MB/);
  });

  it("visiting never changes your own room", async () => {
    load();
    const before = mem.get(SAVE_KEY);
    const friend = JSON.stringify({ albums: [{ id: "f", title: "Friend", frontCover: "pic.png" }], images: [{ name: "pic.png", data: "AAAA" }], spinningId: "f" });
    expect(visit(friend)).toBe(1);
    expect(useCollection.getState()).toMatchObject({ visiting: true, spinningId: "f" });
    expect(albums()[0]).toMatchObject({ title: "Friend", frontCover: "visit:pic.png" });
    useCollection.getState().upsert({ ...albums()[0], title: "changed" });
    useCollection.getState().setSpinning("f");
    expect(mem.get(SAVE_KEY)).toBe(before); // save is a no-op while visiting
    expect(stored.size).toBe(0); // the friend's images never reach your storage
    await expect(importShare(friend)).rejects.toThrow(/leave the visit/);
    leaveVisit();
    expect(useCollection.getState().visiting).toBe(false);
    expect(albums()).toHaveLength(3);
    expect(albums()[0].title).toBe("Midnight Static");
  });

  it("shares the room too: layout, options and uploaded models, and a visit shows it without saving anything", async () => {
    load();
    stored.set("abcd1234.glb", new Blob([glb()]));
    useLayout.setState({ items: { bed: { position: [0, 0, 0.5], rotationY: 0, scale: 1 }, "model-0000aaaa": { position: [1, 0.75, 1], rotationY: 0, scale: 1 } },
      options: { bed: { size: "double" } }, models: { "model-0000aaaa": { asset: "abcd1234.glb", name: "Lamp" } } });
    const json = await exportCollection(), f = JSON.parse(json);
    expect(f.room.options.bed.size).toBe("double");
    expect(f.images.map((i: { name: string }) => i.name)).toContain("abcd1234.glb");
    // a friend's copy: visiting shows their room, prefixed model files, and writes nothing to your save
    useLayout.setState({ items: {}, options: {}, models: {} });
    const ownSave = mem.get("my-room-layout");
    visit(json);
    expect(useLayout.getState().models["model-0000aaaa"].asset).toBe("visit:abcd1234.glb");
    expect(useLayout.getState().items.bed.position).toEqual([0, 0, 0.5]);
    useLayout.getState().move("bed", { position: [1, 0, 1], rotationY: 0, scale: 1 }); // even a change during a visit
    expect(mem.get("my-room-layout")).toBe(ownSave);
    leaveVisit();
    expect(useLayout.getState().items).toEqual({});
  });

  it("refuses share files with a disallowed model", () => {
    const bad = (extra: Record<string, unknown>) => JSON.stringify({ albums: [{ id: "a" }], images: [{ name: "x1234567.glb", data: b64(glb(extra)) }] });
    expect(() => parseShare(bad({ buffers: [{ byteLength: 36, uri: "http://evil.example/x.bin" }] }))).toThrow(/model in it isn't allowed: .*outside files/);
    expect(() => parseShare(bad({ materials: Array.from({ length: 40 }, () => ({})) }))).toThrow(/40 materials/);
    expect(parseShare(bad({})).images).toHaveLength(1); // a clean model passes
  });
});
