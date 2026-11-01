"use client";

import { Slab, tint } from "./Surface";
import { OPENING } from "./City";
import type { Vec3 } from "@/lib/store";

// Tints multiply the photo albedo (values from the Unity room).
const FLOOR = tint(0.6, 0.55, 0.7);
const WALL = tint(0.22, 0.2, 0.36);
const CEILING = tint(0.22, 0.2, 0.36, 0.7);

// Back wall in four pieces round the window opening; the plaster is pinned to wall coordinates (room-side face:
// u = x, v = y) so the pieces join without seams, and the cut edges form the opening's reveal.
function BackWall() {
  const { x0, x1, y0, y1 } = OPENING, X0 = -2, X1 = 2, Y0 = -0.05, Y1 = 2.75;
  const pieces: [number, number, number, number][] = [[X0, Y0, x0, Y1], [x1, Y0, X1, Y1], [x0, Y0, x1, y0], [x0, y1, x1, Y1]];
  return (
    <>
      {pieces.map(([a, b, c, d]) => {
        const size: Vec3 = [c - a, d - b, 0.1];
        return <Slab key={`${a}${b}`} set="grey_plaster" tile={1} size={size} position={[(a + c) / 2, (b + d) / 2, -2.05]} offset={[a + 0.37, b + 0.61]} color={WALL} cast={false} />;
      })}
    </>
  );
}

// Shell: 4 × 2.8 × 4 m, walls 10 cm thick just outside the room box.
export function RoomShell() {
  return (
    <>
      <Slab set="dark_wooden_planks" tile={2} size={[4, 0.1, 4]} position={[0, -0.05, 0]} color={FLOOR} cast={false} />
      <Slab set="grey_plaster" tile={1} size={[4, 0.1, 4]} position={[0, 2.75, 0]} color={CEILING} cast={false} />
      <BackWall />
      <Slab set="grey_plaster" tile={1} size={[4, 2.8, 0.1]} position={[0, 1.35, 2.05]} color={WALL} cast={false} />
      <Slab set="grey_plaster" tile={1} size={[0.1, 2.8, 4]} position={[-2.05, 1.35, 0]} color={WALL} cast={false} />
      <Slab set="grey_plaster" tile={1} size={[0.1, 2.8, 4]} position={[2.05, 1.35, 0]} color={WALL} cast={false} />
    </>
  );
}
