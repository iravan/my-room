import { defineItem } from "../types";

export const lamp = defineItem({ id: "lamp", name: "Lamp", category: "lighting", home: { position: [-1.7, 0.54, 0.45] }, on: "nightstand",
  parts: ["metal"], variants: ["drum"] });

export default lamp;
