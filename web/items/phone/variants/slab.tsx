"use client";

import * as THREE from "three";
import { drawText, hsv, lerp, paint, type RGBA } from "@/lib/paint";
import { C, Plastic, Prim } from "../../_shared/prims";
import { useClockTexture } from "../../_shared/clock";
import { defineVariant } from "../../types";

// Phone home screen: wallpaper gradient, app grid; the clock goes above it.
const phoneScreen = () => paint(40, 80, (u, v) => {
  if (v > 0.1 && v < 0.62 && u > 0.1 && u < 0.9 && (u * 4.4) % 1 < 0.7 && (v * 7.6) % 1 < 0.7)
    return hsv((Math.floor(u * 4.4) * 0.23 + Math.floor(v * 7.6) * 0.37) % 1, 0.7, 0.95);
  return lerp([0.55, 0.15, 0.6], [1, 0.45, 0.5], v) as RGBA;
});
const drawPhoneClock = (t: THREE.CanvasTexture, time: string) => drawText(t, time, 2, 60, 2, [1, 1, 1]);

// Phone lying face up, home screen on, the real time above the apps.
function Slab() {
  const screen = useClockTexture(phoneScreen, drawPhoneClock);
  return (
    <>
      <Plastic p={[0, 0, 0]} s={[0.075, 0.008, 0.155]} c={C(0.035, 0.035, 0.04)} />
      <Prim t="quad" p={[0, 0.0045, 0]} e={[90, 0, 0]} s={[0.07, 0.148]} map={screen} glow={C(1, 1, 1)} />
    </>
  );
}

export default defineVariant({ item: "phone", id: "slab", name: "Smartphone", Component: Slab });
