"use client";

import { T } from "../../desk/variants/gaming";
import { C, DeskFrame, Plastic, Prim } from "../../_shared/prims";
import { defineVariant } from "../../types";

// A pair of small speakers either side of the monitor.
function Bookshelf() {
  const black = C(0.035, 0.035, 0.04);
  return (
    <DeskFrame>
      {[-0.48, 0.48].map((x) => (
        <group key={x}>
          <Plastic p={[x, T + 0.08, 0.14]} s={[0.09, 0.16, 0.1]} c={black} />
          <Prim t="cylinder" p={[x, T + 0.07, 0.089]} s={[0.06, 0.002, 0.06]} e={[90, 0, 0]} c={C(0.12, 0.12, 0.14)} />
        </group>
      ))}
    </DeskFrame>
  );
}

export default defineVariant({ item: "speakers", id: "bookshelf", name: "Bookshelf speakers", Component: Bookshelf });
