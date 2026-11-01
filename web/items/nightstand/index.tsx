"use client";

import { HOMES } from "@/lib/room";
import { RoomItem } from "@/components/room/RoomItem";
import { ContactShadow } from "../_shared/ContactShadow";
import { useVariant } from "../resolve";

// The nightstand item: its current look plus a contact shadow. The lamp is its own item standing on it.
export function NightstandItem() {
  const v = useVariant("nightstand");
  if (!v) return null;
  const [w, d] = v.footprint?.() ?? [0.45, 0.4], [x, , z] = HOMES.nightstand.position;
  return (
    <RoomItem id="nightstand" home={HOMES.nightstand}>
      <v.Component id="nightstand" />
      <ContactShadow x={x} z={z} size={[w + 0.15, d + 0.15]} />
    </RoomItem>
  );
}
