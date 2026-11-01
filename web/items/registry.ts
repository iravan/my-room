// Every item in the room. Add a folder under items/ and list it here.
import type { ItemDef } from "./types";
import bed from "./bed/item";
import nightstand from "./nightstand/item";
import lamp from "./lamp/item";
import desk from "./desk/item";
import chair from "./chair/item";
import cabinet from "./cabinet/item";
import crate from "./crate/item";
import window from "./window/item";
import door from "./door/item";
import closet from "./closet/item";
import lightSwitch from "./switch/item";
import socket from "./socket/item";
import frames from "./frames/item";
import wall_shelf from "./wall-shelf/item";
import poster from "./poster/item";
import rug from "./rug/item";
import neon_cove from "./neon-cove/item";
import ceiling_light from "./ceiling-light/item";
import smoke_detector from "./smoke-detector/item";
import hoodie from "./hoodie/item";
import jeans from "./jeans/item";
import sneakers from "./sneakers/item";
import backpack from "./backpack/item";
import basketball from "./basketball/item";
import skateboard from "./skateboard/item";

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  ([] as ItemDef[]).concat(
    bed,
    nightstand,
    lamp,
    desk,
    chair,
    cabinet,
    crate,
    window,
    door,
    closet,
    lightSwitch,
    socket,
    frames,
    wall_shelf,
    poster,
    rug,
    neon_cove,
    ceiling_light,
    smoke_detector,
    hoodie,
    jeans,
    sneakers,
    backpack,
    basketball,
    skateboard,
  ).map((d) => [d.id, d]),
);
