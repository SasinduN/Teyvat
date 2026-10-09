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
  <div className="flex min-h-screen items-center justify-center bg-[#FBF9F6] px-6 text-center">
    <div>
      <h1 className="font-heading text-xl font-bold text-[#0F2E23]">The admin panel hit an error</h1>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 rounded-xl bg-[#0F2E23] px-4 py-2.5 text-xs font-bold text-white"
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
          <Route path="settings" element={<SettingsPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="credits" element={<ImageCreditsPage />} />
          {/* Static `inquiries`, `settings` and `media` above outrank this dynamic segment. */}
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
