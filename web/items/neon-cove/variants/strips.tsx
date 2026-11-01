"use client";

import { CYAN, MAGENTA } from "@/lib/lighting";
import { useLayout } from "@/lib/room";
import { Neon } from "@/components/room/Lighting";
import { defineVariant } from "../../types";

// Neon strips along the top of the walls: magenta left/back, cyan right/front (matte trim in styles without glow).
function Strips() {
  const size = useLayout((s) => s.size);
  return (
    <>
      <Neon position={[0, size.h - 0.12, -size.d / 2 + 0.03]} size={[size.w - 0.1, 0.03, 0.03]} color={MAGENTA} />
      <Neon position={[-size.w / 2 + 0.03, size.h - 0.12, 0]} size={[0.03, 0.03, size.d - 0.1]} color={MAGENTA} />
      <Neon position={[0, size.h - 0.12, size.d / 2 - 0.03]} size={[size.w - 0.1, 0.03, 0.03]} color={CYAN} />
      <Neon position={[size.w / 2 - 0.03, size.h - 0.12, 0]} size={[0.03, 0.03, size.d - 0.1]} color={CYAN} />
    </>
  );
}

export default defineVariant({ item: "neon-cove", id: "strips", name: "Neon strips", Component: Strips });
