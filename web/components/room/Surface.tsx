"use client";

import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Vec3 } from "@/lib/store";
import { defaultFinish } from "@/lib/options";

export type TextureSet =
  | "black_walnut_veneer_01" | "coated_pine" | "cotton_jersey" | "dark_wooden_planks"
  | "fabric_leather_02" | "grey_plaster" | "knitted_fleece" | "metal_plate_02";

export { srgb as tint } from "@/lib/lighting";

const DEG = Math.PI / 180;
// Unity Euler (degrees, left-handed) → three Euler for the z-mirrored room: x and y flip sign, order Z-X-Y.
export const unityEuler = ([x, y, z]: Vec3) => new THREE.Euler(-x * DEG, -y * DEG, z * DEG, "YXZ");

// Box UVs in real metres (`tile` metres per repeat) with a random offset per box, so a stretched box never
// stretches its texture and neighbouring boards don't share the same grain. Faces: +x −x +y −y +z −z, 4 verts each.
// `offset` pins the texture instead (in repeats), so neighbouring pieces of one wall line up seamlessly.
export function boxGeometry([sx, sy, sz]: Vec3, tile: number, offset?: [number, number]) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const spans: [number, number][] = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  const [ou, ov] = offset ?? [Math.random(), Math.random()];
  for (let i = 0; i < uv.count; i++) {
    const [su, sv] = spans[i >> 2];
    uv.setXY(i, uv.getX(i) * su / tile + ou, uv.getY(i) * sv / tile + ov);
  }
  return g;
}

// Texture coordinates from position: project along each vertex's dominant normal axis, `tile` metres per repeat.
export function projectUVs(g: THREE.BufferGeometry, tile: number) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ax >= ay && ax >= az ? [p.getZ(i), p.getY(i)] : ay >= az ? [p.getX(i), p.getZ(i)] : [p.getX(i), p.getY(i)];
    uv[i * 2] = u / tile;
    uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

export const rounded = (w: number, h: number, d: number, r: number, tile: number) => projectUVs(new RoundedBoxGeometry(w, h, d, 4, r), tile);

// Upholstery: a finely subdivided rounded box, welded, then reshaped by `deform` (metres in, metres out) for
// bolsters, dips and tapers; optional per-vertex tint (sRGB) for two-tone covers.
export function softBox(w: number, h: number, d: number, r: number, tile: number,
  deform: (x: number, y: number, z: number) => [number, number, number],
  tint?: (x: number, y: number, z: number) => THREE.Color) {
  // Even ~1.2 cm grid (three's RoundedBoxGeometry leaves each flat face as one big quad: nothing to bend or tint),
  // rounded by pushing every vertex out from an inner box by r.
  const seg = (v: number) => Math.max(2, Math.round(v / 0.012));
  let g: THREE.BufferGeometry = new THREE.BoxGeometry(w, h, d, seg(w), seg(h), seg(d));
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  const p0 = g.attributes.position, half = [w / 2 - r, h / 2 - r, d / 2 - r], v = new THREE.Vector3(), inner = new THREE.Vector3();
  for (let i = 0; i < p0.count; i++) {
    v.fromBufferAttribute(p0, i);
    inner.set(Math.max(-half[0], Math.min(half[0], v.x)), Math.max(-half[1], Math.min(half[1], v.y)), Math.max(-half[2], Math.min(half[2], v.z)));
    v.sub(inner).normalize().multiplyScalar(r).add(inner);
    p0.setXYZ(i, v.x, v.y, v.z);
  }
  g = mergeVertices(g);
  const p = g.attributes.position, col = tint && new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    if (col) { const c = tint!(x, y, z); col.set([c.r, c.g, c.b], i * 3); }
    p.setXYZ(i, ...deform(x, y, z));
  }
  if (col) g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return projectUVs(g, tile);
}

// Unity's capsule (radius 0.5, height 2) with its scale baked in; with `tile`, UVs stretched to roughly
// metres (u round the girth, v along the length).
function capsuleGeometry([sx, sy, sz]: Vec3, tile?: number) {
  const g = new THREE.CapsuleGeometry(0.5, 1, 6, 16);
  g.scale(sx, sy, sz);
  if (tile) {
    const uv = g.attributes.uv as THREE.BufferAttribute, girth = (Math.PI * (sx + sz)) / 2, length = 2 * sy;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * girth) / tile, (uv.getY(i) * length) / tile);
  }
  return g;
}

// Poly Haven ARM packs AO/roughness/metalness in R/G/B, which is exactly what three reads from
// aoMap (R), roughnessMap (G) and metalnessMap (B), so one texture feeds all three. Textures are cached
// per set; each mesh gets its own material so its colour can change in place.
// `grainOnly`: keep the photo's relief and roughness but not its colour (e.g. dyed leather in any colour).
// `finish`: which customisable part this is (default from the photo set: wood, fabric, leather, metal; or e.g. "fabric:Duvet").
export function PbrMaterial({ set, color, metal = 1, side, vertexColors, grainOnly, finish }: { set: TextureSet; color: THREE.Color; metal?: number; side?: THREE.Side; vertexColors?: boolean; grainOnly?: boolean; finish?: string }) {
  const [map, normalMap, arm] = useTexture(
    ["diff", "nor", "arm"].map((k) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/textures/${set}_${k}.jpg`),
    (ts) => {
      for (const t of ts) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 8;
      }
      ts[0].colorSpace = THREE.SRGBColorSpace;
    },
  );
  return <meshStandardMaterial map={grainOnly ? null : map} normalMap={normalMap} aoMap={arm} roughnessMap={arm} metalnessMap={arm} metalness={metal} color={color} side={side} vertexColors={vertexColors} userData={{ finish: finish ?? defaultFinish(set) }} />;
}

function useEuler(r?: Vec3) {
  const [x, y, z] = r ?? [0, 0, 0];
  return useMemo(() => unityEuler([x, y, z]), [x, y, z]);
}

type Placed = { position: Vec3; rotation?: Vec3; cast?: boolean };

export function Slab({ set, tile, size, position, color, metal = 1, rotation, cast = true, offset, grainOnly }: Placed & {
  set: TextureSet; tile: number; size: Vec3; color: THREE.Color; metal?: number; offset?: [number, number]; grainOnly?: boolean;
}) {
  const [sx, sy, sz] = size, [ou, ov] = offset ?? [NaN, NaN];
  const geometry = useMemo(() => boxGeometry([sx, sy, sz], tile, Number.isNaN(ou) ? undefined : [ou, ov]), [sx, sy, sz, tile, ou, ov]);
  const euler = useEuler(rotation);
  return (
    <mesh geometry={geometry} position={position} rotation={euler} castShadow={cast} receiveShadow>
      <PbrMaterial set={set} color={color} metal={metal} grainOnly={grainOnly} />
    </mesh>
  );
}

export function PbrCapsule({ set, tile, scale, position, color, metal = 1, rotation, cast = true }: Placed & {
  set: TextureSet; tile: number; scale: Vec3; color: THREE.Color; metal?: number;
}) {
  const [sx, sy, sz] = scale;
  const geometry = useMemo(() => capsuleGeometry([sx, sy, sz], tile), [sx, sy, sz, tile]);
  const euler = useEuler(rotation);
  return (
    <mesh geometry={geometry} position={position} rotation={euler} castShadow={cast} receiveShadow>
      <PbrMaterial set={set} color={color} metal={metal} />
    </mesh>
  );
}

// Untextured part (Unity's plain Standard primitives): box by default, or capsule/cylinder at Unity sizes.
export function Part({ size, position, color, rotation, gloss = 0.25, shape = "box", cast = true }: Placed & {
  size: Vec3; color: THREE.Color; gloss?: number; shape?: "box" | "capsule" | "cylinder";
}) {
  const [sx, sy, sz] = size;
  const geometry = useMemo(() => {
    if (shape === "capsule") return capsuleGeometry([sx, sy, sz]);
    if (shape === "cylinder") return new THREE.CylinderGeometry(0.5, 0.5, 2, 24).scale(sx, sy, sz);
    return new THREE.BoxGeometry(sx, sy, sz);
  }, [shape, sx, sy, sz]);
  const euler = useEuler(rotation);
  return (
    <mesh geometry={geometry} position={position} rotation={euler} castShadow={cast} receiveShadow>
      <meshStandardMaterial color={color} roughness={1 - gloss} />
    </mesh>
  );
}
