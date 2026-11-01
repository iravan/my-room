"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame, type Vec3 } from "@/lib/store";
import { CYAN, MAGENTA, srgb } from "@/lib/lighting";
import { drawText, hsv, lerp, paint, rng, type RGBA } from "@/lib/paint";
import { Neon } from "./Lighting";
import { bedSurfaceY } from "@/items/bed";
import { ContactShadow } from "@/items/_shared/ContactShadow";
import { Desk, T } from "./Desk";
import { Chair } from "./Chair";
import { Core } from "./Shell";
import { RoomItem } from "./RoomItem";
import { HOMES, placePoint, useLayout } from "@/lib/room";
import { PbrCapsule, PbrMaterial, Slab, unityEuler, type TextureSet } from "./Surface";

// A teenager lives here: gaming desk and PC, chair, closet, and the mess, which lands somewhere new every visit.
// Straight port of the Unity build's VinylRoomStuff.cs (git tag unity-final): everything below is written in Unity coordinates (p, s, e) and flipped here,
// so it can be checked line by line against the C#. A yaw-ed group's local −z faces into the room.

type U3 = [number, number, number];
const flip = ([x, y, z]: U3): Vec3 => [x, y, -z];
const C = (r: number, g: number, b: number, k = 1) => srgb(r, g, b, k);
const Ck = ([r, g, b]: number[], k = 1) => srgb(r, g, b, k);
const VIOLET = srgb(0.55, 0.25, 1);
const glowOf = (c: THREE.Color, k: number) => c.clone().multiplyScalar(k);
// The mess is rolled once per page load from this seed (deterministic within a load).
const LOAD_SEED = Math.floor(Math.random() * 2 ** 31);

const GEO = {
  cube: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(0.5, 24, 16),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 2, 24),
  capsule: new THREE.CapsuleGeometry(0.5, 1, 6, 16),
  quad: new THREE.PlaneGeometry(1, 1),
};

function G({ p, yaw = 0, e, children }: { p: U3; yaw?: number; e?: U3; children: ReactNode }) {
  return <group position={flip(p)} rotation={unityEuler(e ?? [0, yaw, 0])}>{children}</group>;
}

// Unity primitive with a plain Standard material (gloss .25; Plastic = .6), or unlit glow; quads are 1×1 facing −z.
function Prim({ t = "cube", p, s, e, c = C(1, 1, 1), gloss = 0.25, map, glow, emissive, cast = false, transparent }: {
  t?: keyof typeof GEO; p: U3; s: U3 | [number, number]; e?: U3; c?: THREE.Color; gloss?: number;
  map?: THREE.Texture; glow?: THREE.Color; emissive?: THREE.Color; cast?: boolean; transparent?: boolean;
}) {
  const scale: Vec3 = s.length === 2 ? [s[0], s[1], 1] : s;
  return (
    <mesh geometry={GEO[t]} position={flip(p)} rotation={unityEuler(e ?? [0, 0, 0])} scale={scale} castShadow={cast} receiveShadow={!glow}>
      {glow
        ? <meshBasicMaterial color={glow} map={map} transparent={transparent} />
        : <meshStandardMaterial color={c} roughness={1 - gloss} map={map} emissive={emissive ?? "black"} />}
    </mesh>
  );
}
const Plastic = (props: Parameters<typeof Prim>[0]) => <Prim gloss={0.6} {...props} />;

function PbrSphere({ set, tile, p, s, e, c }: { set: TextureSet; tile: number; p: U3; s: U3; e?: U3; c: THREE.Color }) {
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(0.5, 32, 20);
    const uv = g.attributes.uv as THREE.BufferAttribute, girth = (Math.PI * (s[0] + s[2])) / 2;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * girth) / tile, (uv.getY(i) * s[1] * 1.57) / tile);
    return g;
  }, [s, tile]);
  return (
    <mesh geometry={geometry} position={flip(p)} rotation={unityEuler(e ?? [0, 0, 0])} scale={s} receiveShadow>
      <PbrMaterial set={set} color={c} />
    </mesh>
  );
}

// Jersey photo is ~70% grey: tints scaled up to match (as in Unity).
const Fabric = ({ p, s, c, e }: { p: U3; s: U3; c: number[]; e?: U3 }) =>
  <Slab set="cotton_jersey" tile={0.26} position={flip(p)} size={s} rotation={e} color={Ck(c, 1.4)} cast={false} />;
const Walnut = ({ p, s, c, cast }: { p: U3; s: U3; c: U3; cast?: boolean }) =>
  <Slab set="black_walnut_veneer_01" tile={1} position={flip(p)} size={s} color={C(...c)} cast={!!cast} />;

// ---------- generated textures ----------

const canTexture = () => paint(32, 32, (u, v) =>
  v > 0.9 || v < 0.08 ? [0.75, 0.75, 0.78] : Math.abs(((u * 4) % 1) - 0.5) < 0.12 ? [0.4, 1, 0.2] : [0.05, 0.05, 0.06]);

// Third-person game, world layer: sky and hills, seamless across u so it can scroll forever.
const gameWorld = () => paint(192, 108, (u, v) => {
  const hill = 0.35 + 0.07 * Math.sin(u * Math.PI * 4) + 0.04 * Math.sin(u * Math.PI * 10 + 1);
  if (v < hill) return lerp([0.04, 0.1, 0.06], [0.15, 0.32, 0.15], v / hill) as RGBA;
  return lerp([1, 0.55, 0.35], [0.15, 0.25, 0.6], (v - hill) / (1 - hill)) as RGBA;
}, { repeat: true });

// HUD over it (transparent elsewhere): health bar, minimap, crosshair, and the sun, which shouldn't scroll.
const gameHud = () => paint(192, 108, (u, v) => {
  if (v > 0.88 && v < 0.92 && u > 0.03 && u < 0.25) return u < 0.19 ? [0.9, 0.2, 0.2] : [0.25, 0.05, 0.05];
  if (u > 0.85 && u < 0.97 && v > 0.7 && v < 0.94) return Math.abs(u - 0.91) < 0.006 && Math.abs(v - 0.82) < 0.01 ? [1, 0.92, 0.016] : [0.12, 0.22, 0.16];
  if ((Math.abs(u - 0.5) < 0.012 && Math.abs(v - 0.5) < 0.003) || (Math.abs(v - 0.5) < 0.02 && Math.abs(u - 0.5) < 0.002)) return [1, 1, 1];
  if (Math.hypot(u * 1.78 - 1.15, v - 0.55) < 0.09) return [1, 0.9, 0.65];
  return [0, 0, 0, 0];
});

// Group chat: channel sidebar, bubbles left and right; the clock goes in the top bar.
const chatScreen = () => paint(128, 80, (u, v) => {
  if (v > 0.9) return [0.1, 0.1, 0.13];
  if (u < 0.2) return Math.abs(((u * 5) % 1) - 0.5) < 0.3 && (v * 8) % 1 < 0.5 && u > 0.04 && u < 0.16 ? [0.35, 0.4, 0.9] : [0.13, 0.13, 0.16];
  const row = Math.floor(v * 9), len = 0.25 + ((row * 37) % 11) * 0.03;
  const mine = row % 3 === 1, inBand = (v * 9) % 1 < 0.65 && v > 0.08;
  if (inBand && !mine && u > 0.23 && u < 0.23 + len) return [0.32, 0.33, 0.38];
  if (inBand && mine && u > 0.97 - len && u < 0.97) return [0.25, 0.45, 0.95];
  return v < 0.08 ? [0.25, 0.25, 0.3] : [0.19, 0.19, 0.23];
});

// Phone home screen: wallpaper gradient, app grid; the clock goes above it.
const phoneScreen = () => paint(40, 80, (u, v) => {
  if (v > 0.1 && v < 0.62 && u > 0.1 && u < 0.9 && (u * 4.4) % 1 < 0.7 && (v * 7.6) % 1 < 0.7)
    return hsv((Math.floor(u * 4.4) * 0.23 + Math.floor(v * 7.6) * 0.37) % 1, 0.7, 0.95);
  return lerp([0.55, 0.15, 0.6], [1, 0.45, 0.5], v) as RGBA;
});

// Gig poster: two-colour gradient, striped sun or rings, title blocks along the bottom.
function posterTexture(seed: number) {
  const r = rng(seed), h = r(), h2 = (h + 0.3 + r() * 0.4) % 1;
  const a = hsv(h, 0.8, 0.35), b = hsv(h2, 0.7, 0.9), ink = hsv((h + 0.5) % 1, 0.6, 1), rings = r() < 0.5;
  return paint(90, 128, (u, v) => {
    if (v < 0.16) return u > 0.1 && u < 0.9 && v > 0.05 && v < 0.11 && (u * 12) % 1 < 0.8 ? [1, 1, 1] : [0.05, 0.05, 0.07];
    const d = Math.hypot(u - 0.5, v * 1.42 - 0.85);
    if (rings ? d < 0.38 && (d * 12) % 1 < 0.5 : d < 0.3 && (v > 0.6 || (v * 40) % 1 < 0.6)) return ink;
    return lerp(a, b, v) as RGBA;
  });
}

function Poster({ p, e, size, seed }: { p: U3; e: U3; size: [number, number]; seed: number }) {
  const map = useMemo(() => posterTexture(seed), [seed]);
  return <Prim t="quad" p={p} e={e} s={size} map={map} gloss={0.1} />;
}

// The game world pans under its HUD.
const scroll = (t: THREE.Texture, seconds: number) => { t.offset.x = (seconds * 0.02) % 1; };
function Monitor({ T }: { T: number }) {
  const [world, hud] = useMemo(() => [gameWorld(), gameHud()], []);
  useFrame(({ clock }) => scroll(world, clock.elapsedTime));
  return (
    <>
      <Prim t="quad" p={[0, T + 0.32, 0.104]} s={[0.61, 0.345]} map={world} glow={C(1, 1, 1)} />
      <Prim t="quad" p={[0, T + 0.32, 0.1035]} s={[0.61, 0.345]} map={hud} glow={C(1, 1, 1)} transparent />
    </>
  );
}

// ---------- realism ----------

// Contact shadow under p (Unity coords, parent space).
const Blob = ({ p, size }: { p: U3; size: [number, number] }) => { const [x, , z] = flip(p); return <ContactShadow x={x} z={z} size={size} />; };

// A cable through Unity world points, Catmull-Rom smoothed (6 steps per span, as in Unity), never below the floor.
function Cable({ c, width, pts, owners }: { c: THREE.Color; width: number; pts: U3[]; owners?: string[] }) {
  const items = useLayout((s) => s.items), size = useLayout((s) => s.size);
  const gone = useLayout((s) => !!owners && s.hidden.includes(owners[0])); // the device it belongs to is hidden
  const key = (owners?.map((o) => JSON.stringify(items[o] ?? null)).join("|") ?? "") + JSON.stringify(size);
  const geometry = useMemo(() => {
    const P = pts.map((q, i) => (owners ? placePoint(owners[i], flip(q), items, undefined, size) : new THREE.Vector3(...flip(q)))), out: THREE.Vector3[] = [];
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[Math.max(i - 1, 0)], b = P[i], d = P[i + 1], e = P[Math.min(i + 2, P.length - 1)];
      for (let k = 0; k < 6; k++) {
        const t = k / 6, t2 = t * t, t3 = t2 * t;
        const q = new THREE.Vector3().addScaledVector(b, 2).addScaledVector(d.clone().sub(a), t)
          .addScaledVector(a.clone().multiplyScalar(2).addScaledVector(b, -5).addScaledVector(d, 4).sub(e), t2)
          .addScaledVector(b.clone().multiplyScalar(3).sub(a).addScaledVector(d, -3).add(e), t3).multiplyScalar(0.5);
        q.y = Math.max(q.y, 0.012);
        out.push(q);
      }
    }
    out.push(P[P.length - 1]);
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(out), out.length * 3, width / 2, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the owners' poses
  }, [pts, width, key]);
  if (gone) return null;
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={c} roughness={0.5} />
    </mesh>
  );
}

// Phone and laptop clocks show the real local time, redrawn when the minute changes.
const drawChatClock = (t: THREE.CanvasTexture, time: string) => drawText(t, time, 107, 73, 1, [0.8, 0.8, 0.85]);
const drawPhoneClock = (t: THREE.CanvasTexture, time: string) => drawText(t, time, 2, 60, 2, [1, 1, 1]);
function useClockTexture(make: () => THREE.CanvasTexture, draw: (t: THREE.CanvasTexture, time: string) => void) {
  // Start with the clock-less screen: the material is compiled with a map from the first frame
  // (three doesn't recompile when a map appears later, so an empty start would stay white).
  const [tex, setTex] = useState(make);
  useEffect(() => {
    let shown = -1, current: THREE.CanvasTexture | undefined;
    const tick = () => {
      const now = new Date(), minute = now.getHours() * 60 + now.getMinutes();
      if (minute === shown) return;
      shown = minute;
      const t = make();
      draw(t, `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
      const old = current;
      current = t;
      setTex(t);
      setTimeout(() => old?.dispose(), 1000);
    };
    const first = setTimeout(tick, 0), id = setInterval(tick, 5000);
    return () => { clearTimeout(first); clearInterval(id); current?.dispose(); };
  }, [make, draw]);
  return tex;
}

// Dust in the lamp's glow. Real dust is brightest backlit, which a lit material gets backwards, so: unlit soft
// additive motes drifting in a small box round the lamp, fading in and out, shown only while it's on (and not on Low).
const DUST = { n: 90, life: 14, centre: [-1.45, 1.15, -0.45] as U3, box: [1.2, 1, 1.2] as U3 };
function makeDust() {
  const pos = new Float32Array(DUST.n * 3), col = new Float32Array(DUST.n * 3), age = new Float32Array(DUST.n), seed = new Float32Array(DUST.n * 3);
  const c = flip(DUST.centre), rnd = rng(11);
  const spawn = (i: number) => { for (let k = 0; k < 3; k++) { pos[i * 3 + k] = c[k] + (rnd() - 0.5) * DUST.box[k]; seed[i * 3 + k] = rnd() * 100; } };
  for (let i = 0; i < DUST.n; i++) { spawn(i); age[i] = rnd() * DUST.life; } // prewarmed
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const map = paint(16, 16, (u, v) => { const a = 0.6 * Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.5) * 2); return [a, a * 0.8, a * 0.93]; });
  const step = (dt: number, time: number) => {
    for (let i = 0; i < DUST.n; i++) {
      age[i] += dt;
      if (age[i] > DUST.life) { age[i] = 0; spawn(i); }
      for (let k = 0; k < 3; k++) pos[i * 3 + k] += Math.sin(time * 0.25 + seed[i * 3 + k]) * 0.025 * dt;
      const t = age[i] / DUST.life, fade = t < 0.2 ? t / 0.2 : t > 0.8 ? (1 - t) / 0.2 : 1;
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = fade;
    }
    geometry.attributes.position.needsUpdate = geometry.attributes.color.needsUpdate = true;
  };
  return { geometry, map, step };
}
function Dust() {
  const on = useGame((s) => s.lamp && s.quality > 0);
  const dust = useMemo(() => makeDust(), []);
  useFrame(({ clock }, dt) => { if (on) dust.step(Math.min(dt, 0.1), clock.elapsedTime); });
  if (!on) return null;
  return (
    <points geometry={dust.geometry} raycast={() => null}>
      <pointsMaterial map={dust.map} size={0.012} sizeAttenuation vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// ---------- the room ----------

// What every real bedroom has: skirting, a door, sockets, a light switch, a ceiling light, a smoke detector.

function RoomBasics() {
  const paintC = C(0.5, 0.48, 0.56), steel = C(0.7, 0.7, 0.75), white = C(0.8, 0.8, 0.78);
  const { w, d, h } = useLayout((s) => s.size), hw = w / 2 - 0.0075, hd = d / 2 - 0.0075;
  const skirting: [U3, U3][] = [[[0, 0.04, hd], [w, 0.08, 0.015]], [[0, 0.04, -hd], [w, 0.08, 0.015]], [[-hw, 0.04, 0], [0.015, 0.08, d]], [[hw, 0.04, 0], [0.015, 0.08, d]]];
  const sockets: [U3, number, string][] = [[[-2, 0.3, -1.2], -90, "socket-desk"], [[0.25, 0.3, 2], 0, "socket-window"], [[2, 0.3, -1.4], 90, "socket-right"]];
  return (
    <>
      {skirting.map(([p, s], i) => <Plastic key={i} p={p} s={s} c={paintC} />)}
      {/* Door on the front wall beside the closet; handle on the switch side */}
      <RoomItem id="door" home={HOMES.door}><G p={[1.4, 0, -2]} yaw={180}>
        <Walnut p={[0, 1.025, -0.02]} s={[0.8, 2.05, 0.04]} c={[0.55, 0.5, 0.5]} />
        {[-1, 1].map((s) => <Plastic key={s} p={[s * 0.43, 1.055, -0.01]} s={[0.06, 2.11, 0.02]} c={paintC} />)}
        <Plastic p={[0, 2.08, -0.01]} s={[0.92, 0.06, 0.02]} c={paintC} />
        <Plastic t="cylinder" p={[-0.3, 1, -0.045]} s={[0.05, 0.01, 0.05]} e={[90, 0, 0]} c={steel} />
        <Plastic p={[-0.26, 1, -0.065]} s={[0.12, 0.018, 0.02]} c={steel} />
      </G></RoomItem>
      <RoomItem id="switch" home={HOMES.switch}><G p={[2, 1.1, -1.75]} yaw={90}>
        <Plastic p={[0, 0, -0.004]} s={[0.08, 0.08, 0.008]} c={white} />
        <Plastic p={[0, 0, -0.01]} s={[0.025, 0.04, 0.006]} e={[8, 0, 0]} c={C(0.8, 0.8, 0.78, 0.9)} />
      </G></RoomItem>
      {sockets.map(([p, yaw, id]) => (
        <RoomItem key={id} id={id} home={HOMES[id]}><G p={p} yaw={yaw}>
          <Plastic p={[0, 0, -0.004]} s={[0.08, 0.08, 0.008]} c={white} />
          {[-0.012, 0.012].map((x) => <Prim key={x} p={[x, 0, -0.0085]} s={[0.006, 0.016, 0.002]} c={C(0.05, 0.05, 0.05)} />)}
        </G></RoomItem>
      ))}
      {/* Ceiling: flush light, off at night (faint white dish); smoke detector with its red LED */}
      <RoomItem id="ceiling-light" home={HOMES["ceiling-light"]}>
        <Plastic t="cylinder" p={[0, h - 0.115, 0.2]} s={[0.36, 0.015, 0.36]} c={C(0.75, 0.75, 0.78)} emissive={C(0.06, 0.055, 0.07)} />
      </RoomItem>
      <RoomItem id="smoke-detector" home={HOMES["smoke-detector"]}>
        <Plastic t="cylinder" p={[0.9, h - 0.11, -0.6]} s={[0.11, 0.01, 0.11]} c={white} />
        <Prim t="sphere" p={[0.93, h - 0.122, -0.6]} s={[0.008, 0.008, 0.008]} glow={C(2, 0.1, 0.1)} />
      </RoomItem>
      {/* Contact shadows under the core furniture: bed, nightstand, cabinet, crate */}
      <RoomItem id="nightstand" home={HOMES.nightstand}><Blob p={[-1.7, 0, -0.45]} size={[0.6, 0.55]} /></RoomItem>
      <RoomItem id="cabinet" home={HOMES.cabinet}><Blob p={[1.26, 0, 1.8]} size={[1.6, 0.55]} /></RoomItem>
      <RoomItem id="crate" home={HOMES.crate}><Blob p={[1.45, 0, 0.35]} size={[0.55, 0.8]} /></RoomItem>
    </>
  );
}

function Teen() {
  // Everything random is rolled once per load.
  return useMemo(() => {
    const rnd = rng(LOAD_SEED);
    const R = (a: number, b: number) => a + rnd() * (b - a);
    const chance = (p: number) => rnd() < p;
    const int = (n: number) => Math.floor(rnd() * n);
    const hue = (s: number, v: number) => hsv(R(0, 1), s, v);
    const black = C(0.035, 0.035, 0.04), steel = C(0.2, 0.2, 0.25);
    const can = canTexture();

    const notes = Array.from({ length: int(3) }, (_, i) =>
      <Prim key={i} p={[R(-0.3, 0.3) > 0 ? 0.3 : -0.3, T + R(0.16, 0.45), 0.103]} s={[0.05, 0.05, 0.002]} e={[0, 0, R(-8, 8)]} c={C(1, 0.9, 0.3)} />);

    const band = 0.085, top = 0.19;
    const drinks = ([[0.42, -0.22], [0.52, -0.02], [0.26, 0.06], [-0.3, 0.05]] as const).map(([x, z], i) => {
      if (!chance(0.55)) return null;
      return chance(0.25)
        ? <Plastic key={i} t="cylinder" p={[x, T + 0.05, z]} s={[0.08, 0.05, 0.08]} c={C(0.85, 0.85, 0.82)} />
        : <Prim key={i} t="cylinder" p={[x, T + 0.061, z]} s={[0.066, 0.061, 0.066]} e={[0, R(0, 360), 0]} map={can} gloss={0.75} />;
    });

    const books: ReactNode[] = [];
    let bx = -0.42;
    while (bx < 0.18) {
      const w = R(0.025, 0.05), h = R(0.17, 0.26);
      books.push(<Prim key={bx} p={[bx + w / 2, 1.5125 + h / 2, 0.19]} s={[w, h, R(0.14, 0.19)]} c={Ck(hue(R(0.3, 0.7), R(0.25, 0.7)))} />);
      bx += w + 0.002;
    }

    const accent = chance(0.5) ? [0.9, 0.2, 0.6] : [0.2, 0.7, 0.9];
    const accent6 = accent.map((v) => v * 0.6);
    const hoodieAt = int(3); // 0 chair, 1 floor, 2 closet hook
    const hoodie = hue(R(0, 0.3), R(0.2, 0.5));
    const rotY = ([x, y, z]: U3, deg: number): U3 => {
      const a = (deg * Math.PI) / 180;
      return [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
    };
    const shoeColor = hue(0.6, 0.8).map((v) => v * 1.4);
    const flipShoe = chance(0.3);
    const ball: U3 = [R(1.45, 1.8), 0.12, R(-1.3, -0.7)];
    // Bed gadgets, rolled here so the phone charger cable can find the phone; they rest on the duvet's real surface.
    const onBed = (x: number, z: number, lift: number) => bedSurfaceY(x, -z) + lift; // Unity z → three z
    const laptopZ = R(0.2, 0.45);
    const laptop = { z: laptopZ, y: onBed(-1.45, laptopZ, 0.008), yaw: -90 + R(-25, 25) };
    const phoneX = R(-1.7, -1.2), phoneZ = R(1, 1.3);
    const phone = { p: [phoneX, onBed(phoneX, phoneZ, 0.0045), phoneZ] as U3, yaw: R(0, 360) };
    const padX = R(-1.3, -1.05), padZ = R(0.6, 0.9);
    const pad = { x: padX, z: padZ, y: onBed(padX, padZ, 0.023), yaw: R(0, 360) };
    const plugAt = rotY([0, 0, -0.085], phone.yaw), plug: U3 = [phone.p[0] + plugAt[0], phone.p[1], phone.p[2] + plugAt[2]];
    const cableBlack = C(0.03, 0.03, 0.035);
    // Clutter: where each piece landed this load (Unity coords) — also its home for the layout.
    const pile: U3 = [R(0.6, 1), 0, R(-1.25, -0.9)], jeansAt: U3 = [R(-0.6, 0.2), 0, R(-1.1, -0.7)], hasJeans = chance(0.7);
    const shoesAt: U3 = [R(-0.85, -0.6), 0, R(-0.6, -0.4)], boardAt: U3 = [1.76, 0, R(-0.45, -0.25)];
    const at = (p: U3) => ({ position: flip(p) });
    const chairLocal: U3 = [R(-0.12, 0.12), 0, -0.62 + R(-0.08, 0.08)], chairOff = rotY(chairLocal, -90);
    const chairAt: U3 = [-1.68 + chairOff[0], 0, -1.35 + chairOff[2]];

    return (
      <>
        {/* Desk against the left wall. Local frame: −z faces the room, +z the wall, +x towards the bed. */}
        <RoomItem id="desk" home={HOMES.desk}>
        <G p={[-1.68, 0, -1.35]} yaw={-90}>
          <Desk />
          <Blob p={[0, 0, 0]} size={[1.35, 0.75]} />
          <Blob p={[0.4, 0, 0.02]} size={[0.32, 0.55]} />
          <Blob p={[-0.45, 0, -0.05]} size={[0.32, 0.32]} />

          <Core lift>
          {/* Monitor with a game running, webcam, a sticky note or two, and its soft blue spill */}
          <Plastic p={[0, T + 0.006, 0.15]} s={[0.24, 0.012, 0.18]} c={black} />
          <Plastic p={[0, T + 0.11, 0.16]} s={[0.05, 0.2, 0.03]} c={black} />
          <Plastic p={[0, T + 0.32, 0.12]} s={[0.64, 0.38, 0.03]} c={black} />
          <Monitor T={T} />
          <Plastic p={[0, T + 0.52, 0.115]} s={[0.08, 0.025, 0.03]} c={black} />
          {notes}
          <pointLight position={flip([0, T + 0.3, -0.3])} color={C(0.5, 0.6, 1)} intensity={1.2} distance={1.8} />

          {/* RGB keyboard, mouse, speakers */}
          <Plastic p={[-0.05, T + 0.016, -0.1]} s={[0.44, 0.022, 0.14]} c={black} />
          <Neon position={flip([-0.05, T + 0.004, -0.1])} size={[0.45, 0.004, 0.15]} color={chance(0.5) ? CYAN : MAGENTA} />
          <Plastic t="sphere" p={[0.27, T + 0.018, -0.1]} s={[0.065, 0.035, 0.11]} c={black} />
          {[-0.48, 0.48].map((x) => (
            <group key={x}>
              <Plastic p={[x, T + 0.08, 0.14]} s={[0.09, 0.16, 0.1]} c={black} />
              <Prim t="cylinder" p={[x, T + 0.07, 0.089]} s={[0.06, 0.002, 0.06]} e={[90, 0, 0]} c={C(0.12, 0.12, 0.14)} />
            </group>
          ))}

          {/* Gaming headset on its stand */}
          <G p={[-0.42, T, -0.14]} yaw={R(-40, 40)}>
            <Plastic t="cylinder" p={[0, 0.004, 0]} s={[0.1, 0.004, 0.1]} c={black} />
            <Plastic t="cylinder" p={[0, 0.13, 0]} s={[0.015, 0.13, 0.015]} c={black} />
            {Array.from({ length: 9 }, (_, i) => {
              const a = (i * 180) / 8, r = (a * Math.PI) / 180;
              return <Plastic key={i} p={[Math.cos(r) * band, top + Math.sin(r) * band, 0]} s={[0.036, 0.012, 0.03]} e={[0, 0, a + 90]} c={black} />;
            })}
            {[-1, 1].map((s) => (
              <group key={s}>
                <Plastic t="cylinder" p={[s * (band + 0.005), top - 0.035, 0]} s={[0.085, 0.02, 0.085]} e={[0, 0, 90]} c={black} />
                <Prim t="cylinder" p={[s * (band + 0.026), top - 0.035, 0]} s={[0.05, 0.002, 0.05]} e={[0, 0, 90]} glow={glowOf(CYAN, 1.5)} />
              </group>
            ))}
          </G>

          {drinks}
          </Core>

          <Core>
          {/* Gaming PC under the desk, glass front, RGB fans */}
          <Plastic p={[0.4, 0.25, 0.02]} s={[0.22, 0.48, 0.44]} c={black} cast />
          {[CYAN, VIOLET, MAGENTA].map((c, i) =>
            <Prim key={i} t="cylinder" p={[0.4, 0.1 + i * 0.14, -0.201]} s={[0.12, 0.002, 0.12]} e={[90, 0, 0]} glow={glowOf(c, 1.5)} />)}

          {/* Bin under the other end, with the shots that missed */}
          <Plastic t="cylinder" p={[-0.45, 0.15, -0.05]} s={[0.22, 0.15, 0.22]} c={C(0.15, 0.15, 0.17)} />
          {Array.from({ length: 1 + int(3) }, (_, i) => {
            const d = R(0.05, 0.07);
            return <Prim key={i} t="sphere" p={[R(-0.65, -0.2), 0.03, R(-0.5, -0.2)]} s={[d, d, d]} e={[R(0, 360), R(0, 360), 0]} c={C(0.85, 0.85, 0.8)} />;
          })}
          </Core>

        </G>
        </RoomItem>
        <Cable c={cableBlack} width={0.007} pts={[[-1.92, 0.35, -0.95], [-1.95, 0.012, -1], [-1.975, 0.012, -1.18], [-1.99, 0.3, -1.2]]} owners={["desk", "desk", "socket-desk", "socket-desk"]} />
        <Cable c={cableBlack} width={0.006} pts={[[-1.88, 0.95, -1.35], [-1.965, 0.76, -1.33], [-1.97, 0.012, -1.27], [-1.99, 0.29, -1.21]]} owners={["desk", "desk", "socket-desk", "socket-desk"]} />

        {/* Wall shelf above the desk (books, the one leaning over, a plant) and the poster over it: wall items of their own, modelled in the desk's frame */}
        <RoomItem id="wall-shelf" home={{ position: [-1.87, 1.5, 1.35] }}>
        <G p={[-1.68, 0, -1.35]} yaw={-90}>
          <Walnut p={[0, 1.5, 0.19]} s={[0.9, 0.025, 0.22]} c={[0.75, 0.7, 0.68]} />
          {books}
          <Prim p={[bx + 0.06, 1.6, 0.19]} s={[0.035, 0.22, 0.16]} e={[0, 0, -28]} c={Ck(hue(0.5, 0.5))} />
          <Prim t="cylinder" p={[0.36, 1.5525, 0.19]} s={[0.1, 0.04, 0.1]} c={C(0.6, 0.3, 0.2)} />
          <Prim t="sphere" p={[0.36, 1.65, 0.19]} s={[0.17, 0.14, 0.17]} c={C(0.15, 0.35, 0.12)} />
        </G>
        </RoomItem>
        <RoomItem id="poster-desk" home={{ position: [-1.975, 2.1, 1.35] }}>
        <G p={[-1.68, 0, -1.35]} yaw={-90}>
          <Poster p={[0, 2.1, 0.295]} e={[0, 0, R(-2, 2)]} size={[0.45, 0.62]} seed={int(1e9)} />
        </G>
        </RoomItem>

        {/* Gaming chair, pushed back from the desk at whatever angle it was left: its own item (rolled in the desk's frame) */}
        <RoomItem id="chair" home={at(chairAt)}>
        <G p={[-1.68, 0, -1.35]} yaw={-90}>
          <G p={chairLocal} yaw={R(-35, 35)}>
            <Blob p={[0, 0, 0]} size={[0.75, 0.75]} />
            <Chair accent={accent6} hoodieOn={hoodieAt === 0} />
            {hoodieAt === 0 && <Core><Fabric p={[0, 1.36, -0.36]} s={[0.56, 0.06, 0.22]} c={hoodie} e={[-10, 0, R(-6, 6)]} /></Core>}
          </G>
        </G>
        </RoomItem>

        {/* Built-in wardrobe: framed opening, top and floor track, two sliding doors with long pulls (the back one a mirror),
            so it doesn't read as a second room door. A hook for the hoodie. */}
        <RoomItem id="closet" home={{ position: [0.1, 0, 2] }}>
        <G p={[0.1, 0, -2]}>
          {[-1, 1].map((s) => (
            <group key={s}>
              <Walnut p={[s * 0.4, 1.03, s < 0 ? 0.015 : 0.04]} s={[0.8, 2.06, 0.025]} c={[0.85, 0.8, 0.78]} />
              <Plastic p={[s * 0.74, 1.05, s < 0 ? 0.03 : 0.055]} s={[0.025, 1.2, 0.015]} c={C(0.7, 0.7, 0.75)} />
              <Plastic p={[s * 0.82, 1.06, 0.03]} s={[0.04, 2.12, 0.06]} c={C(0.5, 0.48, 0.56)} />
            </group>
          ))}
          <Plastic p={[0, 2.11, 0.035]} s={[1.68, 0.08, 0.07]} c={C(0.5, 0.48, 0.56)} />
          <Plastic p={[0, 0.01, 0.03]} s={[1.6, 0.02, 0.06]} c={C(0.7, 0.7, 0.75)} />
          <mesh geometry={GEO.cube} position={flip([-0.4, 1.05, 0.03])} scale={[0.62, 1.75, 0.004]}>
            <meshStandardMaterial color={C(0.9, 0.9, 0.92)} metalness={1} roughness={0.04} />
          </mesh>
          <Plastic p={[0.55, 1.62, 0.065]} s={[0.02, 0.02, 0.05]} c={C(0.7, 0.7, 0.75)} />
          {hoodieAt === 2 && (
            <>
              <Fabric p={[0.55, 1.33, 0.1]} s={[0.42, 0.55, 0.06]} c={hoodie} e={[0, 0, R(-4, 4)]} />
              <Fabric p={[0.55, 1.58, 0.09]} s={[0.2, 0.14, 0.07]} c={hoodie.map((v) => v * 0.85)} />
            </>
          )}
        </G>
        </RoomItem>

        {/* Clothes where they fell: hoodie (unless it's on the chair or the hook), jeans, sneakers */}
        {hoodieAt === 1 && (
          <RoomItem id="hoodie" home={at(pile)}><G p={pile} yaw={R(0, 360)}>
            <Blob p={[0, 0, 0]} size={[0.6, 0.5]} />
            {[0, 1, 2].map((i) => <Fabric key={i} p={[R(-0.06, 0.06), 0.02 + i * 0.035, R(-0.06, 0.06)]} s={[0.5 - i * 0.1, 0.04, 0.4 - i * 0.08]} c={hoodie} e={[0, R(-30, 30), 0]} />)}
          </G></RoomItem>
        )}
        {hasJeans && (
          <RoomItem id="jeans" home={at(jeansAt)}><G p={jeansAt} yaw={R(0, 360)}>
            {[-1, 1].map((s) => <Fabric key={s} p={[s * 0.09, 0.015, 0]} s={[0.16, 0.03, 0.75]} c={[0.2, 0.3, 0.55]} e={[0, s * R(2, 12), 0]} />)}
          </G></RoomItem>
        )}
        <RoomItem id="sneakers" home={at(shoesAt)}><G p={shoesAt} yaw={R(0, 360)}>
          <Blob p={[0, 0, 0]} size={[0.4, 0.42]} />
          {[-1, 1].map((s) => {
            const knocked = s === 1 && flipShoe;
            return (
              <G key={s} p={[s * 0.09 + (knocked ? 0.05 : 0), knocked ? 0.05 : 0, R(-0.05, 0.05)]} e={[0, R(-20, 20), knocked ? 80 : 0]}>
                <Plastic p={[0, 0.018, 0]} s={[0.1, 0.035, 0.28]} c={C(0.92, 0.92, 0.9)} />
                <PbrCapsule set="cotton_jersey" tile={0.26} position={flip([0, 0.06, -0.01])} scale={[0.09, 0.12, 0.07]} rotation={[90, 0, 0]} color={Ck(shoeColor)} cast={false} />
              </G>
            );
          })}
        </G></RoomItem>

        {/* On the bed (gadgets sit on the duvet folds, ~.55): laptop mid-chat, phone, controller */}
        <RoomItem id="bed" home={HOMES.bed}>
        <Core lift><BedGadgets laptop={laptop} phone={phone} pad={pad} /></Core>

        </RoomItem>

        {/* Cables to the sockets (behind the desk at (-2, .3, -1.2), under the window at (.25, .3, 2)): PC + monitor in the desk item; the lamp's goes with the nightstand */}
        {/* Cables run from their device to their socket: each point follows the item it belongs to. */}
        <Cable c={cableBlack} width={0.005} pts={[[-1.75, 0.55, -0.45], [-1.95, 0.5, -0.5], [-1.975, 0.012, -0.6], [-1.98, 0.012, -1.1], [-1.99, 0.31, -1.19]]} owners={["nightstand", "nightstand", "nightstand", "socket-desk", "socket-desk"]} />
        {/* Phone charger: over the bed edge, across the floor to the window socket */}
        <Cable c={C(0.85, 0.85, 0.82)} width={0.006} pts={[plug, [-0.93, onBed(-0.93, plug[2] + 0.1, 0.006), plug[2] + 0.1], [-0.8, 0.2, plug[2] + 0.2], [-0.75, 0.012, 1.6], [0.1, 0.012, 1.96], [0.25, 0.29, 1.99]]} owners={["bed", "bed", "bed", "socket-window", "socket-window", "socket-window"]} />

        {/* Basketball; skateboard against the right wall with two posters above it */}
        <RoomItem id="basketball" home={at(ball)}>
        <Blob p={ball} size={[0.32, 0.32]} />
        <PbrSphere set="fabric_leather_02" tile={0.25} p={ball} s={[0.24, 0.24, 0.24]} e={[R(0, 360), R(0, 360), 0]} c={C(1.6, 0.65, 0.25)} />
        </RoomItem>
        <RoomItem id="skateboard" home={at(boardAt)}><G p={boardAt} e={[0, 0, -12]}>
          <Deck seed={int(1e9)} />
          {[0.14, 0.7].map((y) => (
            <group key={y}>
              <Plastic p={[-0.02, y, 0]} s={[0.025, 0.03, 0.15]} c={steel} />
              {[-1, 1].map((s) => <Plastic key={s} t="cylinder" p={[-0.04, y, s * 0.08]} s={[0.055, 0.015, 0.055]} e={[0, 0, 90]} c={C(0.95, 0.9, 0.8)} />)}
            </group>
          ))}
        </G></RoomItem>
        <RoomItem id="poster-1" home={at([1.995, 1.65, -1.05])}><Poster p={[1.995, 1.65, -1.05]} e={[0, 90, R(-2, 2)]} size={[0.5, 0.7]} seed={int(1e9)} /></RoomItem>
        <RoomItem id="poster-2" home={at([1.995, 1.55, -0.3])}><Poster p={[1.995, 1.55, -0.3]} e={[0, 90, R(-3, 3)]} size={[0.4, 0.56]} seed={int(1e9)} /></RoomItem>
      </>
    );
  }, []);
}

function Deck({ seed }: { seed: number }) {
  const map = useMemo(() => posterTexture(seed), [seed]);
  return <Prim p={[0, 0.42, 0]} s={[0.015, 0.8, 0.21]} map={map} />;
}

function BedGadgets({ laptop: l, phone: ph, pad }: {
  laptop: { z: number; y: number; yaw: number }; phone: { p: U3; yaw: number }; pad: { x: number; z: number; y: number; yaw: number };
}) {
  const chat = useClockTexture(chatScreen, drawChatClock), phone = useClockTexture(phoneScreen, drawPhoneClock);
  const black = C(0.035, 0.035, 0.04), silver = C(0.6, 0.6, 0.65);
  return (
    <>
      <G p={[-1.45, l.y, l.z]} yaw={l.yaw}>
        <Plastic p={[0, 0.008, 0]} s={[0.32, 0.015, 0.22]} c={silver} />
        <G p={[0, 0.015, 0.11]} e={[-15, 0, 0]}>
          <Plastic p={[0, 0.11, 0]} s={[0.32, 0.22, 0.008]} c={silver} />
          <Prim t="quad" p={[0, 0.11, -0.0045]} s={[0.3, 0.19]} map={chat} glow={C(1, 1, 1)} />
        </G>
      </G>
      <G p={ph.p} yaw={ph.yaw}>
        <Plastic p={[0, 0, 0]} s={[0.075, 0.008, 0.155]} c={black} />
        <Prim t="quad" p={[0, 0.0045, 0]} e={[90, 0, 0]} s={[0.07, 0.148]} map={phone} glow={C(1, 1, 1)} />
      </G>
      <G p={[pad.x, pad.y, pad.z]} yaw={pad.yaw}>
        <Plastic p={[0, 0, 0]} s={[0.15, 0.035, 0.07]} c={black} />
        {[-1, 1].map((s) => <Plastic key={s} t="sphere" p={[s * 0.06, -0.005, -0.035]} s={[0.05, 0.035, 0.07]} c={black} />)}
      </G>
    </>
  );
}

export function TeenStuff() {
  return (
    <>
      <RoomBasics />
      <Teen />
      <RoomItem id="nightstand" home={HOMES.nightstand}><Core lift><Dust /></Core></RoomItem>
    </>
  );
}
