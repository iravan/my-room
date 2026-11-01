"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useLayout } from "@/lib/room";

const box = new THREE.Box3(), part = new THREE.Box3();

// Fit the helper round the selected item's meshes; hidden when nothing is selected.
function fit(helper: THREE.Box3Helper, scene: THREE.Object3D) {
  const id = useLayout.getState().editing ? useLayout.getState().selected : null;
  helper.visible = false;
  if (!id) return;
  box.makeEmpty();
  const slots = new Set<string>();
  scene.traverse((o) => {
    if (o.userData.roomItem !== id) return;
    o.traverse((m) => {
      if (!(m as THREE.Mesh).isMesh) return;
      box.union(part.setFromObject(m));
      const f = ((m as THREE.Mesh).material as THREE.Material).userData?.finish;
      if (f) slots.add(f);
    });
  });
  const list = [...slots].sort(), prev = useLayout.getState().slots;
  if (list.join() !== prev.join()) useLayout.setState({ slots: list });
  if (box.isEmpty()) return;
  helper.box.copy(box).expandByScalar(0.01);
  helper.visible = true;
}

// Cyan box round the selected item (all of its parts, wherever they are rendered from).
export function SelectionBox() {
  const helper = useMemo(() => new THREE.Box3Helper(new THREE.Box3(), new THREE.Color(0.1, 0.9, 1)), []);
  useFrame(({ scene }) => fit(helper, scene));
  return <primitive object={helper} />;
}
