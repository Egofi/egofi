import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF protection for outbound requests to URLs we don't control (merchant
 * webhooks). Anything that could reach the loopback, private LAN, CGNAT, or
 * cloud link-local metadata range (169.254.169.254) is refused. Validation
 * happens against the *resolved* IPs, and redirects are never followed, so a
 * public hostname can't bounce us onto an internal target.
 */
export class SsrfError extends Error {}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return true; // malformed → treat as unsafe
  }
  const [a = 0, b = 0] = parts;
  return (
    a === 0 || // 0.0.0.0/8 "this network"
    a === 10 || // private
    a === 127 || // loopback
    (a === 169 && b === 254) || // link-local + cloud metadata
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    (a === 100 && b >= 64 && b <= 127) // CGNAT 100.64.0.0/10
  );
}

function isPrivateIpv6(ip: string): boolean {
  const norm = ip.toLowerCase();
  if (norm === "::1" || norm === "::") return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(norm);
  if (mapped?.[1]) return isPrivateIpv4(mapped[1]);
  // fc00::/7 unique-local and fe80::/10 link-local
  return (
    norm.startsWith("fc") ||
    norm.startsWith("fd") ||
    norm.startsWith("fe8") ||
    norm.startsWith("fe9") ||
    norm.startsWith("fea") ||
    norm.startsWith("feb")
  );
}

/** Whether an IP literal is in a private/loopback/link-local/CGNAT range. */
export function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return isPrivateIpv4(ip);
  if (v === 6) return isPrivateIpv6(ip);
  return true; // not a valid IP → unsafe
}

/** Literal-only check (no DNS): localhost names and private IP literals. */
export function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (isIP(host)) return isPrivateIp(host);
  return false;
}

/**
 * Validate a URL is safe to fetch: http(s) only, no embedded credentials, and
 * every address the host resolves to is public. Throws {@link SsrfError} otherwise.
 */
export async function assertPublicUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError("URL is not valid");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError("URL must use HTTP or HTTPS");
  }
  if (url.username || url.password) {
    throw new SsrfError("URL must not contain credentials");
  }

  const host = url.hostname.replace(/^\[/, "").replace(/\]$/, "");
  if (host === "localhost" || host.toLowerCase().endsWith(".localhost")) {
    throw new SsrfError("URL targets a private host");
  }
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new SsrfError("URL targets a private IP");
    return;
  }

  const records = await lookup(host, { all: true });
  if (records.length === 0) throw new SsrfError("URL host does not resolve");
  for (const record of records) {
    if (isPrivateIp(record.address)) {
      throw new SsrfError("URL host resolves to a private IP");
    }
  }
}

/**
 * fetch() hardened against SSRF: validates the destination is public and never
 * follows redirects (a 3xx is treated as an error so it can't redirect us onto
 * an internal target).
 */
export async function safeFetch(rawUrl: string, init: RequestInit = {}): Promise<Response> {
  await assertPublicUrl(rawUrl);
  const res = await fetch(rawUrl, { ...init, redirect: "manual" });
  if (res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400)) {
    throw new SsrfError("URL responded with a redirect, which is not allowed");
  }
  return res;
}
