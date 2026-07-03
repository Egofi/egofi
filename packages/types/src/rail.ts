import type { RailStatus, RailType } from "./enums.js";

export interface Invoice {
  id: string;
  merchantId: string;
  displayCurrency: string;
  displayAmount: bigint;
  payAsset: string;
  payChain: string;
  quotedAmount: bigint;
  rate: bigint;
  rateLockedUntil: Date;
  rail: RailType;
  railRef: string | null;
  state: string;
  refundAddress: string | null;
  createdAt: Date;
  expiresAt: Date;
}

export interface PaymentInstructions {
  invoiceId: string;
  rail: RailType;
  depositAddress: string;
  exactAmount: bigint;
  asset: string;
  chain: string;
  expiresAt: Date;
  paymentUri: string;
  qrData: string;
  providerRef?: string;
  memo?: string;
}

export type RailEvent =
  | { type: "DEPOSIT_DETECTED"; txHash: string; amount: bigint; asset: string; chain: string }
  | { type: "DEPOSIT_CONFIRMED"; txHash: string; confirmations: number }
  | { type: "CONVERSION_STARTED"; providerRef: string }
  | { type: "COMPLIANCE_HOLD"; providerRef: string; verificationUrl?: string }
  | { type: "PAYOUT_SENT"; txHash: string; amount: bigint; asset: string }
  | { type: "PAYOUT_CONFIRMED"; txHash: string; confirmations: number }
  | { type: "UNDERPAID"; received: bigint; expected: bigint }
  | { type: "FAILED"; reason: string }
  | { type: "REFUNDED"; txHash: string };

export interface RouteQuery {
  fromAsset: string;
  fromChain: string;
  toAsset: string;
  toChain: string;
  amountBaseUnits: bigint;
}

export interface SettlementRail {
  readonly railType: RailType;
  createPayment(invoice: Invoice): Promise<PaymentInstructions>;
  getStatus(paymentRef: string): Promise<RailStatus>;
  handleWebhook(payload: unknown): Promise<RailEvent>;
  supports(query: RouteQuery): boolean;
}
