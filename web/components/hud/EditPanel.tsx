"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { addModelFile, importModelFile } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { DEFAULT_SIZE, liveHomes, ON_WALL, poseOf, SIZE_RANGE, useLayout, type Pose, type RoomSize } from "@/lib/room";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_STYLE, STYLE_IDS, STYLES } from "@/lib/styles";
import { finishDefaults } from "@/lib/config";
import { typing, useGame } from "@/lib/store";
import { Panel } from "./Panel";
import { ITEMS } from "@/items/registry";
import { ROOM_BUDGET, useBudget } from "@/lib/budget";
import * as THREE from "three";
import { FINISHES, finishLabel, finishType, VARIANTS } from "@/lib/options";
import { VARIANTS as LOOKS } from "@/items/variants";
import { variantId } from "@/items/resolve";

const nameOf = (id: string) => useLayout.getState().models[id]?.name ?? ITEMS[id]?.name ?? id[0].toUpperCase() + id.slice(1);
const STEP = Math.PI / 12; // 15°

export const enterEdit = () => { useGame.getState().setView("room"); useLayout.setState({ editing: true, selected: null }); };
const exitEdit = () => useLayout.setState({ editing: false, selected: null, dragging: false });

// Change the selected item's pose (one undo step each).
function adjust(f: (p: Pose) => Pose) {
  const L = useLayout.getState(), id = L.selected, home = id && liveHomes.get(id);
  if (!id || !home) return;
  L.snapshot();
  L.move(id, f(poseOf(id, home)));
}
const rotate = (d: number) => adjust((p) => ({ ...p, rotationY: Math.round((p.rotationY + d) / STEP) * STEP }));
const resize = (k: number) => adjust((p) => ({ ...p, scale: Math.round(p.scale * k * 100) / 100 }));

// Edit mode: keys R / Shift+R rotate, + / − resize, Ctrl/Cmd+Z undo, Esc deselects then leaves.
function useEditKeys() {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const L = useLayout.getState();
      if (!L.editing || typing(e)) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); L.undo(); }
      else if (e.key === "r" || e.key === "R") rotate(e.shiftKey ? -STEP : STEP);
      else if (e.key === "=" || e.key === "+") resize(1.1);
      else if (e.key === "-") resize(1 / 1.1);
      else if ((e.key === "Delete" || e.key === "Backspace") && L.selected) { e.preventDefault(); L.setHidden(L.selected, true); }
      else if (e.key === "Escape") { if (L.selected) useLayout.setState({ selected: null }); else exitEdit(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
}

// Colour/material per part the item has, and its options (e.g. bed size).
function Options({ id }: { id: string }) {
  const slots = useLayout((s) => s.slots), opts = useLayout((s) => s.options[id]) ?? {}, def = finishDefaults(useLayout((s) => s.style), id);
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
        const choices = FINISHES[finishType(slot)] ?? {}, current = opts[slot] ?? def[slot] ?? def[finishType(slot)] ?? "original";
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

// The selected item's look: one of its own (from items/<id>/variants), or a model of yours in its place.
function Look({ id, onModel }: { id: string; onModel: () => void }) {
  const shell = useLayout((s) => s.shells[id]), pick = useLayout((s) => s.options[id]?.look), style = useLayout((s) => s.style);
  const looks = Object.values(LOOKS[id] ?? {}), current = shell ? null : variantId(id, { style, options: { [id]: { look: pick ?? "" } } });
  return (
    <div>
      <p className="text-xs text-zinc-400">Look: <span className="text-zinc-200">{shell ? shell.name : looks.find((v) => v.id === current)?.name}</span></p>
      <div className="grid grid-cols-2 gap-1">
        {looks.map((v) => (
          <Button key={v.id} size="xs" variant={current === v.id ? "default" : "outline"} onClick={() => useLayout.getState().setLook(id, v.id)}>{v.name}</Button>
        ))}
        <Button size="xs" variant={shell ? "default" : "outline"} onClick={onModel}>{shell ? "Other model…" : "Your model…"}</Button>
        {shell && <Button size="xs" variant="secondary" onClick={() => useLayout.getState().setShell(id, { ...shell, yaw: (shell.yaw + 1) % 4 })}>Turn model 90°</Button>}
      </div>
    </div>
  );
}

// How much of the room's budget is in use (all items + uploads). Past it, new uploads are simplified to fit.
function BudgetMeter() {
  const u = useBudget();
  const rows: [string, number, number, string][] = [
    ["Triangles", u.triangles, ROOM_BUDGET.triangles, `${Math.round(u.triangles / 1000)}k`],
    ["Draw calls", u.draws, ROOM_BUDGET.draws, String(u.draws)],
    ["Textures", u.textureMB, ROOM_BUDGET.textureMB, `${u.textureMB} MB`],
  ];
  return (
    <div className="space-y-1 text-xs text-zinc-400" aria-label="Room budget">
      {rows.map(([label, v, max, text]) => (
        <div key={label}>
          <div className="flex justify-between"><span>{label}</span><span>{text} / {label === "Textures" ? `${max} MB` : label === "Triangles" ? `${max / 1000}k` : max}</span></div>
          <div className="h-1 rounded bg-white/10"><div className={`h-1 rounded ${v > max ? "bg-red-500" : v > max * 0.8 ? "bg-amber-400" : "bg-cyan-400"}`} style={{ width: `${Math.min(100, (v / max) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

// Every item in the room with a show/hide toggle (hidden items can't be clicked, so this is how they come back).
function ItemList() {
  const hidden = useLayout((s) => s.hidden), models = useLayout((s) => s.models);
  const ids = [...new Set([...liveHomes.keys(), ...Object.keys(models)])].filter((id) => !id.startsWith("model-") || models[id])
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  return (
    <details className="text-xs">
      <summary className="cursor-pointer font-bold text-cyan-300">Items ({ids.length - hidden.filter((h) => ids.includes(h)).length} of {ids.length} shown)</summary>
      <div className="mt-1 max-h-48 space-y-0.5 overflow-y-auto pr-1">
        {ids.map((id) => {
          const off = hidden.includes(id);
          return (
            <label key={id} className={`flex cursor-pointer items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-white/5 ${off ? "text-zinc-500" : "text-zinc-200"}`}>
              <span className="truncate">{nameOf(id)}</span>
              <input type="checkbox" aria-label={`Show ${nameOf(id)}`} checked={!off} onChange={(e) => useLayout.getState().setHidden(id, !e.target.checked)} />
            </label>
          );
        })}
      </div>
      {hidden.length > 0 && <Button size="xs" variant="outline" className="mt-1" onClick={() => useLayout.getState().showAll()}>Show all</Button>}
    </details>
  );
}

// The room's style: colours, lighting moods, neon or trim, rug, duvets, view and default finishes.
function StylePicker() {
  const current = useLayout((s) => s.style);
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold text-cyan-300">Style: <span className="text-zinc-200">{STYLES[current].name}</span></p>
      <div className="grid grid-cols-2 gap-1">
        {STYLE_IDS.map((id) => (
          <button key={id} onClick={() => useLayout.getState().setStyle(id)} title={STYLES[id].blurb}
            className={`flex items-center gap-1.5 rounded border px-1.5 py-1 text-left text-[11px] ${id === current ? "border-cyan-300 bg-white/10 text-white" : "border-white/15 text-zinc-300 hover:bg-white/5"}`}>
            <span className="flex shrink-0">{STYLES[id].swatch.map((c) => <span key={c} className="-mr-1 size-3 rounded-full border border-black/40" style={{ background: c }} />)}</span>
            <span className="ml-1 truncate">{STYLES[id].name}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-zinc-400">{STYLES[current].blurb}</p>
    </div>
  );
}

// Room size: width, depth, height. Furniture against a wall goes with it; one undo step per drag.
function RoomSizeControls() {
  const size = useLayout((s) => s.size);
  const rows: [keyof RoomSize, string][] = [["w", "Width"], ["d", "Depth"], ["h", "Height"]];
  return (
    <div className="space-y-2" onPointerDownCapture={() => useLayout.getState().snapshot()}>
      <p className="text-xs font-bold text-cyan-300">Room size</p>
      {rows.map(([k, label]) => (
        <label key={k} className="grid gap-1 text-xs text-zinc-400">
          <span className="flex justify-between"><span>{label}</span><span className="text-zinc-200">{size[k].toFixed(2)} m</span></span>
          <Slider aria-label={`Room ${label.toLowerCase()}`} min={SIZE_RANGE[k][0]} max={SIZE_RANGE[k][1]} step={0.05} value={[size[k]]}
            onValueChange={(v) => useLayout.getState().setSize({ [k]: (Array.isArray(v) ? v[0] : v) as number })} />
        </label>
      ))}
      {(size.w !== DEFAULT_SIZE.w || size.d !== DEFAULT_SIZE.d || size.h !== DEFAULT_SIZE.h) && (
        <Button size="xs" variant="outline" onClick={() => useLayout.getState().setSize(DEFAULT_SIZE)}>Back to 4 × 4 × 2.8 m</Button>
      )}
    </div>
  );
}

export function EditPanel() {
  useEditKeys();
  const editing = useLayout((s) => s.editing), selected = useLayout((s) => s.selected), canUndo = useLayout((s) => s.past.length > 0);
  const moved = useLayout((s) => !!(s.selected && s.items[s.selected])), anyMoved = useLayout((s) => Object.keys(s.items).length + Object.keys(s.options).length > 0 || (Object.keys(DEFAULT_SIZE) as (keyof RoomSize)[]).some((k) => s.size[k] !== DEFAULT_SIZE[k]));
  const file = useRef<HTMLInputElement>(null), lookFile = useRef<HTMLInputElement>(null);
  if (!editing) return null;
  const onWall = !!(selected && ON_WALL[selected]), isModel = !!(selected && selected.startsWith("model-"));
  const replaceLook = async (f?: File) => {
    if (!f || !selected) return;
    try {
      const { asset, name, stats, optimized } = await importModelFile(f);
      useLayout.getState().setShell(selected, { asset, name, yaw: 0 });
      toast.success(`${nameOf(selected)} now uses ${f.name} (${optimized ? `simplified ${optimized.from.toLocaleString()} → ` : ""}${stats.triangles.toLocaleString()} triangles).`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const upload = async (f?: File) => {
    if (!f) return;
    try {
      const id = toast.loading(`Adding ${f.name}…`);
      try {
        const { stats, optimized } = await addModelFile(f);
        toast.success(`Added ${f.name} (${optimized ? `simplified ${optimized.from.toLocaleString()} → ` : ""}${stats.triangles.toLocaleString()} triangles). Drag it into place.`, { id });
      } catch (e) {
        toast.dismiss(id);
        throw e;
      }
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
          <div className="grid grid-cols-2 gap-1">
            <Button size="sm" variant="outline" disabled={!moved} onClick={() => useLayout.getState().reset(selected)}>Put back</Button>
            <Button size="sm" variant="outline" onClick={() => useLayout.getState().setHidden(selected, true)}>Hide [Del]</Button>
          </div>
          <Options id={selected} />
          {isModel && <Button size="sm" variant="destructive" onClick={() => useLayout.getState().removeModel(selected)}>Remove model</Button>}
          {!isModel && <Look id={selected} onModel={() => lookFile.current?.click()} />}
          <input ref={lookFile} type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" className="hidden"
            onChange={(e) => { replaceLook(e.target.files?.[0]); e.target.value = ""; }} />
        </>
      )}
      {!selected && <ItemList />}
      {!selected && <StylePicker />}
      {!selected && <RoomSizeControls />}
      <Button size="sm" variant="secondary" onClick={() => file.current?.click()}>+ Add a 3D model (.glb)</Button>
      <input ref={file} type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" className="hidden"
        onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="grid grid-cols-2 gap-1">
        <Button size="sm" variant="outline" disabled={!canUndo} onClick={() => useLayout.getState().undo()}>Undo [⌘Z]</Button>
        <Button size="sm" variant="outline" disabled={!anyMoved} onClick={() => { useLayout.getState().snapshot(); useLayout.setState({ items: {}, options: {}, size: DEFAULT_SIZE, style: DEFAULT_STYLE }); }}>Reset room</Button>
      </div>
      <BudgetMeter />
      <Button size="sm" onClick={exitEdit}>Done [Esc]</Button>
    </Panel>
  );
}
