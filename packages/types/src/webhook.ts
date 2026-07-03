import type { WebhookEvent } from "./enums.js";

export interface OutboundWebhookPayload {
  id: string;
  event: WebhookEvent;
  merchantId: string;
  invoiceId: string;
  data: Record<string, unknown>;
  timestamp: string;
  signature: string;
}

export interface TatumWebhookPayload {
  subscriptionId: string;
  type: string;
  txId: string;
  blockNumber: number;
  asset: string;
  amount: string;
  address: string;
  counterAddress?: string;
  mempool?: boolean;
}
