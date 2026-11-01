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

export const VARIANTS: Record<string, Record<string, VariantDef>> = {};
for (const v of [bedPlatform, nightstandMidcentury, lampDrum, deskGaming, monitorFlat24, keyboardRgb, speakersBookshelf, headsetStand, drinksCans, pcTower, binMesh]) (VARIANTS[v.item] ??= {})[v.id] = v;
