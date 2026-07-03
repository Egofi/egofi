import type { FeeMechanismStatus } from "./enums.js";

export interface FeeMechanism {
  status: FeeMechanismStatus;
  deprecationNote?: string;
  deprecationDate?: string;
}

export interface FeePolicy {
  id: string;
  providerFeeShare: FeeMechanism & { adjustablePercent: number };
  quoteMarkup: FeeMechanism & { percent: number };
  merchantSaasFee: FeeMechanism & { amountUsd: number; intervalDays: number };
  updatedAt: string;
}

export interface ComputedFee {
  providerFeeShare: string;
  quoteMarkup: string;
  platformFee: string;
  totalFeePercent: string;
}
