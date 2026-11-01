"use client";

import { useMemo } from "react";
import { hsv } from "@/lib/paint";
import { PbrCapsule } from "@/components/room/Surface";
import { Blob, C, Ck, dice, flip, G, Plastic } from "../../_shared/prims";
import { defineVariant } from "../../types";

// A pair of canvas sneakers in a per-load colour; one knocked onto its side on some loads.
function Canvas() {
  const roll = useMemo(() => {
    const { R, chance } = dice(11);
    return { color: hsv(R(0, 1), 0.6, 0.8).map((v) => v * 1.4), knocked: chance(0.3), z: [R(-0.05, 0.05), R(-0.05, 0.05)], yaw: [R(-20, 20), R(-20, 20)] };
  }, []);
  return (
    <>
      <Blob p={[0, 0, 0]} size={[0.4, 0.42]} />
      {[-1, 1].map((s, i) => {
        const knocked = s === 1 && roll.knocked;
        return (
          <G key={s} p={[s * 0.09 + (knocked ? 0.05 : 0), knocked ? 0.05 : 0, roll.z[i]]} e={[0, roll.yaw[i], knocked ? 80 : 0]}>
            <Plastic p={[0, 0.018, 0]} s={[0.1, 0.035, 0.28]} c={C(0.92, 0.92, 0.9)} />
            <PbrCapsule set="cotton_jersey" tile={0.26} position={flip([0, 0.06, -0.01])} scale={[0.09, 0.12, 0.07]} rotation={[90, 0, 0]} color={Ck(roll.color)} cast={false} />
          </G>
        );
      })}
    </>
  );
}

export default defineVariant({ item: "sneakers", id: "canvas", name: "Canvas sneakers", Component: Canvas });
