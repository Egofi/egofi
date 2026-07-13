import { Chain, normalizeChain, resolveAsset } from "@egofi/types";
import { describe, expect, it } from "vitest";

describe("resolveAsset (deposit whitelist + decimals)", () => {
  it("resolves a whitelisted EVM stablecoin by contract, case-insensitively", () => {
    // Real Ethereum USDT contract, mixed case.
    const r = resolveAsset("ETHEREUM", "USDT", "0xdAC17F958D2ee523a2206206994597C13D831ec7");
    expect(r).toEqual({ ok: true, symbol: "USDT", decimals: 6 });
  });

  it("uses the correct per-chain decimals — BSC USDT is 18, not 6", () => {
    const r = resolveAsset("BSC", "USDT", "0x55d398326f99059fF775485246999027B3197955");
    expect(r).toEqual({ ok: true, symbol: "USDT", decimals: 18 });
  });

  it("rejects a fake token whose contract isn't whitelisted for the chain", () => {
    // Symbol says USDT, but the contract is some junk token.
    const r = resolveAsset("ETHEREUM", "USDT", "0x000000000000000000000000000000000000dEaD");
    expect(r).toEqual({ ok: false, reason: "unrecognized_token" });
  });

  it("resolves the native coin (no contract)", () => {
    expect(resolveAsset("ETHEREUM", "ETH", null)).toEqual({
      ok: true,
      symbol: "ETH",
      decimals: 18,
    });
  });

  it("resolves the real Tron USDT contract (base58)", () => {
    const r = resolveAsset("TRON", "USDT", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t");
    expect(r).toEqual({ ok: true, symbol: "USDT", decimals: 6 });
  });

  it("resolves a Solana SPL mint", () => {
    const r = resolveAsset("SOLANA", "USDC", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    expect(r).toEqual({ ok: true, symbol: "USDC", decimals: 6 });
  });

  it("falls back to the legacy 6-decimal default for an unknown chain (no regression)", () => {
    expect(resolveAsset("some-future-chain", "USDT", null)).toEqual({
      ok: true,
      symbol: "USDT",
      decimals: 6,
    });
  });

  it("falls back by symbol when a known chain sends no contract", () => {
    expect(resolveAsset("tron", "USDT", undefined)).toEqual({
      ok: true,
      symbol: "USDT",
      decimals: 6,
    });
  });
});

describe("normalizeChain", () => {
  it("maps our enum values and common Tatum codes", () => {
    expect(normalizeChain("TRON")).toBe(Chain.Tron);
    expect(normalizeChain("trx")).toBe(Chain.Tron);
    expect(normalizeChain("matic")).toBe(Chain.Polygon);
    expect(normalizeChain("eth")).toBe(Chain.Ethereum);
    expect(normalizeChain("bsc")).toBe(Chain.BSC);
  });

  it("returns null for unknown or empty input", () => {
    expect(normalizeChain("dogechain")).toBeNull();
    expect(normalizeChain(undefined)).toBeNull();
    expect(normalizeChain("")).toBeNull();
  });
});
