// Runs in a Web Worker: bring an over-budget model under its triangle and texture limits, then compress it.
// weld + simplify (meshoptimizer) to the target triangle count, shrink textures over the limit (OffscreenCanvas),
// dedup/prune, then meshopt compression (quantised, EXT_meshopt_compression: three decodes it natively).
import { WebIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, simplify, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { checkModel } from "./glb";

export type OptimizeRequest = { bytes: Uint8Array; maxTriangles: number; maxTexture: number };
export type OptimizeReply = { ok: true; bytes: Uint8Array; before: number; after: number } | { ok: false; error: string };

async function shrink(data: Uint8Array, mime: string, max: number) {
  const bmp = await createImageBitmap(new Blob([data as BlobPart], { type: mime }));
  const k = max / Math.max(bmp.width, bmp.height);
  if (k >= 1) { bmp.close(); return null; }
  const c = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const type = mime === "image/png" ? "image/png" : "image/jpeg";
  return { data: new Uint8Array(await (await c.convertToBlob({ type, quality: 0.9 })).arrayBuffer()), type };
}

const triangles = (bytes: Uint8Array) => {
  try { return checkModel(bytes, { budget: false }).triangles; } catch { return Infinity; }
};

self.onmessage = async (e: MessageEvent<OptimizeRequest>) => {
  const { bytes, maxTriangles, maxTexture } = e.data;
  try {
    await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
    const io = new WebIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
      "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder,
    });
    const doc = await io.readBinary(bytes);
    const before = triangles(bytes);
    for (const tex of doc.getRoot().listTextures()) {
      const img = tex.getImage(), mime = tex.getMimeType();
      if (!img || (mime !== "image/png" && mime !== "image/jpeg")) continue;
      const small = await shrink(img, mime, maxTexture);
      if (small) { tex.setImage(small.data); tex.setMimeType(small.type); }
    }
    await doc.transform(dedup(), weld());
    // Simplify towards the target; allow more error if the first pass stops short.
    let out = await io.writeBinary(doc), now = triangles(out);
    for (const error of [0.01, 0.05, 0.2, 1]) {
      if (now <= maxTriangles) break;
      await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, (maxTriangles / now) * 0.97), error }));
      out = await io.writeBinary(doc);
      now = triangles(out);
    }
    await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
    out = await io.writeBinary(doc);
    const reply: OptimizeReply = { ok: true, bytes: out, before, after: triangles(out) };
    (self as unknown as Worker).postMessage(reply, [out.buffer]);
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, error: (err as Error).message } satisfies OptimizeReply);
  }
};
