import { createApiClient } from "@egofi/sdk";
import { getAdminToken, loginRedirect } from "./auth";

/**
 * Shared, authenticated ops API client. Any 401 (missing or expired admin
 * session) redirects to /login instead of crashing the page. The login page
 * deliberately uses its own `createApiClient()` so a bad-credentials 401 shows
 * an inline error rather than redirecting.
 */
export const api = createApiClient();
api.onUnauthorized = () => loginRedirect();

/**
 * Attach the stored admin token, or bounce to login if there isn't one.
 * Returns false when it redirected, so callers can stop.
 */
export function requireAdmin(): boolean {
  const token = getAdminToken();
  if (!token) {
    loginRedirect();
    return false;
  }
  api.setAuthToken(token);
  return true;
}
