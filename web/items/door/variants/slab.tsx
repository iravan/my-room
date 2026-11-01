"use client";

import { C, G, Plastic, Walnut } from "../../_shared/prims";
import { defineVariant } from "../../types";

// Flat walnut door on the front wall beside the closet, in a painted casing; handle on the switch side.
function Slab() {
  const paint = C(0.5, 0.48, 0.56), steel = C(0.7, 0.7, 0.75);
  return (
    <G p={[1.4, 0, -2]} yaw={180}>
      <Walnut p={[0, 1.025, -0.02]} s={[0.8, 2.05, 0.04]} c={[0.55, 0.5, 0.5]} />
      {[-1, 1].map((s) => <Plastic key={s} p={[s * 0.43, 1.055, -0.01]} s={[0.06, 2.11, 0.02]} c={paint} />)}
      <Plastic p={[0, 2.08, -0.01]} s={[0.92, 0.06, 0.02]} c={paint} />
      <Plastic t="cylinder" p={[-0.3, 1, -0.045]} s={[0.05, 0.01, 0.05]} e={[90, 0, 0]} c={steel} />
      <Plastic p={[-0.26, 1, -0.065]} s={[0.12, 0.018, 0.02]} c={steel} />
    </G>
  );
}

export default defineVariant({ item: "door", id: "slab", name: "Flat door", Component: Slab });
