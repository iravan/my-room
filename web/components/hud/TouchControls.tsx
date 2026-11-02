"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { stick, useGame } from "@/lib/store";
import { useLayout } from "@/lib/room";

const R = 36; // stick travel, px

// Walking on a touch screen: drag the knob like WASD (up = forward), bottom right. Only for touch (coarse) pointers,
// and not in edit mode, where the edit panel takes that side.
function MoveStick() {
  const [at, setAt] = useState<[number, number]>([0, 0]), origin = useRef<[number, number] | null>(null);
  const move = (x: number, y: number) => {
    if (!origin.current) return;
    let dx = x - origin.current[0], dy = y - origin.current[1];
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    setAt([dx, dy]);
    stick.x = dx / R;
    stick.y = -dy / R;
  };
  const stop = () => { origin.current = null; setAt([0, 0]); stick.x = stick.y = 0; };
  return (
    <div
      aria-label="Move"
      className="fixed bottom-4 right-4 hidden size-24 touch-none select-none items-center justify-center rounded-full border border-cyan-400/50 bg-black/30 backdrop-blur [@media(pointer:coarse)]:flex"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); const r = e.currentTarget.getBoundingClientRect(); origin.current = [r.left + r.width / 2, r.top + r.height / 2]; move(e.clientX, e.clientY); }}
      onPointerMove={(e) => move(e.clientX, e.clientY)}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      <div className="size-10 rounded-full bg-cyan-400/60 shadow-[0_0_16px] shadow-cyan-400/60" style={{ transform: `translate(${at[0]}px, ${at[1]}px)` }} />
    </div>
  );
}

// On-screen ways out of everything Esc or H would leave: the fixed views, and showcase mode.
export function TouchControls() {
  const view = useGame((s) => s.view), hideUI = useGame((s) => s.hideUI), title = useGame((s) => s.title), editing = useLayout((s) => s.editing);
  if (title) return null;
  if (hideUI) return (
    <Button size="sm" variant="outline" className="fixed bottom-3 right-3 bg-black/50 opacity-70" onClick={() => useGame.setState({ hideUI: false })}>Show controls</Button>
  );
  if (editing) return null;
  if (view === "room") return <MoveStick />;
  return <Button size="lg" className="fixed bottom-4 left-1/2 -translate-x-1/2 px-8 font-bold" onClick={() => useGame.getState().back()}>◀ Back</Button>;
}
