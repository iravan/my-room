import { defineItem } from "../types";

export const chair = defineItem({ id: "chair", name: "Chair", category: "furniture", home: { position: [-1.06, 0, 1.35] }, walls: { x: -1, z: 1 }, anchors: ["backTop"], parts: ["leather", "wood"], variants: ["racing", "windsor"] });

export default chair;
