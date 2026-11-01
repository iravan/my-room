import { defineItem } from "../types";

export const posterDesk = defineItem({ id: "poster-desk", name: "Poster (desk)", category: "decor", home: { position: [-1.975, 2.1, 1.35] }, walls: { x: -1, z: 1 }, onWall: "x", variants: ["default"] });
export const poster1 = defineItem({ id: "poster-1", name: "Poster", category: "decor", home: { position: [1.995, 1.65, 1.05] }, walls: { x: 1 }, onWall: "x", variants: ["default"] });
export const poster2 = defineItem({ id: "poster-2", name: "Poster (small)", category: "decor", home: { position: [1.995, 1.55, 0.3] }, walls: { x: 1 }, onWall: "x", variants: ["default"] });

const posters = [posterDesk, poster1, poster2];

export default posters;
