/**
 * The admin panel's side of `/api/auth/*`.
 *
 * The session itself is an HttpOnly cookie the browser holds and sends. Nothing
 * here can read it, and nothing here needs to.
 */
import {
  API_ROUTES,
  type AuthUser,
  type AuthUserPayload,
  type LoginRequest
} from '@shared/api';
import { ApiRequestError, getJson, postJson } from '@/lib/api/http';

/** The signed-in user, or null when there is no valid session. */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const { user } = await getJson<AuthUserPayload>(API_ROUTES.auth.me);
    return user;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) return null;
    throw error;
  }
}

export async function login(credentials: LoginRequest): Promise<AuthUser> {
  const { user } = await postJson<AuthUserPayload>(API_ROUTES.auth.login, credentials);
  return user;
}

export async function logout(): Promise<void> {
  await postJson<null>(API_ROUTES.auth.logout);
}

export async function logoutEverywhere(): Promise<void> {
  await postJson<null>(API_ROUTES.auth.logoutAll);
}
