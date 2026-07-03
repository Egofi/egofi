import type {
  KybDocumentStatus,
  KybDocumentType,
  KybStatus,
} from "./enums.js";

export interface KybDocumentDto {
  id: string;
  type: KybDocumentType;
  status: KybDocumentStatus;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface KybTierInfo {
  tier: number;
  label: string;
  description: string;
  /** 30-day volume cap in USD; null means unlimited. */
  volumeCapUsd: number | null;
  /** Documents required to reach this tier. */
  requiredDocuments: KybDocumentType[];
}

export interface KybOverview {
  status: KybStatus;
  tier: number;
  submittedAt: string | null;
  reviewNote: string | null;
  documents: KybDocumentDto[];
  tiers: KybTierInfo[];
}

/** One entry per merchant awaiting review, for the admin queue. */
export interface KybReviewItem {
  merchantId: string;
  business: string;
  email: string;
  status: KybStatus;
  currentTier: number;
  submittedAt: string | null;
  documents: KybDocumentDto[];
}
