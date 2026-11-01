"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useCollection, type Album } from "@/lib/collection";
import { grooveTexture, useCover, useDisc } from "@/lib/covers";
import { BOARD, CABINET, CABINET_H, CABINET_W, COLS, CRATE, CUBBY, ROWS } from "@/lib/layout";
import { CYAN, srgb } from "@/lib/lighting";
import { useGame, type Vec3 } from "@/lib/store";
import { Neon } from "./Lighting";
import { unityEuler } from "./Surface";
import { Clickable } from "./Clickable";
import { RoomItem } from "./RoomItem";
import { Core } from "./Shell";
import { HOMES } from "@/lib/room";

const SLEEVE = new THREE.BoxGeometry(0.31, 0.31, 0.006);
const FACE = new THREE.PlaneGeometry(0.31, 0.31);
const SPINE = new THREE.BoxGeometry(0.006, 0.31, 0.31);
const DISC = new THREE.CylinderGeometry(0.15, 0.15, 0.004, 64);
const CARD = srgb(0.1, 0.1, 0.1), VIOLET = srgb(0.55, 0.25, 1);
const PER_CUBBY = 26, SPINE_GAP = 0.0125, CRATE_WINDOW = 31; // records physically in the crate around the selection

// A sleeve standing on its bottom edge: cardboard, worn front cover facing +z, back cover behind.
export function Sleeve({ a, position, rotation }: { a: Album; position?: Vec3; rotation?: THREE.Euler }) {
  const front = useCover(a), back = useCover(a, true);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={SLEEVE} position={[0, 0.155, 0]} castShadow>
        <meshStandardMaterial color={CARD} roughness={0.75} />
      </mesh>
      <mesh geometry={FACE} position={[0, 0.155, 0.0031]}>
        <meshStandardMaterial map={front} roughness={0.75} />
      </mesh>
      <mesh geometry={FACE} position={[0, 0.155, -0.0031]} rotation={[0, Math.PI, 0]}>
        <meshStandardMaterial map={back} roughness={0.75} />
      </mesh>
    </group>
  );
}

// Vinyl with grooves that catch the light in rings; translucent pressings fade.
export function Disc({ a, position }: { a: Album; position?: Vec3 }) {
  const map = useDisc(a);
  return (
    <mesh geometry={DISC} position={position} castShadow receiveShadow>
      <meshStandardMaterial map={map} roughness={0.15} normalMap={grooveTexture()} transparent={a.discStyle === "translucent"} depthWrite={a.discStyle !== "translucent"} />
    </mesh>
  );
}

function Spine({ a, position }: { a: Album; position: Vec3 }) {
  const map = useCover(a, false, false);
  const ref = useRef<THREE.Group>(null), out = useRef(false);
  // Hovered spines slide out of the cubby.
  useFrame((_, dt) => {
    const g = ref.current;
    if (g) g.position.z += ((out.current ? 0.1 : 0.03) - g.position.z) * (1 - Math.exp(-12 * Math.min(dt, 0.1)));
  });
  return (
    <Clickable ref={ref} position={position} hint={`${a.title} - ${a.artist}`} onHover={(on) => { out.current = on; }} onTap={() => useGame.getState().inspect(a.id)}>
      <mesh geometry={SPINE}>
        <meshStandardMaterial map={map} roughness={0.75} />
      </mesh>
    </Clickable>
  );
}

// Crate: sleeves front to back. Flipping: records before the selection lean towards you, the selected one
// pops up in crate view. Only a window of 31 around the selection is shown (performance, as in Unity).
const tmpQ = new THREE.Quaternion();
const lean = [-50, -6, 12].map((x) => new THREE.Quaternion().setFromEuler(unityEuler([x, 0, 0])));
function CrateRecords({ albums }: { albums: Album[] }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const gap = Math.min(0.03, 0.5 / Math.min(Math.max(albums.length, 1), CRATE_WINDOW));
  useFrame((_, dt) => {
    const { selected, view } = useGame.getState(), n = albums.length, sel = Math.min(selected, n - 1);
    const k = 1 - Math.exp(-6 * Math.min(dt, 0.1));
    const first = Math.min(Math.max(sel - (CRATE_WINDOW >> 1), 0), Math.max(0, n - CRATE_WINDOW));
    refs.current.forEach((g, i) => {
      if (!g) return;
      g.visible = i >= first && i < first + CRATE_WINDOW;
      if (!g.visible) return;
      g.quaternion.slerp(tmpQ.copy(lean[i < sel ? 0 : i === sel ? 1 : 2]), Math.min(1, k * 1.5));
      g.position.y += ((i === sel && view === "crate" ? 0.1 : 0.02) - g.position.y) * k;
      g.position.z += (0.25 - (i - first) * gap - g.position.z) * Math.min(1, k * 2);
    });
  });
  return (
    <group position={CRATE}>
      {albums.map((a, i) => (
        <Clickable
          key={a.id}
          ref={(g) => { refs.current[i] = g; }}
          position={[0, 0.02, 0.25 - i * gap]}
          onTap={() => {
            const s = useGame.getState();
            if (s.view === "crate" && s.selected === i) s.inspect(a.id);
            else { useGame.setState({ selected: i }); s.setView("crate"); }
          }}
        >
          <Sleeve a={a} />
        </Clickable>
      ))}
    </group>
  );
}

// Cabinet: every album spine-out, cubby by cubby, top-left first.
// ponytail: fixed 8 cubbies × 26 = 208 records; extend COLS/ROWS (or add a second cabinet) past that.
function CabinetSpines({ albums }: { albums: Album[] }) {
  const left = -CABINET_W / 2;
  return (
    <group position={CABINET}>
      {albums.slice(0, COLS * ROWS * PER_CUBBY).map((a, i) => {
        const cub = Math.floor(i / PER_CUBBY), col = cub % COLS, row = ROWS - 1 - Math.floor(cub / COLS);
        return <Spine key={a.id} a={a} position={[left + BOARD + col * (CUBBY + BOARD) + 0.01 + (i % PER_CUBBY) * SPINE_GAP, BOARD + row * (CUBBY + BOARD) + 0.156, 0.03]} />;
      })}
    </group>
  );
}

// Favourites framed above the bed: the first three albums.
function WallDisplay({ albums }: { albums: Album[] }) {
  const face = unityEuler([0, -90, 0]);
  return (
    <>
      {albums.slice(0, 3).map((a, i) => (
        <group key={a.id}>
          <Neon position={[-1.996, 1.505, -(0.35 + i * 0.5)]} size={[0.004, 0.34, 0.34]} color={i === 1 ? CYAN : VIOLET} />
          <Clickable onTap={() => useGame.getState().inspect(a.id)} position={[-1.99, 1.35, -(0.35 + i * 0.5)]} rotation={face}>
            <Sleeve a={a} />
          </Clickable>
        </group>
      ))}
    </>
  );
}

// What's spinning: its sleeve leans on the stand beside the turntable (the disc is on the platter, Furniture.tsx).
function NowSpinning({ a }: { a: Album }) {
  return (
    <>
      <Clickable onTap={() => useGame.getState().inspect(a.id)} position={[1.6, CABINET_H + 0.02, -1.88]} rotation={unityEuler([12, 0, 0])}>
        <Sleeve a={a} />
      </Clickable>
    </>
  );
}

export function Records() {
  const albums = useCollection((s) => s.albums), spinning = useCollection((s) => s.albums.find((a) => a.id === s.spinningId));
  return (
    <>
      <RoomItem id="crate" home={HOMES.crate}><Core><CrateRecords albums={albums} /></Core></RoomItem>
      <RoomItem id="cabinet" home={HOMES.cabinet}>
        <CabinetSpines albums={albums} />
        {spinning && <Core lift><NowSpinning a={spinning} /></Core>}
      </RoomItem>
      <RoomItem id="frames" home={{ position: [-1.99, 1.35, -0.85] }}><WallDisplay albums={albums} /></RoomItem>
    </>
  );
}
