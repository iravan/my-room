"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame, type Vec3 } from "@/lib/store";
import { CYAN, MAGENTA, PRESETS, srgb } from "@/lib/lighting";
import { paint } from "@/lib/paint";
import { Slab } from "./Surface";
import { Clickable } from "./Clickable";
import { Nightstand } from "./Nightstand";
import { Core } from "./Shell";
import { RoomItem } from "./RoomItem";
import { HOMES } from "@/lib/room";

const METAL = srgb(0.55, 0.55, 0.7);
const LAMP: Vec3 = [-1.7, 0.54, 0.45];
const LIGHT_SCALE = { hemi: 14, sun: 2, fill: 4, city: 8, lamp: 4 }; // tuned by eye against the Unity screenshots

// Powder-coated metal: mostly paint, so it doesn't mirror the dark room as black.
export function Metal({ position, size, shade = 1 }: { position: Vec3; size: Vec3; shade?: number }) {
  const color = useMemo(() => METAL.clone().multiplyScalar(shade), [shade]);
  return <Slab set="metal_plate_02" tile={1.5} metal={0.3} size={size} position={position} color={color} />;
}

// Emissive strip, bright enough for bloom; never casts shadows.
export function Neon({ position, size, color }: { position: Vec3; size: Vec3; color: THREE.Color }) {
  const c = useMemo(() => color.clone().multiplyScalar(2), [color]);
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={c} toneMapped={false} />
    </mesh>
  );
}

function gridTexture() {
  return paint(128, 128, (u, v) => {
    const x = Math.round(u * 127), y = Math.round(v * 127);
    return x % 16 === 0 || y % 16 === 0 || x === 127 || y === 127 ? [1, 0.15, 0.75] : [0.02, 0, 0.05];
  });
}

// Nightstand + neon lamp (click = lamp on/off). The shade glows magenta while it's on.
function NightLamp() {
  const lamp = useGame((s) => s.lamp), toggleLamp = useGame((s) => s.toggleLamp), quality = useGame((s) => s.quality);
  const shade = useMemo(() => MAGENTA.clone().multiplyScalar(2), []);
  return (
    <RoomItem id="nightstand" home={HOMES.nightstand}>
      <Nightstand />
      <Core lift>
      <Clickable onTap={toggleLamp} position={LAMP}>
        <mesh position={[0, 0.01, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.02, 24]} />
          <meshStandardMaterial color={METAL} metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.17, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.3, 12]} />
          <meshStandardMaterial color={METAL} metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.2, 32]} />
          <meshBasicMaterial color={lamp ? shade : "black"} toneMapped={false} />
        </mesh>
      </Clickable>
      <pointLight
        visible={lamp}
        position={[LAMP[0], LAMP[1] + 0.38, LAMP[2]]}
        color={srgb(1, 0.3, 0.8)}
        intensity={LIGHT_SCALE.lamp}
        distance={5}
        decay={1.2}
        castShadow={quality > 0}
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.002}
        shadow-radius={quality === 2 ? 4 : 1} // three r18x dropped PCFSoftShadowMap: PCF softens by radius instead
      />
      </Core>
    </RoomItem>
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
  const preset = useGame((s) => s.preset);
  const p = PRESETS[preset];
  // Trilight-style ambient: up-facing surfaces catch the ceiling's neon cove, undersides only see the dark floor.
  const [sky, ground] = useMemo(() => [
    p.ambient.clone().multiplyScalar(1.15).add(MAGENTA.clone().add(CYAN).multiplyScalar(0.045)),
    p.ambient.clone().multiplyScalar(0.4),
  ], [p]);
  const [sunTarget, cityTarget] = useMemo(() => [new THREE.Object3D(), new THREE.Object3D()], []);
  const rug = useMemo(() => gridTexture(), []);
  const city = useMemo(() => srgb(0.6, 0.45, 1).multiply(p.window), [p]);

  return (
    <>
      <hemisphereLight args={[sky, ground, LIGHT_SCALE.hemi]} />
      {/* Moon: Unity Euler(40, −45, 0), no shadows, just lights the faces you look at. */}
      <primitive object={sunTarget} position={[-0.542, -0.643, -0.542]} />
      <directionalLight position={[0, 0, 0]} target={sunTarget} color={srgb(0.6, 0.5, 1)} intensity={p.sun * LIGHT_SCALE.sun} />
      <pointLight position={[1.2, 1.7, -0.6]} color={CYAN} intensity={LIGHT_SCALE.fill} distance={3.5} />
      {/* City glow through the window: wide, soft, aimed down into the room. */}
      <RoomItem id="window" home={HOMES.window}>
        <primitive object={cityTarget} position={[-0.3, 1.17, -1.1]} />
        <spotLight position={[-0.3, 1.7, -1.95]} target={cityTarget} angle={(57.5 * Math.PI) / 180} penumbra={0.65} distance={5.5} color={city} intensity={LIGHT_SCALE.city} />
      </RoomItem>

      {/* Neon cove along the ceiling: magenta left/back, cyan right/front. */}
      <Neon position={[0, 2.68, -1.97]} size={[3.9, 0.03, 0.03]} color={MAGENTA} />
      <Neon position={[-1.97, 2.68, 0]} size={[0.03, 0.03, 3.9]} color={MAGENTA} />
      <Neon position={[0, 2.68, 1.97]} size={[3.9, 0.03, 0.03]} color={CYAN} />
      <Neon position={[1.97, 2.68, 0]} size={[0.03, 0.03, 3.9]} color={CYAN} />
      {/* Synthwave rug */}
      <mesh position={[0, 0.005, -0.2]}>
        <boxGeometry args={[1.8, 0.01, 1.3]} />
        <meshBasicMaterial map={rug} color={[1.6, 1.6, 1.6]} toneMapped={false} />
      </mesh>

      <NightLamp />
      <Reflections />
    </>
  );
}
