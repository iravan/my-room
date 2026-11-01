"use client";

import { useMemo } from "react";
import { CYAN } from "@/lib/lighting";
import { T } from "../../desk/variants/gaming";
import { C, DeskFrame, dice, G, glowOf, Plastic, Prim } from "../../_shared/prims";
import { defineVariant } from "../../types";

// Gaming headset on its stand, turned however it was put down.
function Stand() {
  const yaw = useMemo(() => dice(3).R(-40, 40), []);
  const black = C(0.035, 0.035, 0.04), band = 0.085, top = 0.19;
  return (
    <DeskFrame>
      <G p={[-0.42, T, -0.14]} yaw={yaw}>
        <Plastic t="cylinder" p={[0, 0.004, 0]} s={[0.1, 0.004, 0.1]} c={black} />
        <Plastic t="cylinder" p={[0, 0.13, 0]} s={[0.015, 0.13, 0.015]} c={black} />
        {Array.from({ length: 9 }, (_, i) => {
          const a = (i * 180) / 8, r = (a * Math.PI) / 180;
          return <Plastic key={i} p={[Math.cos(r) * band, top + Math.sin(r) * band, 0]} s={[0.036, 0.012, 0.03]} e={[0, 0, a + 90]} c={black} />;
        })}
        {[-1, 1].map((s) => (
          <group key={s}>
            <Plastic t="cylinder" p={[s * (band + 0.005), top - 0.035, 0]} s={[0.085, 0.02, 0.085]} e={[0, 0, 90]} c={black} />
            <Prim t="cylinder" p={[s * (band + 0.026), top - 0.035, 0]} s={[0.05, 0.002, 0.05]} e={[0, 0, 90]} glow={glowOf(CYAN, 1.5)} />
          </group>
        ))}
      </G>
    </DeskFrame>
  );
}

export default defineVariant({ item: "headset", id: "stand", name: "Headset on a stand", Component: Stand });
