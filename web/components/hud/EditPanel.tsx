"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { homePose, liveHomes, ON_WALL, useLayout } from "@/lib/room";
import { useGame } from "@/lib/store";
import { Panel } from "./Panel";

const NAMES: Record<string, string> = {
  "socket-desk": "Socket (desk)", "socket-window": "Socket (window)", "socket-right": "Socket (right wall)", switch: "Light switch",
  frames: "Framed records", "wall-shelf": "Wall shelf", "poster-desk": "Poster (desk)", "poster-1": "Poster", "poster-2": "Poster (small)",
};
const nameOf = (id: string) => NAMES[id] ?? id[0].toUpperCase() + id.slice(1);
const STEP = Math.PI / 12; // 15°

export const enterEdit = () => { useGame.getState().setView("room"); useLayout.setState({ editing: true, selected: null }); };
const exitEdit = () => useLayout.setState({ editing: false, selected: null, dragging: false });

// Change the selected item's pose (one undo step each).
function adjust(f: (p: ReturnType<typeof homePose>) => ReturnType<typeof homePose>) {
  const L = useLayout.getState(), id = L.selected, home = id && liveHomes.get(id);
  if (!id || !home) return;
  L.snapshot();
  L.move(id, f(L.items[id] ?? homePose(home)));
}
const rotate = (d: number) => adjust((p) => ({ ...p, rotationY: Math.round((p.rotationY + d) / STEP) * STEP }));
const resize = (k: number) => adjust((p) => ({ ...p, scale: Math.round(p.scale * k * 100) / 100 }));

// Edit mode: keys R / Shift+R rotate, + / − resize, Ctrl/Cmd+Z undo, Esc deselects then leaves.
function useEditKeys() {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const L = useLayout.getState();
      if (!L.editing || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); L.undo(); }
      else if (e.key === "r" || e.key === "R") rotate(e.shiftKey ? -STEP : STEP);
      else if (e.key === "=" || e.key === "+") resize(1.1);
      else if (e.key === "-") resize(1 / 1.1);
      else if (e.key === "Escape") { if (L.selected) useLayout.setState({ selected: null }); else exitEdit(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
}

export function EditPanel() {
  useEditKeys();
  const editing = useLayout((s) => s.editing), selected = useLayout((s) => s.selected), canUndo = useLayout((s) => s.past.length > 0);
  const moved = useLayout((s) => !!(s.selected && s.items[s.selected])), anyMoved = useLayout((s) => Object.keys(s.items).length > 0);
  if (!editing) return null;
  const onWall = !!(selected && ON_WALL[selected]);
  return (
    <Panel side="right">
      <p><b className="text-cyan-300">Edit room</b><br /><span className="text-zinc-400">
        {selected ? (onWall ? "Drag to slide it along its wall." : "Drag to move it on the floor. Shift = fine steps.") : "Click an item to select it, then drag it. Drag empty space to look around."}
      </span></p>
      {selected && (
        <>
          <p className="font-bold text-fuchsia-400">{nameOf(selected)}</p>
          {!onWall && (
            <div className="grid grid-cols-2 gap-1">
              <Button size="sm" variant="secondary" onClick={() => rotate(STEP)}>⟲ Rotate [R]</Button>
              <Button size="sm" variant="secondary" onClick={() => rotate(-STEP)}>⟳ Rotate [⇧R]</Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-1">
            <Button size="sm" variant="secondary" onClick={() => resize(1 / 1.1)}>Smaller [−]</Button>
            <Button size="sm" variant="secondary" onClick={() => resize(1.1)}>Bigger [+]</Button>
          </div>
          <Button size="sm" variant="outline" disabled={!moved} onClick={() => useLayout.getState().reset(selected)}>Put back where it was</Button>
        </>
      )}
      <div className="grid grid-cols-2 gap-1">
        <Button size="sm" variant="outline" disabled={!canUndo} onClick={() => useLayout.getState().undo()}>Undo [⌘Z]</Button>
        <Button size="sm" variant="outline" disabled={!anyMoved} onClick={() => { useLayout.getState().snapshot(); useLayout.setState({ items: {} }); }}>Reset room</Button>
      </div>
      <Button size="sm" onClick={exitEdit}>Done [Esc]</Button>
    </Panel>
  );
}
