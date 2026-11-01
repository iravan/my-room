"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { typing, useGame } from "@/lib/store";
import { sfx } from "@/lib/audio";
import { playAlbum, togglePlay, useCollection } from "@/lib/collection";
import { SHOTS } from "@/lib/layout";
import { HOMES, itemMatrix, poseOf, useLayout } from "@/lib/room";

const SHOT_ITEM = { turntable: "turntable", shelf: "cabinet", crate: "crate" } as const;
const shotMat = new THREE.Matrix4(), shotAt = new THREE.Vector3();

const DEG = Math.PI / 180;
const KEYS: Record<string, "room" | "turntable" | "crate" | "shelf"> = { "1": "room", "2": "turntable", "3": "crate", "4": "shelf" };
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpMat = new THREE.Matrix4();
const tmpEuler = new THREE.Euler(0, 0, 0, "YXZ");
const UP = new THREE.Vector3(0, 1, 0);

// Room view: drag to look (mouse or one finger), WASD/arrows to walk. Other views: eased fixed shots. 1–4 / Esc switch.
export function CameraRig() {
  const { camera, gl, events } = useThree();
  const held = useRef(new Set<string>());

  useEffect(() => {
    const el = gl.domElement;
    // Look follows one pointer (mouse or a single finger); a second finger stops looking, like Unity's touchCount == 1.
    let last: { id: number; x: number; y: number } | null = null, fingers = 0;
    const down = (e: PointerEvent) => {
      fingers++;
      last = fingers === 1 ? { id: e.pointerId, x: e.clientX, y: e.clientY } : null;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      const s = useGame.getState();
      if (!last || last.id !== e.pointerId || s.view !== "room" || s.title || useLayout.getState().dragging) return;
      // Unity read mouse axes ×3: ~0.3° per pixel at sensitivity 1. FPS-style: drag right turns right, drag down looks down.
      s.look((e.clientX - last.x) * 0.3 * s.sensitivity, (e.clientY - last.y) * 0.3 * s.sensitivity);
      last = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const up = () => { fingers = Math.max(0, fingers - 1); last = null; };
    const key = (e: KeyboardEvent) => {
      if (e.type === "keyup") { held.current.delete(e.key.toLowerCase()); return; } // a release always counts, wherever focus is
      if (typing(e)) return;
      const s = useGame.getState();
      if (s.draft || s.dialog || s.title) return; // dialogs own the keyboard; the first key just enters
      if (e.type === "keydown") {
        const editing = useLayout.getState().editing;
        if (KEYS[e.key] && !editing) s.setView(KEYS[e.key]); // edit mode stays in the room view
        if (e.key === "m") useGame.setState({ muted: !s.muted });
        if ((e.key === "Escape" || e.key === "Backspace") && !editing) s.back();
        if (s.view === "inspect") {
          if (e.key === "f") useGame.setState({ inspectRot: [s.inspectRot[0] + 180, s.inspectRot[1]] });
          if (e.key === "v") { useGame.setState({ discOut: !s.discOut }); sfx("slide", 0.7); }
          if (e.key === "g") useGame.setState({ gatefold: !s.gatefold });
          if (e.key === " ") playAlbum(s.inspectId);
        }
        if (s.view === "turntable" && e.key === " ") togglePlay();
        if (s.view === "crate") {
          const albums = useCollection.getState().albums;
          if (e.key === "d" || e.key === "ArrowRight") s.flip(1, albums.length);
          if (e.key === "a" || e.key === "ArrowLeft") s.flip(-1, albums.length);
          if ((e.key === "Enter" || e.key === "e") && albums[s.selected]) s.inspect(albums[s.selected].id);
        }
        held.current.add(e.key.toLowerCase());
      }
    };
    const blur = () => held.current.clear();
    // Crate: the wheel flips records (down = next).
    const wheel = (e: WheelEvent) => {
      const s = useGame.getState();
      if (s.view === "crate" && e.deltaY) s.flip(Math.sign(e.deltaY), useCollection.getState().albums.length);
    };
    el.addEventListener("wheel", wheel, { passive: true });
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", key);
    window.addEventListener("blur", blur);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", key);
      window.removeEventListener("blur", blur);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const s = useGame.getState();
    if (s.title) useGame.setState({ yaw: s.yaw + Math.min(dt, 0.1) * 4 }); // the room turns slowly behind the title
    if (s.view === "room") {
      const k = held.current;
      const h = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
      const v = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
      if (h || v) {
        const y = -s.yaw * DEG, step = 1.5 * Math.min(dt, 0.1);
        // forward is -z in three; rotate (h, -v) by the yaw
        const dx = (h * Math.cos(y) - v * Math.sin(y)) * step;
        const dz = (-h * Math.sin(y) - v * Math.cos(y)) * step;
        const [x, py, z] = s.roomPos;
        const { w, d } = useLayout.getState().size, mx = w / 2 - 0.3, mz = d / 2 - 0.3;
        s.setRoomPos([Math.min(mx, Math.max(-mx, x + dx)), py, Math.min(mz, Math.max(-mz, z + dz))]);
      }
      tmpPos.set(...s.roomPos);
      tmpQuat.setFromEuler(tmpEuler.set(-s.pitch * DEG, -s.yaw * DEG, 0));
    } else {
      // Fixed shots follow their item if it has been moved.
      const [eye, at] = SHOTS[s.view], item = s.view === "inspect" ? undefined : SHOT_ITEM[s.view];
      itemMatrix(item ? HOMES[item] : { position: [0, 0, 0] }, item ? poseOf(item, HOMES[item]) : undefined, shotMat);
      tmpPos.set(...eye).applyMatrix4(shotMat);
      shotAt.set(...at).applyMatrix4(shotMat);
      tmpQuat.setFromRotationMatrix(tmpMat.lookAt(tmpPos, shotAt, UP));
    }
    const t = 1 - Math.exp(-6 * Math.min(dt, 0.1));
    const moving = camera.position.distanceToSquared(tmpPos) > 1e-8 || 1 - Math.abs(camera.quaternion.dot(tmpQuat)) > 1e-8;
    camera.position.lerp(tmpPos, t);
    camera.quaternion.slerp(tmpQuat, t);
    // Re-test what's under the pointer while the camera moves (R3F only does it on pointer events),
    // so hover highlights and tooltips follow the view like Unity's per-frame raycast.
    if (moving) events.update?.();
  });

  return null;
}
