import { defineItem } from "../types";

export const bin = defineItem({ id: "bin", name: "Bin", category: "clutter", home: { position: [-1.63, 0, 1.8] }, walls: { x: -1, z: 1 }, variants: ["mesh"] });

export default bin;
