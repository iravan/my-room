"use client";

import { useMemo } from "react";
import { useGame, type Vec3 } from "@/lib/store";
import { srgb } from "@/lib/lighting";
import { useStyle } from "@/lib/room";
import { Clickable } from "@/components/room/Clickable";
import { defineVariant } from "../../types";

const WOOD = srgb(0.32, 0.22, 0.15);
const LAMP: Vec3 = [-1.7, 0.54, 0.45];
const LIGHT_SCALE = { lamp: 4 };

// Paper lantern (click = on/off): a ribbed paper globe on a short wooden stand, glowing warm and soft. The light sits
// a little lower than the drum's, inside the globe; same key light for the room.
const RIBS = 9;
function Lantern() {
  const lamp = useGame((s) => s.lamp), toggleLamp = useGame((s) => s.toggleLamp), quality = useGame((s) => s.quality);
  const style = useStyle(), glow = useMemo(() => style.lamp.shade.clone().multiplyScalar(1.6), [style]);
  const ribs = useMemo(() => Array.from({ length: RIBS }, (_, i) => 0.21 + (i - (RIBS - 1) / 2) * 0.027), []);
  return (
    <>
      <Clickable onTap={toggleLamp} position={LAMP}>
        <mesh position={[0, 0.012, 0]} castShadow>
          <boxGeometry args={[0.13, 0.024, 0.13]} />
          <meshStandardMaterial color={WOOD} roughness={0.7} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.05, 0.06, 0]} castShadow>
            <boxGeometry args={[0.012, 0.09, 0.012]} />
            <meshStandardMaterial color={WOOD} roughness={0.7} />
          </mesh>
        ))}
        <mesh position={[0, 0.21, 0]} scale={[1, 0.9, 1]}>
          <sphereGeometry args={[0.13, 32, 20]} />
          <meshBasicMaterial color={lamp ? glow : srgb(0.85, 0.82, 0.75)} toneMapped={!lamp} />
        </mesh>
        {/* Bamboo ribs round the paper */}
        {ribs.map((y) => {
          const r = 0.131 * Math.sqrt(Math.max(0, 1 - ((y - 0.21) / 0.117) ** 2));
          return r > 0.02 && (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[r, 0.0018, 4, 40]} />
              <meshStandardMaterial color={lamp ? glow.clone().multiplyScalar(0.55) : srgb(0.6, 0.55, 0.45)} roughness={0.8} />
            </mesh>
          );
        })}
      </Clickable>
      <pointLight
        visible={lamp}
        position={[LAMP[0], LAMP[1] + 0.21, LAMP[2]]}
        color={style.lamp.light}
        intensity={LIGHT_SCALE.lamp * Math.max(0.25, style.exposure)}
        distance={5}
        decay={1.2}
        castShadow={quality > 0}
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.002}
        shadow-radius={quality === 2 ? 4 : 1}
      />
    </>
  );
}

export default defineVariant({ item: "lamp", id: "lantern", name: "Paper lantern", Component: Lantern });
