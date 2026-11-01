"use client";

import { useGame, type Vec3 } from "@/lib/store";
import { CRATE } from "@/lib/layout";
import { MAGENTA, srgb } from "@/lib/lighting";
import { Neon } from "@/components/room/Lighting";
import { Clickable } from "@/components/room/Clickable";
import { Slab } from "@/components/room/Surface";
import { ContactShadow } from "../../_shared/ContactShadow";
import { defineVariant } from "../../types";

const PINE = srgb(0.45, 0.35, 0.45);

// Record crate (click = crate view).
function Box() {
  const setView = useGame((s) => s.setView);
  const sides: { position: Vec3; size: Vec3 }[] = [
    { position: [0, 0.01, 0], size: [0.38, 0.02, 0.6] },
    { position: [-0.19, 0.11, 0], size: [0.02, 0.22, 0.6] },
    { position: [0.19, 0.11, 0], size: [0.02, 0.22, 0.6] },
    { position: [0, 0.11, 0.3], size: [0.4, 0.22, 0.02] },
    { position: [0, 0.11, -0.3], size: [0.4, 0.22, 0.02] },
  ];
  return (
    <Clickable onTap={() => setView("crate")} position={CRATE}>
      {sides.map((p, i) => <Slab key={i} set="coated_pine" tile={0.74} {...p} color={PINE} />)}
      <Neon position={[0, 0.222, 0.3]} size={[0.4, 0.006, 0.022]} color={MAGENTA} />
    </Clickable>
  );
}

const Crate = () => <><Box /><ContactShadow x={CRATE[0]} z={CRATE[2]} size={[0.55, 0.8]} /></>;

export default defineVariant({ item: "crate", id: "pine", name: "Pine crate", Component: Crate, footprint: () => [0.4, 0.62] });
