"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { srgb } from "@/lib/lighting";
import { PbrMaterial, projectUVs, rounded } from "@/components/room/Surface";
import { defineVariant } from "../../types";

// Wooden Windsor chair: a saddle seat on four splayed, H-stretchered legs, and a slightly reclined back of two posts,
// five spindles and a curved crest rail. Local frame: the sitter faces −z, the back is at +z.
const WOOD = srgb(0.62, 0.45, 0.32), SEAT_Y = 0.45;

function Windsor() {
  const g = useMemo(() => ({
    seat: rounded(0.44, 0.045, 0.42, 0.016, 1),
    leg: projectUVs(new THREE.CylinderGeometry(0.016, 0.021, 0.45, 12), 1),
    side: projectUVs(new THREE.CylinderGeometry(0.011, 0.011, 0.34, 10).rotateX(Math.PI / 2), 1),
    cross: projectUVs(new THREE.CylinderGeometry(0.011, 0.011, 0.36, 10).rotateZ(Math.PI / 2), 1),
    post: projectUVs(new THREE.CylinderGeometry(0.014, 0.018, 0.52, 12), 1),
    spindle: projectUVs(new THREE.CylinderGeometry(0.008, 0.009, 0.48, 8), 1),
    crest: rounded(0.46, 0.07, 0.035, 0.012, 1),
  }), []);
  const wood = <PbrMaterial set="black_walnut_veneer_01" color={WOOD} metal={0} />;
  return (
    <>
      <mesh geometry={g.seat} position={[0, SEAT_Y, 0]} castShadow receiveShadow>{wood}</mesh>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} geometry={g.leg} position={[sx * 0.175, 0.215, sz * 0.155]} rotation={[sz * 0.1, 0, -sx * 0.1]} castShadow>{wood}</mesh>
      )))}
      {[-1, 1].map((sx) => <mesh key={sx} geometry={g.side} position={[sx * 0.185, 0.15, 0]} castShadow>{wood}</mesh>)}
      <mesh geometry={g.cross} position={[0, 0.15, 0]} castShadow>{wood}</mesh>
      <group position={[0, SEAT_Y + 0.02, 0.18]} rotation={[0.12, 0, 0]}>
        {[-1, 1].map((sx) => <mesh key={sx} geometry={g.post} position={[sx * 0.18, 0.26, 0]} castShadow>{wood}</mesh>)}
        {[-0.12, -0.06, 0, 0.06, 0.12].map((x) => <mesh key={x} geometry={g.spindle} position={[x, 0.26, 0]} castShadow>{wood}</mesh>)}
        <mesh geometry={g.crest} position={[0, 0.52, 0]} castShadow receiveShadow>{wood}</mesh>
      </group>
    </>
  );
}

export default defineVariant({
  item: "chair", id: "windsor", name: "Windsor chair", Component: Windsor, footprint: () => [0.55, 0.55],
  anchors: { backTop: [0, 1.04, -0.25] }, // Unity coords: where a hoodie hangs over the crest rail
});
