"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { useLayout, type Home } from "@/lib/room";
import { loadModel } from "@/lib/models";
import { RoomItem } from "./RoomItem";

const ORIGIN: Home = { position: [0, 0, 0] };

function Model({ asset }: { asset: string }) {
  const [obj, setObj] = useState<THREE.Object3D>();
  useEffect(() => {
    let live = true;
    loadModel(asset).then((t) => { if (live) setObj(t.clone(true)); }).catch(() => {});
    return () => { live = false; };
  }, [asset]);
  return obj ? <primitive object={obj} /> : null;
}

// Uploaded models: each is a room item modelled at the origin, placed by its saved pose.
export function DecorModels() {
  const models = useLayout((s) => s.models);
  return (
    <>
      {Object.entries(models).map(([id, m]) => (
        <RoomItem key={id} id={id} home={ORIGIN}><Model asset={m.asset} /></RoomItem>
      ))}
    </>
  );
}
