import { dice } from "../_shared/prims";

// Where on the bed it was left this load: Unity x, z, `lift` above the duvet (whose height the bed's look gives at
// render time), and how it's turned.
const { R } = dice(25);
export const CONTROLLER = { x: R(-1.3, -1.05), z: R(0.6, 0.9), lift: 0.023, yaw: R(0, 360) };
