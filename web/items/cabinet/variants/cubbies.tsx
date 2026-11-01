"use client";

import { useGame } from "@/lib/store";
import { CABINET, CABINET_H, CABINET_W, BOARD, CUBBY, COLS, ROWS } from "@/lib/layout";
import { CYAN } from "@/lib/lighting";
import { Metal, Neon } from "@/components/room/Lighting";
import { Clickable } from "@/components/room/Clickable";
import { ContactShadow } from "../../_shared/ContactShadow";
import { defineVariant } from "../../types";

// Open record cabinet with cyan shelf LEDs (click = shelf view).
function Shelving() {
  const setView = useGame((s) => s.setView);
  const uprights = Array.from({ length: COLS + 1 }, (_, i) => -CABINET_W / 2 + BOARD / 2 + i * (CUBBY + BOARD));
  const shelves = Array.from({ length: ROWS + 1 }, (_, j) => BOARD / 2 + j * (CUBBY + BOARD));
  return (
    <Clickable onTap={() => setView("shelf")} position={CABINET}>
      {uprights.map((x) => <Metal key={x} position={[x, CABINET_H / 2, 0]} size={[BOARD, CABINET_H, 0.4]} />)}
      {shelves.map((y) => (
        <group key={y}>
          <Metal position={[0, y, 0]} size={[CABINET_W, BOARD, 0.4]} />
          <Neon position={[0, y, 0.203]} size={[CABINET_W, 0.008, 0.006]} color={CYAN} />
        </group>
      ))}
      <Metal position={[0, CABINET_H / 2, -0.195]} size={[CABINET_W, CABINET_H, 0.01]} shade={0.7} />
    </Clickable>
  );
}

const Cubbies = () => <><Shelving /><ContactShadow x={CABINET[0]} z={CABINET[2]} size={[1.6, 0.55]} /></>;

export default defineVariant({
  item: "cabinet", id: "cubbies", name: "Open cubbies", Component: Cubbies,
  surfaceY: () => CABINET_H, footprint: () => [CABINET_W, 0.4],
});
