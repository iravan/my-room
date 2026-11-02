"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "@/lib/store";
import { CYAN, MAGENTA, srgb } from "@/lib/lighting";
import { Neon } from "@/components/room/Lighting";
import { PbrMaterial, projectUVs, rounded } from "@/components/room/Surface";
import { Bedding, bedWidth, FOOT, HEAD, L, surfaceY } from "../bedding";
import { defineVariant } from "../../types";

// Walnut platform frame on legs with an upholstered, channel-tufted headboard and LED strips (floor glow under the
// rails, a wall wash behind the headboard).
const WOOD = srgb(0.42, 0.34, 0.32), UPHOLSTERY = srgb(0.3, 0.27, 0.42);

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

const PlatformBed = () => <Bedding frame={(W) => <Frame W={W} />} />;

// Today's bed: walnut platform frame, tufted headboard, single or double.
export default defineVariant({
  item: "bed", id: "platform", name: "Walnut platform",
  Component: PlatformBed, surfaceY, footprint: (size) => [bedWidth(size), 1.94],
});
