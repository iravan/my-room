import { dice } from "../_shared/prims";

// Where on the bed it was left this load: Unity x, z, `lift` above the duvet (whose height the bed's look gives at
// render time), and how it's turned.
const { R } = dice(24);
export const PHONE = { x: R(-1.7, -1.2), z: R(1, 1.3), lift: 0.0045, yaw: R(0, 360) };
