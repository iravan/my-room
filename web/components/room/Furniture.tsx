"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame, type Vec3 } from "@/lib/store";
import { CABINET, CABINET_H, CABINET_W, CRATE, BOARD, CUBBY, COLS, ROWS, TURNTABLE } from "@/lib/layout";
import { CYAN, MAGENTA, srgb } from "@/lib/lighting";
import { Metal, Neon } from "./Lighting";
import { Clickable } from "./Clickable";
import { Part, Slab, unityEuler } from "./Surface";
import { BedItem } from "@/items/bed";
import { NightstandItem } from "@/items/nightstand";
import { LampItem } from "@/items/lamp";
import { ChairItem } from "@/items/chair";
import { ItemView } from "@/items/_shared/ItemView";
import { RoomItem } from "./RoomItem";
import { Core } from "./Shell";
import { HOMES } from "@/lib/room";
import { Disc } from "./Records";
import { togglePlay, useCollection } from "@/lib/collection";
import { setHum, sfx } from "@/lib/audio";

const SILVER = srgb(0.75, 0.75, 0.8), DARK = srgb(0.05, 0.05, 0.06), PLATTER = srgb(0.2, 0.2, 0.24);
const WALNUT = srgb(0.3, 0.26, 0.26), PINE = srgb(0.45, 0.35, 0.45), BLIND = srgb(0.55, 0.55, 0.58), CORD = srgb(0.44, 0.44, 0.46);

// Open record cabinet with cyan shelf LEDs (click = shelf view).
function Cabinet() {
  const setView = useGame((s) => s.setView);
  const uprights = Array.from({ length: COLS + 1 }, (_, i) => -CABINET_W / 2 + BOARD / 2 + i * (CUBBY + BOARD));
  const shelves = Array.from({ length: ROWS + 1 }, (_, j) => BOARD / 2 + j * (CUBBY + BOARD));
  return (
    <Clickable onTap={() => setView("shelf")} position={CABINET}>
      {uprights.map((x) => <Metal key={x} position={[x, CABINET_H / 2, 0]} size={[BOARD, CABINET_H, 0.4]} />)}
      {shelves.map((y) => (
        <group key={y}>
          <Metal position={[0, y, 0]} size={[CABINET_W, BOARD, 0.4]} />
          <Neon position={[0, y, 0.203]} size={[CABINET_W, 0.008, 0.006]} color={CYAN} />
        </group>
      ))}
      <Metal position={[0, CABINET_H / 2, -0.195]} size={[CABINET_W, CABINET_H, 0.01]} shade={0.7} />

    </Clickable>
  );
}

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

// "Now spinning" sleeve stand beside the turntable.
function SleeveStand() {
  return (
    <>
      <Metal position={[1.6, CABINET_H + 0.01, -1.88]} size={[0.34, 0.02, 0.08]} />
      <Neon position={[1.6, CABINET_H + 0.01, -1.839]} size={[0.34, 0.006, 0.004]} color={MAGENTA} />
    </>
  );
}

// Record crate (click = crate view).
function Crate() {
  const setView = useGame((s) => s.setView);
  const sides: { position: Vec3; size: Vec3 }[] = [
    { position: [0, 0.01, 0], size: [0.38, 0.02, 0.6] },
    { position: [-0.19, 0.11, 0], size: [0.02, 0.22, 0.6] },
    { position: [0.19, 0.11, 0], size: [0.02, 0.22, 0.6] },
    { position: [0, 0.11, 0.3], size: [0.4, 0.22, 0.02] },
    { position: [0, 0.11, -0.3], size: [0.4, 0.22, 0.02] },
  ];
  return (
    <Clickable onTap={() => setView("crate")} position={CRATE}>
      {sides.map((p, i) => <Slab key={i} set="coated_pine" tile={0.74} {...p} color={PINE} />)}
      <Neon position={[0, 0.222, 0.3]} size={[0.4, 0.006, 0.022]} color={MAGENTA} />

    </Clickable>
  );
}

// Venetian blinds lowered over the top 40% of the window, slats tilted 20° so the skyline stripes through,
// and a faint glass pane: black additive dielectric, so only its reflections show (the lamp in the glass).
function BlindsAndGlass() {
  const cyclePreset = useGame((s) => s.cyclePreset);
  const slats = useMemo(() => Array.from({ length: 17 }, (_, i) => 2.035 - i * 0.024), []);
  return (
    <>
      {/* Glass in the opening (click = next lighting preset) */}
      <Clickable onTap={cyclePreset} position={[-0.3, 1.55, -2.04]}>
        <mesh>
          <planeGeometry args={[1.4, 1]} />
          <meshStandardMaterial color="black" roughness={0.12} metalness={0} blending={THREE.AdditiveBlending} depthWrite={false} envMapIntensity={2} />
        </mesh>
      </Clickable>
      <Part position={[-0.3, 2.07, -1.965]} size={[1.46, 0.04, 0.05]} color={BLIND} gloss={0.6} cast={false} />
      {slats.map((y) => <Part key={y} position={[-0.3, y, -1.962]} size={[1.42, 0.002, 0.026]} rotation={[20, 0, 0]} color={BLIND} gloss={0.6} cast={false} />)}
      <Part position={[-0.3, 1.615, -1.962]} size={[1.42, 0.012, 0.03]} color={BLIND} gloss={0.6} cast={false} />
      <Part position={[0.36, 1.4, -1.945]} size={[0.003, 0.66, 0.003]} color={CORD} cast={false} />
      <Part shape="capsule" position={[0.36, 1.065, -1.945]} size={[0.012, 0.025, 0.012]} color={BLIND} gloss={0.6} cast={false} />
    </>
  );
}

export function Furniture() {
  return (
    <>
      <BedItem />
      <NightstandItem />
      <LampItem />
      <ChairItem />
      {["desk", "monitor", "keyboard", "speakers", "headset", "drinks", "pc", "bin"].map((id) => <ItemView key={id} id={id} />)}
      <RoomItem id="cabinet" home={HOMES.cabinet}>
        <Cabinet />
        <Core lift>
          <Turntable />
          <SleeveStand />
        </Core>
      </RoomItem>
      <RoomItem id="crate" home={HOMES.crate}><Crate /></RoomItem>
      <RoomItem id="window" home={HOMES.window}><BlindsAndGlass /></RoomItem>
    </>
  );
}
