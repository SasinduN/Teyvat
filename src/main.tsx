import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App, { firstScreenPage } from "./App";
import { fetchSiteContent } from "@/lib/api/content";
import { queryClient, queryKeys } from "@/lib/queryClient";

/** How long the server's first screen may wait for the app before the app renders anyway. */
const FIRST_SCREEN_WAIT_MS = 10_000;

/**
 * When the server rendered the first screen (`#root[data-ssr]`, `src/ssr/first-screen.tsx`),
 * it stays on screen until the app can draw the same thing: the content (the request the
 * page's `<link rel="preload">` already started) and the page's chunk. React's first render
 * then replaces it with identical markup: no splash, no blank, nothing moving
 * (`browser-ssr-handover`). Never hydration, so the two can't mismatch.
 *
 * A failure or a slow network renders anyway, as before: the app shows its own error or splash.
 */
async function firstScreenReady(root: HTMLElement): Promise<void> {
  if (!root.hasAttribute("data-ssr")) return;
  const page = firstScreenPage(window.location.pathname);
  const ready = Promise.all([
    queryClient.ensureQueryData({ queryKey: queryKeys.siteContent, queryFn: fetchSiteContent }),
    page?.()
  ]);
  const timeout = new Promise((resolve) => setTimeout(resolve, FIRST_SCREEN_WAIT_MS));
  await Promise.race([ready, timeout]).catch(() => undefined);
}

const root = document.getElementById("root")!;
void firstScreenReady(root).then(() =>
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
);
