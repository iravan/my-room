import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as THREE from "three";
import type { Vec3 } from "./store";
import { ITEMS } from "@/items/registry";
import { normalizeOptions, type Options } from "./options";
import { STYLES, styleOf, type Style, type StyleId } from "./styles";

// The room as data. Every item renders through <RoomItem id home>: its children are modelled in place at `home`
// (the default room), and a saved pose moves the whole item rigidly about that home point. Only moved items are
// stored, so the default room is an empty layout. Poses are three.js world space; rotationY in radians.
export type Pose = { position: Vec3; rotationY: number; scale: number };
export type Home = { position: Vec3; rotationY?: number };
export type Layout = Record<string, Pose>;

// Room size: width (x), depth (z), height. The default room is 4 × 4 × 2.8 m, centred on x/z, floor at y 0.
export type RoomSize = { w: number; d: number; h: number };
export const DEFAULT_SIZE: RoomSize = { w: 4, d: 4, h: 2.8 };
export const SIZE_RANGE: Record<keyof RoomSize, [number, number]> = { w: [3, 8], d: [3, 8], h: [2.4, 4] };
export function normalizeSize(raw: unknown): RoomSize {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const one = (k: keyof RoomSize) => {
    const [lo, hi] = SIZE_RANGE[k], v = r[k];
    return typeof v === "number" && Number.isFinite(v) ? Math.round(Math.min(hi, Math.max(lo, v)) * 100) / 100 : DEFAULT_SIZE[k];
  };
  return { w: one("w"), d: one("d"), h: one("h") };
}

// Which walls an item stands against (−1 = left/back, +1 = right/front); it follows them when the room is resized,
// so a bed against the back wall stays against it. Items not listed follow a wall if they're within 0.5 m of it.
// Walls each item follows (from its definition in items/<id>/item.ts).
const ANCHOR: Record<string, { x?: -1 | 1; z?: -1 | 1 }> = Object.fromEntries(
  Object.values(ITEMS).filter((d) => d.walls).map((d) => [d.id, d.walls!]),
);
function anchorOf(id: string, p: Vec3, size: RoomSize) {
  const a = ANCHOR[id];
  if (a) return { x: a.x ?? 0, z: a.z ?? 0 };
  const near = (v: number, half: number) => (v < -half + 0.5 ? -1 : v > half - 0.5 ? 1 : 0);
  return { x: near(p[0], size.w / 2), z: near(p[2], size.d / 2) };
}
// Where an item rests when it hasn't been moved: its home, carried along with the walls it stands against.
export function restPosition(id: string, home: Home, size: RoomSize): Vec3 {
  const a = anchorOf(id, home.position, DEFAULT_SIZE);
  return [home.position[0] + (a.x * (size.w - DEFAULT_SIZE.w)) / 2, home.position[1], home.position[2] + (a.z * (size.d - DEFAULT_SIZE.d)) / 2];
}
export const restPose = (id: string, home: Home, size: RoomSize): Pose => ({ position: restPosition(id, home, size), rotationY: home.rotationY ?? 0, scale: 1 });

// Fixed homes of the furniture that other code also needs (camera shots); clutter homes are rolled per load.
// Fixed homes (from the item definitions); clutter homes are rolled per load and registered by <RoomItem>.
export const HOMES: Record<string, Home> = Object.fromEntries(
  Object.values(ITEMS).filter((d) => d.home).map((d) => [d.id, d.home!]),
);

// Wall fixtures slide along their wall: the coordinate across the wall and the facing stay as at home.
export const ON_WALL: Record<string, "x" | "z"> = Object.fromEntries(
  Object.values(ITEMS).filter((d) => d.onWall).map((d) => [d.id, d.onWall!]),
);
// Window: its opening (1.4 × 1 m at scale 1) must stay inside the wall.
export const WINDOW_SIZE = { w: 1.4, h: 1 };
function constrain(id: string, p: Pose, size: RoomSize): Pose {
  const axis = ON_WALL[id], home = HOMES[id];
  if (!axis || !home) return p;
  const position: Vec3 = [...p.position], i = axis === "x" ? 0 : 2;
  position[i] = restPosition(id, home, size)[i];
  if (id === "window") {
    const hw = (WINDOW_SIZE.w * p.scale) / 2 + 0.05, hh = (WINDOW_SIZE.h * p.scale) / 2 + 0.05;
    position[0] = Math.min(size.w / 2 - hw, Math.max(-size.w / 2 + hw, position[0]));
    position[1] = Math.min(size.h - 0.1 - hh, Math.max(0.1 + hh, position[1]));
  }
  return { position, rotationY: home.rotationY ?? 0, scale: id === "window" ? Math.min(p.scale, 1.8) : p.scale };
}

const finite = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

// Untrusted layout (save, share file, a friend's room) → clean poses inside the room. Bad entries are dropped.
export function normalizeLayout(raw: unknown, size: RoomSize = DEFAULT_SIZE): Layout {
  const out: Layout = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, p] of Object.entries(raw as Record<string, unknown>).slice(0, 500)) {
    if (!/^[\w-]{1,64}$/.test(id) || !p || typeof p !== "object") continue;
    const q = p as Record<string, unknown>, pos = Array.isArray(q.position) ? q.position : [];
    if (pos.length !== 3) continue;
    out[id] = constrain(id, {
      position: [finite(pos[0], -size.w / 2, size.w / 2, 0), finite(pos[1], 0, size.h, 0), finite(pos[2], -size.d / 2, size.d / 2, 0)],
      rotationY: finite(q.rotationY, -1e3, 1e3, 0) % (2 * Math.PI),
      scale: finite(q.scale, 0.25, 4, 1),
    }, size);
  }
  return out;
}

// Homes of the items currently rendered (clutter homes are rolled per load), registered by <RoomItem>.
export const liveHomes = new Map<string, Home>();



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

// Built-in items whose look is replaced by an uploaded model: item id → model file, name, and a quarter-turn yaw.
export type Shells = Record<string, { asset: string; name: string; yaw: number }>;
export function normalizeShells(raw: unknown): Shells {
  const out: Shells = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, m] of Object.entries(raw as Record<string, unknown>).slice(0, 200)) {
    const v = m as { asset?: unknown; name?: unknown; yaw?: unknown };
    if (/^[\w-]{1,64}$/.test(id) && !id.startsWith("model-") && typeof v?.asset === "string" && /^(visit:)?[0-9a-f]{8}\.glb$/.test(v.asset))
      out[id] = { asset: v.asset, name: typeof v.name === "string" ? v.name.slice(0, 60) : "Model", yaw: [0, 1, 2, 3].includes(v.yaw as number) ? (v.yaw as number) : 0 };
  }
  return out;
}

// Hidden items (any item id, built-in or uploaded).
export function normalizeHidden(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((id): id is string => typeof id === "string" && /^[\w-]{1,64}$/.test(id)))].slice(0, 500).sort();
}

export type RoomData = { hidden: string[]; style: StyleId; size: RoomSize; items: Layout; options: Options; models: Models; shells: Shells };
// Untrusted room layout (a share file): every part cleaned; model files optionally renamed (visit: prefix).
export function normalizeRoom(raw: unknown, assetPrefix = ""): RoomData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const models = normalizeModels(r.models);
  const shells = normalizeShells(r.shells);
  for (const m of [...Object.values(models), ...Object.values(shells)]) m.asset = assetPrefix + m.asset.replace(/^visit:/, "");
  const size = normalizeSize(r.size), style = (typeof r.style === "string" && r.style in STYLES ? r.style : "cyber") as StyleId;
  return { hidden: normalizeHidden(r.hidden), style, size, items: normalizeLayout(r.items, size), options: normalizeOptions(r.options), models, shells };
}

type State = {
  hidden: string[];
  setHidden: (id: string, hide: boolean) => void;
  showAll: () => void;
  style: StyleId;
  setStyle: (style: StyleId) => void;
  size: RoomSize;
  setSize: (size: Partial<RoomSize>) => void; // live while a slider moves: call snapshot() first
  items: Layout;
  models: Models;
  shells: Shells;
  setShell: (id: string, shell: Shells[string] | null) => void;
  options: Options; // per item: finish slot or variant → choice
  // Edit mode (not saved): which item is selected, whether it's being dragged, and undo history.
  editing: boolean;
  selected: string | null;
  dragging: boolean;
  past: RoomData[];
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
      hidden: [],
      setHidden: (id, hide) => {
        get().snapshot();
        set((s) => ({ hidden: normalizeHidden(hide ? [...s.hidden, id] : s.hidden.filter((h) => h !== id)), selected: hide && s.selected === id ? null : s.selected }));
      },
      showAll: () => { get().snapshot(); set({ hidden: [] }); },
      style: "cyber",
      setStyle: (style) => { get().snapshot(); set({ style }); },
      size: DEFAULT_SIZE,
      // Resize: moved items standing against a wall go with it; everything is then kept inside the new room.
      setSize: (patch) => set((s) => {
        const size = normalizeSize({ ...s.size, ...patch }), moved: Layout = {};
        for (const [id, p] of Object.entries(s.items)) {
          const a = anchorOf(id, p.position, s.size);
          moved[id] = { ...p, position: [p.position[0] + (a.x * (size.w - s.size.w)) / 2, p.position[1], p.position[2] + (a.z * (size.d - s.size.d)) / 2] };
        }
        return { size, items: normalizeLayout(moved, size) };
      }),
      items: {},
      models: {},
      shells: {},
      setShell: (id, shell) => {
        get().snapshot();
        set((s) => {
          const shells = { ...s.shells };
          if (shell) Object.assign(shells, normalizeShells({ [id]: shell })); else delete shells[id];
          return { shells };
        });
      },
      options: {},
      slots: [],
      editing: false,
      selected: null,
      dragging: false,
      past: [],
      move: (id, pose) => set((s) => ({ items: { ...s.items, ...normalizeLayout({ [id]: pose }, s.size) } })),
      reset: (id) => { get().snapshot(); set((s) => { const items = { ...s.items }; delete items[id]; return { items }; }); },
      setOption: (id, key, value) => {
        get().snapshot();
        set((s) => ({ options: { ...s.options, ...normalizeOptions({ [id]: { ...s.options[id], [key]: value } }) } }));
      },
      addModel: (asset, name, pose) => {
        const id = `model-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
        get().snapshot();
        set((s) => ({ models: { ...s.models, [id]: { asset, name } }, items: { ...s.items, ...normalizeLayout({ [id]: pose }, s.size) }, selected: id }));
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
      snapshot: () => set((s) => ({ past: [...s.past.slice(-19), { hidden: s.hidden, style: s.style, size: s.size, items: s.items, options: s.options, models: s.models, shells: s.shells }] })),
      undo: () => set((s) => (s.past.length ? { ...s.past[s.past.length - 1], past: s.past.slice(0, -1) } : {})),
    }),
    {
      name: "my-room-layout", version: 1, storage, partialize: ({ hidden, style, size, items, options, models, shells }) => ({ hidden, style, size, items, options, models, shells }),
      merge: (saved, cur) => ({ ...cur, ...normalizeRoom(saved) }),
    },
  ),
);

// Hidden itself, or standing on a hidden item it hasn't been moved off.
export function hiddenOf(id: string, s: { items: Layout; hidden: string[] }): boolean {
  const on = ITEMS[id]?.on;
  return s.hidden.includes(id) || (!!on && !s.items[id] && hiddenOf(on, s));
}

// An item's pose now: where it was moved to, or its rest position in the current room.
export function poseOf(id: string, home: Home, s: { items: Layout; size: RoomSize } = useLayout.getState()): Pose {
  if (s.items[id]) return s.items[id];
  const on = ITEMS[id]?.on, parentHome = on ? HOMES[on] : undefined;
  if (!on || !parentHome) return restPose(id, home, s.size);
  // Standing on its parent: carried by the parent's pose.
  const parent = poseOf(on, parentHome, s), p = new THREE.Vector3(...home.position).applyMatrix4(itemMatrix(parentHome, parent));
  return { position: [p.x, p.y, p.z], rotationY: (home.rotationY ?? 0) + parent.rotationY - (parentHome.rotationY ?? 0), scale: parent.scale };
}

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
export function placePoint(id: string, p: Vec3, items: Layout, out = new THREE.Vector3(), size: RoomSize = DEFAULT_SIZE): THREE.Vector3 {
  const home = HOMES[id] ?? liveHomes.get(id);
  out.set(...p);
  if (!home) { // rolled clutter not drawn yet: unmoved, it goes where what it stands on goes
    const on = ITEMS[id]?.on;
    return on && !items[id] ? placePoint(on, p, items, out, size) : out;
  }
  return out.applyMatrix4(itemMatrix(home, poseOf(id, home, { items, size }), tmpM));
}

// The room's current style (see styles.ts).
export const useStyle = (): Style => useLayout((s) => styleOf(s.style));
