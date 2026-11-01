"use client";

import * as THREE from "three";
import { srgb } from "@/lib/lighting";
import { PbrMaterial, projectUVs, rounded } from "./Surface";

// Gaming desk, built like the real thing: a walnut top with rounded, banded edges on a black powder-coated steel
// frame (two T-legs with levelling feet, a beam between them, top brackets), a cable tray hung under the back edge,
// and a cloth desk mat with a stitched border. Local frame of the desk group: +x along the desk (toward the bed),
// +z toward the room, −z toward the wall; the top surface is at T.
export const T = 0.75;
const TOP = { w: 1.2, h: 0.035, d: 0.6 };
const LEG_X = 0.55, LEG_Z = -0.04;
const WOOD = srgb(0.75, 0.7, 0.68), MAT = srgb(0.12, 0.11, 0.15), STITCH = srgb(0.55, 0.5, 0.62);

let geo: ReturnType<typeof build> | null = null;
function build() {
  return {
    top: rounded(TOP.w, TOP.h, TOP.d, 0.009, 1),
    upright: rounded(0.06, T - TOP.h - 0.055, 0.06, 0.006, 1),
    foot: rounded(0.07, 0.035, 0.58, 0.01, 1),
    bracket: rounded(0.05, 0.03, 0.52, 0.006, 1),
    beam: rounded(2 * LEG_X - 0.06, 0.05, 0.03, 0.006, 1),
    leveller: projectUVs(new THREE.CylinderGeometry(0.016, 0.018, 0.012, 16), 1),
    trayBottom: rounded(0.8, 0.004, 0.1, 0.0015, 1),
    trayLip: rounded(0.8, 0.06, 0.004, 0.0015, 1),
    mat: rounded(0.95, 0.003, 0.42, 0.0014, 0.26),
  };
}
const steel = new THREE.MeshStandardMaterial({ color: srgb(0.09, 0.09, 0.11), metalness: 0.5, roughness: 0.42 });
const stitch = new THREE.MeshStandardMaterial({ color: STITCH, roughness: 0.9 });

function Steel({ g, p, cast = true }: { g: THREE.BufferGeometry; p: [number, number, number]; cast?: boolean }) {
  return <mesh geometry={g} material={steel} position={p} castShadow={cast} receiveShadow />;
}

export function Desk() {
  const g = (geo ??= build());
  const footY = 0.012 + 0.0175, uprightY = footY + 0.0175 + (T - TOP.h - 0.055) / 2;
  const mat = { x: 0.05, z: 0.08, w: 0.95, d: 0.42, y: T + 0.0015 };
  const inset = 0.007, sw = 0.0018; // stitching: 7 mm in from the mat edge
  return (
    <>
      <mesh geometry={g.top} position={[0, T - TOP.h / 2, 0]} castShadow receiveShadow>
        <PbrMaterial set="black_walnut_veneer_01" color={WOOD} metal={0} />
      </mesh>
      {[-LEG_X, LEG_X].map((x) => (
        <group key={x}>
          <Steel g={g.upright} p={[x, uprightY, LEG_Z]} />
          <Steel g={g.foot} p={[x, footY, LEG_Z]} />
          <Steel g={g.bracket} p={[x, T - TOP.h - 0.015, LEG_Z]} cast={false} />
          {[-0.26, 0.26].map((z) => <Steel key={z} g={g.leveller} p={[x, 0.006, LEG_Z + z]} cast={false} />)}
        </group>
      ))}
      <Steel g={g.beam} p={[0, T - TOP.h - 0.045, LEG_Z]} cast={false} />
      {/* Cable tray under the back edge */}
      <Steel g={g.trayBottom} p={[0, T - 0.135, -0.2]} cast={false} />
      <Steel g={g.trayLip} p={[0, T - 0.105, -0.15]} cast={false} />
      {/* Desk mat: cloth with a stitched border */}
      <mesh geometry={g.mat} position={[mat.x, mat.y, mat.z]} receiveShadow>
        <PbrMaterial set="cotton_jersey" color={MAT} metal={0} />
      </mesh>
      {[-1, 1].map((sd) => (
        <group key={sd}>
          <mesh material={stitch} position={[mat.x, mat.y + 0.0016, mat.z + sd * (mat.d / 2 - inset)]}><boxGeometry args={[mat.w - 2 * inset, 0.0004, sw]} /></mesh>
          <mesh material={stitch} position={[mat.x + sd * (mat.w / 2 - inset), mat.y + 0.0016, mat.z]}><boxGeometry args={[sw, 0.0004, mat.d - 2 * inset]} /></mesh>
        </group>
      ))}
    </>
  );
}
