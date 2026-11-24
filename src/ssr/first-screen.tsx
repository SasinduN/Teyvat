/**
 * The first screen, rendered on the server (`docs/plans/server-rendered-headers.md`, PR 1).
 *
 * Express calls `renderFirstScreen` with the same payload `/api/content` sends and puts the
 * markup inside `#root` (`server/src/pages/first-screen.ts`). It is the app's own components
 * (`SiteFrame`, the `Navbar`, the page's header), fed the same mapped content through a
 * prefilled query cache, so it is the markup React draws first: `src/main.tsx` lets React
 * replace it once the app is ready, and nothing changes on screen.
 *
 * Home only for now; every other path returns null and renders in the browser, as before.
 * Built by `scripts/build-server.mjs` into `dist/.ssr/` (Vite, the app's aliases), never served.
 */
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { HeroSection } from '@/components/HeroSection';
import { toSiteContent } from '@/lib/api/content';
import { queryKeys } from '@/lib/queryClient';
import { Section } from '@/pages/Section';
import { SiteFrame } from '@/pages/SiteFrame';
import type { SiteContentPayload } from '@shared/api';
import { paths } from '@shared/site-paths';

/** The paths with a server-rendered first screen. */
export const FIRST_SCREEN_PATHS: readonly string[] = [paths.home];

const ignore = () => undefined;

/** The markup for `#root` at `path`, or null where the page renders in the browser. */
export function renderFirstScreen(path: string, payload: SiteContentPayload): string | null {
  if (!FIRST_SCREEN_PATHS.includes(path)) return null;
  // One cache per request, already holding the content: the hooks read it as in the browser.
  const queries = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  queries.setQueryData(queryKeys.siteContent, toSiteContent(payload));
  return renderToString(
    <QueryClientProvider client={queries}>
      <StaticRouter location={path}>
        <SiteFrame onOpenSearch={ignore}>
          <Section name="HeroSection">
            <HeroSection />
          </Section>
        </SiteFrame>
      </StaticRouter>
    </QueryClientProvider>
  );
}
