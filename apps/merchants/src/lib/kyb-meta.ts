import { KybDocumentType, KybStatus } from "@egofi/types";
import type { BadgeVariant } from "@egofi/ui";

export const DOCUMENT_META: Record<
  KybDocumentType,
  { label: string; description: string; examples: string }
> = {
  [KybDocumentType.BusinessRegistration]: {
    label: "Business registration",
    description: "Proof your business is legally registered.",
    examples: "CAC certificate, certificate of incorporation",
  },
  [KybDocumentType.DirectorId]: {
    label: "Director's ID",
    description: "Government ID of a company director.",
    examples: "NIN slip, international passport, driver's licence",
  },
  [KybDocumentType.ProofOfAddress]: {
    label: "Proof of address",
    description: "A recent document showing your business address.",
    examples: "Utility bill, tenancy agreement (last 3 months)",
  },
  [KybDocumentType.BankStatement]: {
    label: "Bank statement",
    description: "A recent business bank statement.",
    examples: "Last 3 months, PDF from your bank",
  },
  [KybDocumentType.TaxId]: {
    label: "Tax ID (optional)",
    description: "Your Tax Identification Number document.",
    examples: "TIN certificate",
  },
  [KybDocumentType.Other]: {
    label: "Supporting document",
    description: "Anything else that supports your application.",
    examples: "",
  },
};

export const KYB_STATUS_META: Record<
  string,
  { label: string; variant: BadgeVariant; tone: "info" | "warning" | "success" | "danger" }
> = {
  [KybStatus.Pending]: { label: "Not submitted", variant: "default", tone: "info" },
  [KybStatus.UnderReview]: { label: "Under review", variant: "warning", tone: "warning" },
  [KybStatus.Verified]: { label: "Verified", variant: "success", tone: "success" },
  [KybStatus.Rejected]: { label: "Action needed", variant: "danger", tone: "danger" },
};

export function formatCap(capUsd: number | null): string {
  if (capUsd === null) return "Unlimited";
  return `$${capUsd.toLocaleString()} / 30 days`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
