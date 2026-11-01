"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame, type Vec3 } from "@/lib/store";
import { CYAN, srgb } from "@/lib/lighting";
import { Slab } from "./Surface";
import { RoomItem } from "./RoomItem";
import { HOMES, useStyle } from "@/lib/room";

const METAL = srgb(0.55, 0.55, 0.7);
const LIGHT_SCALE = { hemi: 14, sun: 2, fill: 4, city: 8, lamp: 4 }; // tuned by eye against the Unity screenshots

// Powder-coated metal: mostly paint, so it doesn't mirror the dark room as black.
export function Metal({ position, size, shade = 1 }: { position: Vec3; size: Vec3; shade?: number }) {
  const color = useMemo(() => METAL.clone().multiplyScalar(shade), [shade]);
  return <Slab set="metal_plate_02" tile={1.5} metal={0.3} size={size} position={position} color={color} />;
}

// Emissive strip, bright enough for bloom; never casts shadows. The style decides what the strips are: its own
// accent colours (cyan → b, everything else → a), glowing, or plain matte trim in those colours.
export function Neon({ position, size, color }: { position: Vec3; size: Vec3; color: THREE.Color }) {
  const { neon } = useStyle();
  const accent = color.equals(CYAN) ? neon.b : neon.a;
  const c = useMemo(() => accent.clone().multiplyScalar(2), [accent]);
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      {neon.glow ? <meshBasicMaterial color={c} toneMapped={false} /> : <meshStandardMaterial color={accent} roughness={0.7} />}
    </mesh>
  );
}

// Glossy surfaces reflect the room itself (neon in the floor), re-captured when the lighting changes.
function Reflections() {
  const { gl, scene } = useThree();
  const preset = useGame((s) => s.preset), lamp = useGame((s) => s.lamp);
  const cubeCam = useMemo(() => {
    const cam = new THREE.CubeCamera(0.05, 10, new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType }));
    cam.position.set(0, 1.35, 0);
    return cam;
  }, []);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      scene.environment = null;
      cubeCam.update(gl, scene);
      scene.environment = cubeCam.renderTarget.texture;
      scene.environmentIntensity = 0.6;
    });
    return () => cancelAnimationFrame(id);
  }, [gl, scene, cubeCam, preset, lamp]);
  return null;
}

export function Lighting() {
  const preset = useGame((s) => s.preset), style = useStyle();
  const p = style.presets[preset % 3];
  // Trilight-style ambient: up-facing surfaces catch the ceiling's cove (its neon tint when it glows), undersides
  // only see the floor.
  const [sky, ground] = useMemo(() => [
    p.ambient.clone().multiplyScalar(1.15).add(style.neon.glow ? style.neon.a.clone().add(style.neon.b).multiplyScalar(0.045) : new THREE.Color()),
    p.ambient.clone().multiplyScalar(0.4),
  ], [p, style]);
  const [sunTarget, cityTarget] = useMemo(() => [new THREE.Object3D(), new THREE.Object3D()], []);
  const city = useMemo(() => style.windowLight.clone().multiply(p.window), [p, style]);

  return (
    <>
      <hemisphereLight args={[sky, ground, LIGHT_SCALE.hemi * style.exposure]} />
      {/* Moon: Unity Euler(40, −45, 0), no shadows, just lights the faces you look at. */}
      <primitive object={sunTarget} position={[-0.542, -0.643, -0.542]} />
      <directionalLight position={[0, 0, 0]} target={sunTarget} color={style.sunColor} intensity={p.sun * LIGHT_SCALE.sun * style.exposure} />
      <pointLight position={[1.2, 1.7, -0.6]} color={style.fill} intensity={LIGHT_SCALE.fill * style.exposure} distance={3.5} />
      {/* City glow through the window: wide, soft, aimed down into the room. */}
      <RoomItem id="window" home={HOMES.window}>
        <primitive object={cityTarget} position={[-0.3, 1.17, -1.1]} />
        <spotLight position={[-0.3, 1.7, -1.95]} target={cityTarget} angle={(57.5 * Math.PI) / 180} penumbra={0.65} distance={5.5} color={city} intensity={LIGHT_SCALE.city * style.exposure} />
      </RoomItem>

      <Reflections />
    </>
  );
}
