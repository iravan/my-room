"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useGame } from "@/lib/store";
import { CABINET_H } from "@/lib/layout";
import { MAGENTA, srgb } from "@/lib/lighting";
import { Metal, Neon } from "./Lighting";
import { Clickable } from "./Clickable";
import { Part } from "./Surface";
import { BedItem } from "@/items/bed";
import { NightstandItem } from "@/items/nightstand";
import { LampItem } from "@/items/lamp";
import { ChairItem } from "@/items/chair";
import { ItemView } from "@/items/_shared/ItemView";
import { RoomItem } from "./RoomItem";
import { Core } from "./Shell";
import { HOMES } from "@/lib/room";

const BLIND = srgb(0.55, 0.55, 0.58), CORD = srgb(0.44, 0.44, 0.46);

// "Now spinning" sleeve stand beside the turntable.
function SleeveStand() {
  return (
    <>
      <Metal position={[1.6, CABINET_H + 0.01, -1.88]} size={[0.34, 0.02, 0.08]} />
      <Neon position={[1.6, CABINET_H + 0.01, -1.839]} size={[0.34, 0.006, 0.004]} color={MAGENTA} />
    </>
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
      {["desk", "monitor", "keyboard", "speakers", "headset", "drinks", "pc", "bin", "cabinet", "turntable", "crate"].map((id) => <ItemView key={id} id={id} />)}
      <RoomItem id="cabinet" home={HOMES.cabinet}><Core lift><SleeveStand /></Core></RoomItem>
      <RoomItem id="window" home={HOMES.window}><BlindsAndGlass /></RoomItem>
    </>
  );
}
