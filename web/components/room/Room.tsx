"use client";

import { Slab, tint } from "./Surface";
import { OPENING } from "./City";
import { HOMES, poseOf, useLayout } from "@/lib/room";
import type { Vec3 } from "@/lib/store";

// Tints multiply the photo albedo (values from the Unity room).
const FLOOR = tint(0.6, 0.55, 0.7);
const WALL = tint(0.22, 0.2, 0.36);
const CEILING = tint(0.22, 0.2, 0.36, 0.7);

// Back wall in four pieces round the window opening; the plaster is pinned to wall coordinates (room-side face:
// u = x, v = y) so the pieces join without seams, and the cut edges form the opening's reveal.
function BackWall() {
  const size = useLayout((s) => s.size), moved = useLayout((s) => s.items.window), home = HOMES.window.position;
  const win = moved ?? poseOf("window", HOMES.window, { items: {}, size }); // select plain values: a new object per read would re-render forever
  const k = win.scale, dx = win.position[0] - home[0], dy = win.position[1] - home[1];
  const cx = (OPENING.x0 + OPENING.x1) / 2 + dx, cy = (OPENING.y0 + OPENING.y1) / 2 + dy;
  const hw = ((OPENING.x1 - OPENING.x0) / 2) * k, hh = ((OPENING.y1 - OPENING.y0) / 2) * k;
  const x0 = cx - hw, x1 = cx + hw, y0 = cy - hh, y1 = cy + hh, X0 = -size.w / 2, X1 = size.w / 2, Y0 = -0.05, Y1 = size.h - 0.05;
  const pieces: [number, number, number, number][] = [[X0, Y0, x0, Y1], [x1, Y0, X1, Y1], [x0, Y0, x1, y0], [x0, y1, x1, Y1]];
  return (
    <>
      {pieces.map(([a, b, c, d]) => {
        const sz: Vec3 = [c - a, d - b, 0.1];
        return <Slab key={`${a}${b}`} set="grey_plaster" tile={1} size={sz} position={[(a + c) / 2, (b + d) / 2, -size.d / 2 - 0.05]} offset={[a + 0.37, b + 0.61]} color={WALL} cast={false} />;
      })}
    </>
  );
}

// Shell: width × height × depth from the room size (default 4 × 2.8 × 4 m), walls 10 cm thick just outside it.
export function RoomShell() {
  const { w, d, h } = useLayout((s) => s.size);
  return (
    <>
      <Slab set="dark_wooden_planks" tile={2} size={[w, 0.1, d]} position={[0, -0.05, 0]} color={FLOOR} cast={false} />
      <Slab set="grey_plaster" tile={1} size={[w, 0.1, d]} position={[0, h - 0.05, 0]} color={CEILING} cast={false} />
      <BackWall />
      <Slab set="grey_plaster" tile={1} size={[w, h, 0.1]} position={[0, h / 2 - 0.05, d / 2 + 0.05]} color={WALL} cast={false} />
      <Slab set="grey_plaster" tile={1} size={[0.1, h, d]} position={[-w / 2 - 0.05, h / 2 - 0.05, 0]} color={WALL} cast={false} />
      <Slab set="grey_plaster" tile={1} size={[0.1, h, d]} position={[w / 2 + 0.05, h / 2 - 0.05, 0]} color={WALL} cast={false} />
    </>
  );
}
