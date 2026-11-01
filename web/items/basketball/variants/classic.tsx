"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { PbrMaterial, unityEuler, type TextureSet } from "@/components/room/Surface";
import { Blob, C, dice, flip, type U3 } from "../../_shared/prims";
import { defineVariant } from "../../types";

function PbrSphere({ set, tile, p, s, e, c }: { set: TextureSet; tile: number; p: U3; s: U3; e?: U3; c: THREE.Color }) {
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(0.5, 32, 20);
    const uv = g.attributes.uv as THREE.BufferAttribute, girth = (Math.PI * (s[0] + s[2])) / 2;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * girth) / tile, (uv.getY(i) * s[1] * 1.57) / tile);
    return g;
  }, [s, tile]);
  return (
    <mesh geometry={geometry} position={flip(p)} rotation={unityEuler(e ?? [0, 0, 0])} scale={s} receiveShadow>
      <PbrMaterial set={set} color={c} />
    </mesh>
  );
}

// Pebbled leather ball, lying at whatever spin it stopped.
function Classic() {
  const spin = useMemo((): U3 => { const { R } = dice(13); return [R(0, 360), R(0, 360), 0]; }, []);
  return (
    <>
      <Blob p={[0, 0, 0]} size={[0.32, 0.32]} />
      <PbrSphere set="fabric_leather_02" tile={0.25} p={[0, 0.12, 0]} s={[0.24, 0.24, 0.24]} e={spin} c={C(1.6, 0.65, 0.25)} />
    </>
  );
}

export default defineVariant({ item: "basketball", id: "classic", name: "Basketball", Component: Classic });
