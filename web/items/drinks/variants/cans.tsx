"use client";

import { useMemo } from "react";
import { paint } from "@/lib/paint";
import { T } from "../../desk/variants/gaming";
import { C, DeskFrame, dice, Plastic, Prim } from "../../_shared/prims";
import { defineVariant } from "../../types";

const canTexture = () => paint(32, 32, (u, v) =>
  v > 0.9 || v < 0.08 ? [0.75, 0.75, 0.78] : Math.abs(((u * 4) % 1) - 0.5) < 0.12 ? [0.4, 1, 0.2] : [0.05, 0.05, 0.06]);

// Whatever got left on the desk this time: energy cans, the odd plastic cup.
function Cans() {
  const drinks = useMemo(() => {
    const { R, chance } = dice(4), can = canTexture();
    return ([[0.42, -0.22], [0.52, -0.02], [0.26, 0.06], [-0.3, 0.05]] as const).map(([x, z], i) => {
      if (!chance(0.55)) return null;
      return chance(0.25)
        ? <Plastic key={i} t="cylinder" p={[x, T + 0.05, z]} s={[0.08, 0.05, 0.08]} c={C(0.85, 0.85, 0.82)} />
        : <Prim key={i} t="cylinder" p={[x, T + 0.061, z]} s={[0.066, 0.061, 0.066]} e={[0, R(0, 360), 0]} map={can} gloss={0.75} />;
    });
  }, []);
  return <DeskFrame>{drinks}</DeskFrame>;
}

export default defineVariant({ item: "drinks", id: "cans", name: "Cans", Component: Cans });
