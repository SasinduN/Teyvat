import { QueryClient } from '@tanstack/react-query';
import type { ContentTableName, InquiryStatus } from '@/lib/database.types';

/**
 * One QueryClient for the whole app.
 *
 * Content changes rarely and is read on every page load, so the public site
 * gets a generous `staleTime`. Admin mutations invalidate the keys they touch,
 * which is what keeps a list view honest right after a save.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 0
    }
  }
});

export interface InquiryFilters {
  status: InquiryStatus | 'all';
  search: string;
}

/**
 * Centralised query keys. Every key starts with a namespace so an admin
 * mutation can invalidate a whole area with one prefix.
 */
export const queryKeys = {
  siteContent: ['site-content'] as const,

  admin: {
    all: ['admin'] as const,
    collection: (table: ContentTableName) => ['admin', 'collection', table] as const,
    record: (table: ContentTableName, id: string) =>
      ['admin', 'record', table, id] as const,
    counts: ['admin', 'counts'] as const,
    inquiries: (filters: InquiryFilters) => ['admin', 'inquiries', filters] as const,
    inquiryCounts: ['admin', 'inquiry-counts'] as const
  }
} as const;
