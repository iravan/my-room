// Every look of every item (React components; kept apart from registry.ts, which the engine imports without React).
import type { VariantDef } from "./types";
import bedPlatform from "./bed/variants/platform";
import nightstandMidcentury from "./nightstand/variants/midcentury";
import lampDrum from "./lamp/variants/drum";

export const VARIANTS: Record<string, Record<string, VariantDef>> = {};
for (const v of [bedPlatform, nightstandMidcentury, lampDrum]) (VARIANTS[v.item] ??= {})[v.id] = v;
