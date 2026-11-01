"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useGame, type Vec3 } from "@/lib/store";
import { useLayout, useStyle } from "@/lib/room";
import { BED_HOME } from "@/lib/layout";
import { CYAN, MAGENTA, srgb } from "@/lib/lighting";
import { perlin, rng } from "@/lib/paint";
import { Neon } from "@/components/room/Lighting";
import { Clickable } from "@/components/room/Clickable";
import { PbrMaterial, projectUVs, rounded, type TextureSet } from "@/components/room/Surface";
import { defineVariant } from "../../types";

// A real bed, not a stack of boxes: walnut frame on legs with an upholstered headboard, a mattress with rounded
// edges in a fitted sheet, two plump pillows, a duvet that is actual cloth (wraps the mattress edge, hangs in folds,
// droops at the corners, turned down at the head) and a knitted throw across the foot.
// Local frame: head at −z (against the back wall), foot at +z. Click = next duvet colour.

const BED_POS: Vec3 = BED_HOME;
const W1 = 1.02, L = 1.94, MT = 0.48, MB = 0.24; // single mattress width, length, top, bottom
const WIDTH: Record<string, number> = { single: W1, double: 1.42 };
const HEAD = -0.97, FOOT = HEAD + L;

// Duvet cover colours (cotton), cycled by clicking the bed.
const SHEET = srgb(0.62, 0.6, 0.7), CASE = srgb(0.7, 0.68, 0.78), THROW = srgb(0.62, 0.5, 0.85);
const WOOD = srgb(0.42, 0.34, 0.32), UPHOLSTERY = srgb(0.3, 0.27, 0.42);

// The bed is made differently every visit.
const SEED = Math.floor(Math.random() * 1e6);

// Pillow: boxy footprint, thickness tapering to pinched edges, an optional head dent.
function pillowGeometry([w, h, d]: Vec3, dent: number, seed: number) {
  let g: THREE.BufferGeometry = new THREE.SphereGeometry(0.5, 64, 40);
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  g = mergeVertices(g);
  const p = g.attributes.position, sp = (v: number, e: number) => Math.sign(v) * Math.abs(v * 2) ** e;
  for (let i = 0; i < p.count; i++) {
    const x = sp(p.getX(i), 0.28), z = sp(p.getZ(i), 0.28); // −1..1, nearly square footprint
    let y = sp(p.getY(i), 0.8) * (1 - 0.6 * Math.max(Math.abs(x), Math.abs(z)) ** 3);
    if (y > 0) y -= dent * Math.exp(-((x - 0.1) ** 2 + z * z) / 0.18);
    y += (perlin(x * 2 + seed, z * 2) - 0.5) * 0.15 * (1 - Math.abs(y));
    p.setXYZ(i, (x * w) / 2, (y * h) / 2, (z * d) / 2);
  }
  g.computeVertexNormals();
  return projectUVs(g, 0.26);
}

// Cloth over the mattress. Flat cloth coordinates (s across, t along) map onto: the flat top between |s| ≤ a and
// from z0 to z1; beyond that the excess wraps a rounded edge (radius r) and hangs down; at the foot corners the
// two drapes meet in a drooping cone like a real duvet corner. `fold` turns the head end back over itself.
// Then rumples: lumps and diagonal creases on top, vertical folds in the hanging part.
type Drape = {
  a: number; z0: number; z1: number; top: number; r: number; hangSide: number; hangFoot: number;
  fold?: { rho: number; len: number }; lumps: number; tile: number; seed: number;
};
function drapeGeometry(o: Drape) {
  const step = 0.02, sideLen = (Math.PI / 2) * o.r + o.hangSide, footLen = o.hangFoot ? (Math.PI / 2) * o.r + o.hangFoot : 0;
  const sMax = o.a + sideLen, foldLen = o.fold ? Math.PI * o.fold.rho + o.fold.len : 0;
  const tMin = -foldLen, tMax = o.z1 - o.z0 + footLen;
  const nx = Math.ceil((2 * sMax) / step) + 1, nt = Math.ceil((tMax - tMin) / step) + 1;
  const pos = new Float32Array(nx * nt * 3), uv = new Float32Array(nx * nt * 2), hang = new Float32Array(nx * nt);
  const r = rng(o.seed), ph = Array.from({ length: 6 }, () => r() * 10);
  // Arc-length profile over the rounded edge then straight down, with a slight outward flare as it hangs.
  const profile = (e: number, rad: number) => {
    const arc = (Math.PI / 2) * rad;
    if (e <= arc) { const th = e / rad; return [rad * Math.sin(th), rad * (1 - Math.cos(th))]; }
    const down = e - arc;
    return [rad + 0.05 * Math.min(1, down / 0.3), rad + down];
  };
  for (let j = 0; j < nt; j++) {
    const t = tMin + ((tMax - tMin) * j) / (nt - 1);
    // Along the bed: main body, or the turned-down fold (half turn up and back toward the foot).
    let zb: number, yb: number, dz = 0;
    if (t >= 0) { zb = o.z0 + Math.min(t, o.z1 - o.z0); yb = o.top; dz = Math.max(0, t - (o.z1 - o.z0)); }
    else {
      const u = -t, rho = o.fold!.rho;
      if (u <= Math.PI * rho) { const phi = u / rho; zb = o.z0 - rho * Math.sin(phi); yb = o.top + rho * (1 - Math.cos(phi)); }
      else { zb = o.z0 + (u - Math.PI * rho); yb = o.top + 2 * rho; }
    }
    const layer = yb - o.top; // the folded-back layer drapes just outside the one beneath
    for (let i = 0; i < nx; i++) {
      const s = -sMax + (2 * sMax * i) / (nx - 1), sg = Math.sign(s) || 1;
      const dx = Math.max(0, Math.abs(s) - o.a), e = Math.hypot(dx, dz);
      let x = sg * Math.min(Math.abs(s), o.a), y = yb, z = zb, down = 0;
      if (e > 0) {
        const [h, v] = profile(e, o.r + layer);
        x += sg * (dx / e) * h;
        z += (dz / e) * h;
        y -= v;
        down = Math.max(0, v - o.r - layer);
      }
      const k = j * nx + i;
      pos.set([x, Math.max(0.03, y), z], k * 3);
      uv.set([s / o.tile, t / o.tile], k * 2);
      hang[k] = down;
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < nt - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Rumple along the normals, then recompute them.
  const n = g.attributes.normal;
  for (let j = 0; j < nt; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, s = uv[k * 2] * o.tile, t = uv[k * 2 + 1] * o.tile, dn = hang[k];
    const lumps = (perlin(s * 3 + ph[0], t * 3 + ph[1]) - 0.5) * 2 + (perlin(s * 7 + ph[2], t * 7) - 0.5) * 0.6;
    const crease = Math.max(0, 1 - Math.abs(Math.sin((s * 0.8 + t) * 5 + ph[3] + perlin(s * 2, t * 2 + ph[4]) * 4)) * 4);
    const along = Math.abs(s) > o.a ? t : s; // folds run down the hanging cloth
    const folds = Math.sin(along * 34 + ph[5] + perlin(along * 3, 0.5) * 5) * Math.min(1, dn / 0.12);
    const d = (lumps * o.lumps + crease * o.lumps * 0.5) * (1 - Math.min(1, dn / 0.05)) + folds * 0.014;
    pos[k * 3] += n.getX(k) * d;
    pos[k * 3 + 1] += n.getY(k) * d;
    pos[k * 3 + 2] += n.getZ(k) * d;
  }
  g.computeVertexNormals();
  return g;
}

// Everything soft is built once per load and width, shared by the bed and by bedSurfaceY (gadgets resting on it).
const built = new Map<number, ReturnType<typeof build>>();
function build(W: number) {
  const duvet = drapeGeometry({ a: W / 2 - 0.04, z0: -0.45, z1: FOOT - 0.04, top: MT + 0.03, r: 0.07, hangSide: 0.13, hangFoot: 0.14,
    fold: { rho: 0.035, len: 0.26 }, lumps: 0.012, tile: 0.35, seed: SEED });
  const throwG = drapeGeometry({ a: W / 2 - 0.04, z0: 0.5, z1: FOOT - 0.04, top: MT + 0.085, r: 0.12, hangSide: 0.2, hangFoot: 0.1,
    fold: { rho: 0.02, len: 0 }, lumps: 0.006, tile: 0.27, seed: SEED + 1 });
  return {
    duvet, throwG,
    mattress: rounded(W, MT - MB, L, 0.05, 0.26),
    pillowFlat: pillowGeometry([0.62, 0.15, 0.4], 0.35, SEED % 97),
    pillowBack: pillowGeometry([0.6, 0.14, 0.4], 0, (SEED % 89) + 5),
  };
}
const geometries = (W = W1) => { if (!built.has(W)) built.set(W, build(W)); return built.get(W)!; };

// Pillow placements (local): one lying with a head dent, one leaning on the headboard behind it.
const PILLOWS = [
  { key: "pillowBack" as const, position: [0.03, MT + 0.2, -0.86] as Vec3, rotation: [-1.15, 0.05, 0] as Vec3 },
  { key: "pillowFlat" as const, position: [-0.02, MT + 0.065, -0.66] as Vec3, rotation: [0.06, 0.07, 0] as Vec3 },
];

// Height of whatever is on the bed at world (x, z): duvet, throw, pillows, mattress. For things lying on it.
const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), from = new THREE.Vector3();
let probes: THREE.Object3D | null = null;
function surfaceY(x: number, z: number) {
  if (!probes) {
    const g = geometries(), m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    probes = new THREE.Group();
    probes.position.set(...BED_POS);
    probes.add(new THREE.Mesh(g.duvet, m), new THREE.Mesh(g.throwG, m), new THREE.Mesh(g.mattress, m).translateY((MT + MB) / 2).translateZ(HEAD + L / 2));
    for (const p of PILLOWS) {
      const mesh = new THREE.Mesh(g[p.key], m);
      mesh.position.set(...p.position);
      mesh.rotation.set(...p.rotation);
      probes.add(mesh);
    }
    probes.updateMatrixWorld(true);
  }
  ray.set(from.set(x, 2, z), down);
  const hit = ray.intersectObject(probes, true)[0];
  return hit ? hit.point.y : MT;
}

function Soft({ geometry, set, color, position, rotation, double, finish }: {
  geometry: THREE.BufferGeometry; set: TextureSet; color: THREE.Color; position?: Vec3; rotation?: Vec3; double?: boolean; finish: string;
}) {
  return (
    <mesh geometry={geometry} position={position} rotation={rotation} castShadow receiveShadow>
      <PbrMaterial set={set} color={color} metal={0} side={double ? THREE.DoubleSide : THREE.FrontSide} finish={finish} />
    </mesh>
  );
}

function Frame({ W }: { W: number }) {
  const g = useMemo(() => ({
    rail: rounded(0.035, 0.11, L + 0.07, 0.012, 1),
    end: rounded(W + 0.07, 0.11, 0.035, 0.012, 1),
    leg: projectUVs(new THREE.CylinderGeometry(0.024, 0.018, 0.13, 16), 1),
    head: rounded(W + 0.1, 0.9, 0.06, 0.02, 1),
    channel: rounded(0.205, 0.56, 0.07, 0.03, 0.4),
  }), [W]);
  const channels = Math.round(W / 0.205);
  const wood = <PbrMaterial set="black_walnut_veneer_01" color={WOOD} metal={0} />;
  const legs: Vec3[] = [[-W / 2 - 0.01, 0.065, HEAD + 0.03], [W / 2 + 0.01, 0.065, HEAD + 0.03], [-W / 2 - 0.01, 0.065, FOOT - 0.03], [W / 2 + 0.01, 0.065, FOOT - 0.03]];
  return (
    <>
      {[-1, 1].map((sx) => <mesh key={sx} geometry={g.rail} position={[sx * (W / 2 + 0.0175), 0.235, (HEAD + FOOT) / 2]} castShadow receiveShadow>{wood}</mesh>)}
      <mesh geometry={g.end} position={[0, 0.235, FOOT + 0.0175]} castShadow receiveShadow>{wood}</mesh>
      {legs.map((p, i) => <mesh key={i} geometry={g.leg} position={p} castShadow>{wood}</mesh>)}
      {/* Headboard: walnut back with padded channels (five on a single) */}
      <mesh geometry={g.head} position={[0, 0.6, HEAD - 0.06]} castShadow receiveShadow>{wood}</mesh>
      {Array.from({ length: channels }, (_, i) => i - (channels - 1) / 2).map((i) => (
        <mesh key={i} geometry={g.channel} position={[i * 0.205, 0.72, HEAD - 0.02]} castShadow receiveShadow>
          <PbrMaterial set="cotton_jersey" color={UPHOLSTERY} metal={0} finish="fabric:Headboard" />
        </mesh>
      ))}
      {/* LED strips: under the side rails and the foot (floor glow), and a wall wash behind the headboard */}
      {[-1, 1].map((sx) => <Neon key={sx} position={[sx * (W / 2 + 0.005), 0.172, (HEAD + FOOT) / 2]} size={[0.006, 0.006, L]} color={MAGENTA} />)}
      <Neon position={[0, 0.172, FOOT + 0.003]} size={[W, 0.006, 0.006]} color={MAGENTA} />
      <Neon position={[0, 1.04, HEAD - 0.095]} size={[W, 0.008, 0.008]} color={CYAN} />
    </>
  );
}

// Bed size option: a double grows into the room (away from the wall), so its wall side stays put.
const bedWidth = (size?: string) => WIDTH[size ?? "single"] ?? W1;

function PlatformBed() {
  const covers = useStyle().covers, cover = covers[useGame((s) => s.blanket) % covers.length];
  const W = bedWidth(useLayout((s) => s.options.bed?.size)), g = geometries(W);
  // Clicking the bed cycles the duvet colours; a duvet colour picked in edit mode gives way to it.
  const nextBlanket = () => {
    useGame.getState().nextBlanket();
    const o = useLayout.getState().options.bed;
    if (o?.["fabric:Duvet"]) { const rest = { ...o }; delete rest["fabric:Duvet"]; useLayout.setState((s) => ({ options: { ...s.options, bed: rest } })); }
  };
  return (
    <Clickable onTap={nextBlanket} position={[BED_POS[0] + (W - W1) / 2, BED_POS[1], BED_POS[2]]}>
      <Frame W={W} />
      <Soft geometry={g.mattress} set="cotton_jersey" color={SHEET} position={[0, (MT + MB) / 2, HEAD + L / 2]} finish="fabric:Sheets" />
      {PILLOWS.map((p) => <Soft key={p.key} geometry={g[p.key]} set="cotton_jersey" color={CASE} position={p.position} rotation={p.rotation} finish="fabric:Sheets" />)}
      <Soft geometry={g.duvet} set="cotton_jersey" color={cover} double finish="fabric:Duvet" />
      <Soft geometry={g.throwG} set="knitted_fleece" color={THROW} double finish="fabric:Throw" />
    </Clickable>
  );
}

// Today's bed: walnut platform frame, tufted headboard, single or double.
export default defineVariant({
  item: "bed", id: "platform", name: "Walnut platform",
  Component: PlatformBed, surfaceY, footprint: (size) => [bedWidth(size), 1.94],
});
