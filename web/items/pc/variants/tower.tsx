"use client";

import { CYAN, MAGENTA } from "@/lib/lighting";
import { Blob, C, DeskFrame, glowOf, Plastic, Prim, VIOLET } from "../../_shared/prims";
import { defineVariant } from "../../types";

// Gaming PC under the desk: glass front, three RGB fans.
function Tower() {
  return (
    <DeskFrame>
      <Blob p={[0.4, 0, 0.02]} size={[0.32, 0.55]} />
      <Plastic p={[0.4, 0.25, 0.02]} s={[0.22, 0.48, 0.44]} c={C(0.035, 0.035, 0.04)} cast />
      {[CYAN, VIOLET, MAGENTA].map((c, i) =>
        <Prim key={i} t="cylinder" p={[0.4, 0.1 + i * 0.14, -0.201]} s={[0.12, 0.002, 0.12]} e={[90, 0, 0]} glow={glowOf(c, 1.5)} />)}
    </DeskFrame>
  );
}

export default defineVariant({ item: "pc", id: "tower", name: "RGB tower", Component: Tower, footprint: () => [0.22, 0.44] });
