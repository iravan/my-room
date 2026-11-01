"use client";

import { useLayout } from "@/lib/room";
import { C, Plastic, Prim } from "../../_shared/prims";
import { defineVariant } from "../../types";

// Round smoke detector with its red LED.
function Round() {
  const h = useLayout((s) => s.size.h);
  return (
    <>
      <Plastic t="cylinder" p={[0.9, h - 0.11, -0.6]} s={[0.11, 0.01, 0.11]} c={C(0.8, 0.8, 0.78)} />
      <Prim t="sphere" p={[0.93, h - 0.122, -0.6]} s={[0.008, 0.008, 0.008]} glow={C(2, 0.1, 0.1)} />
    </>
  );
}

export default defineVariant({ item: "smoke-detector", id: "round", name: "Round", Component: Round });
