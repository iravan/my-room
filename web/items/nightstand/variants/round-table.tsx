"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { srgb } from "@/lib/lighting";
import { PbrMaterial, projectUVs } from "@/components/room/Surface";
import { defineVariant } from "../../types";

// Round side table: a solid wood top with a rounded edge, three legs splayed out from under it, and a lower shelf ring
// holding a book. Same top height as the mid-century nightstand (0.54), so the lamp stands where it did.
const POS: [number, number, number] = [-1.7, 0, 0.45];
const TOP_Y = 0.54, R = 0.23, WOOD = srgb(0.7, 0.55, 0.42);

function RoundTable() {
  const g = useMemo(() => ({
    top: projectUVs(new THREE.CylinderGeometry(R, R - 0.008, 0.03, 40), 1),
    shelf: projectUVs(new THREE.CylinderGeometry(R * 0.72, R * 0.72, 0.018, 32), 1),
    leg: projectUVs(new THREE.CylinderGeometry(0.014, 0.011, TOP_Y - 0.03, 12), 1),
  }), []);
  const wood = <PbrMaterial set="black_walnut_veneer_01" color={WOOD} metal={0} />;
  return (
    <group position={POS}>
      <mesh geometry={g.top} position={[0, TOP_Y - 0.015, 0]} castShadow receiveShadow>{wood}</mesh>
      <mesh geometry={g.shelf} position={[0, 0.18, 0]} castShadow receiveShadow>{wood}</mesh>
      {[0, 1, 2].map((i) => {
        const a = (i * 2 * Math.PI) / 3 + 0.4;
        return (
          <mesh key={i} geometry={g.leg} position={[Math.cos(a) * R * 0.68, (TOP_Y - 0.03) / 2, Math.sin(a) * R * 0.68]}
            rotation={[Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08]} castShadow>{wood}</mesh>
        );
      })}
      {/* A book on the shelf */}
      <mesh position={[0.02, 0.2, 0.01]} rotation={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.15, 0.025, 0.21]} />
        <meshStandardMaterial color={srgb(0.35, 0.42, 0.5)} roughness={0.8} />
      </mesh>
    </group>
  );
}

export default defineVariant({
  item: "nightstand", id: "round-table", name: "Round side table", Component: RoundTable,
  surfaceY: () => TOP_Y, footprint: () => [2 * R, 2 * R],
});
