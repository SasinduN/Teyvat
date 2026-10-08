import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useSearchParams, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@/lib/queryClient';
import { ScrollRestorer } from '@/lib/ScrollRestorer';
import { PublicLayout } from '@/pages/PublicLayout';
import { paths, LEGACY_HOME_SECTIONS } from '@shared/site-paths';

/**
 * The admin panel is code-split: a traveller visiting the marketing site never
 * downloads the CMS. Its `AuthProvider` lives inside it too, so the public page
 * makes no `/api/auth` calls.
 */
const AdminApp = lazy(() => import('@/admin/AdminApp'));

/**
 * Each page is its own chunk. Only the destinations page's (the interactive map) and
 * the tour page's (its route map) contain map code; Leaflet itself loads when
 * a map is about to render (`src/lib/leaflet.ts`). Navigations run in a
 * transition, so the current page stays on screen while the next one's code
 * arrives.
 */
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const ExplorePage = lazy(() => import('@/pages/ExplorePage').then(m => ({ default: m.ExplorePage })));
const DestinationsPage = lazy(() => import('@/pages/DestinationsPage').then((m) => ({ default: m.DestinationsPage })));
const DestinationPage = lazy(() => import('@/pages/DestinationPage').then((m) => ({ default: m.DestinationPage })));
const ExperiencesPage = lazy(() => import('@/pages/ExperiencesPage').then((m) => ({ default: m.ExperiencesPage })));
const ExperiencePage = lazy(() => import('@/pages/ExperiencePage').then((m) => ({ default: m.ExperiencePage })));
const ToursPage = lazy(() => import('@/pages/ToursPage').then((m) => ({ default: m.ToursPage })));
const TourPage = lazy(() => import('@/pages/TourPage').then((m) => ({ default: m.TourPage })));
const ArticlePage = lazy(() => import('@/pages/ArticlePage').then((m) => ({ default: m.ArticlePage })));
const AboutPage = lazy(() => import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const PlanPage = lazy(() => import('@/pages/PlanPage').then((m) => ({ default: m.PlanPage })));
const JournalPage = lazy(() => import('@/pages/JournalPage').then((m) => ({ default: m.JournalPage })));
const PhotoCreditsPage = lazy(() => import('@/pages/PhotoCreditsPage').then((m) => ({ default: m.PhotoCreditsPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

/**
 * The home page, unless the URL is an old link: `/?tour=<id>` and
 * `/?destination=<id>` (the WhatsApp messages sent before phase 8) go to the
 * page, replacing the history entry. Phase 8b adds the same redirect on the
 * server, as a 301.
 */
function HomeRoute() {
  const [params] = useSearchParams();
  const location = useLocation();
  const tour = params.get('tour');
  if (tour) return <Navigate to={paths.tour(tour)} replace />;
  const destination = params.get('destination');
  if (destination) return <Navigate to={paths.destination(destination)} replace />;
  const relocated = LEGACY_HOME_SECTIONS[location.hash];
  if (relocated) return <Navigate to={relocated} state={location.state} replace />;
  return <HomePage />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollRestorer />
        <Routes>
          {/* --------------------------------------------------- admin */}
          <Route
            path="/admin/*"
            element={
              <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
                <AdminApp />
              </Suspense>
            }
          />

          {/* -------------------------------------------------- public */}
          <Route element={<PublicLayout />}>
            <Route index element={<HomeRoute />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="destinations" element={<DestinationsPage />} />
            <Route path="destinations/:slug" element={<DestinationPage />} />
            <Route path="experiences" element={<ExperiencesPage />} />
            <Route path="experiences/:slug" element={<ExperiencePage />} />
            <Route path="tours" element={<ToursPage />} />
            <Route path="tours/:slug" element={<TourPage />} />
            <Route path="journal/:slug" element={<ArticlePage />} />
            <Route path="journal" element={<JournalPage />} />
            <Route path="plan" element={<PlanPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="photo-credits" element={<PhotoCreditsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
