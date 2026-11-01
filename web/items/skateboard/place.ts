import { dice } from "../_shared/prims";

// Against the right wall, somewhere along it this load (Unity coords).
export const BOARD = { p: [1.76, 0, dice(21).R(-0.45, -0.25)] as [number, number, number] };
