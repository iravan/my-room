// Uploaded-model guard: real GLBs pass with their stats; hostile or over-budget files are refused with a reason.
import { describe, expect, it } from "vitest";
import { checkModel, imageSize } from "./glb";

const png = (w: number, h: number) => {
  const b = new Uint8Array(24);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  return b;
};

// Minimal GLB: one triangle (3 positions), optional embedded PNG, any JSON overrides.
function glb(extra: Record<string, unknown> = {}, image?: Uint8Array) {
  const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const binParts = [new Uint8Array(pos.buffer), ...(image ? [image] : [])];
  const binLen = binParts.reduce((s, p) => s + p.length, 0), padded = Math.ceil(binLen / 4) * 4;
  const json: Record<string, unknown> = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: padded }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }, ...(image ? [{ buffer: 0, byteOffset: 36, byteLength: image.length }] : [])],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    nodes: [{ mesh: 0 }],
    scenes: [{ nodes: [0] }],
    ...(image ? { images: [{ bufferView: 1, mimeType: "image/png" }] } : {}),
    ...extra,
  };
  let text = JSON.stringify(json);
  while (text.length % 4) text += " ";
  const jsonBytes = new TextEncoder().encode(text), total = 12 + 8 + jsonBytes.length + 8 + padded;
  const out = new Uint8Array(total), v = new DataView(out.buffer);
  v.setUint32(0, 0x46546c67, true); v.setUint32(4, 2, true); v.setUint32(8, total, true);
  v.setUint32(12, jsonBytes.length, true); v.setUint32(16, 0x4e4f534a, true); out.set(jsonBytes, 20);
  const at = 20 + jsonBytes.length;
  v.setUint32(at, padded, true); v.setUint32(at + 4, 0x004e4942, true);
  let o = at + 8;
  for (const p of binParts) { out.set(p, o); o += p.length; }
  return out;
}

describe("model guard", () => {
  it("accepts a self-contained GLB and reports its stats", () => {
    expect(checkModel(glb({}, png(512, 256)))).toEqual({ triangles: 1, materials: 0, maxTexture: 512 });
  });

  it("refuses links to outside files", () => {
    expect(() => checkModel(glb({ buffers: [{ byteLength: 36, uri: "http://evil.example/x.bin" }] }))).toThrow(/outside files/);
    expect(() => checkModel(glb({ images: [{ uri: "../secret.png" }] }))).toThrow(/outside texture/);
  });

  it("refuses over-budget models", () => {
    expect(() => checkModel(glb({ accessors: [{ count: 600_000 }] }))).toThrow(/200,000 triangles; the limit is 150,000/);
    expect(() => checkModel(glb({ nodes: Array.from({ length: 150_001 }, () => ({ mesh: 0 })) }))).toThrow(/triangles/); // instancing counts
    expect(() => checkModel(glb({ materials: Array.from({ length: 17 }, () => ({})) }))).toThrow(/17 materials/);
    expect(() => checkModel(glb({}, png(4096, 4096)))).toThrow(/4096×4096 texture/);
    expect(() => checkModel(new Uint8Array(21 * 1024 * 1024))).toThrow(/limit is 20 MB/);
  });

  it("refuses compressed or unknown-format models and junk", () => {
    expect(() => checkModel(glb({ extensionsRequired: ["KHR_draco_mesh_compression"] }))).toThrow(/KHR_draco_mesh_compression/);
    expect(() => checkModel(glb({ asset: { version: "1.0" } }))).toThrow(/2\.0/);
    expect(() => checkModel(new TextEncoder().encode("hello"))).toThrow(/Not a GLB/);
    const cut = glb(); new DataView(cut.buffer).setUint32(8, cut.length + 100, true);
    expect(() => checkModel(cut)).toThrow(/cut short/);
  });

  it("reads PNG and JPEG sizes from headers", () => {
    expect(imageSize(png(300, 200))).toEqual([300, 200]);
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 17, 8, 0x01, 0x90, 0x02, 0x58, 3]);
    expect(imageSize(jpg)).toEqual([600, 400]);
  });
});
