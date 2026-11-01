import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ITEMS } from "@/items/registry";
import { normalizeShells, useLayout, type Shells } from "./room";
import { getImage, putImage, VISIT } from "./images";

// Your own library of looks: an item's look as you set it up (which built-in look, its colours/materials and other
// options, or your model in its place), saved apart from any room so it can go onto the same kind of item later —
// in this room after a reset, in a new room, or on another poster. Kept in this browser (localStorage).
export type LibraryEntry = { id: string; name: string; kind: string; options: Record<string, string>; model?: Shells[string] };

// Items of one kind take each other's looks (the three posters, the three sockets); everything else is its own kind.
export const kindOf = (id: string) => ITEMS[id]?.kind ?? id;

const MAX = 100;
export function normalizeLibrary(raw: unknown): LibraryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: LibraryEntry[] = [];
  for (const e of raw.slice(0, MAX)) {
    if (!e || typeof e !== "object") continue;
    const r = e as Record<string, unknown>;
    if (typeof r.id !== "string" || !/^[0-9a-f]{8}$/.test(r.id) || typeof r.kind !== "string" || !/^[\w-]{1,64}$/.test(r.kind)) continue;
    const options: Record<string, string> = {};
    if (r.options && typeof r.options === "object")
      for (const [k, v] of Object.entries(r.options as Record<string, unknown>).slice(0, 50)) if (/^[\w:-]{1,64}$/.test(k) && typeof v === "string") options[k] = v.slice(0, 64);
    const model = normalizeShells({ x: r.model }).x;
    out.push({ id: r.id, name: typeof r.name === "string" ? r.name.slice(0, 60) : "Look", kind: r.kind, options, ...(model && !model.asset.startsWith(VISIT) ? { model } : {}) });
  }
  return out;
}

type State = {
  entries: LibraryEntry[];
  save: (item: string, name: string) => Promise<LibraryEntry>;
  remove: (id: string) => void;
};

export const useLibrary = create<State>()(
  persist(
    (set) => ({
      entries: [],
      // Save the item's look as it is now. A model from a friend's room (kept in memory only) is copied to yours first.
      save: async (item, name) => {
        const L = useLayout.getState(), shell = L.shells[item];
        let model = shell && { ...shell };
        if (model?.asset.startsWith(VISIT)) {
          const blob = await getImage(model.asset), mine = model.asset.slice(VISIT.length);
          if (!blob) throw new Error("That model isn't loaded any more.");
          await putImage(mine, blob);
          model = { ...model, asset: mine };
        }
        const entry: LibraryEntry = { id: crypto.randomUUID().replace(/-/g, "").slice(0, 8), name: name.slice(0, 60), kind: kindOf(item), options: { ...L.options[item] }, ...(model ? { model } : {}) };
        set((s) => ({ entries: [entry, ...s.entries].slice(0, MAX) }));
        return entry;
      },
      remove: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    { name: "my-room-library", version: 1, storage: createJSONStorage(() => ({ // read lazily: no localStorage while the server renders
      getItem: (k: string) => localStorage.getItem(k), setItem: (k: string, v: string) => localStorage.setItem(k, v), removeItem: (k: string) => localStorage.removeItem(k),
    })), merge: (saved, cur) => ({ ...cur, entries: normalizeLibrary((saved as { entries?: unknown })?.entries) }) },
  ),
);

// Put a saved look on an item: its options replace the item's, its model goes in (or the item's model comes out).
export const applyLook = (e: LibraryEntry, item: string) => useLayout.getState().applyLook(item, e.options, e.model ?? null);
