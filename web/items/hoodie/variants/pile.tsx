"use client";

import { useMemo } from "react";
import { Blob, dice, Fabric } from "../../_shared/prims";
import { HOODIE } from "../roll";
import { defineVariant } from "../../types";

// Dropped on the floor: three loose folds of jersey.
function Pile() {
  const folds = useMemo(() => {
    const { R } = dice(19);
    return [0, 1, 2].map((i) => <Fabric key={i} p={[R(-0.06, 0.06), 0.02 + i * 0.035, R(-0.06, 0.06)]} s={[0.5 - i * 0.1, 0.04, 0.4 - i * 0.08]} c={HOODIE.color} e={[0, R(-30, 30), 0]} />);
  }, []);
  return <><Blob p={[0, 0, 0]} size={[0.6, 0.5]} />{folds}</>;
}

export default defineVariant({ item: "hoodie", id: "pile", name: "Heap on the floor", Component: Pile });
