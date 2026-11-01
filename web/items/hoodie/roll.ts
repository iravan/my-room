import { hsv } from "@/lib/paint";
import { dice } from "../_shared/prims";

// Where the hoodie ended up this load (0 over the chair, 1 on the floor, 2 on the closet hook) and its colour.
const { R, int } = dice(6);
export const HOODIE = { at: int(3), color: hsv(R(0, 1), R(0, 0.3), R(0.2, 0.5)) };
