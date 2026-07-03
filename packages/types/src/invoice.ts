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
    paymentUri: string;
    qrData: string;
    expiresAt: string;
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
