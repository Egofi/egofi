import { ChainFamily } from "@egofi/types";

/**
 * Chain-address validation — pure predicates, no I/O. Checksums are
 * intentionally out of scope here (that's an adapter concern); these guards
 * catch pasted-into-the-wrong-field mistakes at the domain boundary.
 */
const PATTERNS: Record<ChainFamily, RegExp> = {
  [ChainFamily.EVM]: /^0x[0-9a-fA-F]{40}$/,
  [ChainFamily.Tron]: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
  [ChainFamily.Solana]: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  [ChainFamily.Bitcoin]: /^(bc1[02-9ac-hj-np-z]{11,87}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/,
};

export function isValidAddress(address: string, family: ChainFamily): boolean {
  const pattern = PATTERNS[family];
  return pattern?.test(address.trim());
}

export function detectAddressFamily(address: string): ChainFamily | null {
  const trimmed = address.trim();
  for (const [family, pattern] of Object.entries(PATTERNS) as Array<[ChainFamily, RegExp]>) {
    if (pattern.test(trimmed)) return family;
  }
  return null;
}
