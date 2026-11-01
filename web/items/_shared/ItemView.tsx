"use client";

import { HOMES } from "@/lib/room";
import { RoomItem } from "@/components/room/RoomItem";
import { useVariant } from "../resolve";

// An item drawn by its current look, at its place. Looks bring their own contact shadow.
export function ItemView({ id }: { id: string }) {
  const v = useVariant(id);
  if (!v) return null;
  return <RoomItem id={id} home={HOMES[id]}><v.Component /></RoomItem>;
}
