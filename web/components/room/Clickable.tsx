"use client";

import { useEffect, useRef, type ReactNode, type Ref } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useGame, type Vec3 } from "@/lib/store";
import { useLayout } from "@/lib/room";

const HOVER = new THREE.Color(0.06, 0.05, 0.1); // added to emissive: a lift like Unity's colour × 1.4 + violet

// Brighten (or restore) every lit mesh this clickable owns. Nested clickables (spines in the cabinet,
// sleeves in the crate) light up on their own, so the walk stops at them.
function tint(root: THREE.Object3D, on: boolean) {
  for (const child of root.children) {
    if (child.userData.clickable) continue;
    const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (m?.emissive && child.userData.lit !== on) {
      if (on) m.emissive.add(HOVER);
      else m.emissive.sub(HOVER);
      child.userData.lit = on;
    }
    tint(child, on);
  }
}

// Something you can click: highlight + pointer cursor on hover, optional tooltip, and a tap that isn't
// the end of a camera drag. Hover is off in Inspect, like Unity.
export function Clickable({ onTap, hint, onHover, children, position, rotation, ref }: {
  onTap: () => void; hint?: string; onHover?: (on: boolean) => void; children: ReactNode;
  position?: Vec3; rotation?: THREE.Euler; ref?: Ref<THREE.Group>;
}) {
  const own = useRef<THREE.Group>(null);
  const hover = (on: boolean) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (on && useGame.getState().view === "inspect") return;
    tint(e.eventObject, on);
    document.body.style.cursor = on ? "pointer" : "";
    if (hint) useGame.setState({ hint: on ? hint : "" });
    onHover?.(on);
  };
  return (
    <group
      ref={(g) => {
        own.current = g;
        if (typeof ref === "function") ref(g);
        else if (ref) ref.current = g;
      }}
      position={position}
      rotation={rotation}
      userData={{ clickable: true }}
      onPointerOver={hover(true)}
      onPointerOut={hover(false)}
      onClick={(e) => {
        if (e.delta > 4 || useGame.getState().title || useLayout.getState().editing) return; // in edit mode a press selects instead
        e.stopPropagation();
        onTap();
      }}
    >
      {children}
    </group>
  );
}

// Spine titles are too thin to read on the shelf: a small label follows the pointer.
export function Tooltip() {
  const hint = useGame((s) => s.hint);
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const move = (e: PointerEvent) => { if (el.current) el.current.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 8}px)`; };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return (
    <div ref={el} className={`pointer-events-none fixed left-0 top-0 rounded border border-cyan-400/40 bg-black/80 px-2 py-1 text-xs text-cyan-100 ${hint ? "" : "hidden"}`}>
      {hint}
    </div>
  );
}
