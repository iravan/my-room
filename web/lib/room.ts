import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as THREE from "three";
import type { Vec3 } from "./store";
import { BED_HOME, CABINET, CRATE, NIGHTSTAND, DESK } from "./layout";
import { normalizeOptions, type Options } from "./options";

// The room as data. Every item renders through <RoomItem id home>: its children are modelled in place at `home`
// (the default room), and a saved pose moves the whole item rigidly about that home point. Only moved items are
// stored, so the default room is an empty layout. Poses are three.js world space; rotationY in radians.
export type Pose = { position: Vec3; rotationY: number; scale: number };
export type Home = { position: Vec3; rotationY?: number };
export type Layout = Record<string, Pose>;

const ROOM = { x: 2, yMax: 2.8, z: 2 };

// Fixed homes of the furniture that other code also needs (camera shots); clutter homes are rolled per load.
export const HOMES: Record<string, Home> = {
  bed: { position: BED_HOME },
  nightstand: { position: NIGHTSTAND },
  desk: { position: DESK, rotationY: Math.PI / 2 },
  cabinet: { position: CABINET },
  crate: { position: CRATE },
  window: { position: [-0.3, 1.55, -2] },
  door: { position: [1.4, 0, 2] },
  closet: { position: [0.1, 0, 2] },
  switch: { position: [2, 1.1, 1.75] },
  "socket-desk": { position: [-2, 0.3, 1.2] },
  "socket-window": { position: [0.25, 0.3, -2] },
  "socket-right": { position: [2, 0.3, 1.4] },
  frames: { position: [-1.99, 1.35, -0.85] },
  "wall-shelf": { position: [-1.87, 1.5, 1.35] },
  "poster-desk": { position: [-1.975, 2.1, 1.35] },
  "poster-1": { position: [1.995, 1.65, 1.05] },
  "poster-2": { position: [1.995, 1.55, 0.3] },
};

// Wall fixtures slide along their wall: the coordinate across the wall and the facing stay as at home.
export const ON_WALL: Record<string, "x" | "z"> = {
  window: "z", door: "z", closet: "z", "socket-window": "z",
  switch: "x", "socket-desk": "x", "socket-right": "x", frames: "x", "wall-shelf": "x", "poster-desk": "x", "poster-1": "x", "poster-2": "x",
};
// Window: its opening (1.4 × 1 m at scale 1) must stay inside the wall.
export const WINDOW_SIZE = { w: 1.4, h: 1 };
function constrain(id: string, p: Pose): Pose {
  const axis = ON_WALL[id], home = HOMES[id];
  if (!axis || !home) return p;
  const position: Vec3 = [...p.position];
  position[axis === "x" ? 0 : 2] = home.position[axis === "x" ? 0 : 2];
  if (id === "window") {
    const hw = (WINDOW_SIZE.w * p.scale) / 2 + 0.05, hh = (WINDOW_SIZE.h * p.scale) / 2 + 0.05;
    position[0] = Math.min(ROOM.x - hw, Math.max(-ROOM.x + hw, position[0]));
    position[1] = Math.min(2.7 - hh, Math.max(0.1 + hh, position[1]));
  }
  return { position, rotationY: home.rotationY ?? 0, scale: id === "window" ? Math.min(p.scale, 1.8) : p.scale };
}

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
    out[id] = constrain(id, {
      position: [finite(pos[0], -ROOM.x, ROOM.x, 0), finite(pos[1], 0, ROOM.yMax, 0), finite(pos[2], -ROOM.z, ROOM.z, 0)],
      rotationY: finite(q.rotationY, -1e3, 1e3, 0) % (2 * Math.PI),
      scale: finite(q.scale, 0.25, 4, 1),
    });
  }
  return out;
}

// Homes of the items currently rendered (clutter homes are rolled per load), registered by <RoomItem>.
export const liveHomes = new Map<string, Home>();

export const homePose = (home: Home): Pose => ({ position: [...home.position], rotationY: home.rotationY ?? 0, scale: 1 });

// Uploaded models placed in the room: instance id → stored file (IndexedDB) and its original file name.
export type Models = Record<string, { asset: string; name: string }>;
export function normalizeModels(raw: unknown): Models {
  const out: Models = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, m] of Object.entries(raw as Record<string, unknown>).slice(0, 200)) {
    const v = m as { asset?: unknown; name?: unknown };
    if (/^model-[0-9a-f]{8}$/.test(id) && typeof v?.asset === "string" && /^(visit:)?[0-9a-f]{8}\.glb$/.test(v.asset))
      out[id] = { asset: v.asset, name: typeof v.name === "string" ? v.name.slice(0, 60) : "Model" };
  }
  return out;
}

// While visiting a friend's room their layout is shown in this store; nothing may be written to your save.
let frozen = false;
export const freezeLayoutSaves = (on: boolean) => { frozen = on; };
const storage = createJSONStorage(() => ({
  getItem: (k: string) => localStorage.getItem(k),
  setItem: (k: string, v: string) => { if (!frozen) localStorage.setItem(k, v); },
  removeItem: (k: string) => { if (!frozen) localStorage.removeItem(k); },
}));

export type RoomData = { items: Layout; options: Options; models: Models };
// Untrusted room layout (a share file): every part cleaned; model files optionally renamed (visit: prefix).
export function normalizeRoom(raw: unknown, assetPrefix = ""): RoomData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const models = normalizeModels(r.models);
  for (const m of Object.values(models)) m.asset = assetPrefix + m.asset.replace(/^visit:/, "");
  return { items: normalizeLayout(r.items), options: normalizeOptions(r.options), models };
}

type State = {
  items: Layout;
  models: Models;
  options: Options; // per item: finish slot or variant → choice
  // Edit mode (not saved): which item is selected, whether it's being dragged, and undo history.
  editing: boolean;
  selected: string | null;
  dragging: boolean;
  past: { items: Layout; options: Options; models: Models }[];
  addModel: (asset: string, name: string, pose: Pose) => string;
  removeModel: (id: string) => void;
  // In edit mode: the finish slots the selected item has (found by SelectionBox).
  slots: string[];
  setOption: (id: string, key: string, value: string) => void;
  move: (id: string, pose: Pose) => void;
  reset: (id: string) => void;
  snapshot: () => void; // call before a change that should be undoable
  undo: () => void;
};
export const useLayout = create<State>()(
  persist(
    (set, get) => ({
      items: {},
      models: {},
      options: {},
      slots: [],
      editing: false,
      selected: null,
      dragging: false,
      past: [],
      move: (id, pose) => set((s) => ({ items: { ...s.items, ...normalizeLayout({ [id]: pose }) } })),
      reset: (id) => { get().snapshot(); set((s) => { const items = { ...s.items }; delete items[id]; return { items }; }); },
      setOption: (id, key, value) => {
        get().snapshot();
        set((s) => ({ options: { ...s.options, ...normalizeOptions({ [id]: { ...s.options[id], [key]: value } }) } }));
      },
      addModel: (asset, name, pose) => {
        const id = `model-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
        get().snapshot();
        set((s) => ({ models: { ...s.models, [id]: { asset, name } }, items: { ...s.items, ...normalizeLayout({ [id]: pose }) }, selected: id }));
        return id;
      },
      removeModel: (id) => {
        get().snapshot();
        set((s) => {
          const models = { ...s.models }, items = { ...s.items }, options = { ...s.options };
          delete models[id]; delete items[id]; delete options[id];
          return { models, items, options, selected: s.selected === id ? null : s.selected };
        });
      },
      snapshot: () => set((s) => ({ past: [...s.past.slice(-19), { items: s.items, options: s.options, models: s.models }] })),
      undo: () => set((s) => (s.past.length ? { ...s.past[s.past.length - 1], past: s.past.slice(0, -1) } : {})),
    }),
    {
      name: "my-room-layout", version: 1, storage, partialize: ({ items, options, models }) => ({ items, options, models }),
      merge: (saved, cur) => {
        const s = saved as { items?: unknown; options?: unknown; models?: unknown } | undefined;
        return { ...cur, items: normalizeLayout(s?.items), options: normalizeOptions(s?.options), models: normalizeModels(s?.models) };
      },
    },
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

// Where an item-local point (modelled at home) is now: for things joining two items, like cables.
const tmpM = new THREE.Matrix4();
export function placePoint(id: string, p: Vec3, items: Layout, out = new THREE.Vector3()) {
  const home = HOMES[id];
  out.set(...p);
  return home ? out.applyMatrix4(itemMatrix(home, items[id], tmpM)) : out;
}
