"use client";

import { Button } from "@/components/ui/button";
import { Panel } from "./Panel";
import { useGame } from "@/lib/store";
import { togglePlay, useCollection } from "@/lib/collection";

// What's on the platter, arm down/up, speed, and a way to the sleeve.
export function TurntablePanel() {
  const view = useGame((s) => s.view), playing = useGame((s) => s.playing), rpm45 = useGame((s) => s.rpm45);
  const t = useCollection((s) => s.albums.find((a) => a.id === s.spinningId));
  if (view !== "turntable") return null;
  return (
    <Panel side="right">
      {!t ? (
        <p>No record on the platter.<br />Pick one from the crate.</p>
      ) : (
        <>
          <p>On the platter:<br /><b className="text-fuchsia-400">{t.title}</b> — {t.artist}</p>
          <Button size="sm" onClick={togglePlay}>{playing ? "Lift tonearm [Space]" : "Lower tonearm [Space]"}</Button>
          <Button size="sm" variant="secondary" onClick={() => useGame.setState({ rpm45: !rpm45 })}>{rpm45 ? "Speed: 45 rpm" : "Speed: 33⅓ rpm"}</Button>
          <Button size="sm" variant="secondary" onClick={() => useGame.getState().inspect(t.id)}>Inspect sleeve</Button>
        </>
      )}
    </Panel>
  );
}
