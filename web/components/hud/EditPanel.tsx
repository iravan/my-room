"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { addModelFile, importModelFile } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { homePose, liveHomes, ON_WALL, useLayout } from "@/lib/room";
import { useGame } from "@/lib/store";
import { Panel } from "./Panel";
import * as THREE from "three";
import { FINISHES, finishLabel, finishType, VARIANTS } from "@/lib/options";

const NAMES: Record<string, string> = {
  "socket-desk": "Socket (desk)", "socket-window": "Socket (window)", "socket-right": "Socket (right wall)", switch: "Light switch",
  frames: "Framed records", "wall-shelf": "Wall shelf", "poster-desk": "Poster (desk)", "poster-1": "Poster", "poster-2": "Poster (small)",
};
const nameOf = (id: string) => useLayout.getState().models[id]?.name ?? NAMES[id] ?? id[0].toUpperCase() + id.slice(1);
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

// Colour/material per part the item has, and its variants (e.g. bed size).
function Options({ id }: { id: string }) {
  const slots = useLayout((s) => s.slots), opts = useLayout((s) => s.options[id]) ?? {};
  const variants = VARIANTS[id] ?? {};
  const set = (k: string, v: string) => useLayout.getState().setOption(id, k, v);
  return (
    <div className="space-y-2">
      {Object.entries(variants).map(([k, v]) => (
        <div key={k}>
          <p className="text-xs text-zinc-400">{v.label}</p>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(v.choices).map(([c, label]) => (
              <Button key={c} size="xs" variant={(opts[k] ?? Object.keys(v.choices)[0]) === c ? "default" : "outline"} onClick={() => set(k, c)}>{label}</Button>
            ))}
          </div>
        </div>
      ))}
      {slots.map((slot) => {
        const choices = FINISHES[finishType(slot)] ?? {}, current = opts[slot] ?? "original";
        return (
          <div key={slot}>
            <p className="text-xs text-zinc-400">{finishLabel(slot)}: <span className="text-zinc-200">{choices[current]?.label}</span></p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(choices).map(([c, ch]) => (
                <button key={c} title={ch.label} aria-label={`${finishLabel(slot)} ${ch.label}`} onClick={() => set(slot, c)}
                  className={`size-6 rounded-full border ${current === c ? "border-2 border-cyan-300" : "border-white/30"}`}
                  style={{ background: ch.color ? `#${ch.color.getHexString(THREE.SRGBColorSpace)}` : "conic-gradient(#a77,#7a7,#77a,#a77)" }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EditPanel() {
  useEditKeys();
  const editing = useLayout((s) => s.editing), selected = useLayout((s) => s.selected), canUndo = useLayout((s) => s.past.length > 0);
  const moved = useLayout((s) => !!(s.selected && s.items[s.selected])), anyMoved = useLayout((s) => Object.keys(s.items).length + Object.keys(s.options).length > 0);
  const file = useRef<HTMLInputElement>(null), lookFile = useRef<HTMLInputElement>(null);
  const shell = useLayout((s) => (s.selected ? s.shells[s.selected] : undefined));
  if (!editing) return null;
  const onWall = !!(selected && ON_WALL[selected]), isModel = !!(selected && selected.startsWith("model-"));
  const replaceLook = async (f?: File) => {
    if (!f || !selected) return;
    try {
      const { asset, name, stats } = await importModelFile(f);
      useLayout.getState().setShell(selected, { asset, name, yaw: 0 });
      toast.success(`${nameOf(selected)} now uses ${f.name} (${stats.triangles.toLocaleString()} triangles).`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const upload = async (f?: File) => {
    if (!f) return;
    try {
      const st = await addModelFile(f);
      toast.success(`Added ${f.name} (${st.triangles.toLocaleString()} triangles). Drag it into place.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <Panel side="right">
      <p><b className="text-cyan-300">Edit room</b><br /><span className="text-zinc-400">
        {selected ? (onWall ? "Drag to slide it along its wall." : isModel ? "Drag it onto the floor, the desk, a shelf or the bed." : "Drag to move it on the floor. Shift = fine steps.") : "Click an item to select it, then drag it. Drag empty space to look around."}
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
          <Options id={selected} />
          {isModel && <Button size="sm" variant="destructive" onClick={() => useLayout.getState().removeModel(selected)}>Remove model</Button>}
          {!isModel && (shell ? (
            <>
              <p className="text-xs text-zinc-400">Look: <span className="text-zinc-200">{shell.name}</span></p>
              <div className="grid grid-cols-2 gap-1">
                <Button size="sm" variant="secondary" onClick={() => useLayout.getState().setShell(selected, { ...shell, yaw: (shell.yaw + 1) % 4 })}>Turn model 90°</Button>
                <Button size="sm" variant="outline" onClick={() => useLayout.getState().setShell(selected, null)}>Original look</Button>
              </div>
            </>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => lookFile.current?.click()}>Replace look with a model…</Button>
          ))}
          <input ref={lookFile} type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" className="hidden"
            onChange={(e) => { replaceLook(e.target.files?.[0]); e.target.value = ""; }} />
        </>
      )}
      <Button size="sm" variant="secondary" onClick={() => file.current?.click()}>+ Add a 3D model (.glb)</Button>
      <input ref={file} type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" className="hidden"
        onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="grid grid-cols-2 gap-1">
        <Button size="sm" variant="outline" disabled={!canUndo} onClick={() => useLayout.getState().undo()}>Undo [⌘Z]</Button>
        <Button size="sm" variant="outline" disabled={!anyMoved} onClick={() => { useLayout.getState().snapshot(); useLayout.setState({ items: {}, options: {} }); }}>Reset room</Button>
      </div>
      <Button size="sm" onClick={exitEdit}>Done [Esc]</Button>
    </Panel>
  );
}
