import { defineItem } from "../types";

export const window = defineItem({ id: "window", name: "Window", category: "fixture", home: { position: [-0.3, 1.55, -2] }, walls: { z: -1 }, onWall: "z", parts: ["metal"], variants: ["default"] });

export default window;
