import { Chain, ChainFamily } from "./enums.js";

export interface ChainConfig {
  chain: Chain;
  family: ChainFamily;
  nativeAsset: string;
  confirmationsRequired: number;
  blockTimeSeconds: number;
  explorerBaseUrl: string;
}

export interface ChainAdapter {
  readonly chain: Chain;
  getBalance(address: string, asset?: string): Promise<bigint>;
  getTxConfirmations(txHash: string): Promise<number>;
  buildPaymentUri(address: string, amount: bigint, asset: string, memo?: string): string;
}

export const CHAIN_CONFIGS: Record<Chain, ChainConfig> = {
  [Chain.Ethereum]: {
    chain: Chain.Ethereum,
    family: ChainFamily.EVM,
    nativeAsset: "ETH",
    confirmationsRequired: 12,
    blockTimeSeconds: 12,
    explorerBaseUrl: "https://etherscan.io",
  },
  [Chain.BSC]: {
    chain: Chain.BSC,
    family: ChainFamily.EVM,
    nativeAsset: "BNB",
    confirmationsRequired: 12,
    blockTimeSeconds: 3,
    explorerBaseUrl: "https://bscscan.com",
  },
  [Chain.Polygon]: {
    chain: Chain.Polygon,
    family: ChainFamily.EVM,
    nativeAsset: "POL",
    confirmationsRequired: 12,
    blockTimeSeconds: 2,
    explorerBaseUrl: "https://polygonscan.com",
  },
  [Chain.Base]: {
    chain: Chain.Base,
    family: ChainFamily.EVM,
    nativeAsset: "ETH",
    confirmationsRequired: 12,
    blockTimeSeconds: 2,
    explorerBaseUrl: "https://basescan.org",
  },
  [Chain.Tron]: {
    chain: Chain.Tron,
    family: ChainFamily.Tron,
    nativeAsset: "TRX",
    confirmationsRequired: 19,
    blockTimeSeconds: 3,
    explorerBaseUrl: "https://tronscan.org",
  },
  [Chain.Solana]: {
    chain: Chain.Solana,
    family: ChainFamily.Solana,
    nativeAsset: "SOL",
    confirmationsRequired: 1,
    blockTimeSeconds: 1,
    explorerBaseUrl: "https://solscan.io",
  },
  [Chain.Bitcoin]: {
    chain: Chain.Bitcoin,
    family: ChainFamily.Bitcoin,
    nativeAsset: "BTC",
    confirmationsRequired: 2,
    blockTimeSeconds: 600,
    explorerBaseUrl: "https://mempool.space",
  },
};

// ─── Asset registry ────────────────────────────────────────────────────────
// The canonical contract/mint address and decimals for every asset we credit,
// per chain. A deposit is credited only if it matches a whitelisted entry — this
// is what stops fake-token spoofing (anyone can deploy a token called "USDT";
// only the real contract counts) and pins the correct decimals per chain
// (e.g. USDT is 6 decimals on Tron/Ethereum but 18 on BSC).

export interface AssetConfig {
  symbol: string;
  /** Contract (EVM/Tron) or mint (Solana); `null` for the chain's native coin. */
  contract: string | null;
  decimals: number;
}

export const ASSET_REGISTRY: Record<Chain, AssetConfig[]> = {
  [Chain.Ethereum]: [
    { symbol: "ETH", contract: null, decimals: 18 },
    { symbol: "USDT", contract: "0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6 },
    { symbol: "USDC", contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6 },
  ],
  [Chain.BSC]: [
    { symbol: "BNB", contract: null, decimals: 18 },
    { symbol: "USDT", contract: "0x55d398326f99059ff775485246999027b3197955", decimals: 18 },
    { symbol: "USDC", contract: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", decimals: 18 },
  ],
  [Chain.Polygon]: [
    { symbol: "POL", contract: null, decimals: 18 },
    { symbol: "USDT", contract: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", decimals: 6 },
    { symbol: "USDC", contract: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", decimals: 6 },
  ],
  [Chain.Base]: [
    { symbol: "ETH", contract: null, decimals: 18 },
    { symbol: "USDC", contract: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", decimals: 6 },
  ],
  [Chain.Tron]: [
    { symbol: "TRX", contract: null, decimals: 6 },
    { symbol: "USDT", contract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", decimals: 6 },
    { symbol: "USDC", contract: "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8", decimals: 6 },
  ],
  [Chain.Solana]: [
    { symbol: "SOL", contract: null, decimals: 9 },
    { symbol: "USDT", contract: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6 },
    { symbol: "USDC", contract: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 },
  ],
  [Chain.Bitcoin]: [{ symbol: "BTC", contract: null, decimals: 8 }],
};

const CHAIN_ALIASES: Record<string, Chain> = {
  ETH: Chain.Ethereum,
  ETHEREUM: Chain.Ethereum,
  BSC: Chain.BSC,
  BNB: Chain.BSC,
  BINANCE: Chain.BSC,
  POLYGON: Chain.Polygon,
  MATIC: Chain.Polygon,
  POL: Chain.Polygon,
  BASE: Chain.Base,
  TRON: Chain.Tron,
  TRX: Chain.Tron,
  SOLANA: Chain.Solana,
  SOL: Chain.Solana,
  BITCOIN: Chain.Bitcoin,
  BTC: Chain.Bitcoin,
};

/** Map a chain string (our enum, or a Tatum chain code) to a Chain, or null. */
export function normalizeChain(input: string | undefined | null): Chain | null {
  if (!input) return null;
  return CHAIN_ALIASES[input.trim().toUpperCase()] ?? null;
}

export type AssetResolution =
  | { ok: true; symbol: string; decimals: number }
  | { ok: false; reason: "unrecognized_token" };

const FALLBACK_DECIMALS = 6;

/**
 * Resolve an incoming deposit's asset to its canonical symbol + decimals.
 *
 * - A token whose contract address is present but not whitelisted for the chain
 *   is rejected (`unrecognized_token`) — the fake-token guard.
 * - When no contract is present (native coin, or a provider that omits it) we
 *   fall back to symbol lookup, and finally to the legacy 6-decimal default so
 *   existing stablecoin deposits keep matching unchanged.
 */
export function resolveAsset(
  chain: string | undefined | null,
  symbol: string | undefined | null,
  contract: string | undefined | null,
): AssetResolution {
  const c = normalizeChain(chain);
  const sym = symbol?.trim();
  const con = contract?.trim();

  if (!c) {
    // Unknown chain — we can't validate, so preserve legacy behaviour.
    return { ok: true, symbol: (sym || "UNKNOWN").toUpperCase(), decimals: FALLBACK_DECIMALS };
  }

  const assets = ASSET_REGISTRY[c];

  if (con) {
    const match = assets.find((a) => a.contract && a.contract.toLowerCase() === con.toLowerCase());
    if (match) return { ok: true, symbol: match.symbol, decimals: match.decimals };
    return { ok: false, reason: "unrecognized_token" };
  }

  if (sym) {
    const match = assets.find((a) => a.symbol.toUpperCase() === sym.toUpperCase());
    if (match) return { ok: true, symbol: match.symbol, decimals: match.decimals };
  }

  return { ok: true, symbol: (sym || "UNKNOWN").toUpperCase(), decimals: FALLBACK_DECIMALS };
}
