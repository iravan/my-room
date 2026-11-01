import { defineItem } from "../types";
import { TURNTABLE } from "@/lib/layout";

export const turntable = defineItem({ id: "turntable", name: "Turntable", category: "gadget", home: { position: TURNTABLE }, on: "cabinet", anchors: ["platter"], variants: ["classic"] });

export default turntable;
