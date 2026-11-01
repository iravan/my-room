"use client";

import { useMemo, type ReactNode } from "react";
import { hsv } from "@/lib/paint";
import { C, Ck, DeskFrame, dice, Prim, Walnut } from "../../_shared/prims";
import { defineVariant } from "../../types";

// Floating walnut shelf above the desk: a row of books, the one leaning over, a plant.
function WalnutShelf() {
  const { books, bx, lean } = useMemo(() => {
    const { R } = dice(18), hue = (s: number, v: number) => hsv(R(0, 1), s, v);
    const books: ReactNode[] = [];
    let bx = -0.42;
    while (bx < 0.18) {
      const w = R(0.025, 0.05), h = R(0.17, 0.26);
      books.push(<Prim key={bx} p={[bx + w / 2, 1.5125 + h / 2, 0.19]} s={[w, h, R(0.14, 0.19)]} c={Ck(hue(R(0.3, 0.7), R(0.25, 0.7)))} />);
      bx += w + 0.002;
    }
    return { books, bx, lean: hue(0.5, 0.5) };
  }, []);
  return (
    <DeskFrame>
      <Walnut p={[0, 1.5, 0.19]} s={[0.9, 0.025, 0.22]} c={[0.75, 0.7, 0.68]} />
      {books}
      <Prim p={[bx + 0.06, 1.6, 0.19]} s={[0.035, 0.22, 0.16]} e={[0, 0, -28]} c={Ck(lean)} />
      <Prim t="cylinder" p={[0.36, 1.5525, 0.19]} s={[0.1, 0.04, 0.1]} c={C(0.6, 0.3, 0.2)} />
      <Prim t="sphere" p={[0.36, 1.65, 0.19]} s={[0.17, 0.14, 0.17]} c={C(0.15, 0.35, 0.12)} />
    </DeskFrame>
  );
}

export default defineVariant({ item: "wall-shelf", id: "walnut", name: "Floating walnut", Component: WalnutShelf });
