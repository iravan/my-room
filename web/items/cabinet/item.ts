import { defineItem } from "../types";
import { CABINET } from "@/lib/layout";

export const cabinet = defineItem({ id: "cabinet", name: "Record cabinet (+ turntable)", category: "furniture", home: { position: CABINET }, walls: { x: 1, z: -1 },
  anchors: ["surface"], parts: ["metal", "wood"], variants: ["default"] });

export default cabinet;
