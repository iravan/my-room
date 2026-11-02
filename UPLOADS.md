# How uploaded 3D models (.glb) are saved

Short version: the model file lives in **this browser's IndexedDB**; the room only keeps its file name. Nothing goes to
a server yet.

## 1. Import — `web/lib/models.ts` (`importModelFile`)
- Accepts `.glb` or a self-contained `.gltf`, up to **20 MB**.
- `checkModel` (`web/lib/glb.ts`) counts triangles and checks texture sizes.
- Over the room's triangle budget, or textures too big → it is **simplified, not refused**: a Web Worker
  (`web/lib/optimize.worker.ts`, gltf-transform + meshoptimizer) welds, simplifies, dedups, prunes, shrinks textures and
  meshopt-compresses it.
- It is parsed once to make sure it really loads.

## 2. Storage — `web/lib/images.ts`
- Given a random name like `abcd1234.glb`.
- `putImage(name, blob)` writes it to IndexedDB database `my-room`, store `images` (the same store as album covers).
- Files are never deleted (so saved library looks can always point at them).

## 3. References in the room — `web/lib/room.ts`
- Added as decor: `models`, e.g. `"model-1a2b3c4d": { asset: "abcd1234.glb", name }`, its position in `items`.
- Replacing an item's look: `shells`, e.g. `"bed": { asset, name, yaw }`.
- That small JSON is saved in localStorage under `my-room-layout`; the model bytes stay in IndexedDB.
- Your personal library of looks (`my-room-library` in localStorage) holds the same kind of reference.

## 4. Loading — `loadModel`
- Reads the blob from IndexedDB (`getImage`), parses it with GLTFLoader + the meshopt decoder.
- Drops lights in the model, stands it on the floor, rescales anything over 2.5 m or under 5 cm to about 60 cm.
- Cached per file name, so copies of one upload share it.

## 5. Sharing and visiting — `web/lib/share.ts`
- Exporting/sharing a room embeds every referenced model file (base64) in the share file — why shares get big
  (capped at 100 MB).
- Visiting a friend's room: their files stay in memory only (`visit:` names), never written to your IndexedDB. Saving
  one of their looks to your library copies the file into your own store first.

## Limitation
Everything is per browser: clearing site data, another browser/device, or moving the site to a new address (new
origin) loses uploaded models. Fix: store uploads in **Supabase Storage** and keep only the name in the room — waiting on
the Supabase setup choice (see CUSTOMIZATION.md).
