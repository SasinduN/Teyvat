import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';

import { RequireAdmin } from '@/admin/components/RequireAdmin';
import { AdminLayout } from '@/admin/components/AdminLayout';
import { LoginPage } from '@/admin/pages/LoginPage';
import { DashboardPage } from '@/admin/pages/DashboardPage';
import { InquiriesPage } from '@/admin/pages/InquiriesPage';
import { CollectionPage } from '@/admin/pages/CollectionPage';
import { RecordEditorPage } from '@/admin/pages/RecordEditorPage';

/**
 * Everything under `/admin`. Loaded lazily from `src/App.tsx`, so this whole
 * subtree — including Zod, React Hook Form and Sonner — ships as its own chunk.
 *
 * Paths here are relative to `/admin/*`. The toaster lives here rather than in
 * the root app so `sonner` stays out of the public bundle: the marketing site
 * has no toasts.
 */
const AdminApp: React.FC = () => (
  <>
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
        {/* Static `inquiries` above outranks this dynamic segment. */}
        <Route path=":collection" element={<CollectionPage />} />
        <Route path=":collection/new" element={<RecordEditorPage />} />
        <Route path=":collection/:id" element={<RecordEditorPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  </>
);

export default AdminApp;
