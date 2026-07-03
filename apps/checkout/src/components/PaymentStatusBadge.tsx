import { InvoiceState } from "@egofi/types";
import type { BadgeVariant } from "@egofi/ui";
import { Badge } from "@egofi/ui";

const STATE_LABELS: Record<string, string> = {
  [InvoiceState.AwaitingPayment]: "Awaiting payment",
  [InvoiceState.Received]: "Deposit detected",
  [InvoiceState.Converting]: "Converting",
  [InvoiceState.ComplianceHold]: "Verification required",
  [InvoiceState.PayoutSent]: "Payout sent",
  [InvoiceState.PaidConfirmed]: "Confirmed",
  [InvoiceState.Underpaid]: "Underpaid",
  [InvoiceState.Overpaid]: "Overpaid",
  [InvoiceState.Failed]: "Failed",
  [InvoiceState.Refunded]: "Refunded",
  [InvoiceState.Expired]: "Expired",
};

const STATE_VARIANT: Record<string, BadgeVariant> = {
  [InvoiceState.PaidConfirmed]: "success",
  [InvoiceState.Received]: "info",
  [InvoiceState.Converting]: "accent",
  [InvoiceState.PayoutSent]: "accent",
  [InvoiceState.ComplianceHold]: "warning",
  [InvoiceState.Underpaid]: "warning",
  [InvoiceState.Overpaid]: "warning",
  [InvoiceState.Failed]: "danger",
  [InvoiceState.Refunded]: "danger",
  [InvoiceState.Expired]: "default",
};

export function PaymentStatusBadge({ state }: { state: string }) {
  const variant: BadgeVariant = STATE_VARIANT[state] ?? "default";
  const label = STATE_LABELS[state] ?? state;
  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}
