import { defineItem } from "../types";
import { CRATE } from "@/lib/layout";

export const crate = defineItem({ id: "crate", name: "Record crate", category: "furniture", home: { position: CRATE }, walls: { x: 1 }, parts: ["wood"], variants: ["default"] });

export default crate;
