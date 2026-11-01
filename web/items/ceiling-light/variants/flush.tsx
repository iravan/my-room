"use client";

import { useLayout } from "@/lib/room";
import { C, Plastic } from "../../_shared/prims";
import { defineVariant } from "../../types";

// Flush ceiling light, off at night: a faint white dish.
function Flush() {
  const h = useLayout((s) => s.size.h);
  return <Plastic t="cylinder" p={[0, h - 0.115, 0.2]} s={[0.36, 0.015, 0.36]} c={C(0.75, 0.75, 0.78)} emissive={C(0.06, 0.055, 0.07)} />;
}

export default defineVariant({ item: "ceiling-light", id: "flush", name: "Flush dish", Component: Flush });
