"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { srgb } from "@/lib/lighting";
import { PbrMaterial, projectUVs, rounded } from "@/components/room/Surface";
import { Blob, DeskFrame } from "../../_shared/prims";
import { T } from "./gaming";
import { defineVariant } from "../../types";

// Scandinavian writing desk: a pale wood top on four tapered, slightly splayed round legs, a slim apron, and a
// shallow drawer on the left with a leather pull (the PC stays clear on the right). Same top height and size as the
// gaming desk, so everything standing on it keeps its place. Desk frame as in gaming.tsx (+z toward the room).
const TOP = { w: 1.2, h: 0.03, d: 0.6 };
const WOOD = srgb(0.86, 0.74, 0.6), PULL = srgb(0.35, 0.22, 0.14);
const LEG_H = T - TOP.h - 0.02;

function Scandi() {
  const g = useMemo(() => ({
    top: rounded(TOP.w, TOP.h, TOP.d, 0.008, 1),
    leg: projectUVs(new THREE.CylinderGeometry(0.024, 0.015, LEG_H, 16), 1),
    apronLong: rounded(TOP.w - 0.12, 0.06, 0.02, 0.004, 1),
    apronShort: rounded(0.02, 0.06, TOP.d - 0.12, 0.004, 1),
    drawer: rounded(0.5, 0.075, 0.02, 0.004, 1),
    pull: rounded(0.09, 0.012, 0.012, 0.005, 1),
  }), []);
  const wood = <PbrMaterial set="coated_pine" color={WOOD} metal={0} />;
  const ay = T - TOP.h - 0.03;
  return (
    <DeskFrame>
      <mesh geometry={g.top} position={[0, T - TOP.h / 2, 0]} castShadow receiveShadow>{wood}</mesh>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} geometry={g.leg} position={[sx * 0.53, LEG_H / 2 + 0.005, sz * 0.24]} rotation={[-sz * 0.05, 0, sx * 0.05]} castShadow>{wood}</mesh>
      )))}
      {[-1, 1].map((sz) => <mesh key={sz} geometry={g.apronLong} position={[0, ay, sz * 0.25]} castShadow>{wood}</mesh>)}
      {[-1, 1].map((sx) => <mesh key={sx} geometry={g.apronShort} position={[sx * 0.53, ay, 0]} castShadow>{wood}</mesh>)}
      {/* Drawer front proud of the front apron, with a leather pull */}
      <mesh geometry={g.drawer} position={[-0.22, ay - 0.008, 0.262]} castShadow>{wood}</mesh>
      <mesh geometry={g.pull} position={[-0.22, ay - 0.012, 0.277]}>
        <meshStandardMaterial color={PULL} roughness={0.6} />
      </mesh>
      <Blob p={[0, 0, 0]} size={[1.3, 0.72]} />
    </DeskFrame>
  );
}

export default defineVariant({
  item: "desk", id: "scandi", name: "Pale wood writing desk", Component: Scandi,
  surfaceY: () => T, footprint: () => [TOP.w, TOP.d],
});
