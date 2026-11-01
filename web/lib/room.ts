import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as THREE from "three";
import type { Vec3 } from "./store";
import { BED_HOME, CABINET, CRATE, NIGHTSTAND, DESK } from "./layout";

// The room as data. Every item renders through <RoomItem id home>: its children are modelled in place at `home`
// (the default room), and a saved pose moves the whole item rigidly about that home point. Only moved items are
// stored, so the default room is an empty layout. Poses are three.js world space; rotationY in radians.
export type Pose = { position: Vec3; rotationY: number; scale: number };
export type Home = { position: Vec3; rotationY?: number };
export type Layout = Record<string, Pose>;

// Fixed homes of the furniture that other code also needs (camera shots); clutter homes are rolled per load.
export const HOMES: Record<string, Home> = {
  bed: { position: BED_HOME },
  nightstand: { position: NIGHTSTAND },
  desk: { position: DESK, rotationY: Math.PI / 2 },
  cabinet: { position: CABINET },
  crate: { position: CRATE },
};

const ROOM = { x: 2, yMax: 2.8, z: 2 };
const finite = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

// Untrusted layout (save, share file, a friend's room) → clean poses inside the room. Bad entries are dropped.
export function normalizeLayout(raw: unknown): Layout {
  const out: Layout = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, p] of Object.entries(raw as Record<string, unknown>).slice(0, 500)) {
    if (!/^[\w-]{1,64}$/.test(id) || !p || typeof p !== "object") continue;
    const q = p as Record<string, unknown>, pos = Array.isArray(q.position) ? q.position : [];
    if (pos.length !== 3) continue;
    out[id] = {
      position: [finite(pos[0], -ROOM.x, ROOM.x, 0), finite(pos[1], 0, ROOM.yMax, 0), finite(pos[2], -ROOM.z, ROOM.z, 0)],
      rotationY: finite(q.rotationY, -1e3, 1e3, 0) % (2 * Math.PI),
      scale: finite(q.scale, 0.25, 4, 1),
    };
  }
  return out;
}

type State = {
  items: Layout;
  move: (id: string, pose: Pose) => void;
  reset: (id: string) => void;
};
export const useLayout = create<State>()(
  persist(
    (set) => ({
      items: {},
      move: (id, pose) => set((s) => ({ items: { ...s.items, ...normalizeLayout({ [id]: pose }) } })),
      reset: (id) => set((s) => { const items = { ...s.items }; delete items[id]; return { items }; }),
    }),
    { name: "my-room-layout", version: 1, merge: (saved, cur) => ({ ...cur, items: normalizeLayout((saved as { items?: unknown })?.items) }) },
  ),
);

// Item-local → world for a pose (identity when the item is at home): T(pose) · Ry(Δyaw) · S · T(−home).
export function itemMatrix(home: Home, pose: Pose | undefined, out = new THREE.Matrix4()) {
  if (!pose) return out.identity();
  const m = new THREE.Matrix4();
  return out.makeTranslation(...pose.position)
    .multiply(m.makeRotationY(pose.rotationY - (home.rotationY ?? 0)))
    .multiply(m.makeScale(pose.scale, pose.scale, pose.scale))
    .multiply(m.makeTranslation(-home.position[0], -home.position[1], -home.position[2]));
}
