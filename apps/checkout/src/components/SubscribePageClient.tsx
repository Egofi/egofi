"use client";

import { createApiClient } from "@egofi/sdk";
import type { PublicPlanDto } from "@egofi/types";
import type { SubscriptionPeriodUnit } from "@egofi/types";
import { Button } from "@egofi/ui";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

const api = createApiClient();

interface PayOption {
  id: string;
  asset: string;
  chain: string;
  /** Short network label shown under the ticker. */
  network: string;
}

const PAY_OPTIONS: PayOption[] = [
  { id: "USDT-TRON", asset: "USDT", chain: "TRON", network: "TRC-20" },
  { id: "USDT-BSC", asset: "USDT", chain: "BSC", network: "BSC" },
  { id: "USDT-POLYGON", asset: "USDT", chain: "POLYGON", network: "Polygon" },
  { id: "USDC-BASE", asset: "USDC", chain: "BASE", network: "Base" },
  { id: "USDC-SOLANA", asset: "USDC", chain: "SOLANA", network: "Solana" },
  { id: "BTC-BITCOIN", asset: "BTC", chain: "BITCOIN", network: "Bitcoin" },
  { id: "ETH-ETHEREUM", asset: "ETH", chain: "ETHEREUM", network: "Ethereum" },
  { id: "SOL-SOLANA", asset: "SOL", chain: "SOLANA", network: "Solana" },
];

function billingCycle(duration: number, unit: SubscriptionPeriodUnit): string {
  const noun = unit.toLowerCase();
  return duration === 1 ? `every ${noun}` : `every ${duration} ${noun}s`;
}

export function SubscribePageClient({ plan }: { plan: PublicPlanDto }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<PayOption>(PAY_OPTIONS[0] as PayOption);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.publicPlans.subscribe(plan.id, {
        customerEmail: email.trim().toLowerCase(),
        payAsset: selected.asset,
        payChain: selected.chain,
      });
      router.push(`/pay/${res.invoiceId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start the subscription. Please try again.",
      );
      setSubmitting(false);
    }
  };

  if (!plan.active) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-card">
          <h1 className="text-lg font-semibold text-navy-950">This plan isn&apos;t available</h1>
          <p className="mt-2 text-sm text-navy-500">
            {plan.merchantBusiness} is no longer accepting new subscribers for “{plan.title}”.
            Please contact them directly.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-navy-50 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        {/* Merchant + plan summary */}
        <div className="rounded-t-2xl border border-b-0 border-navy-100 bg-gradient-to-br from-navy-950 to-primary-900 p-7 text-white">
          <p className="text-xs font-medium uppercase tracking-widest text-white/50">
            {plan.merchantBusiness}
          </p>
          <h1 className="mt-1.5 text-xl font-bold tracking-tight">{plan.title}</h1>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums">
              {Number(plan.costPerPeriod).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-lg font-medium text-white/70">{plan.currency}</span>
          </div>
          <p className="mt-1 text-sm text-white/60">
            billed {billingCycle(plan.periodDuration, plan.periodUnit)}
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-6 rounded-b-2xl border border-navy-100 bg-white p-7 shadow-card"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-navy-800">
              Your email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 outline-none transition-all placeholder:text-navy-300 hover:border-navy-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
            />
            <p className="text-xs text-navy-400">
              We&apos;ll send your payment link here each billing period.
            </p>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-navy-800">Pay with</legend>
            <div className="grid grid-cols-2 gap-2">
              {PAY_OPTIONS.map((opt) => {
                const active = opt.id === selected.id;
                return (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 transition-all ${
                      active
                        ? "border-primary-500 bg-primary-50 ring-2 ring-primary-500/20"
                        : "border-navy-200 hover:border-navy-300 hover:bg-navy-50/60"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-navy-900">{opt.asset}</span>
                      <span className="block text-xs text-navy-400">{opt.network}</span>
                    </span>
                    <input
                      type="radio"
                      name="payAsset"
                      value={opt.id}
                      checked={active}
                      onChange={() => setSelected(opt)}
                      className="size-4 border-navy-300 text-primary focus:ring-2 focus:ring-primary-500/40"
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-danger-600">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" loading={submitting} className="w-full">
            Subscribe &amp; pay first period
          </Button>

          <p className="text-center text-xs leading-relaxed text-navy-400">
            You&apos;ll pay {plan.costPerPeriod} {plan.currency} worth of {selected.asset} now, then{" "}
            {billingCycle(plan.periodDuration, plan.periodUnit)}. Cancel any time by contacting{" "}
            {plan.merchantBusiness}. Payments go directly to the merchant — egofi never holds your
            funds.
          </p>
        </form>
      </div>
    </main>
  );
}
