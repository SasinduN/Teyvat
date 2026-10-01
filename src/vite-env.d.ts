/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** CARTO basemap key. Public (it ships in the page); restrict it by domain in CARTO. */
  readonly VITE_CARTO_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
