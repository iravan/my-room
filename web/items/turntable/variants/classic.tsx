"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/lib/store";
import { TURNTABLE } from "@/lib/layout";
import { CYAN, srgb } from "@/lib/lighting";
import { Neon } from "@/components/room/Lighting";
import { Clickable } from "@/components/room/Clickable";
import { Part, Slab, unityEuler } from "@/components/room/Surface";
import { Disc } from "@/components/room/Records";
import { togglePlay, useCollection } from "@/lib/collection";
import { setHum, sfx } from "@/lib/audio";
import { defineVariant } from "../../types";

const SILVER = srgb(0.75, 0.75, 0.8), DARK = srgb(0.05, 0.05, 0.06), PLATTER = srgb(0.2, 0.2, 0.24);
const WALNUT = srgb(0.3, 0.26, 0.26);

// Turntable on the cabinet (click = turntable view, then lower/lift the arm). The platter spins up to 33⅓ or 45,
// the arm swings over the record and drops, tracking slowly inwards; it lifts first, then swings back.
// The record on it drops onto the platter when it's put on.
function Turntable() {
  const spinning = useCollection((s) => s.albums.find((a) => a.id === s.spinningId));
  const spinner = useRef<THREE.Group>(null), arm = useRef<THREE.Group>(null), disc = useRef<THREE.Group>(null);
  const st = useRef({ speed: 0, armYaw: 0, armPitch: 3, playTime: 0, needleDown: false });
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.1);
    const { playing, rpm45 } = useGame.getState(), t = st.current;
    const toward = (v: number, to: number, step: number) => (Math.abs(to - v) <= step ? to : v + Math.sign(to - v) * step);
    t.speed = toward(t.speed, playing ? (rpm45 ? 270 : 200) : 0, 250 * dt);
    if (spinner.current) spinner.current.rotation.y -= (t.speed * dt * Math.PI) / 180;
    const wantYaw = playing ? 26 + (36 - 26) * Math.min(1, t.playTime / 1200) : 0;
    t.armPitch = toward(t.armPitch, playing && Math.abs(t.armYaw - wantYaw) < 1 ? -2.5 : 3, 8 * dt);
    if (playing || t.armPitch > 2.9) t.armYaw = toward(t.armYaw, wantYaw, 30 * dt);
    if (t.armPitch < -2) t.playTime += dt;
    if (t.needleDown !== t.armPitch < -2.4) { t.needleDown = !t.needleDown; sfx("click", 0.6); }
    setHum(t.speed / 270);
    if (!playing) t.playTime = 0;
    arm.current?.rotation.copy(unityEuler([t.armPitch, t.armYaw, 0]));
    if (disc.current) disc.current.position.y = toward(disc.current.position.y, 0.002, 0.3 * dt);
  });
  return (
    <Clickable onTap={() => (useGame.getState().view === "turntable" ? togglePlay() : useGame.getState().setView("turntable"))} position={TURNTABLE}>
      <Slab set="black_walnut_veneer_01" tile={1} position={[0, 0.04, 0]} size={[0.46, 0.08, 0.36]} color={WALNUT} />
      <Neon position={[0, 0.02, 0.181]} size={[0.46, 0.006, 0.004]} color={CYAN} />
      <group ref={spinner} position={[-0.05, 0.1, 0]}>
        <Part shape="cylinder" position={[0, -0.01, 0]} size={[0.31, 0.01, 0.31]} color={PLATTER} />
        {spinning && (
          <group key={spinning.id} ref={disc} position={[0, 0.15, 0]}>
            <Disc a={spinning} />
          </group>
        )}
      </group>
      <Part shape="cylinder" position={[0.17, 0.1, -0.12]} size={[0.05, 0.03, 0.05]} color={SILVER} />
      <group ref={arm} position={[0.17, 0.13, -0.12]}>
        <Part position={[0, 0, 0.115]} size={[0.012, 0.012, 0.23]} color={SILVER} />
        <Part position={[0, -0.008, 0.235]} size={[0.02, 0.015, 0.035]} color={DARK} />
        <Part position={[0, 0, -0.04]} size={[0.03, 0.03, 0.04]} color={DARK} />
      </group>
    </Clickable>
  );
}

export default defineVariant({ item: "turntable", id: "classic", name: "Walnut turntable", Component: Turntable });
