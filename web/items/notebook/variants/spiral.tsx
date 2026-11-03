"use client";

import { T } from "../../desk/variants/gaming";
import { useGame } from "@/lib/store";
import { Clickable } from "@/components/room/Clickable";
import { C, DeskFrame, Prim } from "../../_shared/prims";
import { defineVariant } from "../../types";

// A spiral notebook with a pen, front right of the desk; opens your notes.
function Spiral() {
  return (
    <DeskFrame>
      <Clickable onTap={() => useGame.setState({ dialog: "notes" })} hint="Notebook: read and write notes">
        <group rotation={[0, 0.12, 0]} position={[0.42, 0, 0.18]}>
          <Prim p={[0, T + 0.004, 0]} s={[0.15, 0.008, 0.21]} c={C(0.95, 0.93, 0.86)} />
          <Prim p={[0, T + 0.0085, 0]} s={[0.152, 0.002, 0.212]} c={C(0.55, 0.12, 0.18)} />
          <Prim t="cylinder" p={[-0.078, T + 0.006, 0]} e={[90, 0, 0]} s={[0.008, 0.1, 0.008]} c={C(0.7, 0.7, 0.72)} gloss={0.7} />
          <Prim t="cylinder" p={[0.03, T + 0.014, 0.02]} e={[90, 25, 0]} s={[0.008, 0.07, 0.008]} c={C(0.05, 0.05, 0.08)} gloss={0.6} />
        </group>
      </Clickable>
    </DeskFrame>
  );
}

export default defineVariant({ item: "notebook", id: "spiral", name: "Spiral notebook", Component: Spiral });
