import { defineItem } from "../types";

export const frames = defineItem({ id: "frames", name: "Framed records", category: "decor", home: { position: [-1.99, 1.35, -0.85] }, walls: { x: -1, z: -1 }, onWall: "x", variants: ["default"] });

export default frames;
