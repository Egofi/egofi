export enum SubscriptionPeriodUnit {
  Day = "DAY",
  Week = "WEEK",
  Month = "MONTH",
  Year = "YEAR",
}

export interface SubscriptionPlanDto {
  id: string;
  merchantId: string;
  title: string;
  /** How many `periodUnit`s make one billing period (e.g. 3 → every 3 months). */
  periodDuration: number;
  periodUnit: SubscriptionPeriodUnit;
  /** Cost per period, as a decimal string in `currency`. */
  costPerPeriod: string;
  currency: string;
  /** Advanced: where IPN/webhook notifications are POSTed. */
  ipnCallbackUrl: string | null;
  /** Advanced: redirect after a successful payment. */
  successUrl: string | null;
  /** Advanced: redirect after a failed payment. */
  failedUrl: string | null;
  /** Advanced: redirect after a partial payment. */
  partialUrl: string | null;
  /** Inactive plans stop accepting new subscribers; existing ones keep billing. */
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionPlanDto {
  title: string;
  periodDuration: number;
  periodUnit: SubscriptionPeriodUnit;
  costPerPeriod: string;
  currency?: string;
  ipnCallbackUrl?: string;
  successUrl?: string;
  failedUrl?: string;
  partialUrl?: string;
}

/** Every field optional — a partial edit of an existing plan. */
export type UpdateSubscriptionPlanDto = Partial<CreateSubscriptionPlanDto> & {
  /** Inactive plans stop accepting new subscribers; existing ones keep billing. */
  active?: boolean;
};

export enum SubscriptionStatus {
  Active = "ACTIVE",
  PastDue = "PAST_DUE",
  Canceled = "CANCELED",
}

/** A customer's live subscription to a plan. */
export interface SubscriptionDto {
  id: string;
  planId: string;
  merchantId: string;
  customerEmail: string;
  payAsset: string;
  payChain: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingAt: string;
  canceledAt: string | null;
  createdAt: string;
  /** Number of invoices billed so far on this subscription. */
  invoiceCount?: number;
}

/** What the public hosted subscribe page needs — no merchant internals. */
export interface PublicPlanDto {
  id: string;
  title: string;
  periodDuration: number;
  periodUnit: SubscriptionPeriodUnit;
  costPerPeriod: string;
  currency: string;
  active: boolean;
  merchantBusiness: string;
}

/** Body a customer posts to subscribe to a plan. */
export interface SubscribeDto {
  customerEmail: string;
  payAsset: string;
  payChain: string;
}

export interface SubscribeResultDto {
  subscription: SubscriptionDto;
  /** First invoice — redirect the customer to the hosted checkout for this id. */
  invoiceId: string;
}
