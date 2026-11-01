import { HOMES } from "@/lib/room";
import { ITEMS } from "../registry";
import { flip, type U3 } from "./prims";

// A wall fixture's home in Unity coordinates and the yaw that faces it into the room, from its item definition.
export function onWallAt(id: string): { p: U3; yaw: number } {
  const d = ITEMS[id], w = d.walls ?? {};
  const yaw = d.onWall === "x" ? (w.x === 1 ? 90 : -90) : w.z === 1 ? 180 : 0;
  return { p: flip(HOMES[id].position as U3) as U3, yaw };
}
