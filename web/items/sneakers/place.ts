import { dice } from "../_shared/prims";

// Where the sneakers were kicked off this load (Unity coords).
const { R } = dice(12);
export const SNEAKERS = { p: [R(-0.85, -0.6), 0, R(-0.6, -0.4)] as [number, number, number], yaw: R(0, 360) };
