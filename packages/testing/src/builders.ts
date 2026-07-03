import { InvoiceState, RailType } from "@egofi/types";
import type { Invoice } from "@egofi/types";

let counter = 0;
const nextId = (prefix: string) => `${prefix}_test_${++counter}`;

/** Builder with sane defaults; override any field per test. */
export function buildInvoice(overrides: Partial<Invoice> = {}): Invoice {
  const now = new Date();
  return {
    id: nextId("inv"),
    merchantId: nextId("mch"),
    displayCurrency: "USD",
    displayAmount: 100_000_000n, // $100 in 6-decimal units
    payAsset: "USDT",
    payChain: "TRON",
    quotedAmount: 100_000_000n,
    rate: 1_000_000n,
    rateLockedUntil: new Date(now.getTime() + 15 * 60_000),
    rail: RailType.DirectTransfer,
    railRef: null,
    state: InvoiceState.AwaitingPayment,
    refundAddress: null,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 30 * 60_000),
    ...overrides,
  };
}

export const TEST_ADDRESSES = {
  evm: "0x000000000000000000000000000000000000dEaD",
  tron: "TJRabPrwbZy45sbavfcjinPJC18kjpRTv8",
  solana: "11111111111111111111111111111112",
  bitcoin: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
} as const;
