"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { srgb } from "@/lib/lighting";
import { useStyle } from "@/lib/room";
import { PbrMaterial } from "@/components/room/Surface";
import { defineVariant } from "../../types";

// Curtains: a round rod with ball ends above the window, and two cloth panels drawn back to each side, hanging in
// soft pleats from the rod to just above the sill, gathered a little at the bottom. Colour: the style's first rug
// colour (so they go with the room); takes the fabric finish. Window opening: x −1…0.4, top 2.05, sill 1.05.
const ROD_Y = 2.12, Z = -1.94, X0 = -1.08, X1 = 0.48, DROP = 1.2;

function panel(width: number, side: -1 | 1) {
  const g = new THREE.PlaneGeometry(width, DROP, 28, 24);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), v = 0.5 - y / DROP; // 0 at the rod, 1 at the hem
    const pleat = 0.025 * Math.sin((x / width) * Math.PI * 7) * (1 - 0.4 * v); // folds from the rings
    const gather = side * 0.1 * v * v * (x / width + 0.5 * side); // the hem pulls toward the wall side
    p.setXYZ(i, x * (1 - 0.15 * v * v) + gather, y, pleat);
  }
  g.computeVertexNormals();
  return g;
}

function Curtains() {
  const { rug } = useStyle();
  const cloth = useMemo(() => srgb(rug.a[0], rug.a[1], rug.a[2]), [rug]);
  const g = useMemo(() => ({ left: panel(0.42, -1), right: panel(0.42, 1) }), []);
  const metal = <meshStandardMaterial color={srgb(0.3, 0.28, 0.26)} metalness={0.6} roughness={0.4} />;
  return (
    <>
      <mesh position={[(X0 + X1) / 2, ROD_Y, Z]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, X1 - X0 + 0.24, 12]} />
        {metal}
      </mesh>
      {[X0 - 0.13, X1 + 0.13].map((x) => <mesh key={x} position={[x, ROD_Y, Z]}><sphereGeometry args={[0.025, 12, 8]} />{metal}</mesh>)}
      {([[X0 + 0.08, g.left], [X1 - 0.08, g.right]] as const).map(([x, geo]) => (
        <mesh key={x} geometry={geo} position={[x, ROD_Y - 0.02 - DROP / 2, Z + 0.03]} castShadow receiveShadow>
          <PbrMaterial set="cotton_jersey" color={cloth} metal={0} side={THREE.DoubleSide} finish="fabric" />
        </mesh>
      ))}
    </>
  );
}

export default defineVariant({ item: "window-covering", id: "curtains", name: "Curtains", Component: Curtains });
