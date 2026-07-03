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
