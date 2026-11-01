"use client";

import * as THREE from "three";
import { drawText, paint } from "@/lib/paint";
import { C, G, Plastic, Prim } from "../../_shared/prims";
import { useClockTexture } from "../../_shared/clock";
import { defineVariant } from "../../types";

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
const drawChatClock = (t: THREE.CanvasTexture, time: string) => drawText(t, time, 107, 73, 1, [0.8, 0.8, 0.85]);

// Silver laptop, lid tilted back, mid-chat with the real time in the top bar.
function Chat() {
  const chat = useClockTexture(chatScreen, drawChatClock), silver = C(0.6, 0.6, 0.65);
  return (
    <>
      <Plastic p={[0, 0.008, 0]} s={[0.32, 0.015, 0.22]} c={silver} />
      <G p={[0, 0.015, 0.11]} e={[-15, 0, 0]}>
        <Plastic p={[0, 0.11, 0]} s={[0.32, 0.22, 0.008]} c={silver} />
        <Prim t="quad" p={[0, 0.11, -0.0045]} s={[0.3, 0.19]} map={chat} glow={C(1, 1, 1)} />
      </G>
    </>
  );
}

export default defineVariant({ item: "laptop", id: "chat", name: "Laptop (group chat)", Component: Chat });
