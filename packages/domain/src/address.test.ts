import { describe, expect, it } from "vitest";
import { ChainFamily } from "@egofi/types";
import { detectAddressFamily, isValidAddress } from "./address";

const VALID = {
  evm: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  tron: "TJYeasTPa6gpR4vF4ycuPCRbXfRBXgqVXK",
  solana: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  bitcoinBech32: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  bitcoinLegacy: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
} as const;

describe("isValidAddress", () => {
  it("accepts valid addresses per family", () => {
    expect(isValidAddress(VALID.evm, ChainFamily.EVM)).toBe(true);
    expect(isValidAddress(VALID.tron, ChainFamily.Tron)).toBe(true);
    expect(isValidAddress(VALID.solana, ChainFamily.Solana)).toBe(true);
    expect(isValidAddress(VALID.bitcoinBech32, ChainFamily.Bitcoin)).toBe(true);
    expect(isValidAddress(VALID.bitcoinLegacy, ChainFamily.Bitcoin)).toBe(true);
  });

  it("rejects the pasted-into-the-wrong-field mistake", () => {
    expect(isValidAddress(VALID.tron, ChainFamily.EVM)).toBe(false);
    expect(isValidAddress(VALID.evm, ChainFamily.Tron)).toBe(false);
    expect(isValidAddress(VALID.evm, ChainFamily.Bitcoin)).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(isValidAddress("", ChainFamily.EVM)).toBe(false);
    expect(isValidAddress("0x123", ChainFamily.EVM)).toBe(false);
    expect(isValidAddress("not-an-address", ChainFamily.Solana)).toBe(false);
  });

  it("tolerates surrounding whitespace", () => {
    expect(isValidAddress(`  ${VALID.evm}  `, ChainFamily.EVM)).toBe(true);
  });
});

describe("detectAddressFamily", () => {
  it("detects each family", () => {
    expect(detectAddressFamily(VALID.evm)).toBe(ChainFamily.EVM);
    expect(detectAddressFamily(VALID.tron)).toBe(ChainFamily.Tron);
    expect(detectAddressFamily(VALID.bitcoinBech32)).toBe(ChainFamily.Bitcoin);
  });

  it("returns null for unrecognizable input", () => {
    expect(detectAddressFamily("hello world")).toBeNull();
  });
});
