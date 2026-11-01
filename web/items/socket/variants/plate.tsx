"use client";

import { C, G, Plastic, Prim } from "../../_shared/prims";
import { onWallAt } from "../../_shared/wall";
import { defineVariant } from "../../types";
import sockets from "../item";

// Two-pin socket on a square faceplate.
function Plate({ id }: { id: string }) {
  const { p, yaw } = onWallAt(id);
  return (
    <G p={p} yaw={yaw}>
      <Plastic p={[0, 0, -0.004]} s={[0.08, 0.08, 0.008]} c={C(0.8, 0.8, 0.78)} />
      {[-0.012, 0.012].map((x) => <Prim key={x} p={[x, 0, -0.0085]} s={[0.006, 0.016, 0.002]} c={C(0.05, 0.05, 0.05)} />)}
    </G>
  );
}

export default defineVariant({ item: sockets.map((s) => s.id), id: "plate", name: "Faceplate", Component: Plate });
