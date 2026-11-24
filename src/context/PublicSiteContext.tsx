import { createContext, useContext, useEffect } from 'react';
import type { WhatsAppContext } from '@shared/whatsapp';
import { contentTitle, fixedTitle, homeTitle, type ContentKind, type PageName } from '@shared/page-meta';
import { useBrand } from '@/hooks/useSiteContent';

/**
 * What the current page is about, which pre-fills the enquiry form and the
 * WhatsApp message. Pages set it with `usePageSubject`; the layout reads it.
 */
export interface PageSubject {
  /** The enquiry subject (the existing formats: a tour's title, a destination's name, "Experience: …"). */
  inquiry?: string;
  whatsapp?: WhatsAppContext;
}

export interface PublicSiteApi {
  /**
   * Opens the enquiry modal. Without a subject: the page's, or the general one. With a
   * message: the form starts with it (the wishlist), instead of naming the subject.
   */
  openInquiry: (subject?: string, message?: string) => void;
  openSearch: () => void;
  /** The WhatsApp link for this page, or null while no number is set. */
  whatsappHref: string | null;
  pageSubject: PageSubject | null;
  setPageSubject: (subject: PageSubject | null) => void;
}

export const PublicSiteContext = createContext<PublicSiteApi | null>(null);

export function usePublicSite(): PublicSiteApi {
  const api = useContext(PublicSiteContext);
  if (!api) throw new Error('usePublicSite must be used inside PublicLayout.');
  return api;
}

/** Declares what this page is about, for as long as it is mounted. */
export function usePageSubject(subject: PageSubject | null): void {
  const { setPageSubject } = usePublicSite();
  const key = JSON.stringify(subject);
  useEffect(() => {
    setPageSubject(subject);
    return () => setPageSubject(null);
    // `key` stands for `subject`'s contents, so a new object each render doesn't loop.
  }, [key, setPageSubject]);
}

/**
 * Sets `document.title` while a fixed page is shown (`fixedTitle`), or the home page's title for
 * `null`: the same as the server's `<title>`. The brand comes from the content, so a name saved in
 * Admin → Settings shows here as it does there.
 */
export function usePageTitle(page: PageName | null): void {
  const brand = useBrand();
  useDocumentTitle(page === null ? homeTitle(brand) : fixedTitle(page, brand));
}

/** Sets `document.title` for a content page from its own name (`contentTitle`), as the server does. */
export function useContentTitle(kind: ContentKind, name: string): void {
  const brand = useBrand();
  useDocumentTitle(contentTitle(kind, name, brand));
}

function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
