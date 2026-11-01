import { defineItem } from "../types";

export const wallShelf = defineItem({ id: "wall-shelf", name: "Wall shelf", category: "decor", home: { position: [-1.87, 1.5, 1.35] }, walls: { x: -1, z: 1 }, onWall: "x", parts: ["wood"], variants: ["walnut"] });

export default wallShelf;
