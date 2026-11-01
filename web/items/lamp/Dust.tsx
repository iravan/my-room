"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame, type Vec3 } from "@/lib/store";
import { paint, rng } from "@/lib/paint";

// Dust in the lamp's glow. Real dust is brightest backlit, which a lit material gets backwards, so: unlit soft
// additive motes drifting in a small box round the lamp, fading in and out, shown only while it's on (and not on Low).
const DUST = { n: 90, life: 14, centre: [-1.45, 1.15, 0.45] as Vec3, box: [1.2, 1, 1.2] as Vec3 };
function makeDust() {
  const pos = new Float32Array(DUST.n * 3), col = new Float32Array(DUST.n * 3), age = new Float32Array(DUST.n), seed = new Float32Array(DUST.n * 3);
  const c = DUST.centre, rnd = rng(11);
  const spawn = (i: number) => { for (let k = 0; k < 3; k++) { pos[i * 3 + k] = c[k] + (rnd() - 0.5) * DUST.box[k]; seed[i * 3 + k] = rnd() * 100; } };
  for (let i = 0; i < DUST.n; i++) { spawn(i); age[i] = rnd() * DUST.life; } // prewarmed
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const map = paint(16, 16, (u, v) => { const a = 0.6 * Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.5) * 2); return [a, a * 0.8, a * 0.93]; });
  const step = (dt: number, time: number) => {
    for (let i = 0; i < DUST.n; i++) {
      age[i] += dt;
      if (age[i] > DUST.life) { age[i] = 0; spawn(i); }
      for (let k = 0; k < 3; k++) pos[i * 3 + k] += Math.sin(time * 0.25 + seed[i * 3 + k]) * 0.025 * dt;
      const t = age[i] / DUST.life, fade = t < 0.2 ? t / 0.2 : t > 0.8 ? (1 - t) / 0.2 : 1;
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = fade;
    }
    geometry.attributes.position.needsUpdate = geometry.attributes.color.needsUpdate = true;
  };
  return { geometry, map, step };
}
export function Dust() {
  const on = useGame((s) => s.lamp && s.quality > 0);
  const dust = useMemo(() => makeDust(), []);
  useFrame(({ clock }, dt) => { if (on) dust.step(Math.min(dt, 0.1), clock.elapsedTime); });
  if (!on) return null;
  return (
    <points geometry={dust.geometry} raycast={() => null}>
      <pointsMaterial map={dust.map} size={0.012} sizeAttenuation vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

