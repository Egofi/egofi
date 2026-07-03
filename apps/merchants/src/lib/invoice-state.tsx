import { Badge } from "@egofi/ui";
import type { BadgeVariant } from "@egofi/ui";

type StateConfig = { variant: BadgeVariant; label: string };

export const INVOICE_STATE_CONFIG: Record<string, StateConfig> = {
  DRAFT: { variant: "default", label: "Draft" },
  AWAITING_PAYMENT: { variant: "info", label: "Awaiting payment" },
  RECEIVED: { variant: "info", label: "Received" },
  CONVERTING: { variant: "accent", label: "Converting" },
  COMPLIANCE_HOLD: { variant: "warning", label: "Compliance hold" },
  PAYOUT_SENT: { variant: "accent", label: "Payout sent" },
  PAID_CONFIRMED: { variant: "success", label: "Paid" },
  UNDERPAID: { variant: "warning", label: "Underpaid" },
  OVERPAID: { variant: "warning", label: "Overpaid" },
  FAILED: { variant: "danger", label: "Failed" },
  REFUNDED: { variant: "danger", label: "Refunded" },
  EXPIRED: { variant: "default", label: "Expired" },
  COOLDOWN: { variant: "default", label: "Expired" },
};

export function InvoiceStateBadge({ state }: { state: string }) {
  const config = INVOICE_STATE_CONFIG[state] ?? {
    variant: "default" as const,
    label: state,
  };
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}
