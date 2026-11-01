# My Room (web)

Next.js 16 + React Three Fiber + Zustand + Tailwind + shadcn/ui. Rebuilt from the Unity version (git tag `unity-final`; see `../MIGRATION.md`).

```sh
npm install
npm run dev     # http://localhost:3000
npm run build
npm test        # Vitest: collection, sharing, hostile files, visitor mode
npm run check   # needs a running server (default http://127.0.0.1:3100/): view screenshots, drag artifact scan, FPS
```

Node ≥ 20.9. On this Mac `npm` is aliased to pnpm (needs Node 22.13+), so call `/usr/local/bin/npm` directly.
three is pinned to 0.186 until `postprocessing` supports 0.187.
