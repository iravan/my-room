"use client";

import { useMemo } from "react";
import { paint, rng, type RGBA } from "@/lib/paint";
import { C, dice, G, Plastic, Prim } from "../../_shared/prims";
import { onWallAt } from "../../_shared/wall";
import { SIZE } from "./print";
import { defineVariant } from "../../types";
import posters from "../item";

// Botanical print: a leafy stem drawn in ink and green wash on warm paper, a new plant every load, behind a white mat
// in a thin wooden frame that hangs straight (unlike the gig prints).
function botanical(seed: number) {
  const r = rng(seed), leaves = 5 + Math.floor(r() * 5), lean = (r() - 0.5) * 0.25, hue = r();
  const leaf = Array.from({ length: leaves }, (_, i) => ({ v: 0.2 + (i / leaves) * 0.65, side: i % 2 ? 1 : -1, len: 0.12 + r() * 0.12, w: 0.035 + r() * 0.03 }));
  const green: RGBA = [0.32 + hue * 0.15, 0.48 + hue * 0.1, 0.28], ink: RGBA = [0.18, 0.2, 0.16];
  return paint(96, 128, (u, v) => {
    const y = v, sx = 0.5 + lean * (y - 0.1); // v runs bottom → top: the stem grows up from the name
    if (y > 0.1 && y < 0.9 && Math.abs(u - sx) < 0.006) return ink;
    for (const l of leaf) {
      const dx = (u - (0.5 + lean * (l.v - 0.1))) * l.side, dy = y - l.v - dx * 0.6;
      if (dx > 0 && dx < l.len) {
        const half = l.w * Math.sin((dx / l.len) * Math.PI);
        if (Math.abs(dy) < half) return Math.abs(dy) < 0.004 ? ink : green;
      }
    }
    if (y < 0.06 && u > 0.3 && u < 0.7 && (u * 30) % 1 < 0.6) return [0.4, 0.38, 0.34]; // the name, as a line of type
    return [0.93, 0.9, 0.82];
  });
}

function Botanical({ id }: { id: string }) {
  const { p, yaw } = onWallAt(id);
  const map = useMemo(() => botanical(dice(30 + posters.findIndex((d) => d.id === id)).int(1e9)), [id]);
  const [w, h] = SIZE[id] ?? [0.45, 0.62], f = 0.025, wood = C(0.45, 0.32, 0.22);
  return (
    <G p={p} yaw={yaw}>
      {/* Frame: four rails standing 2 cm off the wall, the mat, then the print */}
      <Plastic p={[0, h / 2 + f / 2, 0.01]} s={[w + 2 * f, f, 0.02]} c={wood} />
      <Plastic p={[0, -h / 2 - f / 2, 0.01]} s={[w + 2 * f, f, 0.02]} c={wood} />
      {[-1, 1].map((s) => <Plastic key={s} p={[s * (w / 2 + f / 2), 0, 0.01]} s={[f, h, 0.02]} c={wood} />)}
      <Prim t="quad" p={[0, 0, 0.004]} s={[w, h]} c={C(0.95, 0.94, 0.9)} gloss={0.05} />
      <Prim t="quad" p={[0, 0.01, 0.0035]} s={[w * 0.72, h * 0.72]} map={map} gloss={0.05} />
    </G>
  );
}

export default defineVariant({ item: posters.map((d) => d.id), id: "botanical", name: "Framed botanical", Component: Botanical });
