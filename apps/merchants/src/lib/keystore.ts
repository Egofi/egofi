// Password-encrypted backup of a wallet recovery phrase, produced entirely in
// the browser with WebCrypto. The phrase is encrypted with a key derived from
// the merchant's password (PBKDF2-SHA256) using AES-256-GCM. The password and
// the plaintext phrase never leave the device; egofi never sees either.
//
// The file is self-describing (algorithm + parameters are stored alongside the
// ciphertext) so it can be decrypted independently, not only by egofi.

const PBKDF2_ITERATIONS = 250_000;

export interface EncryptedKeystore {
  egofiWalletBackup: 1;
  createdAt: string;
  cipher: "AES-256-GCM";
  kdf: "PBKDF2";
  kdfParams: { hash: "SHA-256"; iterations: number; salt: string };
  iv: string;
  ciphertext: string;
  // Watch-only public keys, stored for reference only — not secret.
  xpub: string;
  xpubTron: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

// A fresh ArrayBuffer copy — a non-generic BufferSource that satisfies the
// WebCrypto typings across TS/lib versions.
function bytes(input: Uint8Array | string): ArrayBuffer {
  const src = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const out = new ArrayBuffer(src.byteLength);
  new Uint8Array(out).set(src);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", bytes(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: bytes(salt), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
}

export async function encryptMnemonic(
  mnemonic: string,
  password: string,
  xpubs: { xpub: string; xpubTron: string },
): Promise<EncryptedKeystore> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: bytes(iv) }, key, bytes(mnemonic)),
  );

  return {
    egofiWalletBackup: 1,
    createdAt: new Date().toISOString(),
    cipher: "AES-256-GCM",
    kdf: "PBKDF2",
    kdfParams: { hash: "SHA-256", iterations: PBKDF2_ITERATIONS, salt: toBase64(salt) },
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
    xpub: xpubs.xpub,
    xpubTron: xpubs.xpubTron,
  };
}

/** Triggers a client-side download of the keystore as a .json file. */
export function downloadKeystore(keystore: EncryptedKeystore): void {
  const blob = new Blob([JSON.stringify(keystore, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `egofi-wallet-backup-${keystore.createdAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
