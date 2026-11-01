"use client";

import { C, Plastic } from "../../_shared/prims";
import { defineVariant } from "../../types";

// Game controller: body and two grips.
function Gamepad() {
  const black = C(0.035, 0.035, 0.04);
  return (
    <>
      <Plastic p={[0, 0, 0]} s={[0.15, 0.035, 0.07]} c={black} />
      {[-1, 1].map((s) => <Plastic key={s} t="sphere" p={[s * 0.06, -0.005, -0.035]} s={[0.05, 0.035, 0.07]} c={black} />)}
    </>
  );
}

export default defineVariant({ item: "controller", id: "gamepad", name: "Gamepad", Component: Gamepad });
