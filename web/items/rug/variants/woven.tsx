"use client";

import { useMemo } from "react";
import { paint } from "@/lib/paint";
import { useStyle } from "@/lib/room";
import { defineVariant } from "../../types";

type RGB3 = [number, number, number];

// Woven rug in the style's two colours: a double border, a field of fine stripes, a medallion in the middle.
function wovenTexture(a: RGB3, b: RGB3) {
  return paint(256, 256, (u, v) => {
    const edge = Math.min(u, 1 - u, v, 1 - v), weave = 0.93 + 0.07 * Math.sin(u * 256 * Math.PI) * Math.sin(v * 256 * Math.PI);
    const d = Math.abs(u - 0.5) + Math.abs(v - 0.5) * 1.4; // diamond medallion
    let c: number[] = b;
    if (edge < 0.05 || (edge > 0.07 && edge < 0.085)) c = a;
    else if (edge >= 0.085 && (Math.abs(d - 0.22) < 0.02 || d < 0.08 || (v * 18) % 1 < 0.07)) c = a.map((x, i) => x * 0.7 + b[i] * 0.3);
    return [c[0] * weave, c[1] * weave, c[2] * weave];
  });
}

function Woven() {
  const { rug } = useStyle(), map = useMemo(() => wovenTexture(rug.a, rug.b), [rug]);
  return (
    <mesh position={[0, 0.005, -0.2]} receiveShadow>
      <boxGeometry args={[1.8, 0.01, 1.3]} />
      <meshStandardMaterial map={map} roughness={1} />
    </mesh>
  );
}

export default defineVariant({ item: "rug", id: "woven", name: "Woven", Component: Woven });
