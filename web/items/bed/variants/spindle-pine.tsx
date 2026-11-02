"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "@/lib/store";
import { srgb } from "@/lib/lighting";
import { PbrMaterial, projectUVs, rounded } from "@/components/room/Surface";
import { Bedding, bedWidth, FOOT, HEAD, L, surfaceY } from "../bedding";
import { defineVariant } from "../../types";

// Farmhouse spindle bed in pine: four turned corner posts with ball finials, a tall headboard and a lower footboard,
// each a top and bottom rail with round spindles between, and plain side rails. No LEDs.
const PINE = srgb(0.86, 0.7, 0.52);
const POST = 0.06, SPACING = 0.1;

function Frame({ W }: { W: number }) {
  const g = useMemo(() => ({
    rail: rounded(0.035, 0.14, L, 0.012, 1),
    post: (h: number) => projectUVs(new THREE.CylinderGeometry(POST / 2 - 0.004, POST / 2, h, 16), 1),
    finial: projectUVs(new THREE.SphereGeometry(0.036, 16, 12), 1),
    bar: rounded(W + 0.03, 0.06, 0.04, 0.012, 1),
    spindle: (h: number) => projectUVs(new THREE.CylinderGeometry(0.011, 0.011, h, 10), 1),
  }), [W]);
  const pine = <PbrMaterial set="coated_pine" color={PINE} metal={0} />;
  const x = W / 2 + POST / 2 - 0.005, zh = HEAD - 0.035, zf = FOOT + 0.035;
  const n = Math.max(3, Math.round(W / SPACING)), xs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * (W / n));
  // Head (top 1.05) and foot (top 0.8): posts, two rails, spindles between them.
  const ends: { z: number; post: number; low: number; high: number }[] = [{ z: zh, post: 1.02, low: 0.42, high: 0.96 }, { z: zf, post: 0.76, low: 0.3, high: 0.7 }];
  return (
    <>
      {[-1, 1].map((sx) => <mesh key={sx} geometry={g.rail} position={[sx * (W / 2 + 0.0175), 0.24, (HEAD + FOOT) / 2]} castShadow receiveShadow>{pine}</mesh>)}
      {ends.map(({ z, post, low, high }) => (
        <group key={z}>
          {[-1, 1].map((sx) => (
            <group key={sx}>
              <mesh geometry={g.post(post)} position={[sx * x, post / 2, z]} castShadow receiveShadow>{pine}</mesh>
              <mesh geometry={g.finial} position={[sx * x, post + 0.03, z]} castShadow>{pine}</mesh>
            </group>
          ))}
          {[low, high].map((y) => <mesh key={y} geometry={g.bar} position={[0, y, z]} castShadow receiveShadow>{pine}</mesh>)}
          {xs.map((sx) => <mesh key={sx} geometry={g.spindle(high - low - 0.06)} position={[sx, (low + high) / 2, z] as Vec3} castShadow>{pine}</mesh>)}
        </group>
      ))}
    </>
  );
}

const SpindleBed = () => <Bedding frame={(W) => <Frame W={W} />} />;

export default defineVariant({
  item: "bed", id: "spindle-pine", name: "Pine spindle bed",
  Component: SpindleBed, surfaceY, footprint: (size) => [bedWidth(size) + 0.08, 2.04],
});
