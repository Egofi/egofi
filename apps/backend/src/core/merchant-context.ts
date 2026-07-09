import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request-scoped merchant context (§1 RLS + §7 tenant scoping).
 *
 * Auth guards populate this on every authenticated request; the Prisma
 * tenant-scoping middleware and the RLS session-variable setter both read
 * from it. `null` means no merchant context (admin/worker/public endpoint)
 * — these queries bypass tenant filtering.
 */

export interface MerchantContext {
  merchantId: string;
}

export const merchantContextStore = new AsyncLocalStorage<MerchantContext>();

/** Returns the current merchant ID or `null` if outside a merchant request. */
export function currentMerchantId(): string | null {
  return merchantContextStore.getStore()?.merchantId ?? null;
}
