"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "./Panel";
import { useGame } from "@/lib/store";
import { lang, languages, playAlbum, useCollection, type Album } from "@/lib/collection";
import { editAlbum } from "./AlbumEditor";
import { sfx } from "@/lib/audio";

function Tracks({ side, favourite }: { side: string; favourite: string }) {
  const tracks = side.split("\n").map((t) => t.trim()).filter(Boolean);
  return (
    <ol className="space-y-0.5">
      {tracks.map((t, i) => (
        <li key={i} className={t === favourite.trim() ? "font-bold text-white" : "pl-3 text-zinc-300"}>{t === favourite.trim() ? `★ ${t}` : t}</li>
      ))}
    </ol>
  );
}

// Liner notes and controls for the album in the inspector: the collection by language (click to switch),
// flip / vinyl / gatefold / play / back, then title, tracklists with the favourite starred, and the review.
export function InspectPanel() {
  const view = useGame((s) => s.view), id = useGame((s) => s.inspectId), discOut = useGame((s) => s.discOut);
  const albums = useCollection((s) => s.albums), visiting = useCollection((s) => s.visiting);
  const a = albums.find((x) => x.id === id);
  const [tab, setTab] = useState<string>();
  if (view !== "inspect" || !a) return null;
  const langs = languages(albums), current = tab && langs.includes(tab) ? tab : lang(a);
  const g = useGame.getState();
  return (
    <Panel side="right" className="bottom-2.5">
      <div className="grid grid-cols-3 gap-1">
        {langs.map((l) => (
          <Button key={l} size="sm" variant={l === current ? "default" : "outline"} onClick={() => setTab(l)}>{l}</Button>
        ))}
      </div>
      <div className="max-h-44 overflow-y-auto rounded border border-white/10 p-1">
        {albums.filter((x) => lang(x) === current).map((r: Album) => (
          <button key={r.id} onClick={() => g.inspect(r.id)} className={`block w-full truncate rounded px-2 py-1 text-left ${r.id === a.id ? "bg-fuchsia-500/30 text-white" : "hover:bg-white/10"}`}>
            {r.title} - {r.artist}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1">
        <Button size="sm" variant="secondary" onClick={() => useGame.setState((s) => ({ inspectRot: [s.inspectRot[0] + 180, s.inspectRot[1]] }))}>Flip [F]</Button>
        <Button size="sm" variant="secondary" onClick={() => { useGame.setState((s) => ({ discOut: !s.discOut })); sfx("slide", 0.7); }}>{discOut ? "Vinyl in [V]" : "Vinyl out [V]"}</Button>
        <Button size="sm" variant="secondary" onClick={() => useGame.setState((s) => ({ gatefold: !s.gatefold }))}>Gatefold [G]</Button>
        <Button size="sm" onClick={() => playAlbum(a.id)}>Play [Space]</Button>
        {!visiting && <Button size="sm" variant="secondary" onClick={() => editAlbum(a)}>Edit</Button>}
        <Button size="sm" variant="secondary" className={visiting ? "col-span-2" : ""} onClick={() => g.back()}>Back [Esc]</Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        <div>
          <h2 className="text-lg font-bold text-fuchsia-400">{a.title}</h2>
          <p>{a.artist}</p>
          <p className="italic text-zinc-400">{a.year} {a.label}</p>
          <p className="text-zinc-400">{a.genres}</p>
          <p className="text-zinc-400">Language: {lang(a)}</p>
        </div>
        <section><h3 className="font-bold text-cyan-300">Side A</h3><Tracks side={a.sideA} favourite={a.favoriteTrack} /></section>
        <section><h3 className="font-bold text-cyan-300">Side B</h3><Tracks side={a.sideB} favourite={a.favoriteTrack} /></section>
        <section><h3 className="font-bold text-cyan-300">Why I love it</h3><p className="whitespace-pre-wrap">{a.review}</p></section>
      </div>
    </Panel>
  );
}
