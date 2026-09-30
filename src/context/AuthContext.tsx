import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { AuthUser } from '@shared/api';
import { fetchCurrentUser, login, logout, logoutEverywhere } from '@/lib/api/auth';
import { queryKeys } from '@/lib/queryClient';

/**
 * Who is signed in to the admin panel, from `GET /api/auth/me`.
 *
 * Every user is an admin, so a user here is all the UI needs. What it shows is
 * a convenience: the server checks the session cookie on every admin request
 * regardless of what this says.
 *
 * Provided by `AdminApp`, not the root app, so the public site never calls
 * `/api/auth` at all.
 */

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the first `/api/auth/me` has answered. */
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Ends every session this user has, on every device. */
  signOutEverywhere: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const me = useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: fetchCurrentUser,
    // A 401 is an answer (null), not an error, so only network trouble
    // reaches retry. Recheck on focus so a session that expired while the tab
    // sat in the background sends you to the login page when you come back.
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true
  });

  /** Forgets the user and everything the admin panel had loaded as them. */
  const clearLocal = useCallback(() => {
    queryClient.removeQueries({ queryKey: queryKeys.admin.all });
    queryClient.setQueryData(queryKeys.currentUser, null);
  }, [queryClient]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const user = await login({ email, password });
      queryClient.setQueryData(queryKeys.currentUser, user);
    },
    [queryClient]
  );

  const signOut = useCallback(async () => {
    await logout();
    clearLocal();
  }, [clearLocal]);

  const signOutEverywhere = useCallback(async () => {
    await logoutEverywhere();
    clearLocal();
  }, [clearLocal]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: me.data ?? null,
      initializing: me.isPending,
      signIn,
      signOut,
      signOutEverywhere
    }),
    [me.data, me.isPending, signIn, signOut, signOutEverywhere]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return ctx;
}
