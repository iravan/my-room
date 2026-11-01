"use client";

import { useMemo } from "react";
import { useGame, type Vec3 } from "@/lib/store";
import { srgb } from "@/lib/lighting";
import { useStyle } from "@/lib/room";
import { Clickable } from "@/components/room/Clickable";
import { defineVariant } from "../../types";

const METAL = srgb(0.55, 0.55, 0.7);
const LAMP: Vec3 = [-1.7, 0.54, 0.45];
const LIGHT_SCALE = { lamp: 4 };

// Drum-shade table lamp (click = on/off): metal base and stem, a shade that glows in the style's lamp colour while
// it's on, and the room's key light with soft shadows.
function DrumLamp() {
  const lamp = useGame((s) => s.lamp), toggleLamp = useGame((s) => s.toggleLamp), quality = useGame((s) => s.quality);
  const style = useStyle(), shade = useMemo(() => style.lamp.shade.clone().multiplyScalar(2), [style]);
  return (
    <>
      <Clickable onTap={toggleLamp} position={LAMP}>
        <mesh position={[0, 0.01, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.02, 24]} />
          <meshStandardMaterial color={METAL} metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.17, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.3, 12]} />
          <meshStandardMaterial color={METAL} metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.2, 32]} />
          <meshBasicMaterial color={lamp ? shade : "black"} toneMapped={false} />
        </mesh>
      </Clickable>
      <pointLight
        visible={lamp}
        position={[LAMP[0], LAMP[1] + 0.38, LAMP[2]]}
        color={style.lamp.light}
        intensity={LIGHT_SCALE.lamp * Math.max(0.25, style.exposure)}
        distance={5}
        decay={1.2}
        castShadow={quality > 0}
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.002}
        shadow-radius={quality === 2 ? 4 : 1} // three r18x dropped PCFSoftShadowMap: PCF softens by radius instead
      />
    </>
  );
}

export default defineVariant({ item: "lamp", id: "drum", name: "Drum shade", Component: DrumLamp });
