"use client";

import type { ReactNode } from "react";
import { useLayout, type Home } from "@/lib/room";

// Renders an item where the layout puts it. Children are modelled at `home`; with no saved pose this is a no-op.
// Several <RoomItem> with the same id (e.g. the cabinet, its spines and the turntable on it) move together.
export function RoomItem({ id, home, children }: { id: string; home: Home; children: ReactNode }) {
  const pose = useLayout((s) => s.items[id]);
  const yaw = home.rotationY ?? 0;
  return (
    <group position={pose?.position ?? home.position} rotation={[0, (pose?.rotationY ?? yaw) - yaw, 0]} scale={pose?.scale ?? 1} userData={{ roomItem: id }}>
      <group position={[-home.position[0], -home.position[1], -home.position[2]]}>{children}</group>
    </group>
  );
}
