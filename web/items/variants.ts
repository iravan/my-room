// Every look of every item (React components; kept apart from registry.ts, which the engine imports without React).
import type { VariantDef } from "./types";
import bedPlatform from "./bed/variants/platform";
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

export const VARIANTS: Record<string, Record<string, VariantDef>> = {};
for (const v of [bedPlatform, nightstandMidcentury, lampDrum, deskGaming, monitorFlat24, keyboardRgb, speakersBookshelf, headsetStand, drinksCans, pcTower, binMesh, chairRacing, cabinetCubbies, turntableClassic, cratePine,
  windowMetalFrame, windowCoveringVenetian, doorSlab, closetSliding, switchRocker, socketPlate, ceilingLightFlush, smokeDetectorRound]) for (const item of ([] as string[]).concat(v.item)) (VARIANTS[item] ??= {})[v.id] = v;
