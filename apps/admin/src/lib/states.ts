import type { BadgeVariant } from "@egofi/ui";

/** Invoice state → badge look + human label. Shared across ops pages. */
export const INVOICE_STATE: Record<string, { variant: BadgeVariant; label: string }> = {
  DRAFT: { variant: "default", label: "Draft" },
  AWAITING_PAYMENT: { variant: "info", label: "Awaiting payment" },
  RECEIVED: { variant: "info", label: "Received" },
  CONVERTING: { variant: "info", label: "Converting" },
  COMPLIANCE_HOLD: { variant: "warning", label: "Compliance hold" },
  PAYOUT_SENT: { variant: "accent", label: "Payout sent" },
  PAID_CONFIRMED: { variant: "success", label: "Paid" },
  UNDERPAID: { variant: "warning", label: "Underpaid" },
  OVERPAID: { variant: "warning", label: "Overpaid" },
  FAILED: { variant: "danger", label: "Failed" },
  REFUNDED: { variant: "default", label: "Refunded" },
  EXPIRED: { variant: "default", label: "Expired" },
  COOLDOWN: { variant: "default", label: "Cooldown" },
};

export function invoiceState(state: string): { variant: BadgeVariant; label: string } {
  return INVOICE_STATE[state] ?? { variant: "default", label: state };
}

export const MERCHANT_STATUS: Record<string, { variant: BadgeVariant; label: string }> = {
  ACTIVE: { variant: "success", label: "Active" },
  PENDING: { variant: "warning", label: "Pending" },
  SUSPENDED: { variant: "danger", label: "Suspended" },
  REJECTED: { variant: "default", label: "Rejected" },
};

export const KYB_STATUS: Record<string, { variant: BadgeVariant; label: string }> = {
  PENDING: { variant: "default", label: "Not started" },
  UNDER_REVIEW: { variant: "warning", label: "Under review" },
  VERIFIED: { variant: "success", label: "Verified" },
  REJECTED: { variant: "danger", label: "Rejected" },
};

export const DOC_TYPE_LABEL: Record<string, string> = {
  BUSINESS_REGISTRATION: "Business registration",
  TAX_ID: "Tax ID",
  DIRECTOR_ID: "Director ID",
  PROOF_OF_ADDRESS: "Proof of address",
  BANK_STATEMENT: "Bank statement",
  OTHER: "Other",
};

export const DOC_STATUS: Record<string, { variant: BadgeVariant; label: string }> = {
  PENDING: { variant: "default", label: "Pending" },
  APPROVED: { variant: "success", label: "Approved" },
  REJECTED: { variant: "danger", label: "Rejected" },
};

export const KYB_TIERS = [
  { tier: 0, label: "Tier 0 — Starter" },
  { tier: 1, label: "Tier 1 — Verified Business" },
  { tier: 2, label: "Tier 2 — Enhanced" },
];
