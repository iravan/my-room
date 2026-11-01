"use client";

import type { ReactNode } from "react";
import * as THREE from "three";
import type { Vec3 } from "@/lib/store";
import { srgb } from "@/lib/lighting";
import { rng } from "@/lib/paint";
import { Slab, unityEuler } from "@/components/room/Surface";
import { ContactShadow } from "./ContactShadow";

// Building blocks of the Unity port (VinylRoomStuff.cs, git tag unity-final): written in Unity coordinates (p, s, e)
// and flipped here, so items can be checked line by line against the C#. A yaw-ed group's local −z faces into the room.

export type U3 = [number, number, number];
export const flip = ([x, y, z]: U3): Vec3 => [x, y, -z];
export const C = (r: number, g: number, b: number, k = 1) => srgb(r, g, b, k);
export const Ck = ([r, g, b]: number[], k = 1) => srgb(r, g, b, k);
export const VIOLET = srgb(0.55, 0.25, 1);
export const glowOf = (c: THREE.Color, k: number) => c.clone().multiplyScalar(k);
// The mess is rolled once per page load from this seed (deterministic within a load).
export const LOAD_SEED = Math.floor(Math.random() * 2 ** 31);

export const GEO = {
  cube: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(0.5, 24, 16),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 2, 24),
  capsule: new THREE.CapsuleGeometry(0.5, 1, 6, 16),
  quad: new THREE.PlaneGeometry(1, 1),
};

export function G({ p, yaw = 0, e, children }: { p: U3; yaw?: number; e?: U3; children: ReactNode }) {
  return <group position={flip(p)} rotation={unityEuler(e ?? [0, yaw, 0])}>{children}</group>;
}

// Unity primitive with a plain Standard material (gloss .25; Plastic = .6), or unlit glow; quads are 1×1 facing −z.
export function Prim({ t = "cube", p, s, e, c = C(1, 1, 1), gloss = 0.25, map, glow, emissive, cast = false, transparent }: {
  t?: keyof typeof GEO; p: U3; s: U3 | [number, number]; e?: U3; c?: THREE.Color; gloss?: number;
  map?: THREE.Texture; glow?: THREE.Color; emissive?: THREE.Color; cast?: boolean; transparent?: boolean;
}) {
  const scale: Vec3 = s.length === 2 ? [s[0], s[1], 1] : s;
  return (
    <mesh geometry={GEO[t]} position={flip(p)} rotation={unityEuler(e ?? [0, 0, 0])} scale={scale} castShadow={cast} receiveShadow={!glow}>
      {glow
        ? <meshBasicMaterial color={glow} map={map} transparent={transparent} />
        : <meshStandardMaterial color={c} roughness={1 - gloss} map={map} emissive={emissive ?? "black"} />}
    </mesh>
  );
}
export const Plastic = (props: Parameters<typeof Prim>[0]) => <Prim gloss={0.6} {...props} />;

// Contact shadow under p (Unity coords, parent space).
export const Blob = ({ p, size }: { p: U3; size: [number, number] }) => { const [x, , z] = flip(p); return <ContactShadow x={x} z={z} size={size} />; };

// Rolls for one item, fixed for this page load (k keeps items apart).
export function dice(k: number) {
  const r = rng(LOAD_SEED + k);
  return { R: (a: number, b: number) => a + r() * (b - a), chance: (p: number) => r() < p, int: (n: number) => Math.floor(r() * n) };
}

// The desk's frame, which the desk and everything on and under it is modelled in: −z faces the room, +z the wall,
// +x towards the bed. Desk-local (x, y, z) is world (−1.68 − z, y, 1.35 − x).
export const DeskFrame = ({ children }: { children: ReactNode }) => <G p={[-1.68, 0, -1.35]} yaw={-90}>{children}</G>;

// Jersey photo is ~70% grey: tints scaled up to match (as in Unity).
export const Fabric = ({ p, s, c, e }: { p: U3; s: U3; c: number[]; e?: U3 }) =>
  <Slab set="cotton_jersey" tile={0.26} position={flip(p)} size={s} rotation={e} color={Ck(c, 1.4)} cast={false} />;

export const Walnut = ({ p, s, c, cast }: { p: U3; s: U3; c: U3; cast?: boolean }) =>
  <Slab set="black_walnut_veneer_01" tile={1} position={flip(p)} size={s} color={C(...c)} cast={!!cast} />;
