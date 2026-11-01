import { defineItem } from "../types";
import { NIGHTSTAND } from "@/lib/layout";

export const nightstand = defineItem({ id: "nightstand", name: "Nightstand (+ lamp)", category: "furniture", home: { position: NIGHTSTAND }, walls: { x: -1 },
  anchors: ["surface"], parts: ["wood", "metal"], variants: ["default"] });

export default nightstand;
