import { defineItem } from "../types";

export const whiteboard = defineItem({ id: "whiteboard", name: "Whiteboard", category: "decor", home: { position: [1.99, 1.45, -0.8] }, walls: { x: 1 }, onWall: "x", variants: ["marker"] });

export default whiteboard;
