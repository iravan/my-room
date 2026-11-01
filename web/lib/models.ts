import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { BudgetError, checkModel, LIMITS, type ModelStats } from "./glb";
import { uploadTarget } from "./budget";
import type { OptimizeReply } from "./optimize.worker";
import { getImage, putImage } from "./images";
import { useLayout } from "./room";
import { useGame } from "./store";

// Uploaded models: checked (glb.ts), parsed once, normalised to stand on the floor centred on their footprint,
// stored in IndexedDB and placed in front of the camera. Instances share the parsed template (cloned).
const templates = new Map<string, Promise<THREE.Object3D>>();

// glTF is Y-up in metres already. Centre the footprint on the origin and stand it on y = 0; a model whose size
// makes no sense for a room (exported in cm, or tiny) is rescaled to 60 cm. Lights inside models are dropped.
function normalise(scene: THREE.Object3D) {
  const lights: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if ((o as THREE.Light).isLight) lights.push(o);
    if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  for (const l of lights) l.removeFromParent();
  const box = new THREE.Box3().setFromObject(scene), size = box.getSize(new THREE.Vector3());
  const max = Math.max(size.x, size.y, size.z), k = max > 2.5 || max < 0.05 ? 0.6 / Math.max(max, 1e-6) : 1;
  const wrap = new THREE.Group();
  scene.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  wrap.add(scene);
  wrap.scale.setScalar(k);
  return wrap;
}

const parse = async (buf: ArrayBuffer) => normalise((await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buf, "")).scene);

// Bring a model under the limits in a worker (simplify, shrink textures, compress); the UI stays responsive.
function optimize(bytes: Uint8Array, maxTriangles: number) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const w = new Worker(new URL("./optimize.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<OptimizeReply>) => {
      w.terminate();
      if (e.data.ok) resolve(e.data.bytes); else reject(new Error(`Couldn't simplify that model (${e.data.error}).`));
    };
    w.onerror = () => { w.terminate(); reject(new Error("Couldn't simplify that model.")); };
    w.postMessage({ bytes, maxTriangles, maxTexture: LIMITS.texture });
  });
}

export function loadModel(asset: string) {
  if (!templates.has(asset))
    templates.set(asset, getImage(asset).then(async (blob) => {
      if (!blob) throw new Error("missing model file");
      return parse(await blob.arrayBuffer());
    }));
  return templates.get(asset)!;
}

// Check, parse and store an uploaded file; returns its stored name. Throws with a user-facing message.
export async function importModelFile(file: File): Promise<{ asset: string; name: string; stats: ModelStats; optimized?: { from: number } }> {
  if (!/\.(glb|gltf)$/i.test(file.name)) throw new Error("Choose a .glb (or self-contained .gltf) file.");
  if (file.size > LIMITS.bytes) throw new Error(`The model is ${(file.size / 1048576).toFixed(1)} MB; the limit is 20 MB.`);
  let bytes: Uint8Array = new Uint8Array(await file.arrayBuffer()), stats: ModelStats, optimized: { from: number } | undefined;
  const target = uploadTarget(LIMITS.triangles);
  try {
    stats = checkModel(bytes);
    if (stats.triangles > target) throw new BudgetError("over the room's budget");
  } catch (e) {
    if (!(e instanceof BudgetError)) throw e;
    // Too many triangles or too-big textures: simplify it rather than refuse (to fit the room's budget too).
    const from = checkModel(bytes, { budget: false }).triangles;
    bytes = await optimize(bytes, target);
    stats = checkModel(bytes);
    optimized = { from };
  }
  let template: THREE.Object3D;
  try { template = await parse(bytes.slice().buffer as ArrayBuffer); } catch { throw new Error("Couldn't read that model."); }
  const asset = `${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}.glb`;
  await putImage(asset, new Blob([bytes as BlobPart], { type: "model/gltf-binary" }));
  templates.set(asset, Promise.resolve(template));
  return { asset, name: file.name.replace(/\.(glb|gltf)$/i, ""), stats, optimized };
}

// Upload a model as free decor, placed in front of the camera.
export async function addModelFile(file: File) {
  const { asset, name, stats, optimized } = await importModelFile(file);
  // In front of the camera, on the floor, facing it.
  const { roomPos, yaw } = useGame.getState(), a = (yaw * Math.PI) / 180, fx = Math.sin(a), fz = -Math.cos(a);
  const clamp = (v: number) => Math.min(1.7, Math.max(-1.7, v));
  useLayout.getState().addModel(asset, name, {
    position: [clamp(roomPos[0] + fx * 1.2), 0, clamp(roomPos[2] + fz * 1.2)], rotationY: Math.atan2(-fx, -fz), scale: 1,
  });
  return { stats, optimized };
}
