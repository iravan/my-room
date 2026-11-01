import type { NextConfig } from "next";

// GitHub Pages build (the deploy workflow sets PAGES_BASE_PATH=/my-room): plain static files served from /<repo>/,
// so no server features. Everywhere else (dev, `next start`, `npm run check`) it's the normal server build.
const pagesBase = process.env.PAGES_BASE_PATH;
const pages = pagesBase !== undefined;

const nextConfig: NextConfig = {
  ...(pages
    ? { output: "export", basePath: pagesBase, env: { NEXT_PUBLIC_BASE_PATH: pagesBase } } // base path also for textures loaded at runtime
    : { cacheComponents: true, partialPrefetching: true }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
