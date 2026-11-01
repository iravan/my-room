"use client";

import { useMemo } from "react";
import { CYAN, MAGENTA } from "@/lib/lighting";
import { Neon } from "@/components/room/Lighting";
import { T } from "../../desk/variants/gaming";
import { C, DeskFrame, dice, flip, Plastic } from "../../_shared/prims";
import { defineVariant } from "../../types";

// RGB keyboard (cyan or magenta underglow, per load) and mouse.
function Rgb() {
  const glow = useMemo(() => (dice(2).chance(0.5) ? CYAN : MAGENTA), []), black = C(0.035, 0.035, 0.04);
  return (
    <DeskFrame>
      <Plastic p={[-0.05, T + 0.016, -0.1]} s={[0.44, 0.022, 0.14]} c={black} />
      <Neon position={flip([-0.05, T + 0.004, -0.1])} size={[0.45, 0.004, 0.15]} color={glow} />
      <Plastic t="sphere" p={[0.27, T + 0.018, -0.1]} s={[0.065, 0.035, 0.11]} c={black} />
    </DeskFrame>
  );
}

export default defineVariant({ item: "keyboard", id: "rgb", name: "RGB keyboard", Component: Rgb });
