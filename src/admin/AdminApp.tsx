import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AuthProvider } from '@/context/AuthContext';
import { ErrorBoundary } from '@/lib/ErrorBoundary';
import { RequireAdmin } from '@/admin/components/RequireAdmin';
import { AdminLayout } from '@/admin/components/AdminLayout';
import { LoginPage } from '@/admin/pages/LoginPage';
import { DashboardPage } from '@/admin/pages/DashboardPage';
import { InquiriesPage } from '@/admin/pages/InquiriesPage';
import { BookingsPage } from '@/admin/pages/BookingsPage';
import { CollectionPage } from '@/admin/pages/CollectionPage';
import { RecordEditorPage } from '@/admin/pages/RecordEditorPage';
import { MediaPage } from '@/admin/pages/MediaPage';
import { ImageCreditsPage } from '@/admin/pages/ImageCreditsPage';
import { SettingsPage } from '@/admin/pages/SettingsPage';

/**
 * Everything under `/admin`. Loaded lazily from `src/App.tsx`, so this whole
 * subtree — including Zod, React Hook Form and Sonner — ships as its own chunk.
 *
 * Paths here are relative to `/admin/*`. The toaster and the `AuthProvider`
 * live here rather than in the root app: the marketing site has no toasts and
 * no sign-in, so neither belongs in its bundle or its network traffic.
 */
/** Last resort if something outside a page (the layout, sign-in) throws. */
const AdminCrash = (
  <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-center">
    <div>
      <h1 className="font-heading text-xl font-bold text-[var(--brand-primary)]">The admin panel hit an error</h1>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 rounded-xl bg-[var(--inverse-surface)] px-4 py-2.5 text-sm font-bold text-white"
      >
        Reload
      </button>
    </div>
  </div>
);

const AdminApp: React.FC = () => (
  <ErrorBoundary name="admin" fallback={AdminCrash}>
    <AuthProvider>
      <Toaster
        position="bottom-right"
        closeButton
        toastOptions={{
          style: {
            fontFamily: 'var(--font-sans)',
            fontSize: '12px',
            borderRadius: '0.75rem'
          }
        }}
      />

      <Routes>
        <Route path="login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="inquiries" element={<InquiriesPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="credits" element={<ImageCreditsPage />} />
          {/* Static `inquiries`, `bookings`, `settings` and `media` above outrank this dynamic segment. */}
          <Route path=":collection" element={<CollectionPage />} />
          <Route path=":collection/new" element={<RecordEditorPage />} />
          <Route path=":collection/:id" element={<RecordEditorPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AuthProvider>
  </ErrorBoundary>
);

export default AdminApp;
