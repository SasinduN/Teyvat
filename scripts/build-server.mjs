import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// Railway/Express does not otherwise compress these responses. Generate once,
// rather than spending CPU on compression for every request.
const assets = new URL('../dist/assets/', import.meta.url);
for (const file of readdirSync(assets)) {
  if (/\.(js|css)$/.test(file)) {
    writeFileSync(new URL(`${file}.gz`, assets), gzipSync(readFileSync(new URL(file, assets)), { level: 9 }));
  }
}

// Use the existing Vite/Rollup pipeline for both bundles, without loading
// the browser plugins or asking a second resolver to traverse parent folders.
await build({
  configFile: false,
  resolve: { alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)) } },
  build: {
    ssr: 'server/src/index.ts',
    outDir: 'server/dist',
    target: 'node22',
    minify: false,
    rollupOptions: { output: { format: 'es', entryFileNames: 'index.js' } }
  }
});
