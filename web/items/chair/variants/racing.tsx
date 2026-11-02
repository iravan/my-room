"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { srgb } from "@/lib/lighting";
import { PbrMaterial, projectUVs, rounded, softBox } from "@/components/room/Surface";
import { dice } from "../../_shared/prims";
import { HOODIE } from "../../hoodie/roll";
import { defineVariant } from "../../types";

// Racing-style gaming chair: bucket seat with raised side bolsters, a tall back that narrows at the waist and wraps
// forward at the sides, accent-coloured bolsters, a headrest pillow, armrests on brackets, chrome gas lift and a
// five-star base on twin-wheel casters. Local frame: the sitter faces −z (toward the desk), the back is at +z.
type RGB = number[];
const LEATHER = srgb(0.045, 0.045, 0.05); // dyed PU leather: grain from the photo, colour from here
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const SEAT_Y = 0.46, BACK = { y: 0.92, z: 0.25, h: 0.84 };

const plastic = new THREE.MeshStandardMaterial({ color: srgb(0.03, 0.03, 0.035), roughness: 0.45 });
const chrome = new THREE.MeshStandardMaterial({ color: srgb(0.8, 0.8, 0.85), metalness: 1, roughness: 0.18 });

function build(accent: RGB) {
  const acc = srgb(accent[0], accent[1], accent[2], 1.2);
  const two = (bolster: number) => (bolster > 0.5 ? acc : LEATHER);
  const seat = softBox(0.52, 0.1, 0.5, 0.04, 0.22, (x, y, z) => {
    const side = smooth(0.12, 0.24, Math.abs(x)), top = y > 0 ? 1 : 0;
    const dip = 0.014 * (1 - (x / 0.26) ** 2) * (1 - (z / 0.25) ** 2);
    return [x, y + top * (0.04 * side - dip * (1 - side)), z];
  }, (x) => two(smooth(0.15, 0.2, Math.abs(x))));
  const back = softBox(0.54, BACK.h, 0.1, 0.045, 0.22, (x, y, z) => {
    const v = y / BACK.h + 0.5; // 0 bottom .. 1 top
    const waist = 0.8 + 0.2 * smooth(0.25, 0.65, v) + 0.06 * (1 - smooth(0, 0.18, v)); // narrow lumbar, wide shoulders
    const wrap = z < 0 ? 0.05 * smooth(0.13, 0.25, Math.abs(x)) * smooth(0.05, 0.3, v) * (1 - 0.6 * smooth(0.8, 1, v)) : 0;
    const lumbar = -0.025 * Math.exp(-(((v - 0.3) / 0.12) ** 2)); // pushes the lower back toward the sitter
    return [x * waist, y, z - wrap + lumbar];
  }, (x, y) => two(smooth(0.16, 0.2, Math.abs(x)) * (y / BACK.h + 0.5 < 0.93 ? 1 : 0)));
  const headrest = softBox(0.26, 0.11, 0.09, 0.04, 0.22, (x, y, z) => [x, y * (1 - 0.35 * (x / 0.13) ** 4), z * (1 - 0.3 * (x / 0.13) ** 4)], () => acc);
  return {
    seat, back, headrest,
    pad: rounded(0.075, 0.03, 0.26, 0.012, 0.4),
    post: rounded(0.035, 0.2, 0.05, 0.008, 1),
    bracket: rounded(0.12, 0.02, 0.05, 0.006, 1),
    mech: rounded(0.22, 0.05, 0.26, 0.01, 1),
    shroud: new THREE.CylinderGeometry(0.032, 0.036, 0.2, 24),
    piston: new THREE.CylinderGeometry(0.014, 0.014, 0.12, 16),
    hub: new THREE.CylinderGeometry(0.045, 0.05, 0.05, 24),
    arm: projectUVs(rounded(0.045, 0.035, 0.27, 0.012, 1), 1),
    stem: new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8),
    housing: rounded(0.035, 0.03, 0.05, 0.01, 1),
    wheel: new THREE.CylinderGeometry(0.024, 0.024, 0.013, 20).rotateZ(Math.PI / 2),
  };
}

function Chair({ accent, hoodieOn }: { accent: RGB; hoodieOn: boolean }) {
  const g = useMemo(() => build(accent), [accent]);
  const leather = <PbrMaterial set="fabric_leather_02" color={new THREE.Color(1, 1, 1)} metal={0} vertexColors grainOnly />;
  return (
    <>
      {/* Five-star base on twin-wheel casters */}
      <mesh geometry={g.hub} material={plastic} position={[0, 0.085, 0]} />
      {Array.from({ length: 5 }, (_, i) => (
        <group key={i} rotation={[0, (i * 2 * Math.PI) / 5, 0]}>
          <mesh geometry={g.arm} material={plastic} position={[0, 0.075, 0.15]} rotation={[-0.12, 0, 0]} castShadow />
          <mesh geometry={g.stem} material={chrome} position={[0, 0.06, 0.285]} />
          <mesh geometry={g.housing} material={plastic} position={[0, 0.04, 0.29]} />
          {[-1, 1].map((s) => <mesh key={s} geometry={g.wheel} material={plastic} position={[s * 0.013, 0.024, 0.3]} />)}
        </group>
      ))}
      {/* Gas lift and seat mechanism */}
      <mesh geometry={g.shroud} material={plastic} position={[0, 0.2, 0]} />
      <mesh geometry={g.piston} material={chrome} position={[0, 0.34, 0]} />
      <mesh geometry={g.mech} material={plastic} position={[0, 0.39, 0.02]} />
      {/* Seat and back */}
      <mesh geometry={g.seat} position={[0, SEAT_Y, 0]} castShadow receiveShadow>{leather}</mesh>
      <group position={[0, BACK.y, BACK.z]} rotation={[0.17, 0, 0]}>
        <mesh geometry={g.back} castShadow receiveShadow>{leather}</mesh>
        {!hoodieOn && <mesh geometry={g.headrest} position={[0, 0.27, -0.09]} receiveShadow>{leather}</mesh>}
      </group>
      {/* Armrests: bracket from under the seat, post, soft pad */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={g.bracket} material={plastic} position={[s * 0.24, 0.405, 0.02]} />
          <mesh geometry={g.post} material={plastic} position={[s * 0.29, 0.52, 0.02]} />
          <mesh geometry={g.pad} material={plastic} position={[s * 0.29, 0.635, 0]} castShadow />
        </group>
      ))}
    </>
  );
}

// Accent colour rolled per load (magenta or cyan bolsters); the headrest pillow hides under a draped hoodie.
const ACCENT = (dice(7).chance(0.5) ? [0.9, 0.2, 0.6] : [0.2, 0.7, 0.9]).map((v) => v * 0.6);
const Racing = () => <Chair accent={ACCENT} hoodieOn={HOODIE.at === 0} />;

export default defineVariant({ item: "chair", id: "racing", name: "Racing chair", Component: Racing, footprint: () => [0.7, 0.7],
  anchors: { backTop: [0, 1.36, -0.36] }, // Unity coords: where a hoodie hangs over the headrest
});
