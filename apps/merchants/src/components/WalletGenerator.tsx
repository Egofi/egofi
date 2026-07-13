"use client";

import { Button, Input } from "@egofi/ui";
import { HDKey } from "@scure/bip32";
import { generateMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { useMemo, useState } from "react";
import { downloadKeystore, encryptMnemonic } from "../lib/keystore";

/**
 * Model B — egofi creates a receiving wallet for the merchant, entirely in the
 * browser. The 12-word recovery phrase and the private key material NEVER leave
 * this device and are never sent to or stored by egofi; only the two account
 * xpubs (watch-only) are handed back to the caller. That keeps the product
 * non-custodial: egofi can watch deposits and derive addresses, but can never
 * move the merchant's funds.
 *
 * We derive at the standard BIP44 account paths so the phrase restores cleanly
 * in any ordinary wallet:
 *   EVM  (ETH/BSC/Polygon/Base)  m/44'/60'/0'
 *   Tron (USDT-TRC20 default)     m/44'/195'/0'
 */

interface GeneratedXpubs {
  xpub: string;
  xpubTron: string;
}

interface WalletGeneratorProps {
  onComplete: (xpubs: GeneratedXpubs) => void;
  onClose: () => void;
}

type Step = "intro" | "reveal" | "verify";

function deriveXpubs(mnemonic: string): GeneratedXpubs {
  const seed = mnemonicToSeedSync(mnemonic);
  const root = HDKey.fromMasterSeed(seed);
  const xpub = root.derive("m/44'/60'/0'").publicExtendedKey;
  const xpubTron = root.derive("m/44'/195'/0'").publicExtendedKey;
  // Scrub the private root from memory once we have the watch-only keys.
  root.wipePrivateData();
  return { xpub, xpubTron };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

// Two positions the merchant must confirm, each with two decoys from the wordlist.
function buildChallenge(words: string[]) {
  const positions = shuffle(words.map((_, i) => i))
    .slice(0, 2)
    .sort((a, b) => a - b);
  return positions.map((pos) => {
    const correct = words[pos] as string;
    const decoys = new Set<string>();
    while (decoys.size < 2) {
      const w = wordlist[Math.floor(Math.random() * wordlist.length)] as string;
      if (w !== correct) decoys.add(w);
    }
    return { pos, options: shuffle([correct, ...decoys]) };
  });
}

export function WalletGenerator({ onComplete, onClose }: WalletGeneratorProps) {
  const [step, setStep] = useState<Step>("intro");
  const [mnemonic, setMnemonic] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [verifyError, setVerifyError] = useState(false);
  const [backupPassword, setBackupPassword] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const words = useMemo(() => (mnemonic ? mnemonic.split(" ") : []), [mnemonic]);
  const challenge = useMemo(
    () => (step === "verify" && words.length ? buildChallenge(words) : []),
    [step, words],
  );

  const start = () => {
    setMnemonic(generateMnemonic(wordlist, 128)); // 12 words
    setRevealed(false);
    setStep("reveal");
  };

  const copyPhrase = async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the merchant can still read the words */
    }
  };

  const downloadBackup = async () => {
    if (backupPassword.length < 8) return;
    setDownloading(true);
    try {
      const keystore = await encryptMnemonic(mnemonic, backupPassword, deriveXpubs(mnemonic));
      downloadKeystore(keystore);
      setDownloaded(true);
      setBackupPassword("");
    } finally {
      setDownloading(false);
    }
  };

  const goVerify = () => {
    setPicks({});
    setVerifyError(false);
    setStep("verify");
  };

  const confirmBackup = () => {
    const ok = challenge.every((c) => picks[c.pos] === words[c.pos]);
    if (!ok) {
      setVerifyError(true);
      return;
    }
    const xpubs = deriveXpubs(mnemonic);
    setMnemonic(""); // drop the phrase from memory; we only keep watch-only xpubs
    onComplete(xpubs);
  };

  return (
    <dialog
      open
      aria-modal="true"
      aria-label="Create a receiving wallet"
      className="fixed inset-0 z-50 m-0 flex h-full w-full max-w-none items-end justify-center border-0 bg-navy-950/50 p-0 sm:items-center sm:p-4"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        {step === "intro" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-navy-950">Create a receiving wallet</h3>
            <p className="text-sm leading-relaxed text-navy-600">
              We'll create a wallet for you right here on your device. You'll get a{" "}
              <strong className="text-navy-900">12-word recovery phrase</strong> — the only key to
              your money. Write it down and keep it safe.
            </p>
            <ul className="space-y-2 text-sm text-navy-600">
              <li className="flex gap-2">
                <span aria-hidden>🔒</span> egofi never sees your phrase and can never move your
                funds — we only receive a watch-only key.
              </li>
              <li className="flex gap-2">
                <span aria-hidden>⚠️</span> If you lose the phrase, no one — not even us — can
                recover your money.
              </li>
              <li className="flex gap-2">
                <span aria-hidden>📵</span> Don't screenshot it. Write it on paper and store it
                offline.
              </li>
            </ul>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row-reverse">
              <Button onClick={start} size="lg" className="sm:flex-1">
                Create my wallet
              </Button>
              <Button onClick={onClose} variant="ghost" size="lg" className="sm:flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === "reveal" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-navy-950">Your recovery phrase</h3>
            <p className="text-sm text-navy-600">
              Write these 12 words down <strong className="text-navy-900">in order</strong>. You'll
              confirm a couple of them next.
            </p>

            <div className="relative">
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-navy-100 bg-navy-50/60 p-3 sm:grid-cols-3">
                {words.map((w, i) => (
                  <div
                    key={`${i}-${w}`}
                    className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 font-mono text-sm text-navy-900"
                  >
                    <span className="w-5 shrink-0 text-right text-xs text-navy-400">{i + 1}</span>
                    {w}
                  </div>
                ))}
              </div>
              {!revealed && (
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl bg-navy-100/80 backdrop-blur-sm"
                >
                  <span aria-hidden className="text-xl">
                    👁
                  </span>
                  <span className="text-sm font-medium text-navy-700">Tap to reveal</span>
                  <span className="text-xs text-navy-500">Make sure no one is watching</span>
                </button>
              )}
            </div>

            {revealed && (
              <button
                type="button"
                onClick={copyPhrase}
                className="text-sm font-medium text-[#1D4ED8] hover:underline"
              >
                {copied ? "Copied ✓" : "Copy phrase"}
              </button>
            )}

            {revealed && (
              <details className="rounded-xl border border-navy-100 bg-navy-50/40 p-3">
                <summary className="cursor-pointer text-sm font-medium text-navy-800">
                  Also save an encrypted backup file (optional)
                </summary>
                <p className="mt-2 text-xs leading-relaxed text-navy-500">
                  Download a password-protected file of this phrase. It's encrypted on your device —
                  egofi never sees the password or the phrase. Keep the file and password somewhere
                  safe; you'll need both to restore.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="password"
                    placeholder="Choose a password (min 8 characters)"
                    value={backupPassword}
                    onChange={(e) => setBackupPassword(e.target.value)}
                    className="sm:flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={downloadBackup}
                    loading={downloading}
                    disabled={backupPassword.length < 8}
                  >
                    Download
                  </Button>
                </div>
                {downloaded && (
                  <p className="mt-2 text-xs font-medium text-success-700">
                    ✓ Encrypted backup downloaded. Store the file and password safely.
                  </p>
                )}
              </details>
            )}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row-reverse">
              <Button onClick={goVerify} disabled={!revealed} size="lg" className="sm:flex-1">
                I've written it down
              </Button>
              <Button onClick={onClose} variant="ghost" size="lg" className="sm:flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-navy-950">Confirm your backup</h3>
            <p className="text-sm text-navy-600">
              Pick the correct word for each position to prove you saved the phrase.
            </p>

            <div className="space-y-4">
              {challenge.map((c) => (
                <div key={c.pos}>
                  <p className="mb-2 text-sm font-medium text-navy-700">Word #{c.pos + 1}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {c.options.map((opt) => {
                      const selected = picks[c.pos] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setPicks((p) => ({ ...p, [c.pos]: opt }));
                            setVerifyError(false);
                          }}
                          className={`rounded-lg border px-2 py-2 font-mono text-sm transition ${
                            selected
                              ? "border-[#1D4ED8] bg-[#1D4ED8]/10 text-navy-900"
                              : "border-navy-200 bg-white text-navy-700 hover:border-navy-300"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {verifyError && (
              <p className="text-sm text-danger-600">
                That's not right. Check your written phrase and try again.
              </p>
            )}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row-reverse">
              <Button
                onClick={confirmBackup}
                disabled={Object.keys(picks).length < challenge.length}
                size="lg"
                className="sm:flex-1"
              >
                Confirm &amp; use this wallet
              </Button>
              <Button
                onClick={() => setStep("reveal")}
                variant="ghost"
                size="lg"
                className="sm:flex-1"
              >
                Back to phrase
              </Button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
