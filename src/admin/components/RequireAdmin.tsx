import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/admin/components/ui';

/**
 * Route guard for `/admin/*`.
 *
 * This only decides what to *render*. The protection is on the server:
 * `requireAdmin` in `server/src/auth/middleware.ts` checks the session cookie on
 * every admin request, so bypassing this component in the browser grants
 * nothing. Every user is an admin, so being signed in is the whole check.
 */
export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Spinner label="Checking your session" />
      </div>
    );
  }

  if (!user) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};
