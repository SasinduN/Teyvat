import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { countInquiries } from '@/lib/api/inquiries';
import { queryKeys } from '@/lib/queryClient';

/**
 * How many enquiries wait in the inbox, for the sidebar badge, the tab title
 * and the dashboard. Rechecked every minute and when the window regains
 * focus, so a new enquiry shows up without anyone opening the inbox.
 */
export function useInquiryCounts() {
  return useQuery({
    queryKey: queryKeys.admin.inquiryCounts,
    queryFn: countInquiries,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000
  });
}

/** "(2) Enquiries · Travel Eye Admin" while anything is new; the page's own title otherwise. */
export function useUnreadTitle(unread: number): void {
  useEffect(() => {
    const previous = document.title;
    if (unread > 0) {
      document.title = `(${unread}) Enquiries · Travel Eye Admin`;
    }
    return () => {
      document.title = previous;
    };
  }, [unread]);
}
