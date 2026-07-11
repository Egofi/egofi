const TOKEN_KEY = "egofi_admin_token";

let redirecting = false;

/**
 * Send the operator to /login, remembering where they were. Clears the stale
 * token. Guarded so several concurrent 401s don't stack redirects.
 */
export function loginRedirect(): void {
  if (typeof window === "undefined" || redirecting) return;
  redirecting = true;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage disabled — ignore
  }
  const here = window.location.pathname + window.location.search;
  const next = here && !here.startsWith("/login") ? `?next=${encodeURIComponent(here)}` : "";
  window.location.href = `/login${next}`;
}

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/** Same-origin path to return to after login (prevents open redirect). */
export function safeNext(next: string | null | undefined): string {
  if (next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login")) return next;
  return "/dashboard";
}
