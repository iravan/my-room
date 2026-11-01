# Plan: customise every item, and upload your own 3D models

**Is it possible? Yes.** three.js (already in the app) loads glTF/GLB models natively, and the app already stores
uploaded images locally (IndexedDB), embeds them in share files, and has a Supabase bucket with owner-only rules.
Models follow the same path. The real work is not loading a model; it's these four things:

1. **The room is hard-coded today.** Every item is a React component with fixed positions. Customisation needs the
   room to become *data*: a list of items, each with a type, a transform and options.
2. **Some items do things.** The turntable spins records, the cabinet holds spines, the crate flips, the lamp is a
   light, the monitor/phone/laptop show screens, the bed holds the laptop and phone. A user's model doesn't know where
   its platter, shelves or screen are.
3. **Uploaded files are untrusted and can be heavy.** A 200 MB model with 4K textures will crash a phone tab, and
   a model can reference outside files.
4. **Look and scale.** Models arrive in random sizes, orientations and art styles.

Everything below is about solving those four.

---

## Levels of customisation (approaches)

| | Approach | What the user can do | Effort | Quality risk |
|---|---|---|---|---|
| **A** | **Options on built-in items** | Pick colour, material (walnut / oak / painted / metal / fabric from the existing photo sets), size and variant (e.g. single / double bed, 2 or 4 cubby cabinet, chair accent) | Low | None: every combination is designed |
| **B** | **Curated model catalog** | Swap an item for one of several ready models (free CC0 sets: Poly Haven, Kenney, Quaternius), each pre-fitted with anchors | Medium | Low: we prepare each model once |
| **C** | **Upload your own model** (decor or shell) | Replace an item's look with your GLB, or add any model as free decoration (plant, figure, guitar, poster frame…) | Medium–High | Medium: random scale/style, mitigated by auto-fit and budgets |
| **D** | **Upload a fully working item** | Your model *is* the turntable / cabinet / monitor, including its working parts | High | Medium–High: needs anchor points per item |
| **E** | **Generate a model** (photo or text → 3D) | Snap a photo of your real chair, get a model | External service | Cost per model, privacy, inconsistent results |

**Recommendation:** build the data-driven room first (phase 1), then **A**, then **C** with *shell replacement*
for working items (below), then **B** using the same machinery. Do **D** with named anchors later only if wanted;
treat **E** as an optional add-on on top of C.

### Shell replacement: how uploads work for items that do things

Split every working item into a **shell** (what it looks like) and a **core** (the parts that move, glow or hold
things). An upload replaces only the shell; the core stays built-in and is placed on the shell:

| Item | Core kept built-in | Placed by |
|---|---|---|
| Turntable | platter, record, tonearm, speed button | top surface of the uploaded model (auto) |
| Record cabinet | record spines in cubbies | user drags a "records go here" box, or keeps the built-in cabinet |
| Crate | flipping sleeves | inner box of the model (auto from bounds, adjustable) |
| Lamp | the light and the glowing shade | light position = top of model (adjustable) |
| Monitor / laptop / phone | the live screen (game, chat, clock) | user drags the screen rectangle onto the model |
| Bed | gadgets resting on it | raycast onto the model's top surface (already how `bedSurfaceY` works) |
| Window | the 3D city view | not uploadable in v1 (it's part of the wall) |

Approach **D** later replaces the manual step with **named nodes** in the GLB (`anchor_platter`, `anchor_screen`,
`anchor_light`, `anchor_records`…), so artists who follow the convention get a fully working item with no
setup, and everyone else falls back to shell replacement.

---

## Architecture

### 1. Room as data
```ts
type ItemInstance = {
  id: string;
  type: string;                          // "bed", "desk", "turntable", … or "decor"
  source: { kind: "builtin"; variant?: string } | { kind: "model"; asset: string } ;
  transform: { position: Vec3; rotationY: number; scale: number };
  options: Record<string, string | number | boolean>;   // colour, material, size…
  anchors?: Record<string, { position: Vec3; size?: Vec3 }>; // shell-replacement placements
};
type RoomLayout = { version: 1; items: ItemInstance[] };
```
- A **registry** describes each built-in type: its component, its option schema (for the editor UI), its default
  transform (today's positions), and the anchors its core needs.
- The current room becomes the **default layout**; existing rooms load it unchanged.
- Stored with the room: localStorage now, a `room_items` table in Supabase later (the `rooms.settings` column is
  capped at 16 KB, too small for big layouts).

### 2. Edit mode
- An **Edit room** toggle in the HUD. Click an item → side panel with its options (A), "Swap" (B), "Upload model…" (C),
  "Reset to default", "Remove". A **+ Add** button for decor.
- Move / rotate with drei's `TransformControls` (already installed), snapped to the floor, walls and 1 cm grid.
- Undo/redo of the last ~20 changes (the layout is plain data, so this is a list of snapshots).

### 3. Model upload pipeline (all in the browser)
1. **Accept**: `.glb` (preferred, self-contained), `.gltf` with embedded data. Optional: `.obj` / `.fbx` / `.usdz` via
   three's loaders (all present in `three/examples`), converted to GLB with three's `GLTFExporter` so only GLB is stored.
2. **Guard** (untrusted file, same stance as the share-file checks):
   - file ≤ **20 MB**; reject any external URI (only embedded buffers and images)
   - after loading: ≤ **150k triangles**, ≤ **2048 px** textures, ≤ **16** materials; otherwise offer to simplify
   - load in a Web Worker so a bad file can't freeze the room
3. **Normalise**: Y-up, centre on the footprint, stand it on the floor (or the surface it's placed on), auto-scale to the
   slot's bounding box (keep proportions), then let the user nudge scale/rotation.
4. **Optimise** (optional new dependency: `@gltf-transform/core` + `functions` + `meshoptimizer`): weld, simplify
   over the triangle budget, resize textures, meshopt-compress. Keeps phones at 60 fps.
5. **Fit the room**: cast/receive shadows, use the room's reflections, a contact-shadow blob sized from its bounds,
   hover highlight + click via the existing `Clickable`. Optional "match room style" (darken/tint toward the palette).
6. **Store** as a blob in IndexedDB (same store as cover images), referenced by asset id from the layout.

### 4. Sharing
- **Share file**: embeds models like images today. Needs a total cap (e.g. 100 MB) and a warning when big.
- **Share link** (needs Supabase running): a private `models` bucket under `<owner uid>/`, MIME `model/gltf-binary`,
  same RLS as `covers` (owner writes, published rooms readable). Visitors stream the models.
- Visiting someone's room loads their models in memory only, like their covers today.

### 5. Performance budget for the whole room
- Per item: 150k triangles, 2048 px textures. Per room: ~1.5 M triangles, ~400 MB GPU memory, ~600 draw calls.
- An HUD meter in edit mode shows how full the budget is; past it, new uploads are auto-simplified.
- Re-run `npm run check` (60 fps, no flashing) with a stress layout of uploaded models.

---

## Phases

| Phase | Delivers | Rough size |
|---|---|---|
| **1. Room as data** | Registry + layout; today's room rendered from the default layout; saved/loaded; no visible change | 2–3 passes |
| **2. Edit mode + options (A)** | Select, move/rotate, colour/material/size/variant per item, reset, undo | 3–4 passes |
| **3. Upload decor (C, part 1)** | Upload GLB → guard → normalise → place anywhere; stored and shared | 3–4 passes |
| **4. Shell replacement (C, part 2)** | Upload a model for bed, desk, chair, nightstand, cabinet, turntable, lamp, monitor…; cores placed on it | 4–6 passes |
| **5. Catalog (B)** | A handful of CC0 models per item, pre-anchored, using phases 3–4 | 2–3 passes + picking models |
| **6. Optimise + budgets** | Web-worker loading, simplification, compression, room budget meter | 2–3 passes |
| **7. Cloud (needs Supabase)** | `models` bucket + RLS, room items table, share-by-link with models | 2 passes |

Phases 1–2 also make the `REALISM.md` work easier: each rebuilt item becomes a registered type with options.

## Risks
- **Phones**: big models + shadows can crash a mobile tab; budgets and auto-simplify are not optional.
- **Moderation**: uploaded models in *published* rooms are shown to strangers. Needs a report/hide option before
  public rooms go live.
- **Licensing**: users may upload models they don't own; terms of use + a takedown path for published rooms.
- **Style clash**: a photoreal or cartoon model next to the neon room can look pasted-in; the "match room style"
  option helps but won't fix everything.

## Decisions (owner, 2026-11-01)
1. Scope: **A + C**. D (named-anchor working uploads) and E (photo/text-to-3D) are out.
2. **Everything can move**, including wall fixtures (window, door, sockets) — those slide along their wall.
3. **GLB only** (plus `.gltf` with embedded data); no OBJ/FBX/USDZ conversion.
4. `@gltf-transform` + `meshoptimizer` OK, loaded only in edit mode.
5. Limits OK: 20 MB per model, 100 MB per share file.
6. No generation service.
7. REALISM.md loop paused (record cabinet next); this plan goes first.

## Checklist
### Phase 1: room as data (no visible change)
- [x] Layout store + `RoomItem` wrapper: every item renders through a transform from the layout (pivot = the item's own home position, so moving/rotating an item never orbits the room); default layout = today's room; saved in localStorage; untrusted layouts normalised; Vitest checks. — `lib/room.ts` (poses stored only for moved items, `my-room-layout`, `normalizeLayout` clamps to the room, `itemMatrix`), `RoomItem.tsx` (same id in several places moves together). Items: bed (+ gadgets, charger, shadow), nightstand (+ lamp, light, dust, lamp cable), desk (+ chair, PC, shelf, poster, desk cables), cabinet (+ turntable, spines, stand sleeve), crate (+ records), frames, closet (+ hook hoodie), and per-load clutter (hoodie pile, jeans, sneakers, backpack, basketball, skateboard, 2 posters). Turntable/shelf/crate camera shots follow their item. 4 new Vitest checks (clamping, junk, pivot, home yaw). Verified in Chrome: default room unchanged (check 0 flagged, 60 fps); a layout moving + turning the bed, cabinet and crate moved each with everything on it, shelf shot followed the cabinet. Known until the next items: cables keep their socket end attached to the moved item; window/door/sockets/switch not yet items; chair still part of the desk.
- [x] Split the bundled groups so each real object is its own item (chair out of the desk group; clutter pieces, posters, skateboard, ball; gadgets on the bed follow the bed); contact shadows move with their item. — Chair is its own item (its random spot is rolled in the desk's frame and its home computed in world space, so it turns about its own centre; carries the draped hoodie). The wall shelf (books, plant) and the poster above the desk are separate wall items instead of riding along with the desk. Clutter, posters, skateboard, ball and the bed's gadgets were already split in the previous item; every contact shadow sits inside its item. Verified in Chrome: desk moved + turned alone, chair moved + turned 180° alone, shelf and poster stayed on the wall; default room unchanged; check 0 flagged, 60 fps; 12 tests pass.
- [x] Wall fixtures as items constrained to their wall (window opening follows the window; door, closet, sockets, switch); cables re-route to their ends. — Window, door, closet, switch, 3 sockets, framed records, wall shelf and the 3 posters are wall items: `normalizeLayout` keeps them on their wall (the across-wall coordinate and facing are fixed, they slide along it); the window's opening (1.4 × 1 m × scale, scale ≤ 1.8) is kept inside the wall. The back wall is cut where the window is, and the window's frame, glass, blinds, sill and city light move together (the city outside stays put, so a moved window shows another part of the skyline). Cables are no longer carried by one item: each point belongs to an item (device end, floor run, socket end) and `placePoint` puts it where that item now is. 2 new Vitest checks (wall constraint, cable end follows its socket). Verified in Chrome: window moved right + 15% bigger with its opening, door slid along the front wall, sockets moved, bed moved with its charger over the edge; default room unchanged; check 0 flagged, 60 fps; 14 tests pass. Overlap between items (e.g. door over closet) isn't prevented yet: edit mode.
### Phase 2: edit mode + options (A)
- [x] Edit mode: select, move on the floor / along walls, rotate, snap, reset, undo. — "Edit room" in the left panel (forces the room view). Press an item to select it and drag it: floor items slide on the floor, wall fixtures along their wall (ray onto the floor or wall plane, 5 cm snap, Shift = 1 cm). Edit panel (`hud/EditPanel.tsx`): item name, rotate ±15° [R / Shift+R] (not for wall fixtures), smaller / bigger ±10% [− / +], put back, undo [Cmd/Ctrl+Z, 20 steps, one per drag or button], reset room, done; Esc deselects then leaves; clicking empty space deselects; drag on empty space still looks around. Cyan box round the selected item's meshes (`SelectionBox.tsx`). In edit mode presses select instead of acting (no duvet change, no lamp toggle), view keys are off; camera look pauses during an item drag. Verified in Chrome with real mouse/keys: dragged the nightstand 1.25 m (lamp, light and box followed), R R → 30°, Cmd+Z → 15°, Esc deselect then exit, then a normal bed click changed the duvet; check 0 flagged, 60 fps; 14 tests. Not yet: overlap prevention, a drag handle for touch-only rotation (buttons work on touch).
- [x] Options per item (colour, material, size, variant) from a schema in the registry; option panel. — `lib/options.ts`: generic finishes by part type — Wood (walnut / pine / black / white paint), Fabric (7 colours), Leather (black / tan / white / red), Metal (black / white / brass) — every PBR material declares its part (`wood`, `fabric`, …, or a named part like `fabric:Duvet`); the edit panel lists the parts the selected item actually has (found while drawing its selection box) with swatches. Variants: bed Single / Double (1.42 m, grows away from the wall; headboard gets 7 channels; contact shadow follows). Size = Smaller/Bigger from the previous item. Options are saved with the layout, normalised (unknown parts/choices dropped), undoable, cleared by Reset room; applied per frame only for items that have (or just lost) options, and restored exactly. Clicking the bed still cycles duvet colours and clears a duvet colour chosen in edit mode. Fixed on the way: the lamp's dust specks caught every click within 1 m (three's Points raycast threshold), so presses near the nightstand selected it — dust no longer takes clicks. 2 new Vitest checks (option guard, apply/restore). Verified in Chrome via the panel: bed → Double + white wood + mustard duvet + navy headboard rendered; chair shows its Leather part; check 0 flagged, 60 fps; 16 tests.
### Phase 3: upload decor (C, part 1)
- [x] GLB upload: guards (20 MB, no external URIs, triangle/texture/material limits), worker loading, normalise (Y-up, ground, auto-fit), stored in IndexedDB. — `lib/glb.ts` checks the raw bytes before anything loads: GLB 2.0 header/chunks (or .gltf JSON), every buffer and image embedded (links to other files or the web refused), only extensions GLTFLoader handles without decoders (Draco/meshopt/KTX2/WebP refused for now), ≤ 150k triangles (counted from accessors × node instancing), textures ≤ 2048 px (read from PNG/JPEG headers, no decode), ≤ 16 materials, ≤ 20 MB. `lib/models.ts`: parse with three's GLTFLoader, drop lights, centre the footprint and stand it on the floor, rescale to 60 cm only if the size is absurd (> 2.5 m or < 5 cm, e.g. exported in cm), store the file in IndexedDB, place it in front of the camera facing you, selected for dragging. Edit panel: "+ Add a 3D model (.glb)", "Remove model"; models are layout items (move/rotate/resize/undo like the rest) and survive reloads. Worker: not needed for the guard (header/JSON only, milliseconds); comes with simplification in phase 5–6. 5 new Vitest checks with hand-built GLBs (stats, outside links, budgets incl. instancing, compression/version/junk/truncated, image headers). Verified in Chrome: linked GLB refused with its reason, 7,680-triangle knot added at real size on the floor, a cm-scale copy auto-rescaled to 60 cm, both back after reload; check 0 flagged, 60 fps; 21 tests. Not yet: new uploads land on the same spot (drag them apart).
- [ ] Place uploaded models anywhere; included in share files (100 MB cap) and visits.
### Phase 4: shell replacement (C, part 2)
- [ ] Upload a model to replace an item's look; cores (platter/tonearm, spines, crate sleeves, lamp light, screens, bed surface) placed on it automatically or by dragging a box.
### Phase 5–6: optimise and budgets
- [ ] `@gltf-transform` + `meshoptimizer` simplify/compress over budget; room budget meter; stress `npm run check`.
### Phase 7: cloud (needs Supabase running)
- [ ] `models` bucket + RLS, room items table, share-by-link with models.
