import { Injectable } from "@nestjs/common";
import Decimal from "decimal.js";
import { Chain, ChainFamily, CHAIN_CONFIGS } from "@egofi/types";

@Injectable()
export class PaymentUriService {
  /**
   * Build a payment URI for the customer's wallet to pre-fill the payment.
   * Uses EIP-681 (EVM), Solana Pay, TronLink deep-link, BIP-21 (BTC).
   */
  buildUri(params: {
    chain: string;
    address: string;
    amountBaseUnits: bigint;
    asset: string;
    tokenContractAddress?: string;
    memo?: string;
  }): string {
    const chain = params.chain as Chain;
    const config = CHAIN_CONFIGS[chain];
    if (!config) return `${params.address}?amount=${params.amountBaseUnits}`;

    switch (config.family) {
      case ChainFamily.EVM:
        return this.eip681(params);
      case ChainFamily.Tron:
        return this.tronUri(params);
      case ChainFamily.Solana:
        return this.solanaPayUri(params);
      case ChainFamily.Bitcoin:
        return this.bip21Uri(params);
      default:
        return params.address;
    }
  }

  private eip681(params: {
    address: string;
    amountBaseUnits: bigint;
    asset: string;
    tokenContractAddress?: string;
  }): string {
    const isToken = Boolean(params.tokenContractAddress);
    if (isToken && params.tokenContractAddress) {
      const amount = params.amountBaseUnits.toString();
      return `ethereum:${params.tokenContractAddress}/transfer?address=${params.address}&uint256=${amount}`;
    }
    const amountWei = params.amountBaseUnits;
    return `ethereum:${params.address}?value=${amountWei}`;
  }

  private tronUri(params: {
    address: string;
    amountBaseUnits: bigint;
    tokenContractAddress?: string;
  }): string {
    if (params.tokenContractAddress) {
      return `tron:${params.tokenContractAddress}/transfer?address=${params.address}&uint256=${params.amountBaseUnits}`;
    }
    const amountSun = params.amountBaseUnits;
    return `tron:${params.address}?amount=${amountSun}`;
  }

  private solanaPayUri(params: {
    address: string;
    amountBaseUnits: bigint;
    asset: string;
    tokenContractAddress?: string;
    memo?: string;
  }): string {
    const amount = new Decimal(params.amountBaseUnits.toString()).div(1e6).toString();
    const url = new URL(`solana:${params.address}`);
    url.searchParams.set("amount", amount);
    if (params.tokenContractAddress) {
      url.searchParams.set("spl-token", params.tokenContractAddress);
    }
    if (params.memo) url.searchParams.set("memo", params.memo);
    return url.toString();
  }

  private bip21Uri(params: {
    address: string;
    amountBaseUnits: bigint;
    memo?: string;
  }): string {
    const btcAmount = new Decimal(params.amountBaseUnits.toString())
      .div(1e8)
      .toString();
    const url = new URL(`bitcoin:${params.address}`);
    url.searchParams.set("amount", btcAmount);
    if (params.memo) url.searchParams.set("label", params.memo);
    return url.toString();
  }
}
