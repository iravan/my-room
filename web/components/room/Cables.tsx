"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { hiddenOf, placePoint, useLayout } from "@/lib/room";
import { ITEMS } from "@/items/registry";
import { C, flip, type U3 } from "@/items/_shared/prims";
import { onBed } from "@/items/bed";
import { PHONE } from "@/items/phone/place";

// A cable through Unity world points, Catmull-Rom smoothed (6 steps per span, as in Unity), never below the floor.
function Cable({ c, width, pts, owners }: { c: THREE.Color; width: number; pts: U3[]; owners?: string[] }) {
  const items = useLayout((s) => s.items), size = useLayout((s) => s.size);
  const gone = useLayout((s) => !!owners && hiddenOf(owners[0], s)); // the device it belongs to is hidden
  const key = (owners?.map((o) => JSON.stringify([items[o], items[ITEMS[o]?.on ?? ""]])).join("|") ?? "") + JSON.stringify(size);
  const geometry = useMemo(() => {
    const P = pts.map((q, i) => (owners ? placePoint(owners[i], flip(q), items, undefined, size) : new THREE.Vector3(...flip(q)))), out: THREE.Vector3[] = [];
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[Math.max(i - 1, 0)], b = P[i], d = P[i + 1], e = P[Math.min(i + 2, P.length - 1)];
      for (let k = 0; k < 6; k++) {
        const t = k / 6, t2 = t * t, t3 = t2 * t;
        const q = new THREE.Vector3().addScaledVector(b, 2).addScaledVector(d.clone().sub(a), t)
          .addScaledVector(a.clone().multiplyScalar(2).addScaledVector(b, -5).addScaledVector(d, 4).sub(e), t2)
          .addScaledVector(b.clone().multiplyScalar(3).sub(a).addScaledVector(d, -3).add(e), t3).multiplyScalar(0.5);
        q.y = Math.max(q.y, 0.012);
        out.push(q);
      }
    }
    out.push(P[P.length - 1]);
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(out), out.length * 3, width / 2, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the owners' poses
  }, [pts, width, key]);
  if (gone) return null;
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={c} roughness={0.5} />
    </mesh>
  );
}

const rotY = ([x, y, z]: U3, deg: number): U3 => {
  const a = (deg * Math.PI) / 180;
  return [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
};

// Every device's cable to its socket (behind the desk at (-2, .3, -1.2), under the window at (.25, .3, 2), Unity
// coords). Each point follows the item it belongs to; a cable goes when its device is hidden.
export function Cables() {
  const black = C(0.03, 0.03, 0.035);
  const plug = useMemo((): U3 => {
    const ph = onBed(PHONE), at = rotY([0, 0, -0.085], ph.yaw);
    return [ph.p[0] + at[0], ph.p[1], ph.p[2] + at[2]];
  }, []);
  const overBed = useMemo((): U3 => [-0.93, onBed({ x: -0.93, z: plug[2] + 0.1, lift: 0.006, yaw: 0 }).p[1], plug[2] + 0.1], [plug]);
  return (
    <>
      <Cable c={black} width={0.007} pts={[[-1.92, 0.35, -0.95], [-1.95, 0.012, -1], [-1.975, 0.012, -1.18], [-1.99, 0.3, -1.2]]} owners={["pc", "pc", "socket-desk", "socket-desk"]} />
      <Cable c={black} width={0.006} pts={[[-1.88, 0.95, -1.35], [-1.965, 0.76, -1.33], [-1.97, 0.012, -1.27], [-1.99, 0.29, -1.21]]} owners={["monitor", "monitor", "socket-desk", "socket-desk"]} />
      <Cable c={black} width={0.005} pts={[[-1.75, 0.55, -0.45], [-1.95, 0.5, -0.5], [-1.975, 0.012, -0.6], [-1.98, 0.012, -1.1], [-1.99, 0.31, -1.19]]} owners={["lamp", "nightstand", "nightstand", "socket-desk", "socket-desk"]} />
      {/* Phone charger: from the phone over the bed edge, across the floor to the window socket */}
      <Cable c={C(0.85, 0.85, 0.82)} width={0.006} pts={[plug, overBed, [-0.8, 0.2, plug[2] + 0.2], [-0.75, 0.012, 1.6], [0.1, 0.012, 1.96], [0.25, 0.29, 1.99]]}
        owners={["phone", "bed", "bed", "socket-window", "socket-window", "socket-window"]} />
    </>
  );
}
