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
