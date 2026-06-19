import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf-8"),
) as { version: string };

// Allow overriding the reported version at build time (e.g. in CI with the git
// tag) via SAPPR_VERSION; otherwise fall back to package.json.
const appVersion = process.env.SAPPR_VERSION || pkg.version;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    // Network shares, NAS mounts and some virtual/synced filesystems don't
    // deliver native fs.watch events, which makes Vite's watcher crash with
    // "UNKNOWN: unknown error, watch". Polling is the portable workaround;
    // raise `interval` if file-watching load is a concern.
    watch: { usePolling: true, interval: 300 },
  },
  build: {
    target: "es2022",
    // Heavy tool libraries are dynamically imported per-tool, so Vite already
    // code-splits them. Keep the warning limit sane for the few WASM-backed chunks.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Readable output names. Every tool's source file is `Tool.tsx`, so the
        // lazy chunks would all be `Tool-<hash>.js`; name them after the tool's
        // folder instead. The [hash] suffix stays — it's content-based cache
        // busting, so an updated file gets a new URL and never serves stale.
        chunkFileNames: (chunk) => {
          const id = chunk.facadeModuleId;
          const tool = id && id.match(/[/\\]tools[/\\]([^/\\]+)[/\\]Tool\.tsx$/);
          return tool
            ? `assets/tool-${tool[1]}-[hash].js`
            : "assets/[name]-[hash].js";
        },
        entryFileNames: "assets/sappr-[hash].js",
        assetFileNames: (asset) =>
          asset.name && asset.name.endsWith(".css")
            ? "assets/sappr-[hash][extname]"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
  worker: {
    format: "es",
  },
});
