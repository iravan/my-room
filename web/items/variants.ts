// Every look of every item (React components; kept apart from registry.ts, which the engine imports without React).
import type { VariantDef } from "./types";
import bedPlatform from "./bed/variants/platform";
import bedSpindlePine from "./bed/variants/spindle-pine";
import nightstandMidcentury from "./nightstand/variants/midcentury";
import lampDrum from "./lamp/variants/drum";
import deskGaming from "./desk/variants/gaming";
import monitorFlat24 from "./monitor/variants/flat-24";
import keyboardRgb from "./keyboard/variants/rgb";
import speakersBookshelf from "./speakers/variants/bookshelf";
import headsetStand from "./headset/variants/stand";
import drinksCans from "./drinks/variants/cans";
import pcTower from "./pc/variants/tower";
import binMesh from "./bin/variants/mesh";
import chairRacing from "./chair/variants/racing";
import chairWindsor from "./chair/variants/windsor";
import cabinetCubbies from "./cabinet/variants/cubbies";
import turntableClassic from "./turntable/variants/classic";
import cratePine from "./crate/variants/pine";
import windowMetalFrame from "./window/variants/metal-frame";
import windowCoveringVenetian from "./window-covering/variants/venetian";
import doorSlab from "./door/variants/slab";
import closetSliding from "./closet/variants/sliding";
import switchRocker from "./switch/variants/rocker";
import socketPlate from "./socket/variants/plate";
import ceilingLightFlush from "./ceiling-light/variants/flush";
import smokeDetectorRound from "./smoke-detector/variants/round";
import hoodiePile from "./hoodie/variants/pile";
import jeansDenim from "./jeans/variants/denim";
import sneakersCanvas from "./sneakers/variants/canvas";
import basketballClassic from "./basketball/variants/classic";
import skateboardStreet from "./skateboard/variants/street";
import posterPrint from "./poster/variants/print";
import wallShelfWalnut from "./wall-shelf/variants/walnut";
import rugWoven from "./rug/variants/woven";
import rugNeonGrid from "./rug/variants/neon-grid";
import neonCoveStrips from "./neon-cove/variants/strips";
import laptopChat from "./laptop/variants/chat";
import phoneSlab from "./phone/variants/slab";
import controllerGamepad from "./controller/variants/gamepad";

export const VARIANTS: Record<string, Record<string, VariantDef>> = {};
for (const v of [bedPlatform, bedSpindlePine, nightstandMidcentury, lampDrum, deskGaming, monitorFlat24, keyboardRgb, speakersBookshelf, headsetStand, drinksCans, pcTower, binMesh, chairRacing, chairWindsor, cabinetCubbies, turntableClassic, cratePine,
  windowMetalFrame, windowCoveringVenetian, doorSlab, closetSliding, switchRocker, socketPlate, ceilingLightFlush, smokeDetectorRound,
  hoodiePile, jeansDenim, sneakersCanvas, basketballClassic, skateboardStreet, posterPrint, wallShelfWalnut, rugWoven, rugNeonGrid, neonCoveStrips, laptopChat, phoneSlab, controllerGamepad]) for (const item of ([] as string[]).concat(v.item)) (VARIANTS[item] ??= {})[v.id] = v;
