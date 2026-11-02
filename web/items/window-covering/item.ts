import { defineItem } from "../types";

// Its own item so blinds and curtains can be swapped (and hidden) apart from the window; hangs on it.
export const windowCovering = defineItem({ id: "window-covering", name: "Blinds / curtains", category: "fixture", home: { position: [-0.3, 2.07, -1.965] }, on: "window",
  walls: { z: -1 }, onWall: "z", parts: ["fabric"], variants: ["venetian", "curtains"] });

export default windowCovering;
