import { defineItem } from "../types";

export const lightSwitch = defineItem({ id: "switch", name: "Light switch", category: "fixture", home: { position: [2, 1.1, 1.75] }, walls: { x: 1, z: 1 }, onWall: "x", variants: ["rocker"] });

export default lightSwitch;
