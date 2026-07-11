import { Injectable } from "@nestjs/common";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { base58check } from "@scure/base";
import { HDKey } from "@scure/bip32";

// Chains whose addresses come from a secp256k1 key, so a single account xpub
// can produce them. EVM chains all share one address. TRON uses the same
// keccak-derived 20 bytes as EVM, only base58check-encoded with a 0x41 prefix.
const EVM_CHAINS = new Set(["ETHEREUM", "BSC", "POLYGON", "BASE"]);

// Tron/BTC-style base58check: checksum = first 4 bytes of sha256(sha256(payload)).
const b58check = base58check(sha256);

/**
 * Derives per-invoice receive addresses from a merchant's account-level extended
 * public key (xpub), at the standard BIP44 external path `<xpub>/0/index`.
 *
 * The merchant owns the seed behind the xpub, so they hold the private key for
 * every address derived here — only the on-chain encoding is chain-specific.
 * Bitcoin and Solana are intentionally unsupported: BTC needs address-type
 * handling tied to the xpub version, and Solana is ed25519 (child public keys
 * cannot be derived from a parent public key at all).
 */
@Injectable()
export class XpubDerivationService {
  /** Whether a receive address can be derived from a secp256k1 xpub for this chain. */
  static supports(chain: string): boolean {
    const c = chain.toUpperCase();
    return EVM_CHAINS.has(c) || c === "TRON";
  }

  /** Throws if the string is not a parseable extended key. */
  static isValidXpub(xpub: string): boolean {
    try {
      HDKey.fromExtendedKey(xpub.trim());
      return true;
    } catch {
      return false;
    }
  }

  deriveAddress(xpub: string, chain: string, index: number): string {
    if (!Number.isInteger(index) || index < 0) {
      throw new Error("Derivation index must be a non-negative integer");
    }
    const account = HDKey.fromExtendedKey(xpub.trim());
    const child = account.deriveChild(0).deriveChild(index);
    if (!child.publicKey) throw new Error("Could not derive a public key from the xpub");

    const hash20 = this.keccakHash20(child.publicKey);
    const c = chain.toUpperCase();
    if (EVM_CHAINS.has(c)) return this.toEvmAddress(hash20);
    if (c === "TRON") return this.toTronAddress(hash20);
    throw new Error(`xpub derivation is not supported for ${chain}`);
  }

  /** keccak256 of the uncompressed public key (minus its 0x04 tag), last 20 bytes. */
  private keccakHash20(compressedPubkey: Uint8Array): Uint8Array {
    const uncompressed = secp256k1.Point.fromBytes(compressedPubkey).toBytes(false);
    return keccak_256(uncompressed.subarray(1)).subarray(-20);
  }

  /** EIP-55 mixed-case checksum address. */
  private toEvmAddress(hash20: Uint8Array): string {
    const hex = Buffer.from(hash20).toString("hex");
    const checksum = Buffer.from(keccak_256(new TextEncoder().encode(hex))).toString("hex");
    let out = "0x";
    for (let i = 0; i < hex.length; i++) {
      out += Number.parseInt(checksum[i] as string, 16) >= 8 ? hex[i]!.toUpperCase() : hex[i];
    }
    return out;
  }

  /** Tron base58check address: 0x41 || 20-byte hash. */
  private toTronAddress(hash20: Uint8Array): string {
    const payload = new Uint8Array(21);
    payload[0] = 0x41;
    payload.set(hash20, 1);
    return b58check.encode(payload);
  }
}
