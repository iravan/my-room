import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Book = { title: string; author: string; stars: number; remark?: string }; // stars 1–5; remark added later, absent in old lists

export const MAX_MEMOS = 20;
// Sticky-note colours, by memo index (the same on the monitor and in the memo grid).
export const MEMO_COLORS = ["#fcd34d", "#f9a8d4", "#7dd3fc", "#86efac"];

// The notebook on the desk (one string per page), the whiteboard drawing (PNG data URL, "" = clean board), the
// book list behind the wall shelf and the sticky memos on the monitor (always at least one).
export const useNotes = create<{ pages: string[]; board: string; books: Book[]; memos: string[] }>()(
  persist(() => ({ pages: [""], board: "", books: [] as Book[], memos: [""] }), { name: "my-room-notes" }),
);
