/**
 * A merchant stores one payout address per address *family*, not per chain —
 * a single `evm` address receives on Ethereum, BSC, Polygon and Base. These
 * keys are the contract between the settlement settings UI, the register DTO,
 * and the rails; keep them in sync with `SettlementAddresses` in @egofi/types.
 */
const CHAIN_TO_KEY: Record<string, string> = {
  ETHEREUM: "evm",
  BSC: "evm",
  POLYGON: "evm",
  BASE: "evm",
  TRON: "tron",
  SOLANA: "solana",
  BITCOIN: "bitcoin",
};

/** The payout address a deposit on `chain` settles to, or null if unconfigured. */
export function resolveSettlementAddress(
  addresses: Record<string, string> | null | undefined,
  chain: string,
): string | null {
  if (!addresses) return null;
  const key = CHAIN_TO_KEY[chain.toUpperCase()];
  if (!key) return null;
  const address = addresses[key];
  return address && address.length > 0 ? address : null;
}

/** Human-readable name of the settings field a merchant must fill in for `chain`. */
export function settlementAddressLabel(chain: string): string {
  const key = CHAIN_TO_KEY[chain.toUpperCase()];
  return key === "evm" ? "EVM" : (key ?? chain).toUpperCase();
}
