import { defineItem } from "../types";
import { NIGHTSTAND } from "@/lib/layout";

export const nightstand = defineItem({ id: "nightstand", name: "Nightstand", category: "furniture", home: { position: NIGHTSTAND }, walls: { x: -1 },
  anchors: ["surface"], parts: ["wood", "metal"], variants: ["midcentury"] });

export default nightstand;
