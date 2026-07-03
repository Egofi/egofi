"use client";

import { createApiClient } from "@egofi/sdk";
import type { InvoiceDto } from "@egofi/types";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@egofi/ui";
import { type FormEvent, useState } from "react";
import { CopyButton } from "../../../../lib/CopyButton";
import { checkoutUrl } from "../../../../lib/checkout-url";

const api = createApiClient();

// What the customer pays with. Each option maps to a (payAsset, payChain) pair.
const PAY_OPTIONS = [
  { label: "USDT · Tron (TRC-20)", asset: "USDT", chain: "TRON" },
  { label: "USDT · BSC (BEP-20)", asset: "USDT", chain: "BSC" },
  { label: "USDT · Polygon", asset: "USDT", chain: "POLYGON" },
  { label: "USDT · Ethereum", asset: "USDT", chain: "ETHEREUM" },
  { label: "USDC · Solana", asset: "USDC", chain: "SOLANA" },
  { label: "USDC · Base", asset: "USDC", chain: "BASE" },
  { label: "USDC · Polygon", asset: "USDC", chain: "POLYGON" },
  { label: "Bitcoin", asset: "BTC", chain: "BITCOIN" },
  { label: "Ethereum", asset: "ETH", chain: "ETHEREUM" },
  { label: "Solana", asset: "SOL", chain: "SOLANA" },
  { label: "BNB · BSC", asset: "BNB", chain: "BSC" },
  { label: "TRX · Tron", asset: "TRX", chain: "TRON" },
] as const;

const CURRENCIES = ["USD", "NGN", "EUR", "GBP", "GHS", "KES", "ZAR"];

const TTL_OPTIONS = [
  { label: "15 minutes", value: 900 },
  { label: "30 minutes", value: 1800 },
  { label: "1 hour", value: 3600 },
  { label: "6 hours", value: 21600 },
  { label: "24 hours", value: 86400 },
];

export default function NewInvoicePage() {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [payOptionIdx, setPayOptionIdx] = useState(0);
  const [refundAddress, setRefundAddress] = useState("");
  const [ttlSeconds, setTtlSeconds] = useState(1800);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<InvoiceDto | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!amount || Number(amount) <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }
    const token = localStorage.getItem("egofi_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    api.setAuthToken(token);
    const opt = PAY_OPTIONS[payOptionIdx]!;
    setLoading(true);
    try {
      const invoice = await api.invoices.create({
        displayCurrency: currency,
        displayAmount: amount,
        payAsset: opt.asset,
        payChain: opt.chain,
        ttlSeconds,
        ...(refundAddress ? { refundAddress } : {}),
      });
      setCreated(invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the invoice");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCreated(null);
    setAmount("");
    setRefundAddress("");
  };

  // ── Success view ──────────────────────────────────────────────
  if (created) {
    const url = checkoutUrl(created.id);
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6 lg:p-10">
        <div className="animate-fade-in-up">
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-success-50">
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-7 text-success-500"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <h1 className="mt-4 text-xl font-bold tracking-tight text-navy-950">
                  Payment link created
                </h1>
                <p className="mt-1 text-sm text-navy-500">
                  Share this link with your customer. It expires with the invoice.
                </p>
              </div>

              {/* Shareable link */}
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-navy-100 bg-navy-50/50 p-3">
                <span className="min-w-0 flex-1 truncate font-mono text-sm text-navy-800">
                  {url}
                </span>
                <CopyButton text={url} label="payment link" />
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button variant="secondary" className="w-full">
                    Open checkout
                  </Button>
                </a>
                <a href={`/invoices/${created.id}`} className="flex-1">
                  <Button variant="secondary" className="w-full">
                    View invoice
                  </Button>
                </a>
              </div>

              <div className="mt-6 border-t border-navy-100 pt-6 text-sm">
                <dl className="grid grid-cols-2 gap-y-3">
                  <dt className="text-navy-500">Amount</dt>
                  <dd className="text-right font-semibold text-navy-900">
                    {created.displayAmount} {created.displayCurrency}
                  </dd>
                  <dt className="text-navy-500">Customer pays</dt>
                  <dd className="text-right text-navy-900">
                    {created.payAsset} · {created.payChain}
                  </dd>
                  <dt className="text-navy-500">Invoice ID</dt>
                  <dd className="text-right font-mono text-xs text-navy-700">{created.id}</dd>
                </dl>
              </div>
            </CardContent>
          </Card>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-medium text-primary hover:underline"
            >
              + Create another payment link
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form view ─────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 lg:p-10">
      <header>
        <a href="/invoices" className="text-sm font-medium text-navy-400 hover:text-navy-700">
          ← Invoices
        </a>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy-950">New payment link</h1>
        <p className="mt-1 text-sm text-navy-500">
          Set the amount and what the customer pays with. We generate a hosted checkout page you can
          share anywhere.
        </p>
      </header>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Invoice details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Amount + currency */}
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Input
                label="Amount"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                {...(error ? { error } : {})}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="currency" className="text-sm font-medium text-navy-800">
                  Currency
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-[42px] rounded-lg border border-navy-200 bg-white px-3 text-sm text-navy-900 outline-none transition-all hover:border-navy-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pay with */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pay-with" className="text-sm font-medium text-navy-800">
                Customer pays with
              </label>
              <select
                id="pay-with"
                value={payOptionIdx}
                onChange={(e) => setPayOptionIdx(Number(e.target.value))}
                className="w-full rounded-lg border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 outline-none transition-all hover:border-navy-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
              >
                {PAY_OPTIONS.map((o, i) => (
                  <option key={o.label} value={i}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-navy-400">
                We convert this to your settlement asset automatically — you always receive what's
                configured in Settings.
              </p>
            </div>

            {/* Expiry */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ttl" className="text-sm font-medium text-navy-800">
                Link expires after
              </label>
              <select
                id="ttl"
                value={ttlSeconds}
                onChange={(e) => setTtlSeconds(Number(e.target.value))}
                className="w-full rounded-lg border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 outline-none transition-all hover:border-navy-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
              >
                {TTL_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Refund address (optional) */}
            <Input
              label="Refund address (optional)"
              placeholder="Where to return funds if a swap fails"
              value={refundAddress}
              onChange={(e) => setRefundAddress(e.target.value)}
              hint="Strongly recommended for cross-chain payments — swap providers can require it."
              className="font-mono"
            />
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center gap-3">
          <Button type="submit" loading={loading} size="lg">
            Create payment link
          </Button>
          <a href="/invoices">
            <Button type="button" variant="ghost" size="lg">
              Cancel
            </Button>
          </a>
        </div>
      </form>
    </div>
  );
}
