import { defineItem } from "../types";

export const door = defineItem({ id: "door", name: "Door", category: "fixture", home: { position: [1.4, 0, 2] }, walls: { x: 1, z: 1 }, onWall: "z", parts: ["wood"], variants: ["default"] });

export default door;
