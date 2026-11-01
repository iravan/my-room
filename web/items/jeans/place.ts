import { dice } from "../_shared/prims";

// Whether the jeans are lying around this load (70%), and where (Unity coords).
const { R, chance } = dice(10);
export const JEANS = { here: chance(0.7), p: [R(-0.6, 0.2), 0, R(-1.1, -0.7)] as [number, number, number], yaw: R(0, 360) };
