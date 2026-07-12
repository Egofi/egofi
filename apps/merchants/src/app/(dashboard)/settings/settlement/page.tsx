"use client";

import type { MerchantProfile } from "@egofi/types";
import { Button, Card, CardContent, Input, Skeleton } from "@egofi/ui";
import { type FormEvent, useEffect, useState } from "react";
import { api } from "../../../../lib/api";
import { loginRedirect } from "../../../../lib/auth";

const ADDRESS_FIELDS = [
  {
    key: "evm",
    label: "EVM address",
    placeholder: "0x…",
    hint: "Ethereum, BSC, Polygon, and Base",
  },
  {
    key: "tron",
    label: "Tron address",
    placeholder: "T…",
    hint: "TRC-20 — the default USDT-Tron settlement",
  },
  {
    key: "solana",
    label: "Solana address",
    placeholder: "Base58 address",
    hint: "SPL tokens land in your associated token account",
  },
  { key: "bitcoin", label: "Bitcoin address", placeholder: "bc1…", hint: "" },
] as const;

export default function SettlementPage() {
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [addresses, setAddresses] = useState<Record<string, string>>({
    evm: "",
    tron: "",
    solana: "",
    bitcoin: "",
  });
  const [webhookUrl, setWebhookUrl] = useState("");
  const [xpubMode, setXpubMode] = useState(false);
  const [xpub, setXpub] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("egofi_token");
    if (!token) {
      loginRedirect();
      return;
    }
    api.setAuthToken(token);
    void api.merchant.getProfile().then((p) => {
      setMerchant(p);
      const addrs = p.settlementAddresses as Record<string, string>;
      setAddresses({
        evm: addrs["evm"] ?? "",
        tron: addrs["tron"] ?? "",
        solana: addrs["solana"] ?? "",
        bitcoin: addrs["bitcoin"] ?? "",
      });
      setWebhookUrl(p.webhookUrl ?? "");
      setXpubMode(p.xpubMode);
      setXpub(p.xpub ?? "");
    });
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (xpubMode && !xpub.trim()) {
      setError("Fresh-address mode needs your account xpub — paste it below or turn it off.");
      return;
    }
    setLoading(true);
    try {
      await api.merchant.updateSettlement({
        settlementAddresses: addresses,
        webhookUrl,
        xpubMode,
        xpub: xpub.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setLoading(false);
    }
  };

  if (!merchant) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Receiving addresses */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-navy-950">Receiving addresses</h2>
            <span className="rounded-md bg-navy-50 px-2 py-1 font-mono text-xs text-navy-700">
              Settles in {merchant.settlementAsset}
            </span>
          </div>
          <p className="mt-1 text-sm text-navy-500">
            One address per network covers every token on that network. We convert incoming payments
            and pay out to the matching address.
          </p>
          <p className="mt-2 text-sm text-navy-500">
            This is all you need. Paste an ordinary wallet address — MetaMask, Trust, Binance, any
            wallet works. We tell payments apart automatically by giving each invoice a unique
            amount, so no special setup is required.
          </p>
          <div className="mt-5 space-y-5">
            {ADDRESS_FIELDS.map((field) => (
              <Input
                key={field.key}
                label={field.label}
                placeholder={field.placeholder}
                {...(field.hint ? { hint: field.hint } : {})}
                value={addresses[field.key] ?? ""}
                onChange={(e) => setAddresses((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="font-mono"
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Webhook notifications */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-base font-semibold text-navy-950">Webhook notifications</h2>
          <p className="mt-1 text-sm text-navy-500">
            We POST an HMAC-signed event here whenever an invoice's status changes.
          </p>
          <div className="mt-4">
            <Input
              label="Webhook URL"
              type="url"
              placeholder="https://your-site.com/webhooks/egofi"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              hint="Verify the signature before trusting any delivery."
            />
          </div>
        </CardContent>
      </Card>

      {/* Advanced — fresh address per invoice (optional) */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-navy-950">Fresh address per invoice</h2>
            <span className="rounded-md bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">
              Advanced · optional
            </span>
          </div>
          <p className="mt-1 text-sm text-navy-500">
            You don't need this. We already keep every payment separate by giving each invoice its
            own amount. Turn it on only if you want each payment link to use a brand-new on-chain
            address for extra privacy. It requires an account{" "}
            <span className="font-mono">xpub</span> from an HD or hardware wallet — most merchants
            can skip it.
          </p>

          <div className="mt-4 rounded-xl border border-navy-100 bg-navy-50/40 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={xpubMode}
                onChange={(e) => setXpubMode(e.target.checked)}
                className="mt-0.5 size-4 rounded border-navy-300 accent-[#1D4ED8]"
              />
              <span className="text-sm leading-relaxed text-navy-700">
                <strong className="font-semibold text-navy-900">
                  Derive a new address from my xpub.
                </strong>{" "}
                Works on Ethereum, BSC, Polygon, Base and Tron — other chains keep using the fixed
                address above.
              </span>
            </label>

            {xpubMode && (
              <div className="mt-4 border-t border-navy-100 pt-4">
                <Input
                  label="Account xpub"
                  placeholder="xpub6…"
                  value={xpub}
                  onChange={(e) => setXpub(e.target.value)}
                  className="font-mono"
                  hint="The account-level extended PUBLIC key from your wallet (e.g. m/44'/60'/0' for EVM, m/44'/195'/0' for Tron). We only ever see the public key — never your private keys or seed."
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={loading} size="lg">
          {saved ? "Saved ✓" : "Save settlement settings"}
        </Button>
        {error && <span className="text-sm text-danger-600">{error}</span>}
        {saved && (
          <span className="text-sm font-medium text-success-700">Your settings are live.</span>
        )}
      </div>
    </form>
  );
}
