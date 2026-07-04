// The catalog of pay currencies egofi can actually quote and route, grouped by
// the network they settle on. `asset`/`chain` are exactly what POST /invoices
// expects. `icon` is the cryptocurrency-icons ticker (see scripts/sync-crypto-icons.mjs).

export interface NetworkMeta {
  /** Short label shown in the network badge. */
  label: string;
  /** Longer name for the dropdown subtitle. */
  fullName: string;
  /** Tailwind classes for the network badge pill. */
  badge: string;
  /**
   * Rough on-chain cost floor in USD — used for the "minimum payment amount"
   * hint. A payment below this would be eaten by network fees.
   */
  minUsd: number;
}

export const NETWORKS: Record<string, NetworkMeta> = {
  BITCOIN: {
    label: "Bitcoin",
    fullName: "Bitcoin",
    badge: "bg-orange-100 text-orange-700",
    minUsd: 2,
  },
  ETHEREUM: {
    label: "ERC-20",
    fullName: "Ethereum",
    badge: "bg-indigo-100 text-indigo-700",
    minUsd: 5,
  },
  BSC: {
    label: "BSC",
    fullName: "BNB Smart Chain",
    badge: "bg-amber-100 text-amber-800",
    minUsd: 0.3,
  },
  POLYGON: {
    label: "Polygon",
    fullName: "Polygon",
    badge: "bg-purple-100 text-purple-700",
    minUsd: 0.47,
  },
  BASE: {
    label: "Base",
    fullName: "Base",
    badge: "bg-blue-100 text-blue-700",
    minUsd: 0.2,
  },
  TRON: {
    label: "TRC-20",
    fullName: "Tron",
    badge: "bg-red-100 text-red-700",
    minUsd: 1,
  },
  SOLANA: {
    label: "Solana",
    fullName: "Solana",
    badge: "bg-teal-100 text-teal-700",
    minUsd: 0.1,
  },
};

export interface PayCurrency {
  /** Stable unique key, e.g. "USDT-POLYGON". */
  id: string;
  /** payAsset sent to the API. */
  asset: string;
  /** payChain sent to the API. */
  chain: string;
  /** Full display name, e.g. "Tether USD". */
  name: string;
  /** cryptocurrency-icons ticker for the coin glyph. */
  icon: string;
  /** Featured in the "Popular" group. */
  popular?: boolean;
}

function entry(
  asset: string,
  chain: string,
  name: string,
  icon: string,
  popular = false,
): PayCurrency {
  return { id: `${asset}-${chain}`, asset, chain, name, icon, popular };
}

// Order matters: popular ones surface first in the picker.
export const PAY_CURRENCIES: PayCurrency[] = [
  entry("BTC", "BITCOIN", "Bitcoin", "btc", true),
  entry("ETH", "ETHEREUM", "Ethereum", "eth", true),
  entry("USDT", "TRON", "Tether USD", "usdt", true),
  entry("BNB", "BSC", "BNB", "bnb", true),
  entry("SOL", "SOLANA", "Solana", "sol", true),
  entry("TRX", "TRON", "TRON", "trx", true),
  entry("USDT", "BSC", "Tether USD", "usdt"),
  entry("USDT", "POLYGON", "Tether USD", "usdt"),
  entry("USDT", "ETHEREUM", "Tether USD", "usdt"),
  entry("USDC", "SOLANA", "USD Coin", "usdc"),
  entry("USDC", "BASE", "USD Coin", "usdc"),
  entry("USDC", "POLYGON", "USD Coin", "usdc"),
  entry("ETH", "BASE", "Ethereum", "eth"),
  entry("POL", "POLYGON", "Polygon", "matic"),
];

export function networkOf(chain: string): NetworkMeta {
  return (
    NETWORKS[chain.toUpperCase()] ?? {
      label: chain,
      fullName: chain,
      badge: "bg-navy-100 text-navy-600",
      minUsd: 1,
    }
  );
}

/** Rough minimum payment for an asset on a network, in USD. */
export function minPaymentUsd(chain: string): number {
  return networkOf(chain).minUsd;
}

/**
 * The cryptocurrency-icons ticker for an asset (optionally on a specific chain).
 * Falls back to the lowercased symbol; <CoinIcon> degrades gracefully if the
 * icon is missing.
 */
export function iconForAsset(asset: string, chain?: string): string {
  const match =
    (chain && PAY_CURRENCIES.find((c) => c.asset === asset && c.chain === chain)) ||
    PAY_CURRENCIES.find((c) => c.asset === asset);
  return match ? match.icon : asset.toLowerCase();
}
