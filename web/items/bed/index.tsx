"use client";

import { useLayout, HOMES } from "@/lib/room";
import { RoomItem } from "@/components/room/RoomItem";
import { ContactShadow } from "../_shared/ContactShadow";
import { useVariant, variantOf } from "../resolve";
import def from "./item";

// The bed item: its current look, at its place, with a contact shadow sized from that look's footprint.
// Behaviour that isn't the look (clicking cycles the duvet) lives in the look for now, since only one exists.
export function BedItem() {
  const v = useVariant("bed"), size = useLayout((s) => s.options.bed?.size);
  if (!v) return null;
  const [w, d] = v.footprint?.(size) ?? [1.1, 2.1], [hx, , hz] = def.home!.position;
  return (
    <RoomItem id="bed" home={HOMES.bed}>
      <v.Component id="bed" />
      <ContactShadow x={hx + (w - 1.02) / 2} z={hz} size={[w + 0.28, d + 0.31]} />
    </RoomItem>
  );
}

// Top of whatever bed is there, at world (x, z): for the laptop, phone and controller resting on it.
export const bedSurfaceY = (x: number, z: number) => variantOf("bed")?.surfaceY?.(x, z) ?? 0.5;

// A gadget left on the bed (Unity x, z, lift above the duvet, yaw) → where it lies now, on the current look's top.
export const onBed = (q: { x: number; z: number; lift: number; yaw: number }) =>
  ({ p: [q.x, bedSurfaceY(q.x, -q.z) + q.lift, q.z] as [number, number, number], yaw: q.yaw });
