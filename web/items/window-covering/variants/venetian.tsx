"use client";

import { useMemo } from "react";
import { srgb } from "@/lib/lighting";
import { Part } from "@/components/room/Surface";
import { defineVariant } from "../../types";

const BLIND = srgb(0.55, 0.55, 0.58), CORD = srgb(0.44, 0.44, 0.46);

// Venetian blinds lowered over the top 40% of the window, slats tilted 20° so the skyline stripes through; cord and wand.
function Venetian() {
  const slats = useMemo(() => Array.from({ length: 17 }, (_, i) => 2.035 - i * 0.024), []);
  return (
    <>
      <Part position={[-0.3, 2.07, -1.965]} size={[1.46, 0.04, 0.05]} color={BLIND} gloss={0.6} cast={false} />
      {slats.map((y) => <Part key={y} position={[-0.3, y, -1.962]} size={[1.42, 0.002, 0.026]} rotation={[20, 0, 0]} color={BLIND} gloss={0.6} cast={false} />)}
      <Part position={[-0.3, 1.615, -1.962]} size={[1.42, 0.012, 0.03]} color={BLIND} gloss={0.6} cast={false} />
      <Part position={[0.36, 1.4, -1.945]} size={[0.003, 0.66, 0.003]} color={CORD} cast={false} />
      <Part shape="capsule" position={[0.36, 1.065, -1.945]} size={[0.012, 0.025, 0.012]} color={BLIND} gloss={0.6} cast={false} />
    </>
  );
}

export default defineVariant({ item: "window-covering", id: "venetian", name: "Venetian blinds", Component: Venetian });
