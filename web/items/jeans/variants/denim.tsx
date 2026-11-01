"use client";

import { useMemo } from "react";
import { dice, Fabric } from "../../_shared/prims";
import { defineVariant } from "../../types";

// Jeans kicked off: two legs splayed a little.
function Denim() {
  const splay = useMemo(() => { const { R } = dice(20); return [R(2, 12), R(2, 12)]; }, []);
  return <>{[-1, 1].map((s, i) => <Fabric key={s} p={[s * 0.09, 0.015, 0]} s={[0.16, 0.03, 0.75]} c={[0.2, 0.3, 0.55]} e={[0, s * splay[i], 0]} />)}</>;
}

export default defineVariant({ item: "jeans", id: "denim", name: "Jeans", Component: Denim });
