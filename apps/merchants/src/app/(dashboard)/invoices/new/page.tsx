"use client";

import type { InvoiceDto } from "@egofi/types";
import { Button } from "@egofi/ui";
import { type FormEvent, useMemo, useState } from "react";
import { CurrencySelect } from "../../../../lib/CurrencySelect";
import { OrderDetails } from "../../../../lib/OrderDetails";
import { api } from "../../../../lib/api";
import { loginRedirect } from "../../../../lib/auth";
import { PAY_CURRENCIES, minPaymentUsd, networkOf } from "../../../../lib/crypto-assets";

const CURRENCIES = ["USD", "NGN", "EUR", "GBP", "GHS", "KES", "ZAR"];

const TTL_OPTIONS = [
  { label: "15 minutes", value: 900 },
  { label: "30 minutes", value: 1800 },
  { label: "1 hour", value: 3600 },
  { label: "6 hours", value: 21600 },
  { label: "24 hours", value: 86400 },
];

const DEFAULT_CURRENCY = "USDT-TRON";

function InfoDot({ text }: { text: string }) {
  return (
    <span
      title={text}
      className="inline-flex size-4 cursor-help items-center justify-center rounded-full text-info-500"
      aria-label={text}
    >
      <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden>
        <path
          fillRule="evenodd"
          d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zM8 4a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5A.75.75 0 0 1 8 4zm.75 3.25a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0v-4z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}

function CheckField({
  label,
  checked,
  onChange,
  info,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  info: string;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-navy-300 text-primary focus:ring-2 focus:ring-primary-500/40"
      />
      <span className="text-sm font-medium text-navy-800">{label}</span>
      <InfoDot text={info} />
    </label>
  );
}

export default function NewInvoicePage() {
  const [currencyId, setCurrencyId] = useState(DEFAULT_CURRENCY);
  const [price, setPrice] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("USD");
  const [fixedRate, setFixedRate] = useState(false);
  const [feePaidByUser, setFeePaidByUser] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [description, setDescription] = useState("");
  const [showCustomer, setShowCustomer] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ttlSeconds, setTtlSeconds] = useState(1800);
  const [refundAddress, setRefundAddress] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<InvoiceDto | null>(null);

  const currency = useMemo(
    () => PAY_CURRENCIES.find((c) => c.id === currencyId) ?? PAY_CURRENCIES[0]!,
    [currencyId],
  );
  const net = networkOf(currency.chain);
  const minUsd = minPaymentUsd(currency.chain);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!price || Number(price) <= 0) {
      setError("Enter a price greater than zero");
      return;
    }
    const token = localStorage.getItem("egofi_token");
    if (!token) {
      loginRedirect();
      return;
    }
    api.setAuthToken(token);

    // Optional extras ride along as invoice metadata — the API stores them
    // verbatim and they surface in the dashboard + webhooks.
    const metadata: Record<string, unknown> = {
      fixedRate,
      feePaidByUser,
      ...(orderId ? { orderId } : {}),
      ...(description ? { description } : {}),
      ...(customerName || customerEmail
        ? {
            customer: {
              ...(customerName ? { name: customerName } : {}),
              ...(customerEmail ? { email: customerEmail } : {}),
            },
          }
        : {}),
    };

    setLoading(true);
    try {
      const invoice = await api.invoices.create({
        displayCurrency: priceCurrency,
        displayAmount: price,
        payAsset: currency.asset,
        payChain: currency.chain,
        ttlSeconds,
        ...(refundAddress ? { refundAddress } : {}),
        metadata,
      });
      setCreated(invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the payment link");
    } finally {
      setLoading(false);
    }
  };

  // ── Order details (post-create) ───────────────────────────────
  if (created) {
    return (
      <div className="mx-auto max-w-lg p-4 sm:p-6 lg:p-10">
        <OrderDetails
          invoiceId={created.id}
          onCreateAnother={() => {
            setCreated(null);
            setPrice("");
            setOrderId("");
            setDescription("");
          }}
        />
      </div>
    );
  }

  // ── Form (modal-style) ────────────────────────────────────────
  return (
    <div className="mx-auto max-w-lg p-4 sm:p-6 lg:p-10">
      <form
        onSubmit={handleSubmit}
        className="animate-fade-in-up rounded-3xl border border-navy-100 bg-white p-6 shadow-lg sm:p-8"
      >
        <div className="flex items-start justify-between">
          <h1 className="text-xl font-bold tracking-tight text-navy-950">Create payment link</h1>
          <a
            href="/invoices"
            aria-label="Close"
            className="rounded-lg p-1.5 text-navy-400 transition-colors hover:bg-navy-100 hover:text-navy-700"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
            <span className="sr-only">Close</span>
          </a>
        </div>

        <div className="mt-6 space-y-5">
          {/* Pay currency */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-navy-500">Pay currency</span>
            <CurrencySelect value={currencyId} onChange={setCurrencyId} />
          </div>

          {/* Price + fiat currency */}
          <div>
            <label htmlFor="price" className="mb-1.5 block text-sm font-medium text-navy-500">
              Price
            </label>
            <div className="flex items-stretch overflow-hidden rounded-xl border border-navy-200 bg-white transition-colors focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/10">
              <input
                id="price"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-navy-900 placeholder:text-navy-400 focus:outline-none"
                required
              />
              <select
                value={priceCurrency}
                onChange={(e) => setPriceCurrency(e.target.value)}
                aria-label="Price currency"
                className="border-l border-navy-100 bg-navy-50 px-3 text-sm font-medium text-navy-700 focus:outline-none"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="mt-1.5 text-xs text-danger-600">{error}</p>}
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CheckField
              label="Fixed rate"
              checked={fixedRate}
              onChange={setFixedRate}
              info="Locks the exchange rate for the payment window. The customer must send the exact amount before the timer expires."
            />
            <CheckField
              label="Fee paid by user"
              checked={feePaidByUser}
              onChange={setFeePaidByUser}
              info="Adds the network and processing fee on top of the price so your customer covers it, not you."
            />
          </div>

          <hr className="border-navy-100" />

          {/* Order ID */}
          <div>
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Order ID"
              className="w-full rounded-xl border border-navy-200 bg-white px-4 py-3 text-sm text-navy-900 placeholder:text-navy-400 transition-colors hover:border-navy-300 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
            />
          </div>

          {/* Add description */}
          {showDescription ? (
            <div>
              <label htmlFor="desc" className="mb-1.5 block text-sm font-medium text-navy-500">
                Description
              </label>
              <textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What is this payment for?"
                className="w-full rounded-xl border border-navy-200 bg-white px-4 py-3 text-sm text-navy-900 placeholder:text-navy-400 transition-colors hover:border-navy-300 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDescription(true)}
              className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-700"
            >
              <span className="flex size-5 items-center justify-center rounded border border-primary/40 text-primary">
                <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden>
                  <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5z" />
                </svg>
              </span>
              Add description
            </button>
          )}

          {/* Set customer info */}
          <div>
            <button
              type="button"
              onClick={() => setShowCustomer((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-navy-800 hover:text-navy-950"
            >
              Set customer info
              <svg
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-3.5 text-primary"
                aria-hidden
              >
                <path d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.75 2.75 0 0 1-1.117.68l-2.15.717a.75.75 0 0 1-.949-.949l.717-2.15a2.75 2.75 0 0 1 .68-1.116l7.606-7.606z" />
              </svg>
            </button>
            {showCustomer && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="w-full rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 transition-colors hover:border-navy-300 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
                />
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Customer email"
                  className="w-full rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 transition-colors hover:border-navy-300 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
                />
              </div>
            )}
          </div>

          {/* Advanced (expiry + refund) */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-medium text-navy-400 hover:text-navy-700"
            >
              Advanced options
              <svg
                viewBox="0 0 16 16"
                fill="currentColor"
                className={`size-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-3">
                <div>
                  <label htmlFor="ttl" className="mb-1.5 block text-sm font-medium text-navy-500">
                    Link expires after
                  </label>
                  <select
                    id="ttl"
                    value={ttlSeconds}
                    onChange={(e) => setTtlSeconds(Number(e.target.value))}
                    className="w-full rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm text-navy-900 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
                  >
                    {TTL_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  value={refundAddress}
                  onChange={(e) => setRefundAddress(e.target.value)}
                  placeholder="Refund address (optional)"
                  className="w-full rounded-xl border border-navy-200 bg-white px-4 py-2.5 font-mono text-sm text-navy-900 placeholder:font-sans placeholder:text-navy-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
                />
              </div>
            )}
          </div>

          {/* Minimum payment hint */}
          <p className="text-sm text-navy-500">
            Current <span className="font-medium text-primary">minimum payment amount</span> for{" "}
            {currency.asset} on {net.fullName} is{" "}
            <span className="font-medium tabular-nums text-navy-700">
              {minUsd.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              USD
            </span>
          </p>
        </div>

        <Button type="submit" loading={loading} size="lg" className="mt-6 w-full">
          Confirm
        </Button>
      </form>
    </div>
  );
}
