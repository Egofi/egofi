import { createApiClient } from "@egofi/sdk";
import { loginRedirect } from "./auth";

/**
 * Shared, authenticated API client for the dashboard. Any 401 (missing or
 * expired session) redirects to /login with a `next` back to the current page.
 * Login/register pages deliberately use their own `createApiClient()` so a bad
 * credentials 401 shows an error instead of redirecting.
 */
export const api = createApiClient();
api.onUnauthorized = () => loginRedirect();
