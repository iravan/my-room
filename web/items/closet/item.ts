import { defineItem } from "../types";

export const closet = defineItem({ id: "closet", name: "Closet", category: "fixture", home: { position: [0.1, 0, 2] }, walls: { z: 1 }, onWall: "z", parts: ["wood"], variants: ["default"] });

export default closet;
