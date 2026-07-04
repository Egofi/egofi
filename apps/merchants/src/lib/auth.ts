const TOKEN_KEY = "egofi_token";

let redirecting = false;

/**
 * Send the user to /login, remembering where they were so login can bring them
 * back. Clears any stale token. Safe to call multiple times (guards against a
 * redirect storm when several requests 401 at once).
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

/**
 * The path to land on after a successful login. Only same-origin absolute paths
 * are allowed (prevents open-redirect); anything else falls back to /dashboard.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next) return "/dashboard";
  if (
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/login") &&
    !next.startsWith("/register")
  ) {
    return next;
  }
  return "/dashboard";
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
