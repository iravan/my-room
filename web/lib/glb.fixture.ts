// Test fixtures: tiny hand-built PNG headers and GLB files.

export const png = (w: number, h: number) => {
  const b = new Uint8Array(24);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  return b;
};

// Minimal GLB: one triangle (3 positions), optional embedded PNG, any JSON overrides.
export function glb(extra: Record<string, unknown> = {}, image?: Uint8Array) {
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
