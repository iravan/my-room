import type { Vec3 } from "./store";

// Where things stand, in metres (three coords = Unity's with z negated). Room is 4 × 2.8 × 4, centred on x/z.
export const ROOM = { w: 4, h: 2.8, d: 4 };
export const CUBBY = 0.33, BOARD = 0.02, COLS = 4, ROWS = 2;
export const CABINET_W = COLS * CUBBY + (COLS + 1) * BOARD;
export const CABINET_H = ROWS * CUBBY + (ROWS + 1) * BOARD;
export const CABINET: Vec3 = [1.26, 0, -1.8];
export const TURNTABLE: Vec3 = [0.85, CABINET_H, -1.79];
export const PLATTER: Vec3 = [TURNTABLE[0] - 0.05, TURNTABLE[1] + 0.1, TURNTABLE[2]];
export const CRATE: Vec3 = [1.45, 0, -0.35];
export const BED_HOME: Vec3 = [-1.45, 0, -0.9];
export const NIGHTSTAND: Vec3 = [-1.7, 0, 0.45];
export const DESK: Vec3 = [-1.68, 0, 1.35];

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// Fixed camera shots: [eye, target].
export const SHOTS: Record<"turntable" | "shelf" | "crate" | "inspect", [Vec3, Vec3]> = {
  turntable: [add(PLATTER, [0, 0.42, 0.38]), add(PLATTER, [0.03, 0, 0])],
  shelf: [add(CABINET, [0, 0.6, 1.45]), add(CABINET, [0, 0.38, 0])],
  crate: [add(CRATE, [0, 0.8, 0.62]), add(CRATE, [0, 0.12, 0])],
  inspect: [[0.3, 1.25, 1], [0.3, 1, -1.5]],
};
