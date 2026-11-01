# My Room

A cozy neon bedroom in the browser for showing off your vinyl collection.

Walk around the room, flip through crates, inspect sleeves, drop a record on the turntable, and share the space with friends. The room itself is customizable too — lighting moods, wall styles, size, and uploaded 3D models.

## Features

- **3D bedroom** — bed, desk setup, turntable, crate, cabinet, clutter, city outside the window
- **Vinyl collection** — crate flip, spine browse, sleeve inspector (flip / vinyl / gatefold), album editor with custom covers and disc styles
- **Turntable** — place a record, lower the tonearm, 33⅓ / 45 platter spin
- **Showcase** — photo mode, HUD-free showcase mode, export / import / visit a friend’s room (read-only)
- **Room customisation** — lighting presets, materials, room size, replace item looks with uploaded GLB models (cores like platter and screens stay working)
- **Local-first** — collection and images persist in the browser; Supabase schema ready for signed-in sync and public rooms

## Stack

| Area | Tech |
| --- | --- |
| App | Next.js 16, React 19, TypeScript |
| 3D | React Three Fiber, drei, three.js, postprocessing |
| State | Zustand (persisted) |
| UI | Tailwind CSS 4, shadcn/ui |
| Audio | Web Audio API |
| Backend | Supabase (rooms, albums, storage, RLS) |

## Quick start

```sh
cd web
npm install
npm run dev     # http://localhost:3000
```

Requires **Node ≥ 20.9**. Useful scripts:

```sh
npm run build
npm test        # Vitest: collection, sharing, visitor mode, models
npm run check   # headless Chrome: screenshots, drag artifact scan, FPS
```

More notes (including the `npm` / pnpm alias on some Macs) live in [`web/README.md`](web/README.md).

## Repo layout

```
web/          Next.js app (the game)
supabase/     Schema, storage bucket, RLS + policy tests
```

## Docs

| File | What it is |
| --- | --- |
| [`game_design_document_visual_vinyl_showcase.md`](game_design_document_visual_vinyl_showcase.md) | Original design doc |
| [`MIGRATION.md`](MIGRATION.md) | Unity → web rebuild checklist |
| [`REALISM.md`](REALISM.md) | Per-item realism pass |
| [`CUSTOMIZATION.md`](CUSTOMIZATION.md) | Room options and model upload plan |

The original Unity build is kept at git tag `unity-final` (`git checkout unity-final`).

## License

Private repository. Texture packs under `web/public/textures/` include their own CC0 / license notes.
