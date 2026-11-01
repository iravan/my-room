"use client";

import { useMemo } from "react";
import { paint } from "@/lib/paint";
import { useStyle } from "@/lib/room";
import { defineVariant } from "../../types";

type RGB3 = [number, number, number];

function gridTexture(a: RGB3, b: RGB3) {
  return paint(128, 128, (u, v) => {
    const x = Math.round(u * 127), y = Math.round(v * 127);
    return x % 16 === 0 || y % 16 === 0 || x === 127 || y === 127 ? a : b;
  });
}

// Glowing synthwave grid in the style's two rug colours.
function NeonGrid() {
  const { rug } = useStyle(), map = useMemo(() => gridTexture(rug.a, rug.b), [rug]);
  return (
    <mesh position={[0, 0.005, -0.2]} receiveShadow>
      <boxGeometry args={[1.8, 0.01, 1.3]} />
      <meshBasicMaterial map={map} color={[1.6, 1.6, 1.6]} toneMapped={false} />
    </mesh>
  );
}

export default defineVariant({ item: "rug", id: "neon-grid", name: "Neon grid", Component: NeonGrid });
