"use client";

import { useMemo } from "react";
import { HOMES } from "@/lib/room";
import { RoomItem } from "@/components/room/RoomItem";
import { Core } from "@/components/room/Shell";
import { Blob, DeskFrame, dice, Fabric, G } from "../_shared/prims";
import { HOODIE } from "../hoodie/roll";
import { useVariant } from "../resolve";

// The chair item: pushed back from the desk at whatever angle it was left (rolled per load, in the desk's frame),
// with the hoodie over its back on some loads (where the look says its back's top is: anchor `backTop`). Its home is where it stands unrolled.
export function ChairItem() {
  const v = useVariant("chair");
  const roll = useMemo(() => {
    const { R } = dice(8);
    return { at: [R(-0.12, 0.12), 0, -0.62 + R(-0.08, 0.08)] as [number, number, number], yaw: R(-35, 35), tilt: R(-6, 6) };
  }, []);
  if (!v) return null;
  const [w, d] = v.footprint?.() ?? [0.7, 0.7];
  return (
    <RoomItem id="chair" home={HOMES.chair}>
      <DeskFrame>
        <G p={roll.at} yaw={roll.yaw}>
          <Blob p={[0, 0, 0]} size={[w + 0.05, d + 0.05]} />
          <v.Component id="chair" />
          {HOODIE.at === 0 && <Core><Fabric p={(v.anchors?.backTop as [number, number, number] | undefined) ?? [0, 1.36, -0.36]} s={[0.56, 0.06, 0.22]} c={HOODIE.color} e={[-10, 0, roll.tilt]} /></Core>}
        </G>
      </DeskFrame>
    </RoomItem>
  );
}
