import { defineItem } from "../types";

export const chair = defineItem({ id: "chair", name: "Chair", category: "furniture", home: null, walls: { x: -1, z: 1 }, parts: ["leather"], variants: ["default"] });

export default chair;
