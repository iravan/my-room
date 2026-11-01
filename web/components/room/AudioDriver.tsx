"use client";

import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/lib/store";
import { setLevel, setListener, startAudio } from "@/lib/audio";

const fwd = new THREE.Vector3(), up = new THREE.Vector3();

// Starts sound on the first gesture, keeps the master level in step with volume/mute, ears on the camera.
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
  useFrame(({ camera }) => {
    setListener(camera.position, fwd.set(0, 0, -1).applyQuaternion(camera.quaternion), up.set(0, 1, 0).applyQuaternion(camera.quaternion));
  });
  return null;
}
