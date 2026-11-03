"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGame } from "@/lib/store";
import { useNotes } from "@/lib/notes";
import { Clickable } from "@/components/room/Clickable";
import { C, G, Plastic, Prim } from "../../_shared/prims";
import { onWallAt } from "../../_shared/wall";
import { defineVariant } from "../../types";

export const BOARD_SIZE: [number, number] = [1, 0.7]; // metres; the drawing canvas keeps this aspect

// Aluminium-framed whiteboard with a marker tray; shows whatever was last drawn on it.
function Marker({ id }: { id: string }) {
  const { p, yaw } = onWallAt(id);
  const drawing = useNotes((s) => s.board);
  const map = useMemo(() => {
    if (!drawing) return undefined;
    const t = new THREE.TextureLoader().load(drawing);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [drawing]);
  useEffect(() => () => map?.dispose(), [map]);
  const [w, h] = BOARD_SIZE, alu = C(0.72, 0.73, 0.75);
  return (
    <Clickable onTap={() => useGame.setState({ dialog: "board" })} hint="Whiteboard: draw or leave a message">
      <G p={p} yaw={yaw}>
        <Prim p={[0, 0, 0.004]} s={[w + 0.04, h + 0.04, 0.018]} c={alu} gloss={0.6} />
        <Prim key={map?.uuid ?? "blank"} t="quad" p={[0, 0, -0.006]} s={[w, h]} c={C(0.62, 0.62, 0.62)} map={map} gloss={0.5} />
        <Prim p={[0, -h / 2 - 0.03, -0.03]} s={[0.5, 0.012, 0.05]} c={alu} gloss={0.6} />
        <Plastic t="cylinder" p={[-0.12, -h / 2 - 0.016, -0.03]} e={[0, 0, 90]} s={[0.016, 0.06, 0.016]} c={C(0.1, 0.2, 0.8)} />
        <Plastic t="cylinder" p={[0.06, -h / 2 - 0.016, -0.035]} e={[0, 0, 90]} s={[0.016, 0.06, 0.016]} c={C(0.85, 0.1, 0.1)} />
      </G>
    </Clickable>
  );
}

export default defineVariant({ item: "whiteboard", id: "marker", name: "Whiteboard", Component: Marker });
