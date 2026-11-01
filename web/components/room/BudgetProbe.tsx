"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useBudget } from "@/lib/budget";
import { useLayout } from "@/lib/room";

let last = 0;
// Twice a second while editing: count visible triangles, draw calls (visible meshes) and texture memory.
function measure(scene: THREE.Scene) {
  let triangles = 0, draws = 0, bytes = 0;
  const seen = new Set<THREE.Texture>();
  scene.traverseVisible((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry;
    triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    draws++;
    for (const mat of ([] as THREE.Material[]).concat(m.material)) {
      for (const v of Object.values(mat)) {
        const t = v as THREE.Texture;
        if (!t?.isTexture || seen.has(t)) continue;
        seen.add(t);
        const img = t.image as { width?: number; height?: number } | undefined;
        if (img?.width && img.height) bytes += img.width * img.height * 4 * 1.33;
      }
    }
  });
  useBudget.setState({ triangles: Math.round(triangles), draws, textureMB: Math.round(bytes / 1048576) });
}

export function BudgetProbe() {
  useFrame(({ scene, clock }) => {
    if (!useLayout.getState().editing || clock.elapsedTime - last < 0.5) return;
    last = clock.elapsedTime;
    measure(scene);
  });
  return null;
}
