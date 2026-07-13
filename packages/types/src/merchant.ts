import type { KybStatus, MerchantStatus } from "./enums.js";

export interface SettlementAddresses {
  evm?: string;
  tron?: string;
  solana?: string;
  bitcoin?: string;
}

export interface FeeOverride {
  providerFeeShareEnabled?: boolean;
  quoteMarkupEnabled?: boolean;
  quoteMarkupPercent?: number;
  saasFeeBasisPoints?: number;
}

export interface MerchantProfile {
  id: string;
  business: string;
  email: string;
  status: MerchantStatus;
  kybStatus: KybStatus;
  kybTier: number;
  settlementAsset: string;
  settlementAddresses: SettlementAddresses;
  xpub?: string;
  xpubTron?: string;
  xpubMode: boolean;
  webhookUrl?: string;
  feeOverride?: FeeOverride;
  createdAt: Date;
}

export interface CreateMerchantDto {
  business: string;
  email: string;
  password: string;
  settlementAsset: string;
  settlementAddresses: SettlementAddresses;
}

export interface UpdateSettlementDto {
  settlementAsset?: string;
  settlementAddresses?: SettlementAddresses;
  xpub?: string;
  xpubTron?: string;
  xpubMode?: boolean;
  webhookUrl?: string;
}

export interface UpdateProfileDto {
  business?: string;
}

/**
 * The merchant's gateway-integration credentials: the webhook (IPN) callback
 * URL egofi POSTs to, and the HMAC secret used to sign those callbacks so the
 * merchant's server can verify authenticity.
 */
export interface IntegrationSettingsDto {
  webhookUrl: string | null;
  ipnSecret: string | null;
}
