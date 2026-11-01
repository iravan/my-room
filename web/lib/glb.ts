// Guard for uploaded 3D models, run on the raw bytes before anything is loaded: a GLB (or .gltf with embedded data)
// that stays inside the room's budget and never reaches outside the file. Pure byte/JSON work, so it's fast enough
// for the main thread even at 20 MB; throws an Error with a user-facing message.
export const LIMITS = { bytes: 20 * 1024 * 1024, triangles: 150_000, texture: 2048, materials: 16 };

// Extensions three's GLTFLoader handles without extra decoders. Draco/meshopt/KTX2/WebP are refused for now.
const SAFE_EXTENSIONS = new Set([
  "KHR_materials_emissive_strength", "KHR_materials_transmission", "KHR_materials_clearcoat", "KHR_materials_sheen",
  "KHR_materials_specular", "KHR_materials_ior", "KHR_materials_volume", "KHR_materials_unlit", "KHR_materials_iridescence",
  "KHR_materials_anisotropy", "KHR_texture_transform", "KHR_mesh_quantization", "KHR_lights_punctual",
  "EXT_meshopt_compression", // what our own optimiser writes; three decodes it
]);

type Json = {
  asset?: { version?: string };
  extensionsRequired?: string[];
  buffers?: { uri?: string; byteLength: number; extensions?: { EXT_meshopt_compression?: { fallback?: boolean } } }[];
  bufferViews?: { buffer: number; byteOffset?: number; byteLength: number }[];
  accessors?: { count: number }[];
  images?: { uri?: string; bufferView?: number; mimeType?: string }[];
  materials?: unknown[];
  meshes?: { primitives: { mode?: number; indices?: number; attributes: { POSITION?: number } }[] }[];
  nodes?: { mesh?: number }[];
};

export type ModelStats = { triangles: number; materials: number; maxTexture: number };

// Thrown when a model is fine except for its size budget: the optimiser can fix these (triangles, textures).
export class BudgetError extends Error {}

const fail = (msg: string): never => { throw new Error(msg); };
const decodeDataUri = (uri: string) => {
  const m = /^data:[^;,]*(;base64)?,([\s\S]*)$/.exec(uri) ?? fail("Broken embedded data in the model.");
  return m[1] ? Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(m[2]));
};

// Width × height from PNG/JPEG headers (no decoding).
export function imageSize(b: Uint8Array): [number, number] {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return [v.getUint32(16), v.getUint32(20)];
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length; ) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1], len = (b[i + 2] << 8) | b[i + 3];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc)
        return [(b[i + 7] << 8) | b[i + 8], (b[i + 5] << 8) | b[i + 6]];
      i += 2 + len;
    }
  }
  return fail("The model has a texture that isn't PNG or JPEG.");
}

// `budget: false` skips the triangle/texture limits (for measuring a model before optimising it).
export function checkModel(bytes: Uint8Array, { budget = true } = {}): ModelStats {
  if (bytes.byteLength > LIMITS.bytes) fail(`The model is ${(bytes.byteLength / 1048576).toFixed(1)} MB; the limit is 20 MB.`);
  let json: Json, bin: Uint8Array | undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength >= 20 && view.getUint32(0, true) === 0x46546c67) {
    if (view.getUint32(4, true) !== 2) fail("Only glTF 2.0 models are supported.");
    if (view.getUint32(8, true) > bytes.byteLength) fail("The model file is cut short.");
    const jsonLen = view.getUint32(12, true);
    if (view.getUint32(16, true) !== 0x4e4f534a || 20 + jsonLen > bytes.byteLength) fail("The model file is damaged.");
    json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLen)));
    const at = 20 + jsonLen;
    if (at + 8 <= bytes.byteLength && view.getUint32(at + 4, true) === 0x004e4942)
      bin = bytes.subarray(at + 8, at + 8 + view.getUint32(at, true));
  } else if (bytes[0] === 0x7b) {
    try { json = JSON.parse(new TextDecoder().decode(bytes)); } catch { return fail("Not a GLB or glTF model."); }
  } else return fail("Not a GLB or glTF model.");
  if (!json.asset?.version?.startsWith("2")) fail("Only glTF 2.0 models are supported.");

  const unsupported = (json.extensionsRequired ?? []).filter((e) => !SAFE_EXTENSIONS.has(e));
  if (unsupported.length) fail(`The model needs ${unsupported.join(", ")}, which isn't supported yet (compressed models come later).`);

  // Everything must be inside the file: no links to other files or the web.
  const buffers = (json.buffers ?? []).map((b, i) => {
    if (b.uri === undefined) {
      if (i === 0 && bin) return bin;
      if (b.extensions?.EXT_meshopt_compression?.fallback) return new Uint8Array(0); // placeholder for compressed data
      return fail("The model refers to data it doesn't contain.");
    }
    if (!b.uri.startsWith("data:")) fail("The model links to outside files; export it as a single .glb.");
    return decodeDataUri(b.uri);
  });
  let maxTexture = 0;
  for (const img of json.images ?? []) {
    let data: Uint8Array;
    if (img.uri !== undefined) {
      if (!img.uri.startsWith("data:")) fail("The model links to outside texture files; export it as a single .glb.");
      data = decodeDataUri(img.uri);
    } else {
      const bv = json.bufferViews?.[img.bufferView ?? -1] ?? fail("The model has a texture with no data.");
      const buf = buffers[bv.buffer] ?? fail("The model has a texture with no data.");
      data = buf.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
    }
    const [w, h] = imageSize(data);
    if (budget && Math.max(w, h) > LIMITS.texture) throw new BudgetError(`The model has a ${w}×${h} texture; the limit is ${LIMITS.texture} px.`);
    maxTexture = Math.max(maxTexture, w, h);
  }

  const materials = json.materials?.length ?? 0;
  if (materials > LIMITS.materials) fail(`The model has ${materials} materials; the limit is ${LIMITS.materials}.`);

  // Triangles: per primitive from its index or position count, times how many nodes use the mesh.
  const tris = (json.meshes ?? []).map((m) => m.primitives.reduce((s, p) => {
    const n = json.accessors?.[p.indices ?? p.attributes.POSITION ?? -1]?.count ?? 0, mode = p.mode ?? 4;
    return s + (mode === 4 ? n / 3 : mode === 5 || mode === 6 ? Math.max(0, n - 2) : 0);
  }, 0));
  const uses = (json.nodes ?? []).filter((n) => n.mesh !== undefined);
  const triangles = Math.round(uses.length ? uses.reduce((s, n) => s + (tris[n.mesh!] ?? 0), 0) : tris.reduce((a, b) => a + b, 0));
  if (budget && triangles > LIMITS.triangles) throw new BudgetError(`The model has ${triangles.toLocaleString()} triangles; the limit is ${LIMITS.triangles.toLocaleString()}.`);
  return { triangles, materials, maxTexture };
}
