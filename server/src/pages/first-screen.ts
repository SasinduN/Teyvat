/**
 * The server-rendered first screen (`docs/plans/server-rendered-headers.md`, PR 1): the
 * markup Express puts inside `#root`, so the page's header paints before any JavaScript.
 *
 * The renderer is the app's own components, built by `scripts/build-server.mjs` into
 * `dist/.ssr/first-screen.js` next to the client build (`src/ssr/first-screen.tsx`). It is
 * loaded once, on the first page that needs it. Without a build, or if it fails to load or
 * to render, the page goes out with an empty `#root` as before and the browser renders it:
 * never a broken page.
 */
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

import type { SiteContentPayload } from '../../../shared/api';
import { describeForLog } from '../http';

type Renderer = (path: string, payload: SiteContentPayload) => string | null;
interface RendererModule {
  renderFirstScreen: Renderer;
  FIRST_SCREEN_PATHS: readonly string[];
}

/** The shell's empty root, as `index.html` has it; the first screen goes inside. */
const EMPTY_ROOT = '<div id="root"></div>';

/** Puts `markup` inside the shell's `#root`, marked `data-ssr` for `src/main.tsx`. */
export function injectFirstScreen(html: string, markup: string): string {
  const at = html.indexOf(EMPTY_ROOT);
  if (at === -1) return html;
  return `${html.slice(0, at)}<div id="root" data-ssr>${markup}</div>${html.slice(at + EMPTY_ROOT.length)}`;
}

export interface FirstScreen {
  /** Whether `path` has a server-rendered first screen (and the renderer loaded). */
  covers: (path: string) => Promise<boolean>;
  /** The markup, or null: render failed (logged), or the path has none. */
  render: (path: string, payload: SiteContentPayload) => Promise<string | null>;
}

/** The first screen from the module at `file`, or one that renders nothing when there's no file. */
export function firstScreen(file: string): FirstScreen {
  let loading: Promise<RendererModule | null> | null = null;
  const load = () =>
    (loading ??= existsSync(file)
      ? (import(pathToFileURL(file).href) as Promise<RendererModule>).catch((error: unknown) => {
          console.error(`[pages] couldn't load the first-screen renderer: ${describeForLog(error)}`);
          return null;
        })
      : Promise.resolve(null));

  return {
    covers: async (path) => (await load())?.FIRST_SCREEN_PATHS.includes(path) ?? false,
    render: async (path, payload) => {
      const module = await load();
      if (!module) return null;
      try {
        return module.renderFirstScreen(path, payload);
      } catch (error) {
        console.error(`[pages] couldn't render the first screen of ${path}: ${describeForLog(error)}`);
        return null;
      }
    }
  };
}
