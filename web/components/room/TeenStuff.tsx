"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { drawText, hsv, lerp, paint, rng, type RGBA } from "@/lib/paint";
import { bedSurfaceY } from "@/items/bed";
import { C, flip, G, LOAD_SEED, Plastic, Prim, type U3 } from "@/items/_shared/prims";
import { HOODIE, PILE } from "@/items/hoodie/roll";
import { JEANS } from "@/items/jeans/place";
import { SNEAKERS } from "@/items/sneakers/place";
import { BALL } from "@/items/basketball/place";
import { BOARD } from "@/items/skateboard/place";
import { ItemView } from "@/items/_shared/ItemView";
import { Core } from "./Shell";
import { RoomItem } from "./RoomItem";
import { HOMES, hiddenOf, placePoint, useLayout } from "@/lib/room";
import { ITEMS } from "@/items/registry";

// A teenager lives here: gaming desk and PC, chair, closet, and the mess, which lands somewhere new every visit.
// Straight port of the Unity build's VinylRoomStuff.cs (git tag unity-final): everything below is written in Unity coordinates (p, s, e) and flipped here,
// so it can be checked line by line against the C#. A yaw-ed group's local −z faces into the room.



// ---------- generated textures ----------

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

// ---------- realism ----------

// A cable through Unity world points, Catmull-Rom smoothed (6 steps per span, as in Unity), never below the floor.
function Cable({ c, width, pts, owners }: { c: THREE.Color; width: number; pts: U3[]; owners?: string[] }) {
  const items = useLayout((s) => s.items), size = useLayout((s) => s.size);
  const gone = useLayout((s) => !!owners && hiddenOf(owners[0], s)); // the device it belongs to is hidden
  const key = (owners?.map((o) => JSON.stringify([items[o], items[ITEMS[o]?.on ?? ""]])).join("|") ?? "") + JSON.stringify(size);
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

// ---------- the room ----------

// The door, sockets, switch and ceiling fixtures are items (items/<id>/); only the skirting is drawn here.

// Skirting round the walls (follows the room size).
function Skirting() {
  const { w, d } = useLayout((s) => s.size), hw = w / 2 - 0.0075, hd = d / 2 - 0.0075;
  const skirting: [U3, U3][] = [[[0, 0.04, hd], [w, 0.08, 0.015]], [[0, 0.04, -hd], [w, 0.08, 0.015]], [[-hw, 0.04, 0], [0.015, 0.08, d]], [[hw, 0.04, 0], [0.015, 0.08, d]]];
  return <>{skirting.map(([p, s], i) => <Plastic key={i} p={p} s={s} c={C(0.5, 0.48, 0.56)} />)}</>;
}

function Teen() {
  // Everything random is rolled once per load.
  return useMemo(() => {
    const rnd = rng(LOAD_SEED);
    const R = (a: number, b: number) => a + rnd() * (b - a);
    const rotY = ([x, y, z]: U3, deg: number): U3 => {
      const a = (deg * Math.PI) / 180;
      return [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
    };
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

    return (
      <>
        <Cable c={cableBlack} width={0.007} pts={[[-1.92, 0.35, -0.95], [-1.95, 0.012, -1], [-1.975, 0.012, -1.18], [-1.99, 0.3, -1.2]]} owners={["pc", "pc", "socket-desk", "socket-desk"]} />
        <Cable c={cableBlack} width={0.006} pts={[[-1.88, 0.95, -1.35], [-1.965, 0.76, -1.33], [-1.97, 0.012, -1.27], [-1.99, 0.29, -1.21]]} owners={["monitor", "monitor", "socket-desk", "socket-desk"]} />

        {/* Clutter: where each piece landed this load */}
        {HOODIE.at === 1 && <ItemView id="hoodie" place={PILE} />}
        {JEANS.here && <ItemView id="jeans" place={JEANS} />}
        <ItemView id="sneakers" place={SNEAKERS} />
        <ItemView id="basketball" place={BALL} />
        <ItemView id="skateboard" place={BOARD} />

        {/* On the bed (gadgets sit on the duvet folds, ~.55): laptop mid-chat, phone, controller */}
        <RoomItem id="bed" home={HOMES.bed}>
        <Core lift><BedGadgets laptop={laptop} phone={phone} pad={pad} /></Core>

        </RoomItem>

        {/* Cables to the sockets (behind the desk at (-2, .3, -1.2), under the window at (.25, .3, 2)): each follows its device */}
        {/* Cables run from their device to their socket: each point follows the item it belongs to. */}
        <Cable c={cableBlack} width={0.005} pts={[[-1.75, 0.55, -0.45], [-1.95, 0.5, -0.5], [-1.975, 0.012, -0.6], [-1.98, 0.012, -1.1], [-1.99, 0.31, -1.19]]} owners={["lamp", "nightstand", "nightstand", "socket-desk", "socket-desk"]} />
        {/* Phone charger: over the bed edge, across the floor to the window socket */}
        <Cable c={C(0.85, 0.85, 0.82)} width={0.006} pts={[plug, [-0.93, onBed(-0.93, plug[2] + 0.1, 0.006), plug[2] + 0.1], [-0.8, 0.2, plug[2] + 0.2], [-0.75, 0.012, 1.6], [0.1, 0.012, 1.96], [0.25, 0.29, 1.99]]} owners={["bed", "bed", "bed", "socket-window", "socket-window", "socket-window"]} />

      </>
    );
  }, []);
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
      <Skirting />
      <Teen />
    </>
  );
}
