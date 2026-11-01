"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGame } from "@/lib/store";
import { languages, newAlbum, useCollection, type Album, type DiscStyle, type RGB } from "@/lib/collection";
import { checkSize, importImage } from "@/lib/images";

type Text = "title" | "artist" | "year" | "label" | "genres" | "language" | "favoriteTrack";
type Image = "frontCover" | "backCover" | "gatefold" | "centerLabel";
const TEXT: [Text, string][] = [["title", "Title"], ["artist", "Artist"], ["year", "Year"], ["label", "Record label"], ["genres", "Genres"], ["language", "Language"], ["favoriteTrack", "Favourite track"]];
const IMAGES: [Image, string][] = [["frontCover", "Front cover"], ["backCover", "Back cover"], ["gatefold", "Gatefold"], ["centerLabel", "Center label"]];
const STYLES: DiscStyle[] = ["solid", "translucent", "splatter", "picture"];

const hex = (c: RGB) => "#" + c.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
const rgb = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as RGB;

export const editAlbum = (a?: Album) => useGame.setState({ draft: a ? structuredClone(a) : newAlbum({ title: "", artist: "" }) });

// Album editor: metadata, tracklists, the review, four images (stored in IndexedDB on pick: ≤ 10 MB, must decode;
// shown downscaled to ≤ 2048 px) and the vinyl style. Save replaces the album with the same id or adds a new one.
export function AlbumEditor() {
  const draft = useGame((s) => s.draft), albums = useCollection((s) => s.albums);
  if (!draft) return null;
  const set = (patch: Partial<Album>) => useGame.setState({ draft: { ...draft, ...patch } });
  const known = languages(albums).filter((l) => l !== "Other");

  const pick = async (field: Image, file?: File) => {
    if (!file) return;
    try {
      checkSize(file.size);
    } catch (e) {
      toast.error((e as Error).message);
      return;
    }
    try {
      (await createImageBitmap(file)).close(); // reject files that aren't images before storing them
      set({ [field]: await importImage(file) });
    } catch {
      toast.error(`Couldn't load image: ${file.name}`);
    }
  };

  const save = () => {
    const saved = { ...draft, title: draft.title.trim() || "Untitled", artist: draft.artist.trim() || "Unknown Artist" };
    const isNew = !albums.some((a) => a.id === saved.id);
    useCollection.getState().upsert(saved);
    if (isNew) useGame.setState({ selected: useCollection.getState().albums.length - 1 });
    useGame.setState({ draft: null });
    if (useGame.getState().view === "inspect") useGame.getState().inspect(saved.id);
    toast.success(`Saved ${saved.title}`);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) useGame.setState({ draft: null }); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{albums.some((a) => a.id === draft.id) ? `Edit: ${draft.title}` : "New album"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[7rem_1fr] items-center gap-2">
          {TEXT.map(([k, label]) => (
            <div key={k} className="contents">
              <Label htmlFor={k}>{label}</Label>
              <Input id={k} value={draft[k]} onChange={(e) => set({ [k]: e.target.value })} />
              {k === "language" && known.length > 0 && (
                <div className="col-start-2 flex flex-wrap gap-1">
                  {known.map((l) => <Button key={l} size="xs" variant="outline" onClick={() => set({ language: l })}>{l}</Button>)}
                </div>
              )}
            </div>
          ))}
        </div>
        {([["sideA", "Side A (one track per line)"], ["sideB", "Side B (one track per line)"], ["review", "Why I love this album"]] as const).map(([k, label]) => (
          <div key={k} className="grid gap-1">
            <Label htmlFor={k}>{label}</Label>
            <Textarea id={k} rows={3} value={draft[k]} onChange={(e) => set({ [k]: e.target.value })} />
          </div>
        ))}
        <div className="grid grid-cols-[7rem_1fr_auto] items-center gap-2">
          {IMAGES.map(([k, label]) => (
            <div key={k} className="contents">
              <Label htmlFor={k}>{label}</Label>
              <Input id={k} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => pick(k, e.target.files?.[0])} />
              <Button size="xs" variant="ghost" disabled={!draft[k]} onClick={() => set({ [k]: "" })}>{draft[k] ? "Clear" : "—"}</Button>
            </div>
          ))}
        </div>
        <div className="grid gap-2">
          <Label>Vinyl</Label>
          <div className="grid grid-cols-4 gap-1">
            {STYLES.map((st) => (
              <Button key={st} size="sm" variant={draft.discStyle === st ? "default" : "outline"} className="capitalize" onClick={() => set({ discStyle: st })}>{st}</Button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="discColor">Disc colour</Label>
            <input id="discColor" type="color" value={hex(draft.discColor)} onChange={(e) => set({ discColor: rgb(e.target.value) })} />
            {draft.discStyle === "splatter" && (
              <>
                <Label htmlFor="splatterColor">Splatter colour</Label>
                <input id="splatterColor" type="color" value={hex(draft.splatterColor)} onChange={(e) => set({ splatterColor: rgb(e.target.value) })} />
              </>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => useGame.setState({ draft: null })}>Cancel</Button>
          <Button onClick={save}>Save to collection</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
