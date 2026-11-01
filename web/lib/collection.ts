import { create } from "zustand";
import { toast } from "sonner";
import { useGame } from "./store";

// Same shape as Unity's Album, so share files move between the two builds.
export type DiscStyle = "solid" | "translucent" | "splatter" | "picture";
export type RGB = [number, number, number]; // gamma 0..1, like Unity's Color
export type Album = {
  id: string;
  title: string; artist: string; year: string; label: string;
  sideA: string; sideB: string; // one track per line
  review: string; genres: string; favoriteTrack: string; language: string;
  frontCover: string; backCover: string; gatefold: string; centerLabel: string; // image names in IndexedDB
  discStyle: DiscStyle;
  discColor: RGB;
  splatterColor: RGB;
};

const STYLES: DiscStyle[] = ["solid", "translucent", "splatter", "picture"];
const newId = () => crypto.randomUUID().replace(/-/g, "");

export function newAlbum(fields: Partial<Album> = {}): Album {
  return {
    id: newId(), title: "Untitled", artist: "Unknown Artist", year: "", label: "", sideA: "", sideB: "",
    review: "", genres: "", favoriteTrack: "", language: "", frontCover: "", backCover: "", gatefold: "", centerLabel: "",
    discStyle: "solid", discColor: [0.04, 0.04, 0.04], splatterColor: [1, 1, 1], ...fields,
  };
}

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback);
// Accepts [r, g, b] or Unity's {r, g, b, a}.
function rgb(v: unknown, fallback: RGB): RGB {
  if (Array.isArray(v)) return [num(v[0], fallback[0]), num(v[1], fallback[1]), num(v[2], fallback[2])];
  if (v && typeof v === "object") { const c = v as Record<string, unknown>; return [num(c.r, fallback[0]), num(c.g, fallback[1]), num(c.b, fallback[2])]; }
  return fallback;
}

// Untrusted album (save file, share file, Unity export) → a clean Album. Image fields keep plain names only.
export function normalizeAlbum(raw: unknown): Album {
  if (!raw || typeof raw !== "object") throw new Error("album is not an object");
  const a = raw as Record<string, unknown>, d = newAlbum();
  const file = (v: unknown) => str(v).split(/[\\/]/).pop() ?? "";
  const style = typeof a.discStyle === "number" ? STYLES[a.discStyle] : STYLES.find((s) => s === a.discStyle);
  return {
    id: /^[\w-]{1,64}$/.test(str(a.id)) ? str(a.id) : d.id,
    title: str(a.title, d.title), artist: str(a.artist, d.artist), year: str(a.year), label: str(a.label),
    sideA: str(a.sideA), sideB: str(a.sideB), review: str(a.review), genres: str(a.genres),
    favoriteTrack: str(a.favoriteTrack), language: str(a.language),
    frontCover: file(a.frontCover), backCover: file(a.backCover), gatefold: file(a.gatefold), centerLabel: file(a.centerLabel),
    discStyle: style ?? "solid", discColor: rgb(a.discColor, d.discColor), splatterColor: rgb(a.splatterColor, d.splatterColor),
  };
}

type CollectionFile = { albums: Album[]; spinningId: string };

function parseCollection(json: string): CollectionFile {
  const f = JSON.parse(json);
  if (!f || !Array.isArray(f.albums)) throw new Error("no albums list");
  return { albums: f.albums.map(normalizeAlbum), spinningId: str(f.spinningId) };
}

function defaultCollection(): CollectionFile {
  const albums = [
    newAlbum({ title: "Midnight Static", artist: "The Low Lamps", year: "1979", label: "Cassette Moon",
      sideA: "Window Rain\nSlow Fan\nStatic Bloom", sideB: "Half Asleep\nLamp Glow", favoriteTrack: "Lamp Glow",
      genres: "dream pop, lo-fi", language: "English", review: "The record I put on when it rains.",
      discStyle: "translucent", discColor: [0.55, 0.1, 0.6] }),
    newAlbum({ title: "Paper Suns", artist: "Ocra", year: "1984", label: "Warm Wood Records",
      sideA: "Sunrise Tape\nPaper Suns", sideB: "Orange Hour\nDust", favoriteTrack: "Paper Suns",
      genres: "city pop", language: "Japanese", review: "Pure summer on a disc.",
      discStyle: "splatter", discColor: [0.95, 0.75, 0.2], splatterColor: [0.9, 0.2, 0.1] }),
    newAlbum({ title: "Deep Groove", artist: "Velvet Needle", year: "1971", label: "Blue Hum",
      sideA: "Needle Drop\nCrackle", sideB: "Run-out Groove", favoriteTrack: "Needle Drop",
      genres: "jazz", language: "Instrumental", review: "Classic black vinyl, classic sound." }),
  ];
  return { albums, spinningId: albums[0].id };
}

export const SAVE_KEY = "my-room-collection";

// Read the save. A broken save is never lost: it is set aside as `<key>.bak` and the room starts fresh.
export function loadCollection(storage: Pick<Storage, "getItem" | "setItem">): CollectionFile & { warning: string } {
  const raw = storage.getItem(SAVE_KEY);
  if (raw !== null) {
    try {
      return { ...parseCollection(raw), warning: "" };
    } catch (e) {
      storage.setItem(SAVE_KEY + ".bak", raw);
      return { ...defaultCollection(), warning: `Your collection couldn't be read (${(e as Error).message}). A copy was kept as ${SAVE_KEY}.bak.` };
    }
  }
  return { ...defaultCollection(), warning: "" };
}

type State = CollectionFile & {
  loaded: boolean;
  visiting: boolean; // a friend's room: in memory only, never saved
  load: () => string; // returns a warning to show, if any
  save: () => void;
  upsert: (a: Album) => void;
  remove: (id: string) => void;
  setSpinning: (id: string) => void;
};

export const useCollection = create<State>()((set, get) => ({
  albums: [], spinningId: "", loaded: false, visiting: false,
  load: () => {
    const { warning, ...f } = loadCollection(localStorage);
    set({ ...f, loaded: true });
    get().save();
    return warning;
  },
  save: () => {
    const { visiting, albums, spinningId } = get();
    if (visiting) return; // a friend's room must never overwrite yours
    localStorage.setItem(SAVE_KEY, JSON.stringify({ albums, spinningId }));
  },
  upsert: (a) => { set((s) => ({ albums: s.albums.some((x) => x.id === a.id) ? s.albums.map((x) => (x.id === a.id ? a : x)) : [...s.albums, a] })); get().save(); },
  remove: (id) => { set((s) => ({ albums: s.albums.filter((x) => x.id !== id), spinningId: s.spinningId === id ? "" : s.spinningId })); get().save(); },
  setSpinning: (id) => { set({ spinningId: id }); get().save(); },
}));

// Put a record on the turntable (needle up) and go and look at it.
export function playAlbum(id: string) {
  useGame.setState({ playing: false });
  useCollection.getState().setSpinning(id);
  useGame.getState().setView("turntable");
}

// Lower or lift the tonearm.
export function togglePlay() {
  const { albums, spinningId } = useCollection.getState();
  if (!albums.some((a) => a.id === spinningId)) { toast("Pick a record from the crate first."); return; }
  useGame.setState((s) => ({ playing: !s.playing }));
}

// Albums grouped by language for the inspector tabs: alphabetical, "Other" (no language) last.
export const lang = (a: Album) => a.language.trim() || "Other";
export const languages = (albums: Album[]) =>
  [...new Set(albums.map(lang))].sort((a, b) => (a === "Other" ? 1 : 0) - (b === "Other" ? 1 : 0) || a.localeCompare(b));
