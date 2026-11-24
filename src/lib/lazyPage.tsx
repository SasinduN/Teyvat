import { lazy, useState, type ComponentType } from 'react';

export type LazyPage = ComponentType & {
  /** Starts loading the page's chunk; resolves once it can render without suspending. */
  preload: () => Promise<unknown>;
};

/**
 * A page in its own chunk, like `React.lazy`, that can also be loaded *before* it renders.
 *
 * `React.lazy` always suspends on its first render, even when the chunk is already in, and
 * the Suspense fallback would replace the server's first screen with a blank `<main>` for a
 * moment. Once `preload()` has resolved, this renders the page straight away instead
 * (`src/main.tsx` waits for it when the server sent a first screen). Until then it's
 * `React.lazy`. Each mount keeps whichever it started with, so a page never remounts.
 */
export function lazyPage(load: () => Promise<ComponentType>): LazyPage {
  let loaded: ComponentType | null = null;
  let pending: Promise<ComponentType> | null = null;
  const preload = () =>
    (pending ??= load().then(
      (page) => (loaded = page),
      (error: unknown) => {
        pending = null;
        throw error;
      }
    ));
  const Lazy = lazy(() => preload().then((page) => ({ default: page })));

  function Page() {
    const [Ready] = useState(() => loaded);
    return Ready ? <Ready /> : <Lazy />;
  }
  return Object.assign(Page, { preload });
}
