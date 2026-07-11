// Admin/ops surface: analytics, cross-tenant reads, and operational health.
// These back the operator back-office, which runs without a merchant context
// (RLS is permissive there) and can therefore see every tenant.

import type { KybDocumentDto } from "./kyb.js";

// ─── Analytics ──────────────────────────────────────────────────────────────

/** Headline KPIs for the ops dashboard. Amounts are USD-equivalent strings. */
export interface AdminOverviewDto {
  merchants: { total: number; active: number; pending: number; suspended: number };
  invoices: { total: number; paid: number; awaiting: number; failed: number; expired: number };
  subscriptions: { activeSubscribers: number; plans: number; mrrUsd: string };
  volume: {
    /** Settled (PAID_CONFIRMED) display-value, summed in USD-equivalent. */
    settledUsd: string;
    /** Value currently in-flight (awaiting/received/converting). */
    inflightUsd: string;
    /** Paid ÷ (paid + failed + expired), 0–1. */
    conversionRate: number;
  };
  operations: {
    unmatchedOpen: number;
    outboxPending: number;
    outboxDead: number;
    webhooksFailing: number;
    kybPending: number;
  };
  generatedAt: string;
}

export type AdminMetric = "settled_volume" | "invoices_paid" | "invoices_created" | "new_merchants";
export type AdminInterval = "day" | "week" | "month";

export interface TimeseriesPoint {
  /** ISO date at the start of the bucket. */
  t: string;
  value: number;
}
export interface AdminTimeseriesDto {
  metric: AdminMetric;
  interval: AdminInterval;
  points: TimeseriesPoint[];
}

export interface BreakdownSlice {
  key: string;
  label: string;
  count: number;
  /** USD-equivalent value for this slice, when meaningful. */
  valueUsd: string;
}
export interface AdminBreakdownDto {
  byState: BreakdownSlice[];
  byChain: BreakdownSlice[];
  topMerchants: Array<{ merchantId: string; business: string; count: number; valueUsd: string }>;
}

// ─── Cross-tenant reads ───────────────────────────────────────────────────

export interface AdminInvoiceListItem {
  id: string;
  merchantId: string;
  merchantBusiness: string;
  displayAmount: string;
  displayCurrency: string;
  payAsset: string;
  payChain: string;
  state: string;
  rail: string;
  subscriptionId: string | null;
  createdAt: string;
}

export interface AdminInvoiceDetail extends AdminInvoiceListItem {
  quotedAmount: string;
  rate: string;
  depositAddress: string | null;
  refundAddress: string | null;
  notifyEmail: string | null;
  expiresAt: string;
  events: Array<{
    id: string;
    type: string;
    rail: string;
    txHash: string | null;
    amount: string | null;
    asset: string | null;
    ts: string;
  }>;
  ledger: Array<{ id: string; kind: string; amount: string; asset: string; ts: string }>;
}

export interface AdminMerchantDetail {
  id: string;
  business: string;
  email: string;
  status: string;
  kybStatus: string;
  kybTier: number;
  settlementAsset: string;
  createdAt: string;
  /** KYB review context, so an operator can vet a merchant in one place. */
  submittedAt: string | null;
  reviewNote: string | null;
  documents: KybDocumentDto[];
  stats: {
    invoices: number;
    paidInvoices: number;
    settledUsd: string;
    activeSubscribers: number;
    apiKeys: number;
  };
  recentInvoices: AdminInvoiceListItem[];
}

export interface AdminSubscriptionRow {
  id: string;
  planTitle: string;
  merchantId: string;
  merchantBusiness: string;
  customerEmail: string;
  status: string;
  costPerPeriod: string;
  currency: string;
  nextBillingAt: string;
  invoiceCount: number;
}

export interface UnmatchedPaymentDto {
  id: string;
  address: string;
  asset: string;
  chain: string;
  amount: string;
  txHash: string;
  status: string;
  createdAt: string;
}

/** Operational health — the queues and providers behind the gateway. */
export interface AdminOpsHealthDto {
  outbox: { pending: number; dead: number; oldestPendingAgeSec: number | null };
  webhooks: {
    delivered: number;
    failing: number;
    recentFailures: Array<{
      id: string;
      merchantId: string;
      event: string;
      attempts: number;
      createdAt: string;
    }>;
  };
  providers: Array<{
    provider: string;
    successRate: number;
    freezeRate: number;
    medianSettleMs: number;
    sampleSize: number;
    at: string;
  }>;
  unmatched: { open: number };
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  before: unknown;
  after: unknown;
  ip: string | null;
  createdAt: string;
}

export interface AdminPagedResult<T> {
  data: T[];
  total: number;
}
