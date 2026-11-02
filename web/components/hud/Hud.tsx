"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { typing, useGame, type View } from "@/lib/store";
import { useCollection } from "@/lib/collection";
import { styleOf } from "@/lib/styles";
import { downloadCollection, importFromFile, leaveVisit, visitFromFile } from "@/lib/share";
import { takePhoto } from "@/lib/photo";
import { editAlbum } from "./AlbumEditor";
import { Panel } from "./Panel";
import { enterEdit } from "./EditPanel";
import { useLayout } from "@/lib/room";

const VIEWS: [View, string, string][] = [["room", "Room", "1"], ["turntable", "Turntable", "2"], ["crate", "Crate", "3"], ["shelf", "Cabinet", "4"]];
const HELP: Record<View, string> = {
  room: "Drag to look; WASD or the stick (bottom right) to move. Click or tap the turntable, cabinet, crate, lamp, bed, window or framed records.",
  shelf: "Hover a spine to read it, click to pull it out.",
  crate: "A/D, arrows or scroll to flip. Enter = inspect, Space = put on turntable.",
  turntable: "Space or click the turntable to start/stop.",
  inspect: "Drag to rotate. F flip, V slide vinyl out, G gatefold, Space play.",
};
const one = (v: number | readonly number[]) => (Array.isArray(v) ? v[0] : v) as number;

// Neon double-glow title over the slowly turning room; any key, click or tap enters.
function Title() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-[#05020d]/55 text-center">
      <h1 className="relative text-6xl font-black tracking-tight text-fuchsia-500 sm:text-8xl [text-shadow:4px_3px_0_#1ae6ff,0_0_32px_#ff40c0]">VINYL // ROOM</h1>
      <p className="text-lg text-cyan-100">a cyber-city bedroom for your record collection</p>
      <Button size="lg" className="mt-6 h-14 px-10 text-xl font-bold">ENTER ROOM</Button>
      <p className="text-sm text-violet-300/70">tap or press any key · ? for controls</p>
    </div>
  );
}

function LeftPanel() {
  const view = useGame((s) => s.view), preset = useGame((s) => s.preset), lamp = useGame((s) => s.lamp);
  const muted = useGame((s) => s.muted), volume = useGame((s) => s.volume), visiting = useCollection((s) => s.visiting), style = useLayout((s) => s.style);
  const g = useGame.getState();
  return (
    <Panel side="left">
      <p><b className="capitalize text-cyan-300">{view === "shelf" ? "Cabinet" : view} view</b><br /><span className="text-zinc-400">{HELP[view]}</span></p>
      <div className="grid gap-1">
        {VIEWS.map(([v, label, k]) => <Button key={v} size="sm" variant={view === v ? "default" : "secondary"} onClick={() => g.setView(v)}>{label} [{k}]</Button>)}
      </div>
      <div className="grid gap-1">
        <Button size="sm" variant="outline" onClick={g.cyclePreset}>Light: {styleOf(style).presets[preset % 3].name} [L]</Button>
        <Button size="sm" variant="outline" onClick={g.toggleLamp}>Lamp: {lamp ? "on" : "off"}</Button>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="w-28" onClick={() => useGame.setState({ muted: !muted })}>Sound: {muted ? "off" : "on"} [M]</Button>
          <Slider aria-label="Volume" min={0} max={1} step={0.01} value={[volume]} onValueChange={(v) => useGame.setState({ volume: one(v) })} />
        </div>
        <Button size="sm" variant="outline" onClick={takePhoto}>Photo [P]</Button>
        <Button size="sm" variant="outline" onClick={() => useGame.setState({ hideUI: true })}>Showcase mode [H]</Button>
        {!visiting && <Button size="sm" variant="outline" onClick={enterEdit}>Edit room</Button>}
        <div className="grid grid-cols-2 gap-1">
          <Button size="sm" variant="outline" onClick={() => useGame.setState({ dialog: "settings" })}>Settings</Button>
          <Button size="sm" variant="outline" onClick={() => useGame.setState({ dialog: "controls" })}>Controls [?]</Button>
        </div>
      </div>
      <div className="grid gap-1">
        {visiting ? (
          <Button size="sm" variant="outline" onClick={leaveVisit}>Leave visit (back to my room)</Button>
        ) : (
          <>
            <Button size="sm" onClick={() => editAlbum()}>+ New album</Button>
            <div className="grid grid-cols-2 gap-1">
              <Button size="sm" variant="outline" onClick={downloadCollection}>Export</Button>
              <Button size="sm" variant="outline" onClick={importFromFile}>Import</Button>
            </div>
            <Button size="sm" variant="outline" onClick={visitFromFile}>Visit a friend&apos;s room…</Button>
          </>
        )}
      </div>
    </Panel>
  );
}

// Room and cabinet views: what's spinning and how many records there are.
function RoomPanel() {
  const view = useGame((s) => s.view), albums = useCollection((s) => s.albums), editing = useLayout((s) => s.editing);
  const spinning = useCollection((s) => s.albums.find((a) => a.id === s.spinningId));
  if ((view !== "room" && view !== "shelf") || editing) return null;
  return (
    <Panel side="right">
      {view === "room" && <p>{spinning ? <>Now spinning:<br /><b className="text-fuchsia-400">{spinning.title}</b> — {spinning.artist}</> : "Nothing on the turntable."}</p>}
      <p>{albums.length} records in the {view === "room" ? "crate" : "cabinet"}.</p>
    </Panel>
  );
}

const CONTROLS: [string, string][] = [
  ["Everywhere", "1 / 2 / 3 / 4 Room, Turntable, Crate, Cabinet · Esc / Backspace or ◀ Back to go back · L lighting · M mute · P photo · H hide UI (Show controls brings it back) · ? this help"],
  ["Room", "Drag to look, WASD or arrows to move, click anything that lights up."],
  ["Cabinet", "Hover a spine to read it, click to pull the record out."],
  ["Crate", "A/D, arrows or scroll to flip. Enter inspects, Space plays."],
  ["Turntable", "Space or click the turntable to start/stop. Speed button: 33⅓ or 45."],
  ["Inspecting a record", "Drag to rotate. F flip, V slide the vinyl out, G gatefold, Space play. Language tabs on the right list your other records."],
  ["Touch screens", "Tap = click, drag = look or rotate, the stick at the bottom right = walk, ◀ Back = back, pinch = zoom a record (scroll wheel on desktop). Every screen has a button to close it, no keyboard needed."],
  ["Sharing", "Export saves your whole room as one file. Send it to a friend: they open it with “Visit a friend's room”, read-only."],
];

function Dialogs() {
  const dialog = useGame((s) => s.dialog), sensitivity = useGame((s) => s.sensitivity), volume = useGame((s) => s.volume), quality = useGame((s) => s.quality);
  const close = () => useGame.setState({ dialog: "" });
  return (
    <>
      <Dialog open={dialog === "controls"} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Controls</DialogTitle></DialogHeader>
          <dl className="space-y-2 text-sm">
            {CONTROLS.map(([h, t]) => <div key={h}><dt className="font-bold text-cyan-300">{h}</dt><dd className="text-zinc-300">{t}</dd></div>)}
          </dl>
          <Button onClick={close}>Close</Button>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "settings"} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Settings</DialogTitle></DialogHeader>
          <label className="grid gap-2">Mouse sensitivity: {sensitivity.toFixed(1)}×
            <Slider min={0.2} max={3} step={0.1} value={[sensitivity]} onValueChange={(v) => useGame.setState({ sensitivity: one(v) })} />
          </label>
          <label className="grid gap-2">Volume: {Math.round(volume * 100)}%
            <Slider min={0} max={1} step={0.01} value={[volume]} onValueChange={(v) => useGame.setState({ volume: one(v) })} />
          </label>
          <div className="grid gap-2">Graphics
            <div className="grid grid-cols-3 gap-1">
              {(["Low", "Medium", "High"] as const).map((q, i) => (
                <Button key={q} size="sm" variant={quality === i ? "default" : "outline"} onClick={() => useGame.getState().setQuality(i as 0 | 1 | 2)}>{q}</Button>
              ))}
            </div>
            <p className="text-xs text-zinc-400">Low: no glow, no lamp shadows. High: glow, soft shadows, smoothing.</p>
          </div>
          <Button onClick={close}>Close</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Keys that work everywhere outside dialogs: title dismiss, L, H, P, ?.
function useHudKeys() {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (typing(e)) return;
      const s = useGame.getState();
      if (s.title) { enter(); return; }
      if (s.draft || s.dialog) return;
      if (e.key === "l") s.cyclePreset();
      if (e.key === "h") useGame.setState({ hideUI: !s.hideUI });
      if (e.key === "p") takePhoto();
      if (e.key === "?" || e.key === "F1") { e.preventDefault(); useGame.setState({ dialog: "controls" }); }
    };
    // Leave the title after this event has been handled everywhere, so the key or click that enters
    // doesn't also switch a view or toggle the lamp.
    const enter = () => setTimeout(() => useGame.setState({ title: false }), 0);
    const tap = () => { if (useGame.getState().title) enter(); };
    window.addEventListener("keydown", key);
    window.addEventListener("pointerup", tap);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("pointerup", tap); };
  }, []);
}

// Portrait phones are too narrow for the side panels: ask for landscape instead of shrinking everything.
function TurnSideways() {
  return (
    <div className="fixed inset-0 z-50 hidden flex-col items-center justify-center gap-3 bg-[#05020d]/95 p-6 text-center [@media(orientation:portrait)_and_(pointer:coarse)]:flex">
      <p className="text-3xl font-bold text-fuchsia-500 [text-shadow:0_0_18px_#ff40c0]">Turn your phone sideways</p>
      <p className="text-zinc-300">The room is best in landscape.</p>
    </div>
  );
}

export function Hud() {
  useHudKeys();
  const title = useGame((s) => s.title), hideUI = useGame((s) => s.hideUI), visiting = useCollection((s) => s.visiting);
  if (title) return <><Title /><TurnSideways /></>;
  return (
    <>
      <TurnSideways />
      <Dialogs />
      {!hideUI && (
        <>
          <LeftPanel />
          <RoomPanel />
          {visiting && <div className="fixed left-1/2 top-2.5 -translate-x-1/2 rounded border border-fuchsia-400/60 bg-black/70 px-4 py-1 text-xs font-bold tracking-widest text-fuchsia-300">VISITING A FRIEND&apos;S ROOM (read-only)</div>}
        </>
      )}
    </>
  );
}
