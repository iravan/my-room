"use client";

import { useMemo } from "react";
import { Blob, C, DeskFrame, dice, Plastic, Prim } from "../../_shared/prims";
import { defineVariant } from "../../types";

// Bin under the desk's other end, with the shots that missed.
function Mesh() {
  const balls = useMemo(() => {
    const { R, int } = dice(5);
    return Array.from({ length: 1 + int(3) }, (_, i) => {
      const d = R(0.05, 0.07);
      return <Prim key={i} t="sphere" p={[R(-0.65, -0.2), 0.03, R(-0.5, -0.2)]} s={[d, d, d]} e={[R(0, 360), R(0, 360), 0]} c={C(0.85, 0.85, 0.8)} />;
    });
  }, []);
  return (
    <DeskFrame>
      <Blob p={[-0.45, 0, -0.05]} size={[0.32, 0.32]} />
      <Plastic t="cylinder" p={[-0.45, 0.15, -0.05]} s={[0.22, 0.15, 0.22]} c={C(0.15, 0.15, 0.17)} />
      {balls}
    </DeskFrame>
  );
}

export default defineVariant({ item: "bin", id: "mesh", name: "Bin", Component: Mesh });
