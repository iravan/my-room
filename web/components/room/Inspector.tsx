"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/lib/store";
import { useCollection } from "@/lib/collection";
import { useGatefold } from "@/lib/covers";
import { Disc, Sleeve } from "./Records";
import { unityEuler } from "./Surface";

const FACE = new THREE.PlaneGeometry(0.31, 0.31);
const v = new THREE.Vector3(), local = new THREE.Quaternion(), want = new THREE.Quaternion();

function Gatefold({ a }: { a: Parameters<typeof useGatefold>[0] }) {
  const map = useGatefold(a);
  return (
    <mesh geometry={FACE} position={[-0.31, 0, 0.0031]}>
      <meshStandardMaterial map={map} roughness={0.75} />
    </mesh>
  );
}

// The album held in front of the camera: drag to turn it, wheel or pinch to zoom, vinyl slides out to the right,
// gatefold opens to the left. Follows the camera like Unity's camera-parented inspect root.
export function Inspector() {
  const id = useGame((s) => (s.view === "inspect" ? s.inspectId : ""));
  const gatefold = useGame((s) => s.gatefold);
  const album = useCollection((s) => s.albums.find((a) => a.id === id));
  const root = useRef<THREE.Group>(null), disc = useRef<THREE.Group>(null), z = useRef(0.7);
  const { camera, gl } = useThree();

  useEffect(() => {
    const el = gl.domElement, pts = new Map<number, { x: number; y: number }>();
    const active = () => useGame.getState().view === "inspect";
    const down = (e: PointerEvent) => { if (active()) pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); };
    const up = (e: PointerEvent) => pts.delete(e.pointerId);
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p || !active()) return;
      const s = useGame.getState();
      if (pts.size === 1) {
        // Unity: mouse axes × 5 × sensitivity ≈ 0.5° per pixel
        const k = 0.5 * s.sensitivity;
        useGame.setState({ inspectRot: [s.inspectRot[0] + (e.clientX - p.x) * k, s.inspectRot[1] - (e.clientY - p.y) * k] });
      } else if (pts.size === 2) {
        const [a, b] = [...pts.entries()].map(([pid, q]) => (pid === e.pointerId ? { x: e.clientX, y: e.clientY } : q));
        const [a0, b0] = [...pts.values()];
        const before = Math.hypot(a0.x - b0.x, a0.y - b0.y), now = Math.hypot(a.x - b.x, a.y - b.y);
        useGame.setState({ inspectDist: Math.min(1.1, Math.max(0.4, s.inspectDist - (now - before) / innerHeight)) });
      }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    const wheel = (e: WheelEvent) => {
      if (!active() || !e.deltaY) return;
      const s = useGame.getState();
      useGame.setState({ inspectDist: Math.min(1.1, Math.max(0.4, s.inspectDist + Math.sign(e.deltaY) * 0.05)) });
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  useEffect(() => { local.identity(); z.current = 0.7; }, [id]);

  useFrame((_, dt) => {
    const g = root.current;
    if (!g) return;
    const s = useGame.getState(), k = 1 - Math.exp(-6 * Math.min(dt, 0.1));
    z.current += (s.inspectDist - z.current) * Math.min(1, k * 2);
    local.slerp(want.setFromEuler(unityEuler([s.inspectRot[1], -s.inspectRot[0], 0])), Math.min(1, k * 2));
    g.position.copy(camera.position).add(v.set(-0.08, 0, -z.current).applyQuaternion(camera.quaternion));
    g.quaternion.copy(camera.quaternion).multiply(local);
    if (disc.current) disc.current.position.x += ((s.discOut ? 0.22 : 0) - disc.current.position.x) * k;
  });

  if (!album) return null;
  return (
    <group ref={root}>
      <pointLight position={[0.2, 0.3, 0.6]} distance={2} intensity={1.5} />
      <Sleeve a={album} position={[0, -0.155, 0]} />
      <group ref={disc} rotation={[Math.PI / 2, 0, 0]}>
        <Disc a={album} />
      </group>
      {gatefold && <Gatefold a={album} />}
    </group>
  );
}
