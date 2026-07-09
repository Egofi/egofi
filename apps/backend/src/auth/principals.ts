import type { MerchantProfile } from "@egofi/types";

export type AuthenticatedMerchant = MerchantProfile & { role: "merchant" };

export interface AdminPrincipal {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
}

export function withMerchantRole(profile: MerchantProfile): AuthenticatedMerchant {
  return { ...profile, role: "merchant" };
}

export function publicMerchant(profile: AuthenticatedMerchant): MerchantProfile {
  const { role: _role, ...merchant } = profile;
  return merchant;
}
