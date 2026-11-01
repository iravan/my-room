"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { CameraRig } from "./CameraRig";
import { RoomShell, Skirting } from "./Room";
import { Lighting } from "./Lighting";
import { PostFX } from "./PostFX";
import { Items } from "./Items";
import { Cables } from "./Cables";
import { Outside } from "./City";
import { Records } from "./Records";
import { Tooltip } from "./Clickable";
import { Inspector } from "./Inspector";
import { SelectionBox } from "./SelectionBox";
import { DecorModels } from "./Decor";
import { ShellModels } from "./Shell";
import { BudgetProbe } from "./BudgetProbe";
import { useLayout } from "@/lib/room";
import { EditPanel } from "@/components/hud/EditPanel";
import { AudioDriver } from "./AudioDriver";
import { InspectPanel } from "@/components/hud/InspectPanel";
import { TurntablePanel } from "@/components/hud/TurntablePanel";
import { CratePanel } from "@/components/hud/CratePanel";
import { AlbumEditor } from "@/components/hud/AlbumEditor";
import { Hud } from "@/components/hud/Hud";
import { useGame } from "@/lib/store";

const DPR_CAP = [1, 1.5, 2];

export default function Scene() {
  const quality = useGame((s) => s.quality), hideUI = useGame((s) => s.hideUI), title = useGame((s) => s.title);
  return (
    <>
    <Canvas onPointerMissed={() => { if (useLayout.getState().editing) useLayout.setState({ selected: null }); }} shadows="percentage" camera={{ fov: 55, near: 0.03, far: 1200 }} dpr={[1, DPR_CAP[quality]]} style={{ touchAction: "none" }}>
      <Suspense fallback={null}>
        <RoomShell />
        <Lighting />
        <Items />
        <Outside />
        <Skirting />
        <Cables />
        <Records />
        <Inspector />
        <DecorModels />
        <ShellModels />
      </Suspense>
      <CameraRig />
      <SelectionBox />
      <BudgetProbe />
      <AudioDriver />
      <PostFX />
    </Canvas>
    <Hud />
    {!hideUI && !title && (
      <>
        <Tooltip />
        <InspectPanel />
        <TurntablePanel />
        <CratePanel />
        <EditPanel />
      </>
    )}
    <AlbumEditor />
    </>
  );
}
