"use client";

import { useMemo } from "react";
import { hsv, lerp, paint, rng, type RGBA } from "@/lib/paint";
import { dice, Prim } from "../../_shared/prims";
import { onWallAt } from "../../_shared/wall";
import { defineVariant } from "../../types";
import posters from "../item";

// Gig poster: two-colour gradient, striped sun or rings, title blocks along the bottom.
export function posterTexture(seed: number) {
  const r = rng(seed), h = r(), h2 = (h + 0.3 + r() * 0.4) % 1;
  const a = hsv(h, 0.8, 0.35), b = hsv(h2, 0.7, 0.9), ink = hsv((h + 0.5) % 1, 0.6, 1), rings = r() < 0.5;
  return paint(90, 128, (u, v) => {
    if (v < 0.16) return u > 0.1 && u < 0.9 && v > 0.05 && v < 0.11 && (u * 12) % 1 < 0.8 ? [1, 1, 1] : [0.05, 0.05, 0.07];
    const d = Math.hypot(u - 0.5, v * 1.42 - 0.85);
    if (rings ? d < 0.38 && (d * 12) % 1 < 0.5 : d < 0.3 && (v > 0.6 || (v * 40) % 1 < 0.6)) return ink;
    return lerp(a, b, v) as RGBA;
  });
}


export const SIZE: Record<string, [number, number]> = { "poster-desk": [0.45, 0.62], "poster-1": [0.5, 0.7], "poster-2": [0.4, 0.56] };

// A printed gig poster, a new design every load, hung slightly crooked.
function Print({ id }: { id: string }) {
  const { p, yaw } = onWallAt(id);
  const { map, tilt } = useMemo(() => {
    const { R, int } = dice(15 + posters.findIndex((d) => d.id === id));
    return { tilt: R(-2.5, 2.5), map: posterTexture(int(1e9)) };
  }, [id]);
  return <Prim t="quad" p={p} e={[0, yaw, tilt]} s={SIZE[id] ?? [0.45, 0.62]} map={map} gloss={0.1} />;
}

export default defineVariant({ item: posters.map((d) => d.id), id: "print", name: "Gig print", Component: Print });
