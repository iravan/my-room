"use client";

import { CABINET_H } from "@/lib/layout";
import { MAGENTA } from "@/lib/lighting";
import { Metal, Neon } from "./Lighting";
import { BedItem } from "@/items/bed";
import { NightstandItem } from "@/items/nightstand";
import { LampItem } from "@/items/lamp";
import { ChairItem } from "@/items/chair";
import { ItemView } from "@/items/_shared/ItemView";
import { RoomItem } from "./RoomItem";
import { Core } from "./Shell";
import { HOMES } from "@/lib/room";


// "Now spinning" sleeve stand beside the turntable.
function SleeveStand() {
  return (
    <>
      <Metal position={[1.6, CABINET_H + 0.01, -1.88]} size={[0.34, 0.02, 0.08]} />
      <Neon position={[1.6, CABINET_H + 0.01, -1.839]} size={[0.34, 0.006, 0.004]} color={MAGENTA} />
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
      {["desk", "monitor", "keyboard", "speakers", "headset", "drinks", "pc", "bin", "cabinet", "turntable", "crate", "window", "window-covering", "door", "closet", "switch",
        "socket-desk", "socket-window", "socket-right", "ceiling-light", "smoke-detector"].map((id) => <ItemView key={id} id={id} />)}
      <RoomItem id="cabinet" home={HOMES.cabinet}><Core lift><SleeveStand /></Core></RoomItem>
    </>
  );
}
