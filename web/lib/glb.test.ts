// Uploaded-model guard: real GLBs pass with their stats; hostile or over-budget files are refused with a reason.
import { describe, expect, it } from "vitest";
import { checkModel, imageSize } from "./glb";
import { glb, png } from "./glb.fixture";

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
