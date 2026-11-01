"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HOMES, itemMatrix, liveHomes, useLayout } from "@/lib/room";
import { loadModel } from "@/lib/models";
import { RoomItem } from "./RoomItem";

// Shell replacement: an item's look can be replaced by an uploaded model. Its parts split into the shell (hidden and
// replaced) and cores, marked with <Core>, which stay: contact shadows, things under or beside it, and — with `lift` —
// things resting on its top surface, which move up or down onto the model's real top.
export function Core({ lift, children }: { lift?: boolean; children: ReactNode }) {
  return <group userData={{ core: true, lift: !!lift }}>{children}</group>;
}

// Height of each item's built-in top surface (home frame), where lifted cores rest.
export const SURFACE: Record<string, number> = { bed: 0.52, nightstand: 0.54, desk: 0.75, cabinet: 0.71, chair: 0.5 };
export const lifts = new Map<string, number>(); // item id → how far its lifted cores move

const inv = new THREE.Matrix4(), m = new THREE.Matrix4(), part = new THREE.Box3();
const isCore = (o: THREE.Object3D | null, stop: THREE.Object3D): boolean => !!o && o !== stop && (!!o.userData.core || isCore(o.parent, stop));

// The built-in shell's bounding box in the item's home frame (independent of where the item now is).
function shellBox(scene: THREE.Scene, id: string) {
  const box = new THREE.Box3(), items = useLayout.getState().items, home = liveHomes.get(id) ?? HOMES[id];
  if (!home) return box;
  inv.copy(itemMatrix(home, items[id])).invert();
  scene.traverse((root) => {
    if (root.userData.roomItem !== id || root.userData.shellModel) return;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || isCore(mesh, root) || (mesh.material as THREE.Material).transparent) return;
      mesh.geometry.computeBoundingBox();
      box.union(part.copy(mesh.geometry.boundingBox!).applyMatrix4(m.multiplyMatrices(inv, mesh.matrixWorld)));
    });
  });
  return box;
}

// The uploaded model, fitted into the shell's box (uniform scale, ≥ 5 cm sides only), standing on its bottom.
function ShellModel({ id, asset, yaw }: { id: string; asset: string; yaw: number }) {
  const [template, setTemplate] = useState<THREE.Object3D>();
  // The shell box, measured once per shape (options like bed size change the shell, so they're part of the key).
  const key = useLayout((s) => JSON.stringify(s.options[id] ?? null)) + asset;
  const [measured, setMeasured] = useState<{ key: string; box: THREE.Box3 }>();
  const box = measured?.key === key ? measured.box : undefined;
  useEffect(() => {
    let live = true;
    loadModel(asset).then((t) => { if (live) setTemplate(t); }).catch(() => {});
    return () => { live = false; };
  }, [asset]);
  useFrame(({ scene }) => { if (!box) { const b = shellBox(scene, id); if (!b.isEmpty()) setMeasured({ key, box: b }); } });

  const placed = useMemo(() => {
    if (!template || !box) return null;
    const obj = template.clone(true), t = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const fit = (turns: number) => {
      obj.rotation.y = (turns * Math.PI) / 2;
      const s = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
      const ks = [t.x / s.x, t.y / s.y, t.z / s.z].filter((k, i) => [t.x, t.y, t.z][i] > 0.05 && Number.isFinite(k));
      return { s, k: ks.length ? Math.min(...ks) : 1 };
    };
    // Default orientation: the one that fills the item's footprint best (long side along long side); `yaw` turns from there.
    const base = fit(1).k > fit(0).k * 1.01 ? 1 : 0;
    const { s, k } = fit(base + yaw);
    const g = new THREE.Group();
    g.add(obj);
    g.scale.setScalar(k);
    g.position.set(c.x, box.min.y, c.z);
    g.updateMatrixWorld(true);
    // Lifted cores go onto the model's top: cast down at the box centre.
    const hit = new THREE.Raycaster(new THREE.Vector3(c.x, box.max.y + 2, c.z), new THREE.Vector3(0, -1, 0)).intersectObject(g, true)[0];
    if (SURFACE[id] !== undefined) lifts.set(id, hit ? hit.point.y - SURFACE[id] : box.min.y + s.y * k - SURFACE[id]);
    return g;
  }, [template, box, yaw, id]);
  useEffect(() => () => { lifts.delete(id); }, [id]);
  return placed ? <primitive object={placed} /> : null;
}

// One per replaced item, inside a RoomItem with the item's own home so it moves with the item.
export function ShellModels() {
  const shells = useLayout((s) => s.shells);
  const [, retry] = useState(0);
  const missing = Object.keys(shells).some((id) => !(liveHomes.get(id) ?? HOMES[id]));
  useEffect(() => { if (missing) { const t = setTimeout(() => retry((n) => n + 1), 100); return () => clearTimeout(t); } });
  return (
    <>
      {Object.entries(shells).map(([id, s]) => {
        const home = liveHomes.get(id) ?? HOMES[id];
        return home ? (
          <RoomItem key={id} id={id} home={home} shellModel>
            <ShellModel id={id} asset={s.asset} yaw={s.yaw} />
          </RoomItem>
        ) : null;
      })}
    </>
  );
}
