import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Book = { title: string; author: string; stars: number; remark?: string }; // stars 1–5; remark added later, absent in old lists

// The notebook on the desk (one string per page), the whiteboard drawing (PNG data URL, "" = clean board) and the
// book list behind the wall shelf.
export const useNotes = create<{ pages: string[]; board: string; books: Book[] }>()(
  persist(() => ({ pages: [""], board: "", books: [] as Book[] }), { name: "my-room-notes" }),
);
