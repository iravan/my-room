import { dice } from "../_shared/prims";

// Where the ball rolled to this load (Unity coords).
const { R } = dice(22);
export const BALL = { p: [R(1.45, 1.8), 0, R(-1.3, -0.7)] as [number, number, number] };
