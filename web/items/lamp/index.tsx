"use client";

import { HOMES } from "@/lib/room";
import { RoomItem } from "@/components/room/RoomItem";
import { useVariant } from "../resolve";
import { Dust } from "./Dust";

// The lamp item: its current look and the dust drifting in its glow. Stands on the nightstand (see item.ts).
export function LampItem() {
  const v = useVariant("lamp");
  if (!v) return null;
  return (
    <RoomItem id="lamp" home={HOMES.lamp}>
      <v.Component />
      <Dust />
    </RoomItem>
  );
}
