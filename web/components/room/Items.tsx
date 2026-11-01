"use client";

import { useMemo, type ComponentType } from "react";
import { ITEMS } from "@/items/registry";
import { ItemView } from "@/items/_shared/ItemView";
import type { U3 } from "@/items/_shared/prims";
import { BedItem, onBed } from "@/items/bed";
import { NightstandItem } from "@/items/nightstand";
import { LampItem } from "@/items/lamp";
import { ChairItem } from "@/items/chair";
import { HOODIE, PILE } from "@/items/hoodie/roll";
import { JEANS } from "@/items/jeans/place";
import { SNEAKERS } from "@/items/sneakers/place";
import { BALL } from "@/items/basketball/place";
import { BOARD } from "@/items/skateboard/place";
import { LAPTOP } from "@/items/laptop/place";
import { PHONE } from "@/items/phone/place";
import { CONTROLLER } from "@/items/controller/place";

// Items with a view of their own (extra behaviour around the look); everything else is drawn by ItemView.
const VIEWS: Record<string, ComponentType> = { bed: BedItem, nightstand: NightstandItem, lamp: LampItem, chair: ChairItem };

// Every item in the registry, at its home — or, for clutter, where it landed this load (absent: not in the room
// this time). Gadgets on the bed lie on the current bed's top.
export function Items() {
  const places = useMemo((): Record<string, { p: U3; yaw?: number } | undefined> => ({
    hoodie: HOODIE.at === 1 ? PILE : undefined, jeans: JEANS.here ? JEANS : undefined, sneakers: SNEAKERS, basketball: BALL, skateboard: BOARD,
    laptop: onBed(LAPTOP), phone: onBed(PHONE), controller: onBed(CONTROLLER),
  }), []);
  return (
    <>
      {Object.values(ITEMS).map(({ id, home }) => {
        const View = VIEWS[id];
        if (View) return <View key={id} />;
        if (home) return <ItemView key={id} id={id} />;
        return places[id] && <ItemView key={id} id={id} place={places[id]} />;
      })}
    </>
  );
}
