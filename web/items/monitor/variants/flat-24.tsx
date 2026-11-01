"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { lerp, paint, type RGBA } from "@/lib/paint";
import { T } from "../../desk/variants/gaming";
import { C, DeskFrame, dice, flip, Plastic, Prim } from "../../_shared/prims";
import { defineVariant } from "../../types";

// Third-person game, world layer: sky and hills, seamless across u so it can scroll forever.
const gameWorld = () => paint(192, 108, (u, v) => {
  const hill = 0.35 + 0.07 * Math.sin(u * Math.PI * 4) + 0.04 * Math.sin(u * Math.PI * 10 + 1);
  if (v < hill) return lerp([0.04, 0.1, 0.06], [0.15, 0.32, 0.15], v / hill) as RGBA;
  return lerp([1, 0.55, 0.35], [0.15, 0.25, 0.6], (v - hill) / (1 - hill)) as RGBA;
}, { repeat: true });

// HUD over it (transparent elsewhere): health bar, minimap, crosshair, and the sun, which shouldn't scroll.
const gameHud = () => paint(192, 108, (u, v) => {
  if (v > 0.88 && v < 0.92 && u > 0.03 && u < 0.25) return u < 0.19 ? [0.9, 0.2, 0.2] : [0.25, 0.05, 0.05];
  if (u > 0.85 && u < 0.97 && v > 0.7 && v < 0.94) return Math.abs(u - 0.91) < 0.006 && Math.abs(v - 0.82) < 0.01 ? [1, 0.92, 0.016] : [0.12, 0.22, 0.16];
  if ((Math.abs(u - 0.5) < 0.012 && Math.abs(v - 0.5) < 0.003) || (Math.abs(v - 0.5) < 0.02 && Math.abs(u - 0.5) < 0.002)) return [1, 1, 1];
  if (Math.hypot(u * 1.78 - 1.15, v - 0.55) < 0.09) return [1, 0.9, 0.65];
  return [0, 0, 0, 0];
});

// The game world pans under its HUD.
const scroll = (t: THREE.Texture, seconds: number) => { t.offset.x = (seconds * 0.02) % 1; };
function Screen() {
  const [world, hud] = useMemo(() => [gameWorld(), gameHud()], []);
  useFrame(({ clock }) => scroll(world, clock.elapsedTime));
  return (
    <>
      <Prim t="quad" p={[0, T + 0.32, 0.104]} s={[0.61, 0.345]} map={world} glow={C(1, 1, 1)} />
      <Prim t="quad" p={[0, T + 0.32, 0.1035]} s={[0.61, 0.345]} map={hud} glow={C(1, 1, 1)} transparent />
    </>
  );
}

// 24" monitor with a game running, webcam, a sticky note or two, and its soft blue spill.
function Flat24() {
  const notes = useMemo(() => {
    const { R, int } = dice(1);
    return Array.from({ length: int(3) }, (_, i) =>
      <Prim key={i} p={[R(-0.3, 0.3) > 0 ? 0.3 : -0.3, T + R(0.16, 0.45), 0.103]} s={[0.05, 0.05, 0.002]} e={[0, 0, R(-8, 8)]} c={C(1, 0.9, 0.3)} />);
  }, []);
  const black = C(0.035, 0.035, 0.04);
  return (
    <DeskFrame>
      <Plastic p={[0, T + 0.006, 0.15]} s={[0.24, 0.012, 0.18]} c={black} />
      <Plastic p={[0, T + 0.11, 0.16]} s={[0.05, 0.2, 0.03]} c={black} />
      <Plastic p={[0, T + 0.32, 0.12]} s={[0.64, 0.38, 0.03]} c={black} />
      <Screen />
      <Plastic p={[0, T + 0.52, 0.115]} s={[0.08, 0.025, 0.03]} c={black} />
      {notes}
      <pointLight position={flip([0, T + 0.3, -0.3])} color={C(0.5, 0.6, 1)} intensity={1.2} distance={1.8} />
    </DeskFrame>
  );
}

export default defineVariant({ item: "monitor", id: "flat-24", name: "24\" flat monitor", Component: Flat24 });
