"use client";

import * as THREE from "three";
import { paint } from "@/lib/paint";

const smooth = (x: number) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
let tex: THREE.Texture | undefined;
const texture = () => (tex ??= paint(64, 64, (u, v) =>
  [0, 0, 0, 0.8 * smooth(Math.min(u, 1 - u) / 0.45) * smooth(Math.min(v, 1 - v) / 0.45)])); // soft rounded rect, stretches to any footprint
const QUAD = new THREE.PlaneGeometry(1, 1);

// Soft contact shadow on the floor under (x, z), 1.35× the footprint so it spills like real occlusion. Sits just above
// the rug; costs no shadow caster; stays when an item's look is replaced (core).
export function ContactShadow({ x, z, size }: { x: number; z: number; size: [number, number] }) {
  return (
    <mesh userData={{ core: true }} geometry={QUAD} position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[size[0] * 1.35, size[1] * 1.35, 1]}>
      <meshBasicMaterial color="black" map={texture()} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  );
}
