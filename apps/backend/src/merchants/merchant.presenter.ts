import type { FeeOverride, MerchantProfile, SettlementAddresses } from "@egofi/types";
import { type Prisma, Prisma as PrismaNamespace } from "@prisma/client";

export const merchantProfileSelect = PrismaNamespace.validator<Prisma.MerchantSelect>()({
  id: true,
  business: true,
  email: true,
  status: true,
  kybStatus: true,
  kybTier: true,
  settlementAsset: true,
  settlementAddresses: true,
  xpub: true,
  xpubTron: true,
  xpubMode: true,
  webhookUrl: true,
  feeOverride: true,
  createdAt: true,
});

export type MerchantProfileRecord = Prisma.MerchantGetPayload<{
  select: typeof merchantProfileSelect;
}>;

export function toMerchantProfile(merchant: MerchantProfileRecord): MerchantProfile {
  return {
    id: merchant.id,
    business: merchant.business,
    email: merchant.email,
    status: merchant.status as MerchantProfile["status"],
    kybStatus: merchant.kybStatus as MerchantProfile["kybStatus"],
    kybTier: merchant.kybTier,
    settlementAsset: merchant.settlementAsset,
    settlementAddresses: merchant.settlementAddresses as SettlementAddresses,
    ...(merchant.xpub ? { xpub: merchant.xpub } : {}),
    ...(merchant.xpubTron ? { xpubTron: merchant.xpubTron } : {}),
    xpubMode: merchant.xpubMode,
    ...(merchant.webhookUrl ? { webhookUrl: merchant.webhookUrl } : {}),
    ...(merchant.feeOverride ? { feeOverride: merchant.feeOverride as FeeOverride } : {}),
    createdAt: merchant.createdAt,
  };
}
