import { defineItem } from "../types";
import { DESK } from "@/lib/layout";

export const desk = defineItem({ id: "desk", name: "Desk (+ PC, monitor)", category: "furniture", home: { position: DESK, rotationY: Math.PI / 2 }, walls: { x: -1, z: 1 },
  anchors: ["surface"], parts: ["wood", "metal", "fabric"], variants: ["default"] });

export default desk;
