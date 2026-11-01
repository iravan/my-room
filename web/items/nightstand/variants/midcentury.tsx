"use client";

import * as THREE from "three";
import { MAGENTA, srgb } from "@/lib/lighting";
import { Neon } from "@/components/room/Lighting";
import { PbrMaterial, projectUVs, rounded } from "@/components/room/Surface";
import { defineVariant } from "../../types";

// Mid-century nightstand against the left wall: walnut carcass on splayed tapered legs, a top with a slight
// overhang, two drawers with real gap lines and brass bar pulls facing into the room (+x), and a magenta LED
// tucked under the top's front edge. The lamp stands on the top at y 0.54.
const POS: [number, number, number] = [-1.7, 0, 0.45];
const D = 0.45, W = 0.4, TOP_Y = 0.54, LEG_H = 0.11; // depth (x), width (z)
const CASE_H = TOP_Y - 0.022 - LEG_H, FRONT = D / 2;
const WOOD = srgb(0.62, 0.5, 0.46), DRAWER = srgb(0.7, 0.57, 0.52);
const brass = new THREE.MeshStandardMaterial({ color: srgb(0.85, 0.66, 0.36), metalness: 1, roughness: 0.3 });
const shadow = new THREE.MeshStandardMaterial({ color: srgb(0.02, 0.015, 0.015), roughness: 1 });

let geo: ReturnType<typeof build> | null = null;
function build() {
  const dh = (CASE_H - 0.03 - 0.004) / 2; // two drawer fronts, 4 mm gap between, 15 mm frame round them
  return {
    top: rounded(D + 0.02, 0.022, W + 0.02, 0.007, 1),
    carcass: rounded(D - 0.01, CASE_H, W, 0.006, 1),
    recess: new THREE.BoxGeometry(0.002, CASE_H - 0.026, W - 0.026),
    drawer: rounded(0.02, dh, W - 0.034, 0.004, 1),
    dh,
    leg: projectUVs(new THREE.CylinderGeometry(0.016, 0.009, LEG_H + 0.01, 16).translate(0, -(LEG_H + 0.01) / 2, 0), 1),
    bar: new THREE.CylinderGeometry(0.0045, 0.0045, 0.11, 12).rotateX(Math.PI / 2),
    post: new THREE.CylinderGeometry(0.0035, 0.0035, 0.018, 8).rotateZ(Math.PI / 2),
  };
}

function MidCentury() {
  const g = (geo ??= build());
  const wood = <PbrMaterial set="black_walnut_veneer_01" color={WOOD} metal={0} />;
  const caseY = LEG_H + CASE_H / 2;
  const drawerY = [LEG_H + 0.015 + g.dh / 2, LEG_H + 0.015 + g.dh * 1.5 + 0.004];
  return (
    <group position={POS}>
      <mesh geometry={g.top} position={[0.005, TOP_Y - 0.011, 0]} castShadow receiveShadow>{wood}</mesh>
      <mesh geometry={g.carcass} position={[-0.005, caseY, 0]} castShadow receiveShadow>{wood}</mesh>
      {/* Dark backing just inside the front, so the gaps round the drawers read as gaps */}
      <mesh geometry={g.recess} material={shadow} position={[FRONT - 0.009, caseY, 0]} />
      {drawerY.map((y) => (
        <group key={y} position={[FRONT - 0.002, y, 0]}>
          <mesh geometry={g.drawer} castShadow receiveShadow>
            <PbrMaterial set="black_walnut_veneer_01" color={DRAWER} metal={0} />
          </mesh>
          <mesh geometry={g.bar} material={brass} position={[0.026, 0, 0]} />
          {[-0.045, 0.045].map((z) => <mesh key={z} geometry={g.post} material={brass} position={[0.018, 0, z]} />)}
        </group>
      ))}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} geometry={g.leg} position={[sx * (D / 2 - 0.05), LEG_H + 0.005, sz * (W / 2 - 0.05)]}
          rotation={[sz * 0.08, 0, -sx * 0.08]} castShadow>{wood}</mesh>
      )))}
      <Neon position={[FRONT + 0.002, TOP_Y - 0.026, 0]} size={[0.004, 0.004, W - 0.03]} color={MAGENTA} />
    </group>
  );
}

export default defineVariant({
  item: "nightstand", id: "midcentury", name: "Mid-century walnut", Component: MidCentury,
  surfaceY: () => TOP_Y, footprint: () => [D, W],
});
