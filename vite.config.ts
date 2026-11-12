import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { escapeHtml } from "./shared/html";
import { BRAND } from "./shared/brand";
import { homeDescription, homeTitle } from "./shared/page-meta";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * index.html's default title and description, from shared/page-meta.ts, and
 * its favicon, from shared/brand.ts. Express replaces the title and
 * description per page (with the admin's brand settings); these are what the
 * dev server and a page without its own tags show.
 */
const pageMetaDefaults = (): Plugin => ({
  name: "page-meta-defaults",
  transformIndexHtml: (html) =>
    html
      .replace("%HOME_TITLE%", escapeHtml(homeTitle(BRAND)))
      .replace("%HOME_DESCRIPTION%", escapeHtml(homeDescription(BRAND)))
      .replace("%BRAND_FAVICON%", escapeHtml(BRAND.favicon)),
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), pageMetaDefaults()],
  // The API runs as a separate process in dev. In production the same Express
  // service serves both /api/* and the built client, so there is one origin
  // and no CORS anywhere.
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8081",
        changeOrigin: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  // The manifest (dist/.vite/manifest.json) lets `npm run bundle:report` say
  // what each page loads. express.static ignores dot-directories, so it is
  // never served.
  build: {
    manifest: true,
  },
  // No manualChunks. Leaflet is loaded with a dynamic import() only when the
  // map nears the viewport (InteractiveMapSection), so Rollup already gives it
  // its own on-demand chunk. Forcing a named "leaflet" chunk made the entry
  // import a shared CommonJS helper from it, which turned the whole chunk into
  // a startup preload.
});
