"use client";

import * as THREE from "three";
import { useGame } from "@/lib/store";
import { CYAN } from "@/lib/lighting";
import { Metal, Neon } from "@/components/room/Lighting";
import { Clickable } from "@/components/room/Clickable";
import { OPENING } from "@/components/room/City";
import { defineVariant } from "../../types";

// Metal frame round the opening on the room side with a mullion, the cyan sill strip, and a faint glass pane: black
// additive dielectric, so only its reflections show (the lamp in the glass). Click the glass = next lighting preset.
function MetalFrame() {
  const cyclePreset = useGame((s) => s.cyclePreset);
  const { x0, x1, y0, y1 } = OPENING, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, wdt = x1 - x0, hgt = y1 - y0, z = -1.985;
  return (
    <>
      <Metal position={[x0 - 0.025, cy, z]} size={[0.05, hgt + 0.1, 0.03]} />
      <Metal position={[x1 + 0.025, cy, z]} size={[0.05, hgt + 0.1, 0.03]} />
      <Metal position={[cx, y1 + 0.025, z]} size={[wdt, 0.05, 0.03]} />
      <Metal position={[cx, y0 - 0.025, z]} size={[wdt, 0.05, 0.03]} />
      <Metal position={[cx, cy, -2.05]} size={[0.03, hgt, 0.04]} />
      <Neon position={[cx, 1, -1.97]} size={[1.5, 0.02, 0.05]} color={CYAN} />
      {/* Glass in the opening (click = next lighting preset) */}
      <Clickable onTap={cyclePreset} position={[-0.3, 1.55, -2.04]}>
        <mesh>
          <planeGeometry args={[1.4, 1]} />
          <meshStandardMaterial color="black" roughness={0.12} metalness={0} blending={THREE.AdditiveBlending} depthWrite={false} envMapIntensity={2} />
        </mesh>
      </Clickable>
    </>
  );
}

export default defineVariant({ item: "window", id: "metal-frame", name: "Metal frame", Component: MetalFrame });
