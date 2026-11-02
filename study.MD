# Study notes: should the game be hosted on IPFS?

Question (2026-11-01): if the whole game runs on IPFS, do I avoid buying a domain and hosting the app?

## Short answer
Partly, but for this game it isn't much of a benefit. Free static hosting (Vercel, Cloudflare Pages) gives the same
"no domain, no server, no cost" with fewer problems.

## Can this app run on IPFS?
Yes. `web/` is a single page with no server routes (`app/` has only `page.tsx`), so it can be a static build:
- add `output: "export"` to `web/next.config.ts`
- remove `cacheComponents: true` (it doesn't work with static export)
- Supabase is called from the browser, so it keeps working.

## What you still need with IPFS
- **Pinning = hosting.** Files stay online only while someone pins them, usually a pinning service such as
  Pinata, Filebase or Storacha. They have free tiers, but with limits.
- **A gateway** so normal browsers can open it, e.g. `https://<cid>.ipfs.dweb.link`. Public gateways are often slow
  on first load, rate-limited, and can block or drop content.
- **A stable address.** Every deploy gets a new content ID (CID). For a fixed name you need IPNS, which is slow,
  and its record must be republished or it expires (pinning services can do this).
- **Saved rooms are tied to the address.** localStorage and IndexedDB belong to each origin, so a new address means
  an empty save: the room layout, uploaded models and the record collection would all be lost.
- **Supabase** for accounts and sharing, as now.

## Simpler free option
**Vercel** or **Cloudflare Pages**:
- free, no domain to buy: you get a stable subdomain like `myroom.vercel.app`, so saves survive every deploy
- fast worldwide (CDN), deploys on every git push
- Vercel runs Next.js as-is, with no config changes
- add a custom domain later only if you want a nicer name

## When IPFS is worth it
Only if decentralisation, permanence or censorship resistance matter to you. For "free, no domain, no server",
Vercel or Cloudflare Pages is the better choice.

## If you try IPFS anyway
1. In `web/next.config.ts`: `output: "export"`, drop `cacheComponents`.
2. `npm run build` → the static site is in `web/out/`.
3. Upload `web/out/` to a pinning service (Pinata, Filebase or Storacha) and note the CID.
4. Set up an IPNS name (or the service's equivalent) so the address stays the same across deploys.
5. Open it through a subdomain gateway (`https://<cid>.ipfs.dweb.link`), not a path gateway, so each site gets its
   own origin and its own saves.
