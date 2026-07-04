import type { InvoiceState, RailType } from "./enums.js";

export interface CreateInvoiceDto {
  merchantId: string;
  displayCurrency: string;
  displayAmount: string;
  payAsset: string;
  payChain: string;
  refundAddress?: string;
  ttlSeconds?: number;
  metadata?: Record<string, unknown>;
}

/**
 * The body an authenticated merchant sends to POST /invoices. `merchantId` is
 * never sent by the client — the backend injects it from the auth context and
 * rejects the field if present (whitelist validation).
 */
export type CreateInvoicePayload = Omit<CreateInvoiceDto, "merchantId">;

export interface InvoiceDto {
  id: string;
  merchantId: string;
  displayCurrency: string;
  displayAmount: string;
  payAsset: string;
  payChain: string;
  quotedAmount: string;
  rate: string;
  rateLockedUntil: string;
  rail: RailType;
  railRef: string | null;
  state: InvoiceState;
  refundAddress: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface CheckoutSessionDto {
  invoice: InvoiceDto;
  instructions: {
    depositAddress: string;
    exactAmount: string;
    asset: string;
    chain: string;
    /**
     * Payment URI for the plain "Address" tab — for on-chain wallets this is
     * the bare address; some rails embed the amount here too.
     */
    paymentUri: string;
    /**
     * Payment URI with the exact amount pre-filled (BIP-21 / EIP-681 / Solana
     * Pay / TronLink). Powers the "With amount" tab and WalletConnect deep
     * link. Falls back to `paymentUri` when the rail can't embed an amount.
     */
    paymentUriWithAmount: string;
    qrData: string;
    expiresAt: string;
    /**
     * ISO timestamp the locked rate is valid until. After this the customer is
     * re-quoted. Mirrors `invoice.rateLockedUntil` for convenience.
     */
    rateLockedUntil: string;
    /** Minimum acceptable deposit in base units; below this can't be processed. */
    minAmount?: string;
    /** Human label e.g. "Send BTC on the Bitcoin network". */
    networkLabel?: string;
    providerRef?: string;
  };
}

export interface InvoiceStatusDto {
  invoiceId: string;
  state: InvoiceState;
  railStatus?: string;
  depositTxHash?: string;
  payoutTxHash?: string;
  updatedAt: string;
}

/** Body for POST /checkout/sessions/:id/notify — subscribe an email to status updates. */
export interface SubscribeNotifyDto {
  email: string;
}

export interface NotifySubscriptionDto {
  ok: boolean;
  email: string;
}
