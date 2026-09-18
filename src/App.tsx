import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/context/AuthContext';
import { queryClient } from '@/lib/queryClient';
import { useSiteContent } from '@/hooks/useSiteContent';
import { SiteError, SiteLoading } from '@/components/SiteStatus';
import { PublicSite } from '@/pages/PublicSite';

/**
 * The admin panel is code-split: a traveller visiting the marketing site never
 * downloads the CMS.
 */
const AdminApp = lazy(() => import('@/admin/AdminApp'));

/**
 * Gate the marketing site on its content being loaded.
 *
 * The approved design has no empty or skeleton states, so rather than invent
 * any we hold a brand-coloured splash until the data is in, then paint the
 * page exactly as designed.
 */
function PublicSiteRoute() {
  const { loading, error, reload } = useSiteContent();

  if (loading) return <SiteLoading />;
  if (error) return <SiteError message={error} onRetry={reload} />;

  return <PublicSite />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* -------------------------------------------------- public */}
            <Route path="/" element={<PublicSiteRoute />} />

            {/* --------------------------------------------------- admin */}
            <Route
              path="/admin/*"
              element={
                <Suspense fallback={<div className="min-h-screen bg-[#FBF9F6]" />}>
                  <AdminApp />
                </Suspense>
              }
            />

            {/* Unknown paths fall back to the marketing site. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
