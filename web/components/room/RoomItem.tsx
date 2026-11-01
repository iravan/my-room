"use client";

import { useEffect, type ReactNode } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { homePose, liveHomes, ON_WALL, useLayout, type Home } from "@/lib/room";

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();

// Edit mode: press on an item to select it, drag to move it — along the floor, or along its wall for wall
// fixtures — snapped to 5 cm (Shift: 1 cm). One undo step per drag.
function startDrag(id: string, home: Home, e: ThreeEvent<PointerEvent>, camera: THREE.Camera, el: HTMLElement) {
  e.stopPropagation();
  const L = useLayout.getState(), start = L.items[id] ?? homePose(home), axis = ON_WALL[id];
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
    if (!ray.ray.intersectPlane(plane, hit)) return;
    const step = ev.shiftKey ? 0.01 : 0.05, snap = (v: number) => +(Math.round(v / step) * step).toFixed(3);
    const p = hit.add(offset);
    const position: [number, number, number] = axis ? [snap(p.x), snap(p.y), snap(p.z)] : [snap(p.x), start.position[1], snap(p.z)];
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
export function RoomItem({ id, home, children }: { id: string; home: Home; children: ReactNode }) {
  const pose = useLayout((s) => s.items[id]), editing = useLayout((s) => s.editing);
  const { camera, gl } = useThree();
  const yaw = home.rotationY ?? 0;
  useEffect(() => { liveHomes.set(id, home); }, [id, home]);
  return (
    <group
      position={pose?.position ?? home.position}
      rotation={[0, (pose?.rotationY ?? yaw) - yaw, 0]}
      scale={pose?.scale ?? 1}
      userData={{ roomItem: id, home }}
      onPointerDown={editing ? (e) => startDrag(id, home, e, camera, gl.domElement) : undefined}
    >
      <group position={[-home.position[0], -home.position[1], -home.position[2]]}>{children}</group>
    </group>
  );
}
