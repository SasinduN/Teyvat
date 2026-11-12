import { BRAND, resolveBrand, type Brand } from '@shared/brand';

/**
 * The brand as the server put it in this page: Express writes the admin's
 * brand name into `<meta name="application-name">` on every page it sends
 * (`server/src/pages/head.ts`). For what renders before `/api/content`
 * arrives (the splash's logo) and for the admin, which doesn't load content.
 * Everything else uses `useBrand()`, which has the rest of the settings.
 */
export function documentBrand(): Brand {
  if (typeof document === 'undefined') return BRAND;
  const name = document.querySelector<HTMLMetaElement>('meta[name="application-name"]')?.content;
  return resolveBrand({ brand_name: name ?? null });
}
