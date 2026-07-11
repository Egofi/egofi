import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { base58check } from "@scure/base";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import { describe, expect, it } from "vitest";
import { XpubDerivationService } from "./xpub-derivation.service";

// The canonical BIP39 test mnemonic. Its addresses are published in every HD
// wallet reference (e.g. iancoleman.io/bip39), so they pin our derivation to
// values a real wallet would produce for the same account xpub.
const MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

// Account-level xpub at m/44'/60'/0' (the level a merchant exports).
function evmAccountXpub(): string {
  const root = HDKey.fromMasterSeed(mnemonicToSeedSync(MNEMONIC));
  return root.derive("m/44'/60'/0'").publicExtendedKey;
}

const b58check = base58check(sha256);

describe("XpubDerivationService", () => {
  const svc = new XpubDerivationService();
  const xpub = evmAccountXpub();

  it("derives the known EVM receive addresses for the canonical mnemonic", () => {
    // m/44'/60'/0'/0/0 and .../0/1 — the well-known first two addresses.
    expect(svc.deriveAddress(xpub, "ETHEREUM", 0)).toBe(
      "0x9858EfFD232B4033E47d90003D41EC34EcaEda94",
    );
    expect(svc.deriveAddress(xpub, "ETHEREUM", 1)).toBe(
      "0x6Fac4D18c912343BF86fa7049364Dd4E424Ab9C0",
    );
  });

  it("returns EIP-55 mixed-case checksummed addresses", () => {
    const addr = svc.deriveAddress(xpub, "ETHEREUM", 0);
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(addr).not.toBe(addr.toLowerCase()); // has checksum casing
  });

  it("gives every EVM chain the same address (shared derivation)", () => {
    const eth = svc.deriveAddress(xpub, "ETHEREUM", 3);
    for (const chain of ["BSC", "POLYGON", "BASE"]) {
      expect(svc.deriveAddress(xpub, chain, 3)).toBe(eth);
    }
  });

  it("encodes Tron addresses correctly (base58check vector: USDT-TRC20 contract)", () => {
    // TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t == hex 41a614f803b6fd780986a42c78ec9c7f77e6ded13c
    const payload = Buffer.from("41a614f803b6fd780986a42c78ec9c7f77e6ded13c", "hex");
    expect(b58check.encode(payload)).toBe("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t");
  });

  it("derives a valid Tron address controlled by the same key as the EVM address", () => {
    const tron = svc.deriveAddress(xpub, "TRON", 0);
    expect(tron).toMatch(/^T[1-9A-HJ-NP-Za-km-z]{33}$/);

    // Decoding the Tron address yields 0x41 || <the same 20 bytes as the EVM address>,
    // proving it wraps the identical secp256k1 key (so the merchant controls it).
    const decoded = Buffer.from(b58check.decode(tron));
    expect(decoded[0]).toBe(0x41);
    const evm = svc.deriveAddress(xpub, "ETHEREUM", 0).slice(2).toLowerCase();
    expect(decoded.subarray(1).toString("hex")).toBe(evm);
  });

  it("is deterministic", () => {
    expect(svc.deriveAddress(xpub, "TRON", 7)).toBe(svc.deriveAddress(xpub, "TRON", 7));
    expect(svc.deriveAddress(xpub, "ETHEREUM", 7)).toBe(svc.deriveAddress(xpub, "ETHEREUM", 7));
  });

  it("rejects unsupported chains and bad input", () => {
    expect(() => svc.deriveAddress(xpub, "SOLANA", 0)).toThrow();
    expect(() => svc.deriveAddress(xpub, "BITCOIN", 0)).toThrow();
    expect(() => svc.deriveAddress(xpub, "TRON", -1)).toThrow();
    expect(() => svc.deriveAddress("not-an-xpub", "TRON", 0)).toThrow();
  });

  it("knows which chains it supports", () => {
    for (const c of ["ETHEREUM", "BSC", "POLYGON", "BASE", "TRON", "tron"]) {
      expect(XpubDerivationService.supports(c)).toBe(true);
    }
    for (const c of ["BITCOIN", "SOLANA"]) {
      expect(XpubDerivationService.supports(c)).toBe(false);
    }
  });

  it("validates xpub strings", () => {
    expect(XpubDerivationService.isValidXpub(xpub)).toBe(true);
    expect(XpubDerivationService.isValidXpub("xpub-garbage")).toBe(false);
    expect(XpubDerivationService.isValidXpub("")).toBe(false);
  });

  // Guards the claim in the service doc + rail: the pubkey is the compressed 33-byte
  // form and decompresses cleanly (would throw otherwise).
  it("uses compressed public keys that decompress", () => {
    const node = HDKey.fromExtendedKey(xpub).deriveChild(0).deriveChild(0);
    expect(node.publicKey).toHaveLength(33);
    expect(() => secp256k1.Point.fromBytes(node.publicKey as Uint8Array)).not.toThrow();
  });
});
