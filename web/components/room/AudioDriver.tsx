"use client";

import { useEffect } from "react";
import { useGame } from "@/lib/store";
import { setLevel, startAudio } from "@/lib/audio";

// Starts sound on the first gesture and keeps the master level in step with volume/mute.
export function AudioDriver() {
  useEffect(() => {
    const start = () => startAudio();
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
    const apply = (s: { volume: number; muted: boolean }) => setLevel(s.muted ? 0 : s.volume);
    apply(useGame.getState());
    const unsub = useGame.subscribe(apply);
    return () => { window.removeEventListener("pointerdown", start); window.removeEventListener("keydown", start); unsub(); };
  }, []);
  return null;
}
