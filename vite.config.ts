import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
  // No manualChunks. Leaflet is loaded with a dynamic import() only when the
  // map nears the viewport (InteractiveMapSection), so Rollup already gives it
  // its own on-demand chunk. Forcing a named "leaflet" chunk made the entry
  // import a shared CommonJS helper from it, which turned the whole chunk into
  // a startup preload.
});
