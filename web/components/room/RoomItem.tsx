"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { liveHomes, ON_WALL, poseOf, restPosition, useLayout, type Home } from "@/lib/room";
import { applyFinish, finishType } from "@/lib/options";
import { styleOf } from "@/lib/styles";
import { lifts } from "./Shell";

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3(), normal = new THREE.Vector3();

const inItem = (o: THREE.Object3D | null, id: string): boolean => !!o && (o.userData.roomItem === id || inItem(o.parent, id));

// Uploaded models go wherever the pointer is on any upward-facing surface (floor, desk, shelf, bed), not just the floor.
function surfaceUnder(scene: THREE.Scene, id: string): THREE.Vector3 | null {
  for (const h of ray.intersectObject(scene, true)) {
    const m = h.object as THREE.Mesh;
    if (!m.isMesh || !m.visible || inItem(m, id) || (m.material as THREE.Material).transparent || !h.face) continue;
    if (normal.copy(h.face.normal).transformDirection(m.matrixWorld).y < 0.5) return null; // a wall or a side: stay put
    return hit.copy(h.point);
  }
  return null;
}

// Edit mode: press on an item to select it, drag to move it — along the floor, or along its wall for wall
// fixtures — snapped to 5 cm (Shift: 1 cm). One undo step per drag.
function startDrag(id: string, home: Home, e: ThreeEvent<PointerEvent>, camera: THREE.Camera, el: HTMLElement, scene: THREE.Scene) {
  e.stopPropagation();
  const start = poseOf(id, home), axis = ON_WALL[id];
  useLayout.setState({ selected: id, dragging: true });
  const plane = axis
    ? new THREE.Plane(axis === "x" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1), -start.position[axis === "x" ? 0 : 2])
    : new THREE.Plane(new THREE.Vector3(0, 1, 0), -start.position[1]);
  if (!e.ray.intersectPlane(plane, hit)) { useLayout.setState({ dragging: false }); return; }
  const offset = new THREE.Vector3(...start.position).sub(hit);
  let moved = false;
  const move = (ev: PointerEvent) => {
    const r = el.getBoundingClientRect();
    ray.setFromCamera(ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camera);
    const step = ev.shiftKey ? 0.01 : 0.05, snap = (v: number) => +(Math.round(v / step) * step).toFixed(3);
    let position: [number, number, number];
    if (id.startsWith("model-")) {
      const s = surfaceUnder(scene, id);
      if (!s) return;
      position = [snap(s.x), +s.y.toFixed(3), snap(s.z)];
    } else {
      if (!ray.ray.intersectPlane(plane, hit)) return;
      const p = hit.add(offset);
      position = axis ? [snap(p.x), snap(p.y), snap(p.z)] : [snap(p.x), start.position[1], snap(p.z)];
    }
    if (!moved) { useLayout.getState().snapshot(); moved = true; }
    useLayout.getState().move(id, { ...start, position });
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    useLayout.setState({ dragging: false });
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
}

// Renders an item where the layout puts it. Children are modelled at `home`; with no saved pose this is a no-op.
// Several <RoomItem> with the same id (e.g. the cabinet, its spines and the turntable on it) move together.
const noRaycast = () => {};

export function RoomItem({ id, home, children, shellModel }: { id: string; home: Home; children: ReactNode; shellModel?: boolean }) {
  const pose = useLayout((s) => s.items[id]), editing = useLayout((s) => s.editing), size = useLayout((s) => s.size);
  const hidden = useLayout((s) => s.hidden.includes(id));
  const { camera, gl, scene } = useThree();
  const yaw = home.rotationY ?? 0;
  useEffect(() => { if (!shellModel) liveHomes.set(id, home); }, [id, home, shellModel]);
  // Finishes: put each customisable material into the chosen option (or back), only while the item has or had options.
  // Shell replacement: hide the built-in look (and stop it taking clicks) except <Core> parts; lift resting cores.
  const ref = useRef<THREE.Group>(null), touched = useRef(false), shelled = useRef(false);
  useFrame(() => {
    const L = useLayout.getState(), shell = !shellModel && !!L.shells[id];
    const style = styleOf(L.style).finishes, own = L.options[id];
    const styled = Object.keys(style).length > 0, opts = own || styled ? { ...style, ...own } : undefined;
    if (!opts && !touched.current && !shell && !shelled.current) return;
    touched.current = !!opts;
    const wasShelled = shelled.current;
    shelled.current = shell;
    const lift = shell ? lifts.get(id) ?? 0 : 0;
    const walk = (o: THREE.Object3D, core: boolean) => {
      if (o.userData.core) {
        core = true;
        if (o.userData.lift) o.position.y = lift;
      }
      const mesh = o as THREE.Mesh, m = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (m?.userData?.finish) applyFinish(m, opts?.[m.userData.finish] ?? opts?.[finishType(m.userData.finish)]);
      if ((mesh.isMesh || (o as THREE.Points).isPoints) && !core && (shell || wasShelled)) {
        o.visible = !shell;
        o.userData.hiddenShell = shell;
        if (shell && o.raycast !== noRaycast) { o.userData.raycast = o.raycast; o.raycast = noRaycast; }
        if (!shell && o.userData.raycast) { o.raycast = o.userData.raycast; delete o.userData.raycast; }
      }
      for (const c of o.children) walk(c, core);
    };
    if (ref.current) walk(ref.current, !!shellModel);
  });
  if (hidden) return null; // hidden: nothing drawn, lit, clickable or casting shadows
  return (
    <group
      ref={ref}
      position={pose?.position ?? restPosition(id, home, size)}
      rotation={[0, (pose?.rotationY ?? yaw) - yaw, 0]}
      scale={pose?.scale ?? 1}
      userData={{ roomItem: id, home, shellModel }}
      onPointerDown={editing ? (e) => startDrag(id, home, e, camera, gl.domElement, scene) : undefined}
    >
      <group position={[-home.position[0], -home.position[1], -home.position[2]]}>{children}</group>
    </group>
  );
}
