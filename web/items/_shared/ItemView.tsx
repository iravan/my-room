"use client";

import { useMemo } from "react";
import { HOMES } from "@/lib/room";
import { RoomItem } from "@/components/room/RoomItem";
import { useVariant } from "../resolve";
import { flip, G, type U3 } from "./prims";

// An item drawn by its current look, at its place. Looks bring their own contact shadow. Clutter has no fixed home:
// `place` is where it landed this load (Unity coords) and its look is drawn there, turned by `yaw`.
export function ItemView({ id, place }: { id: string; place?: { p: U3; yaw?: number } }) {
  const v = useVariant(id);
  const home = useMemo(() => (place ? { position: flip(place.p) } : HOMES[id]), [id, place]);
  if (!v) return null;
  const look = <v.Component id={id} />;
  return <RoomItem id={id} home={home}>{place ? <G p={place.p} yaw={place.yaw}>{look}</G> : look}</RoomItem>;
}
