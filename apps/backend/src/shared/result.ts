/**
 * Result<T, E> for expected failures (§1): below-minimum, unsupported route,
 * expired quote. No exceptions for control flow — throw only for the truly
 * exceptional.
 */
export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type AppError = {
  code: string;
  message: string;
  /** Extra fields surfaced in the problem+json response. */
  details?: Record<string, unknown>;
};

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function appError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): AppError {
  return details ? { code, message, details } : { code, message };
}

/** Unwraps or throws — use at the boundary where a failure is a programmer error. */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw new Error(
    `Unwrapped an error Result: ${JSON.stringify(result.error)}`,
  );
}
