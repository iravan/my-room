"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";

// A screen showing the real local time, redrawn when the minute changes (the laptop's chat, the phone's home screen).
export function useClockTexture(make: () => THREE.CanvasTexture, draw: (t: THREE.CanvasTexture, time: string) => void) {
  // Start with the clock-less screen: the material is compiled with a map from the first frame
  // (three doesn't recompile when a map appears later, so an empty start would stay white).
  const [tex, setTex] = useState(make);
  useEffect(() => {
    let shown = -1, current: THREE.CanvasTexture | undefined;
    const tick = () => {
      const now = new Date(), minute = now.getHours() * 60 + now.getMinutes();
      if (minute === shown) return;
      shown = minute;
      const t = make();
      draw(t, `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
      const old = current;
      current = t;
      setTex(t);
      setTimeout(() => old?.dispose(), 1000);
    };
    const first = setTimeout(tick, 0), id = setInterval(tick, 5000);
    return () => { clearTimeout(first); clearInterval(id); current?.dispose(); };
  }, [make, draw]);
  return tex;
}
