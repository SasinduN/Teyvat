import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { SiteError, SiteLoading } from '@/components/SiteStatus';
import { PublicSiteContext, type PageSubject, type PublicSiteApi } from '@/context/PublicSiteContext';
import { useSiteContent } from '@/hooks/useSiteContent';
import { ErrorBoundary } from '@/lib/ErrorBoundary';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { focusPageHeading, goToSection } from '@/lib/routeFocus';
import { whatsappMessage, whatsappUrl } from '@shared/whatsapp';
import { Section } from './Section';

/**
 * The enquiry and search modals are their own chunks, out of every page's
 * first load (`npm run bundle:report`). Each is
 * mounted the first time it opens and stays mounted after, so its closing
 * animation still plays; both chunks are fetched once the browser is idle
 * after the first page, so opening one doesn't wait on the network.
 */
const loadInquiryModal = () => import('@/components/InquiryModal');
const loadSearchModal = () => import('@/components/SearchModal');
const InquiryModal = lazy(() => loadInquiryModal().then((m) => ({ default: m.InquiryModal })));
const SearchModal = lazy(() => loadSearchModal().then((m) => ({ default: m.SearchModal })));

/**
 * Every public page: the Navbar, the page, the Footer, and what floats over
 * them (the enquiry and search modals, the WhatsApp button).
 *
 * The approved design has no empty or skeleton states, so rather than invent
 * any we hold a brand-coloured splash until the content is in, then paint the
 * page exactly as designed. Content is cached across pages, so only the first
 * page of a visit waits.
 */
export function PublicLayout() {
  const { content, loading, error, reload } = useSiteContent();
  const location = useLocation();

  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquirySubject, setInquirySubject] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [pageSubject, setPageSubject] = useState<PageSubject | null>(null);
  /** Whether each modal has been opened yet: mounted from then on. */
  const [inquiryMounted, setInquiryMounted] = useState(false);
  const [searchMounted, setSearchMounted] = useState(false);

  const openInquiry = useCallback(
    (subject?: string) => {
      setInquirySubject(subject ?? pageSubject?.inquiry ?? 'General Sri Lanka Trip Inquiry');
      setInquiryMounted(true);
      setInquiryOpen(true);
    },
    [pageSubject]
  );

  const openSearch = useCallback(() => {
    setSearchMounted(true);
    setSearchOpen(true);
  }, []);

  // Fetch both modal chunks once the first page is up and the browser is idle.
  useEffect(() => {
    if (loading || error) return;
    const prefetch = () => {
      void loadInquiryModal().catch(() => undefined);
      void loadSearchModal().catch(() => undefined);
    };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(prefetch, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(prefetch, 1500);
    return () => clearTimeout(id);
  }, [loading, error]);

  const number = content.siteSettings.whatsappNumber;
  const whatsappHref = number
    ? whatsappUrl(number, whatsappMessage(pageSubject?.whatsapp ?? { kind: 'general' }, window.location.origin))
    : null;

  const api = useMemo<PublicSiteApi>(
    () => ({
      openInquiry,
      openSearch,
      whatsappHref,
      pageSubject,
      setPageSubject
    }),
    [openInquiry, openSearch, whatsappHref, pageSubject]
  );

  if (loading) return <SiteLoading />;
  if (error) return <SiteError message={error} onRetry={reload} />;

  return (
    <PublicSiteContext.Provider value={api}>
      <div className="min-h-screen bg-[#FBF9F6] text-[#1A1A1A] font-sans selection:bg-[#1C4737] selection:text-[#F5EFEB]">
        <Section name="Navbar">
          <Navbar
            onOpenSearch={openSearch}
            onOpenPlanner={() => openInquiry(pageSubject?.inquiry ?? 'Custom Travel Journey Request')}
          />
        </Section>

        <main>
          {/* A page that fails shows the error screen in its place; the next page tries again. */}
          <ErrorBoundary
            name="page"
            resetKey={location.pathname}
            fallback={
              <SiteError
                message="Something went wrong showing this page. Please try again."
                onRetry={() => window.location.reload()}
              />
            }
          >
            {/* Only while a page's code first loads; later navigations keep the current page up instead. */}
            <Suspense fallback={<div className="min-h-screen bg-[#FBF9F6]" />}>
              <Outlet />
              {/* Inside the boundary: its effects run once the page itself has rendered. */}
              <RouteEffects />
            </Suspense>
          </ErrorBoundary>
        </main>

        <Section name="Footer">
          <Footer />
        </Section>

        {inquiryMounted && (
          <Section name="InquiryModal">
            <Suspense fallback={null}>
              <InquiryModal
                isOpen={inquiryOpen}
                onClose={() => setInquiryOpen(false)}
                prefilledSubject={inquirySubject}
              />
            </Suspense>
          </Section>
        )}

        {searchMounted && (
          <Section name="SearchModal">
            <Suspense fallback={null}>
              <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
            </Suspense>
          </Section>
        )}

        {/* WhatsApp chat: only once a number is set in Admin → Settings. */}
        {whatsappHref && (
          <Section name="WhatsAppButton">
            <WhatsAppButton href={whatsappHref} hidden={inquiryOpen || searchOpen} />
          </Section>
        )}
      </div>
    </PublicSiteContext.Provider>
  );
}

/**
 * What happens on each navigation, once the content is in:
 *
 * - a hash (`/#explore-map`, `/about#contact`) scrolls to that section, on a
 *   fresh load too (the router's own hash scroll runs before the content
 *   gate opens, so it finds nothing);
 * - otherwise focus moves to the new page's `<h1>`, so a screen reader
 *   announces it. Not on the first load, where focus belongs to the browser;
 * - the content is revalidated in the background, so an admin's edit shows
 *   on the next page as well as on the next load (an unchanged payload is a
 *   304);
 * - `<body data-route>` names the page now on screen. Navigations run in a
 *   transition, so the URL changes a moment before the page does; this
 *   changes with the page (the tests wait on it).
 *
 * Back and Forward (POP) keep the position the router restores.
 */
function RouteEffects() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const first = useRef(true);

  useEffect(() => {
    const hash = decodeURIComponent(location.hash.slice(1));
    const isFirst = first.current;
    first.current = false;
    document.body.dataset.route = location.pathname + location.search;

    if (!isFirst) void queryClient.invalidateQueries({ queryKey: queryKeys.siteContent });

    const frame = requestAnimationFrame(() => {
      if (hash && (isFirst || navigationType !== 'POP') && goToSection(hash, 'auto')) return;
      if (!isFirst) focusPageHeading();
    });
    return () => cancelAnimationFrame(frame);
    // Once per navigation: the key changes even when the URL doesn't.
  }, [location.key]);

  return null;
}
