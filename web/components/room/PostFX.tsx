"use client";

import { EffectComposer, Bloom, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useGame } from "@/lib/store";
import { useStyle } from "@/lib/room";

// Camera-like finish: bloom on the neon (only HDR strips cross the threshold), ACES roll-off, soft vignette.
// Low quality skips the composer; the renderer's own ACES tone mapping still applies.
export function PostFX() {
  const quality = useGame((s) => s.quality), glow = useStyle().neon.glow;
  if (quality === 0) return null;
  return (
    <EffectComposer multisampling={quality === 2 ? 4 : 0}>
      {/* Neon styles glow from dim strips; bright rooms only let real light sources bloom. */}
      <Bloom mipmapBlur luminanceThreshold={glow ? 0.3 : 0.85} luminanceSmoothing={0.1} intensity={glow ? 1.4 : 0.5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.45} />
    </EffectComposer>
  );
}
