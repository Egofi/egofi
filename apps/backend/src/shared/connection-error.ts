/**
 * A dropped Redis connection re-fires on every reconnect attempt, once per
 * worker. Logging each one buries the actual startup error under thousands of
 * identical stack traces, so collapse them: report the first immediately, then
 * at most one line per window carrying the suppressed count.
 */

const TRANSPORT_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "EPIPE",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN",
  "ENOTFOUND",
]);

/** True for "the socket went away", as opposed to a genuine application error. */
export function isTransportError(error: unknown): error is NodeJS.ErrnoException {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return typeof code === "string" && TRANSPORT_ERROR_CODES.has(code);
}

export interface ThrottledReport {
  /** How many identical errors were swallowed since the last report. */
  suppressed: number;
}

/** Rate-limits a repeating event to one report per `windowMs`. */
export class ErrorThrottle {
  private suppressed = 0;
  // -Infinity rather than 0: a timestamp of 0 is a legitimate `now`, and using
  // it as the "never reported" sentinel would suppress the very first error.
  private lastReportedAt = Number.NEGATIVE_INFINITY;

  constructor(private readonly windowMs = 30_000) {}

  /**
   * Returns a report when the caller should log, or `null` when the event was
   * folded into the running suppressed count.
   */
  next(now = Date.now()): ThrottledReport | null {
    if (now - this.lastReportedAt < this.windowMs) {
      this.suppressed++;
      return null;
    }
    const report = { suppressed: this.suppressed };
    this.suppressed = 0;
    this.lastReportedAt = now;
    return report;
  }

  /** Call once the connection is healthy again so the next outage reports at once. */
  reset(): void {
    this.suppressed = 0;
    this.lastReportedAt = Number.NEGATIVE_INFINITY;
  }
}
