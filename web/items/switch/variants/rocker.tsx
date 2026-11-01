"use client";

import { C, G, Plastic } from "../../_shared/prims";
import { onWallAt } from "../../_shared/wall";
import { defineVariant } from "../../types";

// Rocker light switch.
function Rocker({ id }: { id: string }) {
  const { p, yaw } = onWallAt(id);
  return (
    <G p={p} yaw={yaw}>
      <Plastic p={[0, 0, -0.004]} s={[0.08, 0.08, 0.008]} c={C(0.8, 0.8, 0.78)} />
      <Plastic p={[0, 0, -0.01]} s={[0.025, 0.04, 0.006]} e={[8, 0, 0]} c={C(0.8, 0.8, 0.78, 0.9)} />
    </G>
  );
}

export default defineVariant({ item: "switch", id: "rocker", name: "Rocker", Component: Rocker });
