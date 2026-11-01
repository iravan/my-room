import { toast } from "sonner";
import { normalizeAlbum, useCollection, type Album } from "./collection";
import { forgetImages } from "./covers";
import { checkSize, getImage, putImage, VISIT, visitImages } from "./images";
import { useGame } from "./store";

// One shareable file: the albums, what's spinning, and every image they use, base64-embedded.
// Same layout as Unity's ShareFile, so files move between the two builds.
type ShareImage = { name: string; data: string };
type ShareFile = { albums: Album[]; images: ShareImage[]; spinningId: string };
const IMAGE_FIELDS = ["frontCover", "backCover", "gatefold", "centerLabel"] as const;
const MAX_SHARE_BYTES = 200 * 1024 * 1024;

const toBase64 = async (b: Blob) => {
  const bytes = new Uint8Array(await b.arrayBuffer());
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromBase64 = (data: string) => new Blob([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))]);

export async function exportCollection() {
  const { albums, spinningId } = useCollection.getState();
  const names = [...new Set(albums.flatMap((a) => IMAGE_FIELDS.map((f) => a[f])).filter(Boolean))];
  const images: ShareImage[] = [];
  for (const name of names) {
    const blob = await getImage(name);
    if (blob) images.push({ name, data: await toBase64(blob) });
  }
  return JSON.stringify({ albums, images, spinningId } satisfies ShareFile);
}

// A shared file comes from someone else: untrusted. Images may only use plain names and must pass the size
// limit; albums are normalised (image fields cut to plain names, then prefixed for a visit).
export function parseShare(json: string, prefix = ""): ShareFile {
  if (json.length > MAX_SHARE_BYTES) throw new Error("file is too big");
  let f: Record<string, unknown>;
  try { f = JSON.parse(json); } catch { throw new Error("not a vinyl room file"); }
  if (!f || !Array.isArray(f.albums) || f.albums.length === 0) throw new Error("not a vinyl room file");
  const images = (Array.isArray(f.images) ? f.images : []).filter(
    (i): i is ShareImage => !!i && typeof i.name === "string" && /^[^/\\]+$/.test(i.name) && i.name !== "." && i.name !== ".." && typeof i.data === "string",
  );
  for (const i of images) checkSize((i.data.length * 3) / 4);
  const albums = f.albums.map(normalizeAlbum).map((a) => {
    for (const k of IMAGE_FIELDS) if (a[k]) a[k] = prefix + a[k];
    return a;
  });
  return { albums, images: images.map((i) => ({ name: prefix + i.name, data: i.data })), spinningId: typeof f.spinningId === "string" ? f.spinningId : "" };
}

// Merge a shared file into your collection (same album id = replaced).
export async function importShare(json: string) {
  if (useCollection.getState().visiting) throw new Error("leave the visit first");
  const f = parseShare(json);
  for (const i of f.images) await putImage(i.name, fromBase64(i.data));
  const names = new Set(f.images.map((i) => i.name));
  forgetImages((k) => [...names].some((n) => k.includes(n)));
  const ids = new Set(f.albums.map((a) => a.id));
  useCollection.setState((s) => ({ albums: [...s.albums.filter((a) => !ids.has(a.id)), ...f.albums] }));
  useCollection.getState().save();
  return f.albums.length;
}

// Visitor mode: someone else's room in memory only; your collection is untouched until you leave.
let own: { albums: Album[]; spinningId: string } | null = null;
export function visit(json: string) {
  const f = parseShare(json, VISIT);
  leaveImages();
  for (const i of f.images) visitImages.set(i.name, fromBase64(i.data));
  const s = useCollection.getState();
  if (!s.visiting) own = { albums: s.albums, spinningId: s.spinningId };
  useCollection.setState({ albums: f.albums, spinningId: f.spinningId, visiting: true });
  useGame.setState({ selected: 0, playing: false, draft: null });
  return f.albums.length;
}

function leaveImages() {
  visitImages.clear();
  forgetImages((k) => k.includes(VISIT));
}

export function leaveVisit() {
  if (!useCollection.getState().visiting || !own) return;
  leaveImages();
  useCollection.setState({ ...own, visiting: false });
  own = null;
  useGame.setState({ selected: 0, playing: false });
}

// ---- browser glue: download, pick a file ----

export async function downloadCollection() {
  const name = "my-vinyl-room.json";
  const url = URL.createObjectURL(new Blob([await exportCollection()], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast.success(`Downloaded ${name}: send it to a friend.`);
}

function pickJson(then: (text: string) => void | Promise<void>) {
  const input = Object.assign(document.createElement("input"), { type: "file", accept: ".json,application/json" });
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_SHARE_BYTES) throw new Error("file is too big");
      await then(await file.text());
    } catch (e) {
      toast.error(`Couldn't open ${file.name}: ${(e as Error).message}`);
    }
  };
  input.click();
}

export const importFromFile = () => pickJson(async (t) => { toast.success(`Imported ${await importShare(t)} albums.`); });
export const visitFromFile = () => pickJson((t) => { toast.success(`Visiting a room with ${visit(t)} albums (read-only).`); });
