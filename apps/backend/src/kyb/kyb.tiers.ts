import { KybDocumentType } from "@egofi/types";
import type { KybTierInfo } from "@egofi/types";

/**
 * Canonical KYB tier ladder (§14). Single source of truth for volume caps and
 * document requirements — the compliance limits and the merchant UI both read
 * from here so they can never drift.
 */
export const KYB_TIERS: KybTierInfo[] = [
  {
    tier: 0,
    label: "Starter",
    description: "Email and business details only. Good for testing and low volume.",
    volumeCapUsd: 1_000,
    requiredDocuments: [],
  },
  {
    tier: 1,
    label: "Verified Business",
    description: "Confirm your business is real and identify a director.",
    volumeCapUsd: 25_000,
    requiredDocuments: [KybDocumentType.BusinessRegistration, KybDocumentType.DirectorId],
  },
  {
    tier: 2,
    label: "Full",
    description: "Enhanced review for unlimited settlement volume.",
    volumeCapUsd: null, // unlimited
    requiredDocuments: [KybDocumentType.ProofOfAddress, KybDocumentType.BankStatement],
  },
];

/** 30-day USD volume cap for a tier; Infinity means unlimited. */
export function volumeCapForTier(tier: number): number {
  const info = KYB_TIERS.find((t) => t.tier === tier) ?? KYB_TIERS[0];
  return info?.volumeCapUsd ?? Number.POSITIVE_INFINITY;
}

/** All documents required to hold a given tier (cumulative across lower tiers). */
export function cumulativeDocsForTier(tier: number): KybDocumentType[] {
  return KYB_TIERS.filter((t) => t.tier <= tier).flatMap((t) => t.requiredDocuments);
}

/** The minimum documents a merchant must provide to submit KYB for review. */
export const MINIMUM_SUBMISSION_DOCS = cumulativeDocsForTier(1);
