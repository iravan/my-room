"use client";

import { useMemo } from "react";
import { C, dice, Fabric, G, GEO, flip, Plastic, Walnut } from "../../_shared/prims";
import { HOODIE } from "../../hoodie/roll";
import { defineVariant } from "../../types";

// Built-in wardrobe: framed opening, top and floor track, two sliding doors with long pulls (the back one a mirror),
// so it doesn't read as a second room door. A hook, with the hoodie on it on some loads.
function Sliding() {
  const tilt = useMemo(() => dice(9).R(-4, 4), []);
  return (
    <G p={[0.1, 0, -2]}>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Walnut p={[s * 0.4, 1.03, s < 0 ? 0.015 : 0.04]} s={[0.8, 2.06, 0.025]} c={[0.85, 0.8, 0.78]} />
          <Plastic p={[s * 0.74, 1.05, s < 0 ? 0.03 : 0.055]} s={[0.025, 1.2, 0.015]} c={C(0.7, 0.7, 0.75)} />
          <Plastic p={[s * 0.82, 1.06, 0.03]} s={[0.04, 2.12, 0.06]} c={C(0.5, 0.48, 0.56)} />
        </group>
      ))}
      <Plastic p={[0, 2.11, 0.035]} s={[1.68, 0.08, 0.07]} c={C(0.5, 0.48, 0.56)} />
      <Plastic p={[0, 0.01, 0.03]} s={[1.6, 0.02, 0.06]} c={C(0.7, 0.7, 0.75)} />
      <mesh geometry={GEO.cube} position={flip([-0.4, 1.05, 0.03])} scale={[0.62, 1.75, 0.004]}>
        <meshStandardMaterial color={C(0.9, 0.9, 0.92)} metalness={1} roughness={0.04} />
      </mesh>
      <Plastic p={[0.55, 1.62, 0.065]} s={[0.02, 0.02, 0.05]} c={C(0.7, 0.7, 0.75)} />
      {HOODIE.at === 2 && (
        <>
          <Fabric p={[0.55, 1.33, 0.1]} s={[0.42, 0.55, 0.06]} c={HOODIE.color} e={[0, 0, tilt]} />
          <Fabric p={[0.55, 1.58, 0.09]} s={[0.2, 0.14, 0.07]} c={HOODIE.color.map((v) => v * 0.85)} />
        </>
      )}
    </G>
  );
}

export default defineVariant({ item: "closet", id: "sliding", name: "Sliding doors", Component: Sliding });
