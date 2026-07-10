import { SubscriptionPeriodUnit, SubscriptionStatus } from "@egofi/types";
import type { BadgeVariant } from "@egofi/ui";

/** "every month" / "every 3 months" — reads naturally next to a price. */
export function formatPeriod(duration: number, unit: SubscriptionPeriodUnit): string {
  const noun = unit.toLowerCase();
  return duration === 1 ? `every ${noun}` : `every ${duration} ${noun}s`;
}

/** "monthly" / "every 3 months" — compact form for tables. */
export function formatBillingCycle(duration: number, unit: SubscriptionPeriodUnit): string {
  if (duration === 1) {
    switch (unit) {
      case SubscriptionPeriodUnit.Day:
        return "Daily";
      case SubscriptionPeriodUnit.Week:
        return "Weekly";
      case SubscriptionPeriodUnit.Month:
        return "Monthly";
      case SubscriptionPeriodUnit.Year:
        return "Yearly";
    }
  }
  return `Every ${duration} ${unit.toLowerCase()}s`;
}

export function formatMoney(amount: string, currency: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${amount} ${currency}`;
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export const SUBSCRIPTION_STATUS_META: Record<string, { label: string; variant: BadgeVariant }> = {
  [SubscriptionStatus.Active]: { label: "Active", variant: "success" },
  [SubscriptionStatus.PastDue]: { label: "Past due", variant: "warning" },
  [SubscriptionStatus.Canceled]: { label: "Canceled", variant: "default" },
};

export const PERIOD_UNIT_OPTIONS = [
  { value: SubscriptionPeriodUnit.Day, label: "Day" },
  { value: SubscriptionPeriodUnit.Week, label: "Week" },
  { value: SubscriptionPeriodUnit.Month, label: "Month" },
  { value: SubscriptionPeriodUnit.Year, label: "Year" },
];
