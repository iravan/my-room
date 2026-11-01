import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Album } from "./collection";
import { sfx } from "./audio";

export type View = "room" | "turntable" | "crate" | "shelf" | "inspect";
export type Vec3 = [number, number, number];

// A key belongs to a field only while typing in it. A focused slider (it keeps focus after a drag) only keeps its arrows,
// so WASD and the shortcuts still work after touching the volume.
export const typing = (e: KeyboardEvent) =>
  e.target instanceof HTMLTextAreaElement || (e.target instanceof HTMLInputElement && (e.target.type !== "range" || e.key.startsWith("Arrow")));

// Room coordinates are Unity's with z flipped (three is right-handed): Unity (x, y, z) = three (x, y, -z).
type State = {
  view: View;
  inspectReturn: View;
  yaw: number; // degrees, Unity convention: +90 looks along +x
  pitch: number; // degrees, + looks down, clamped ±60
  roomPos: Vec3;
  sensitivity: number;
  volume: number;
  muted: boolean;
  preset: number; // index into PRESETS (lib/lighting.ts)
  lamp: boolean;
  quality: 0 | 1 | 2; // low, medium, high
  blanket: number; // index into BLANKETS (Furniture.tsx)
  nextBlanket: () => void;
  setQuality: (q: 0 | 1 | 2) => void;
  cyclePreset: () => void;
  toggleLamp: () => void;
  selected: number; // crate selection
  inspectId: string; // album being inspected
  hint: string; // hover tooltip
  // Inspector: drag rotation (degrees, Unity's inspectRotation), zoom distance, vinyl out, gatefold open.
  draft: Album | null; // album open in the editor
  title: boolean; // title screen showing (every load)
  hideUI: boolean; // showcase mode
  dialog: "" | "settings" | "controls";
  playing: boolean; // needle down / platter spinning
  rpm45: boolean;
  inspectRot: [number, number];
  inspectDist: number;
  discOut: boolean;
  gatefold: boolean;
  flip: (d: number, count: number) => void;
  inspect: (id: string) => void;
  setView: (v: View) => void;
  back: () => void;
  look: (dYaw: number, dPitch: number) => void;
  setRoomPos: (p: Vec3) => void;
};

export const useGame = create<State>()(
  persist(
    (set, get) => ({
      view: "room",
      inspectReturn: "room",
      yaw: -42, // desk and PC just in frame on the left
      pitch: 10,
      roomPos: [1.3, 1.55, 1.5],
      sensitivity: 1,
      volume: 0.8,
      muted: false,
      preset: 0,
      lamp: true,
      quality: 2,
      blanket: 0,
      nextBlanket: () => set((s) => ({ blanket: (s.blanket + 1) % 4 })),
      setQuality: (quality) => set({ quality }),
      cyclePreset: () => set((s) => ({ preset: (s.preset + 1) % 3 })),
      toggleLamp: () => set((s) => ({ lamp: !s.lamp })),
      selected: 0,
      inspectId: "",
      hint: "",
      flip: (d, count) => set((s) => ({ selected: Math.min(Math.max(0, count - 1), Math.max(0, s.selected + d)) })),
      draft: null,
      title: true,
      hideUI: false,
      dialog: "",
      playing: false,
      rpm45: false,
      inspectRot: [0, 0],
      inspectDist: 0.7,
      discOut: false,
      gatefold: false,
      inspect: (id) => {
        if (get().view !== "inspect") get().setView("inspect");
        sfx("slide", 0.5);
        set({ inspectId: id, inspectRot: [0, 0], inspectDist: 0.7, discOut: false, gatefold: false });
      },
      setView: (v) => set((s) => ({ view: v, inspectReturn: v === "inspect" && s.view !== "inspect" ? s.view : s.inspectReturn })),
      back: () => {
        const s = get();
        if (s.view === "inspect") set({ view: s.inspectReturn });
        else if (s.view !== "room") set({ view: "room" });
      },
      look: (dYaw, dPitch) => set((s) => ({ yaw: s.yaw + dYaw, pitch: Math.min(60, Math.max(-60, s.pitch + dPitch)) })),
      setRoomPos: (p) => set({ roomPos: p }),
    }),
    // Inspect needs a record picked, so a reload lands back where it was opened from.
    { name: "my-room", partialize: ({ view, inspectReturn, yaw, pitch, roomPos, sensitivity, preset, lamp, quality, blanket, rpm45, volume, muted }) => ({ view: view === "inspect" ? inspectReturn : view, inspectReturn, yaw, pitch, roomPos, sensitivity, preset, lamp, quality, blanket, rpm45, volume, muted }) },
  ),
);
