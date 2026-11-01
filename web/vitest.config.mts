import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Same "@/…" path alias as tsconfig.json, so tests can import app modules that use it.
export default defineConfig({ resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } } });
