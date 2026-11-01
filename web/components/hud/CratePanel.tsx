"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "./Panel";
import { useGame } from "@/lib/store";
import { playAlbum, useCollection } from "@/lib/collection";
import { editAlbum } from "./AlbumEditor";

// Crate view: the selected record, flip, inspect, play, edit, delete (confirm), and a new album.
export function CratePanel() {
  const view = useGame((s) => s.view), selected = useGame((s) => s.selected), visiting = useCollection((s) => s.visiting);
  const albums = useCollection((s) => s.albums);
  const [confirm, setConfirm] = useState("");
  if (view !== "crate") return null;
  const a = albums[Math.min(selected, albums.length - 1)], g = useGame.getState();
  return (
    <Panel side="right">
      {!a ? <p>The crate is empty. Add an album!</p> : (
        <>
          <p><b className="text-fuchsia-400">{a.title}</b><br />{a.artist} {a.year}<br /><i className="text-zinc-400">{albums.indexOf(a) + 1} / {albums.length}</i></p>
          <div className="grid grid-cols-2 gap-1">
            <Button size="sm" variant="secondary" onClick={() => g.flip(-1, albums.length)}>&lt; Prev</Button>
            <Button size="sm" variant="secondary" onClick={() => g.flip(1, albums.length)}>Next &gt;</Button>
          </div>
          <Button size="sm" onClick={() => g.inspect(a.id)}>Inspect [Enter]</Button>
          <Button size="sm" variant="secondary" onClick={() => playAlbum(a.id)}>Put on turntable</Button>
          {!visiting && (
            <>
              <Button size="sm" variant="secondary" onClick={() => editAlbum(a)}>Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => {
                if (confirm === a.id) { useCollection.getState().remove(a.id); g.flip(0, albums.length - 1); setConfirm(""); }
                else setConfirm(a.id);
              }}>{confirm === a.id ? "Really delete? Click again" : "Delete"}</Button>
            </>
          )}
        </>
      )}
    </Panel>
  );
}
