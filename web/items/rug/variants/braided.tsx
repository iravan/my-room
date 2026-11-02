"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useStyle } from "@/lib/room";
import { srgb } from "@/lib/lighting";
import { defineVariant } from "../../types";

// Round braided rug: concentric braids alternating the style's two rug colours, each a slightly raised rope with a
// twist pattern, and a soft dome so it sits on the floor like fabric. About 1.5 m across, centred where the rug lies.
const RINGS = 14, R = 0.75, ROPE = R / RINGS;

function Braided() {
  const { rug } = useStyle();
  const [a, b] = useMemo(() => [srgb(rug.a[0], rug.a[1], rug.a[2]), srgb(rug.b[0], rug.b[1], rug.b[2])], [rug]);
  const ropes = useMemo(() => Array.from({ length: RINGS }, (_, i) => {
    const r = (i + 0.5) * ROPE;
    // Braid twist: a thin tube wound round each ring, so it catches light like plaited cloth.
    const g = new THREE.TorusGeometry(r, ROPE * 0.55, 6, Math.max(24, Math.round(r * 120)));
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), y = p.getY(k), z = p.getZ(k), ang = Math.atan2(y, x);
      p.setZ(k, z * 0.45 + Math.sin(ang * r * 70) * ROPE * 0.08); // flatten, then twist bumps
    }
    g.computeVertexNormals();
    return g;
  }), []);
  return (
    <group position={[0, 0.006, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
      {ropes.map((g, i) => (
        <mesh key={i} geometry={g} receiveShadow>
          <meshStandardMaterial color={i % 3 === 2 ? a : i % 3 === 1 ? b.clone().lerp(a, 0.35) : b} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

export default defineVariant({ item: "rug", id: "braided", name: "Round braided", Component: Braided, footprint: () => [1.5, 1.5] });
