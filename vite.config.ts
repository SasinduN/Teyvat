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
  build: {
    // Keep Leaflet and the Supabase SDK out of the entry chunk so the first
    // paint of the marketing site stays small.
    rollupOptions: {
      output: {
        manualChunks: {
          leaflet: ["leaflet", "react-leaflet"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
});
