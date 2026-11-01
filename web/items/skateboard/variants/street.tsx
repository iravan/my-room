"use client";

import { useMemo } from "react";
import { C, dice, G, Plastic, Prim } from "../../_shared/prims";
import { posterTexture } from "../../poster/variants/print";
import { defineVariant } from "../../types";

// Street deck leaning against the wall: printed underside, two trucks with wheels.
function Street() {
  const map = useMemo(() => posterTexture(dice(14).int(1e9)), []), steel = C(0.2, 0.2, 0.25);
  return (
    <G p={[0, 0, 0]} e={[0, 0, -12]}>
      <Prim p={[0, 0.42, 0]} s={[0.015, 0.8, 0.21]} map={map} />
      {[0.14, 0.7].map((y) => (
        <group key={y}>
          <Plastic p={[-0.02, y, 0]} s={[0.025, 0.03, 0.15]} c={steel} />
          {[-1, 1].map((s) => <Plastic key={s} t="cylinder" p={[-0.04, y, s * 0.08]} s={[0.055, 0.015, 0.055]} e={[0, 0, 90]} c={C(0.95, 0.9, 0.8)} />)}
        </group>
      ))}
    </G>
  );
}

export default defineVariant({ item: "skateboard", id: "street", name: "Street deck", Component: Street });
