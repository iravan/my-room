import { defineItem } from "../types";
import { BED_HOME } from "@/lib/layout";

export const bed = defineItem({ id: "bed", name: "Bed (+ laptop, phone)", category: "furniture", home: { position: BED_HOME }, walls: { x: -1, z: -1 },
  anchors: ["surface"], parts: ["wood", "fabric:Duvet", "fabric:Sheets", "fabric:Throw", "fabric:Headboard"], variants: ["platform"] });

export default bed;
