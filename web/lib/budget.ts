import { create } from "zustand";

// Whole-room budget (all items + uploaded models), measured from the scene while editing.
export const ROOM_BUDGET = { triangles: 1_500_000, draws: 600, textureMB: 400 };
export type Usage = { triangles: number; draws: number; textureMB: number };
export const useBudget = create<Usage>(() => ({ triangles: 0, draws: 0, textureMB: 0 }));

// Triangles a new upload may use: the per-model limit, or what's left of the room's, never below 5k.
export const uploadTarget = (perModel: number) =>
  Math.max(5_000, Math.min(perModel, ROOM_BUDGET.triangles - useBudget.getState().triangles));
