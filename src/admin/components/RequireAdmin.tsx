import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Spinner } from '@/admin/components/ui';

/**
 * Route guard for `/admin/*`.
 *
 * This is a convenience layer only — it decides what to *render*. Every actual
 * read and write is authorised by Row Level Security in Postgres, so bypassing
 * this component in the browser grants nothing.
 */
export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, isAdmin, initializing, signOut, user } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#FBF9F6]">
        <Spinner label="Checking your session" />
      </div>
    );
  }

  if (!session) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  // Signed in, but not on the `public.admins` allow-list.
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBF9F6] px-6">
        <Card className="max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#B3261E]/10 text-[#B3261E]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="font-heading text-xl font-bold text-[#0F2E23]">
            This account has no admin access
          </h1>
          <p className="mt-2 text-xs font-light leading-relaxed text-[#1A1A1A]/65">
            You are signed in as <strong>{user?.email}</strong>, but that user is not on the
            admin allow-list. Ask an existing administrator to add a row for you in the{' '}
            <code className="rounded bg-[#F5EFEB] px-1 py-0.5">public.admins</code> table.
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="secondary" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
