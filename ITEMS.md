# Plan: one folder per item, swappable item styles, mapped by config

**Short answer: yes, and it's the right next step.** Today an item is spread over several places, and adding a
new look means editing all of them:

| What | Where it lives now |
|---|---|
| Geometry | `Bed.tsx`, `Desk.tsx`, `Chair.tsx`, `Nightstand.tsx`, `Furniture.tsx` (cabinet, turntable, crate, blinds), and 585 lines of `TeenStuff.tsx` (everything else) |
| Home position, wall anchors | `HOMES`, `ANCHOR`, `ON_WALL` in `lib/room.ts` |
| Colour/material choices | `FINISHES`, `VARIANTS` in `lib/options.ts` |
| Room themes | `STYLES` in `lib/styles.ts` (also sets furniture finishes) |
| Display names | `NAMES` in `components/hud/EditPanel.tsx` |
| What stays when the look is replaced | `<Core>` markers inside each geometry file |

The plan below gives every item its own folder, lets an item have several interchangeable **variants** (e.g. bed:
"Platform walnut", "Metal frame", "Canopy"), and puts the choice of which variant each room style uses in **one
config file**.

## Words (so the plan stays clear)
- **Item**: a thing in the room with a place and behaviour: `bed`, `desk`, `lamp`, `turntable`…
- **Variant**: one interchangeable look of an item (`bed/variants/platform.tsx`). Any variant of an item can
  replace any other, because they share the item's **contract** (below).
- **Room style**: the theme (cyber, countryside, …): room surfaces, light, view — and, new, which variant and finish
  each item uses by default.
- **Finish**: colour/material of a part (already exists: wood, fabric, leather, metal).

## Proposed structure
```
web/
  items/                         one folder per item
    bed/
      item.ts                    id, name, home, wall anchors, category, contract (anchors + parts)
      variants/
        platform.tsx             today's bed (walnut frame, tufted headboard)
        metal-frame.tsx          new looks: same contract, different geometry
        canopy.tsx
      index.ts                   registers the item and its variants
    desk/   chair/   nightstand/   lamp/   cabinet/   turntable/   crate/   window/   door/   closet/
    monitor/   pc/   keyboard/   headset/   speakers/   laptop/   phone/   controller/
    rug/   poster/   wall-shelf/   skateboard/   basketball/   sneakers/   backpack/   hoodie/   jeans/ …
    _shared/                     building blocks used by several items (today's Surface.tsx helpers,
                                 softBox, Blob, Cable, Neon, Metal, textures)
    registry.ts                  collects every item (one import list, generated or hand-kept)
  config/
    room-styles.json             the 8 room styles, incl. the default variant + finishes per item
    items.json                   optional overrides: names, homes, which items exist in the default room
  lib/  components/              engine stays: layout store, RoomItem, edit mode, shells, sharing, budget
```

### The contract (what makes variants exchangeable)
Each item declares what its variants must provide, so swapping never breaks behaviour:
```ts
// items/bed/item.ts
export default defineItem({
  id: "bed",
  name: "Bed",
  category: "furniture",
  home: { position: [-1.45, 0, -0.9] },
  walls: { x: -1, z: -1 },                 // follows the left and back walls when the room is resized
  footprint: [1.1, 2.1],                   // metres, for contact shadow, overlap checks, shells
  anchors: ["surface"],                    // things that rest on it (laptop, phone…) — variant must give its height
  parts: ["wood", "fabric:Duvet", "fabric:Sheets", "fabric:Throw", "fabric:Headboard"], // finish slots
  onTap: "nextDuvet",                      // behaviour stays with the item, not the variant
});
```
```tsx
// items/bed/variants/metal-frame.tsx
export default defineVariant({
  item: "bed",
  id: "metal-frame",
  name: "Metal frame",
  anchors: { surface: 0.5 },              // top of the mattress, for the gadgets
  Component: MetalFrameBed,               // React component modelled at the item's home
});
```
- Things that *do* something stay in the item, not the variant: the lamp's light, the turntable's platter and
  tonearm, the monitor's screen, the crate's records, the bed's surface for gadgets. A variant only provides the
  look plus named anchor points (e.g. `platter`, `screen`, `lightBulb`, `surface`).
- An **uploaded model** becomes just another variant (`kind: "model"`), so today's "Replace look with a model"
  is the same mechanism, and its anchors use today's auto-fit as a fallback.

### The config file (your mapping)
```jsonc
// config/room-styles.json
{
  "default": "cyber",
  "styles": {
    "cyber": {
      "name": "Cyber Neon",
      "room": { "walls": "#38305c", "floor": "dark_wooden_planks", "view": "city", "neon": "glow" },
      "items": {
        "bed":   { "variant": "platform",    "finishes": { "fabric:Duvet": "lilac" } },
        "chair": { "variant": "racing" },
        "lamp":  { "variant": "drum-shade" },
        "rug":   { "variant": "neon-grid" }
      }
    },
    "countryside": {
      "name": "Countryside",
      "items": {
        "bed":   { "variant": "spindle-pine", "finishes": { "wood": "pine", "fabric:Duvet": "sage" } },
        "chair": { "variant": "windsor" },
        "rug":   { "variant": "woven", "finishes": { "fabric": "rose" } }
      }
    }
  }
}
```
Resolution order for what an item looks like (first match wins):
1. the user's own choice in edit mode (saved with the room, as today)
2. the room style's entry for that item in `room-styles.json`
3. the item's own default variant (first in its folder)

Missing entries are fine: a style that doesn't mention the desk uses the desk's default. The config is
**validated at build time** (a small test: every referenced item, variant, finish and colour exists), so a typo
fails `npm test` instead of the room.

### Edit mode with variants
Selecting an item adds a **Look** row: thumbnails of its variants (plus "Upload model…"). Picking one is saved per
room, undoable and shared — the same as finishes today.

## JSON or TypeScript for the config?
| | JSON (`room-styles.json`) | TypeScript (`room-styles.ts`) |
|---|---|---|
| Edit without coding | ✅ any editor; later loadable from Supabase or a share file | ⚠️ needs the codebase |
| Mistakes caught | at `npm test` (schema check) | instantly by the type checker |
| Comments | no (JSONC would need a loader) | yes |

**Recommendation:** JSON for the mapping (styles → variants → finishes), TypeScript for the item definitions and
variant geometry. A JSON schema generated from the registry gives editor autocomplete for item and variant ids.

## Migration (one item per pass, nothing breaks in between)
1. **Framework**: `defineItem` / `defineVariant`, `items/registry.ts`, `config/room-styles.json` loaded and validated;
   `RoomItem`, `HOMES`, `ANCHOR`, `ON_WALL`, `NAMES` read from the registry. No visible change.
2. **Move the big items into folders** with their current look as variant #1: bed, desk, chair, nightstand + lamp,
   cabinet + turntable, crate, window, door, closet. Split `TeenStuff.tsx` (desk gadgets, clutter, posters, fixtures)
   into their own folders; cut `Furniture.tsx`, `Lighting.tsx` (lamp part) and `TeenStuff.tsx` to engine-only code.
3. **Move room styles** from `lib/styles.ts` to `config/room-styles.json` (surfaces, light, view) and add the
   `items` mapping; finish defaults move from `styles.finishes` into it.
4. **Look row in edit mode** + saved variant choice; uploaded models become a variant kind.
5. **New variants**, a few per style, where they matter most: bed, chair, lamp, rug, desk, nightstand, curtains vs
   blinds, posters (styled art). Then the `REALISM.md` items land as new variants instead of rewrites.

Rough size: 1–2 passes for step 1, ~1 pass per 2–3 items for step 2, 1 each for steps 3–4, then ~1 pass per new variant.

## Decisions (owner, 2026-11-01): all yes
1. **JSON** for the style → variant → finish mapping (`config/room-styles.json`); item definitions and geometry in TypeScript.
2. **Separate desk items**: desk, monitor, PC, keyboard + mouse, headset, speakers, drinks, bin become their own items;
   the desk is a surface they rest on (like the bed).
3. **Both**: variants in the codebase, and users can save their own (uploaded model + finishes) into a personal library.
4. **First new variants** (the recommended set): bed, chair, lamp, rug, desk, nightstand, window covering
   (blinds / curtains), posters — one look per room style where the style needs it.

## Checklist
### Step 1: framework (no visible change)
- [x] `defineItem` / `defineVariant`, `items/registry.ts`, `config/room-styles.json` loaded + validated by a Vitest check; `HOMES`, `ANCHOR`, `ON_WALL`, `NAMES` read from the registry. — `web/items/types.ts` (ItemDef: id, name, category, home or null for per-load clutter, walls it follows, onWall axis, anchors, parts, variants; VariantDef), one folder per item with its `item.ts` (28 items; sockets and posters are one folder with 3 instances each), `items/registry.ts`. `web/config/room-styles.json` (default style + an `items` mapping per style, empty until step 3) with `lib/config.ts` (`validateConfig`, `itemDefaults`). The old tables in `lib/room.ts` and the names in EditPanel now come from the registry. `vitest.config.mts` adds the `@/` alias. 3 new checks (config valid, typos caught with readable messages, every item well-formed); 31 tests. Chrome: room unchanged, hide/list flow works (list names from the registry); check 0 flagged, 60 fps.
### Step 2: items into folders (today's look = variant #1)
- [x] bed — `items/bed/`: `item.ts` (variants: platform), `variants/platform.tsx` (today's bed, moved from components/room/Bed.tsx; provides `surfaceY` and `footprint`), `index.tsx` (`BedItem`: current look + contact shadow from its footprint; `bedSurfaceY` asks the current look). `items/variants.ts` collects looks; `items/resolve.ts` picks one: your `look` option → config → first variant (unknown ids fall through). `items/_shared/ContactShadow.tsx` shared. `look` is a validated option. 1 new test; 32 tests. Chrome: single and double bed unchanged, gadgets on the duvet; check 0 flagged, 60 fps.
- [x] nightstand + lamp (lamp its own item) — `items/nightstand/` (variant `midcentury`, moved from components/room/Nightstand.tsx; surface 0.54 m, footprint), `items/lamp/` (new item, variant `drum` moved out of Lighting.tsx with its light; `Dust.tsx` moved out of TeenStuff). New framework rule `on` (ItemDef): an item standing on another follows its pose (move, turn, scale), hides with it, and rises onto a replacement look's top — until you move it yourself; `poseOf` and `RoomItem` handle it, so drags start from where it really is. Lamp cable now runs from the lamp. 1 new test (follows parent, then stays put once moved); 33 tests. Chrome: default unchanged; nightstand moved + turned carried the lamp; lamp moved alone onto the desk; check 0 flagged, 60 fps. Not checked by eye: the lamp on a replacement nightstand model.
- [ ] desk split: desk, monitor, PC, keyboard + mouse, headset, speakers, drinks, bin (each its own item; monitor/keyboard/headset/drinks rest on the desk)
- [ ] chair
- [ ] cabinet, turntable (own item resting on the cabinet), crate
- [ ] window (+ blinds as its own variant slot), door, closet, sockets, switch, ceiling fixtures
- [ ] clutter: hoodie, jeans, sneakers, backpack, basketball, skateboard; posters; wall shelf; rug; neon cove
- [ ] `TeenStuff.tsx`, `Furniture.tsx` and the lamp part of `Lighting.tsx` reduced to engine code or removed
### Step 3: styles to config
- [ ] `lib/styles.ts` → `config/room-styles.json` (surfaces, light, view, items mapping); finishes move into `items`
### Step 4: variants in edit mode + library
- [ ] "Look" row for the selected item (variant thumbnails), saved/undoable/shared; uploaded models become a variant kind
- [ ] Personal library: save the selected item's look (model + finishes) and reuse it on the same item type
### Step 5: new variants
- [ ] bed · [ ] chair · [ ] lamp · [ ] rug · [ ] desk · [ ] nightstand · [ ] window covering · [ ] posters
