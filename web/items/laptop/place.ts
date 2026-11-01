import { dice } from "../_shared/prims";

// Where on the bed it was left this load: Unity x, z, `lift` above the duvet (whose height the bed's look gives at
// render time), and how it's turned.
const { R } = dice(23);
export const LAPTOP = { x: -1.45, z: R(0.2, 0.45), lift: 0.008, yaw: -90 + R(-25, 25) };
