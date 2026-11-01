"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame, type Vec3 } from "@/lib/store";
import { CYAN, MAGENTA, srgb } from "@/lib/lighting";
import { paint } from "@/lib/paint";
import { Slab } from "./Surface";
import { Clickable } from "./Clickable";
import { Nightstand } from "./Nightstand";
import { Core } from "./Shell";
import { RoomItem } from "./RoomItem";
import { HOMES, useLayout, useStyle } from "@/lib/room";

const METAL = srgb(0.55, 0.55, 0.7);
const LAMP: Vec3 = [-1.7, 0.54, 0.45];
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

type RGB3 = [number, number, number];
function gridTexture(a: RGB3, b: RGB3) {
  return paint(128, 128, (u, v) => {
    const x = Math.round(u * 127), y = Math.round(v * 127);
    return x % 16 === 0 || y % 16 === 0 || x === 127 || y === 127 ? a : b;
  });
}

// Woven rug in the style's two colours: a double border, a field of fine stripes, a medallion in the middle.
function wovenTexture(a: RGB3, b: RGB3) {
  return paint(256, 256, (u, v) => {
    const edge = Math.min(u, 1 - u, v, 1 - v), weave = 0.93 + 0.07 * Math.sin(u * 256 * Math.PI) * Math.sin(v * 256 * Math.PI);
    const d = Math.abs(u - 0.5) + Math.abs(v - 0.5) * 1.4; // diamond medallion
    let c: number[] = b;
    if (edge < 0.05 || (edge > 0.07 && edge < 0.085)) c = a;
    else if (edge >= 0.085 && (Math.abs(d - 0.22) < 0.02 || d < 0.08 || (v * 18) % 1 < 0.07)) c = a.map((x, i) => x * 0.7 + b[i] * 0.3);
    return [c[0] * weave, c[1] * weave, c[2] * weave];
  });
}

// Nightstand + neon lamp (click = lamp on/off). The shade glows magenta while it's on.
function NightLamp() {
  const lamp = useGame((s) => s.lamp), toggleLamp = useGame((s) => s.toggleLamp), quality = useGame((s) => s.quality);
  const style = useStyle(), shade = useMemo(() => style.lamp.shade.clone().multiplyScalar(2), [style]);
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
        color={style.lamp.light}
        intensity={LIGHT_SCALE.lamp * Math.max(0.25, style.exposure)}
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
  const preset = useGame((s) => s.preset), size = useLayout((s) => s.size), style = useStyle();
  const p = style.presets[preset % 3];
  // Trilight-style ambient: up-facing surfaces catch the ceiling's cove (its neon tint when it glows), undersides
  // only see the floor.
  const [sky, ground] = useMemo(() => [
    p.ambient.clone().multiplyScalar(1.15).add(style.neon.glow ? style.neon.a.clone().add(style.neon.b).multiplyScalar(0.045) : new THREE.Color()),
    p.ambient.clone().multiplyScalar(0.4),
  ], [p, style]);
  const [sunTarget, cityTarget] = useMemo(() => [new THREE.Object3D(), new THREE.Object3D()], []);
  const rug = useMemo(() => (style.rug.kind === "grid" ? gridTexture : wovenTexture)(style.rug.a, style.rug.b), [style]);
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

      {/* Neon cove along the ceiling: magenta left/back, cyan right/front. */}
      <Neon position={[0, size.h - 0.12, -size.d / 2 + 0.03]} size={[size.w - 0.1, 0.03, 0.03]} color={MAGENTA} />
      <Neon position={[-size.w / 2 + 0.03, size.h - 0.12, 0]} size={[0.03, 0.03, size.d - 0.1]} color={MAGENTA} />
      <Neon position={[0, size.h - 0.12, size.d / 2 - 0.03]} size={[size.w - 0.1, 0.03, 0.03]} color={CYAN} />
      <Neon position={[size.w / 2 - 0.03, size.h - 0.12, 0]} size={[0.03, 0.03, size.d - 0.1]} color={CYAN} />
      {/* Rug: glowing synthwave grid, or a woven rug */}
      <mesh position={[0, 0.005, -0.2]} receiveShadow>
        <boxGeometry args={[1.8, 0.01, 1.3]} />
        {style.rug.kind === "grid"
          ? <meshBasicMaterial map={rug} color={[1.6, 1.6, 1.6]} toneMapped={false} />
          : <meshStandardMaterial map={rug} roughness={1} />}
      </mesh>

      <NightLamp />
      <Reflections />
    </>
  );
}
