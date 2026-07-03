"use client";

import { useEffect, useState } from "react";
import { createApiClient } from "@egofi/sdk";
import type { MerchantProfile, InvoiceDto } from "@egofi/types";
import { Button, Card, CardContent, Skeleton } from "@egofi/ui";
import { InvoiceStateBadge } from "../../../lib/invoice-state";

const api = createApiClient();

const PlusIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden>
    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5z" />
  </svg>
);

const STAT_ICONS = {
  total: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
      <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.6a1.5 1.5 0 0 0-.44-1.06l-3.6-3.6A1.5 1.5 0 0 0 11.4 2H4.5zm2.25 6a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5z" clipRule="evenodd" />
    </svg>
  ),
  paid: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  ),
  flight: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm.75-13a.75.75 0 0 0-1.5 0v5c0 .27.144.518.378.65l3.5 2a.75.75 0 0 0 .744-1.3L10.75 9.566V5z" clipRule="evenodd" />
    </svg>
  ),
};

export default function DashboardPage() {
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("egofi_token");
    if (!token) { window.location.href = "/login"; return; }
    api.setAuthToken(token);
    void (async () => {
      try {
        const [profile, inv] = await Promise.all([
          api.merchant.getProfile(),
          api.invoices.list({ limit: 8 }),
        ]);
        setMerchant(profile);
        setInvoices(inv.data);
        setTotal(inv.total);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const confirmed = invoices.filter((i) => i.state === "PAID_CONFIRMED").length;
  const inflight = invoices.filter((i) =>
    ["AWAITING_PAYMENT", "RECEIVED", "CONVERTING", "PAYOUT_SENT"].includes(i.state),
  ).length;

  const stats = [
    { key: "total", label: "Total invoices", value: total, icon: STAT_ICONS.total, tint: "text-primary bg-primary-50" },
    { key: "paid", label: "Paid & confirmed", value: confirmed, icon: STAT_ICONS.paid, tint: "text-success-700 bg-success-50" },
    { key: "flight", label: "In flight", value: inflight, icon: STAT_ICONS.flight, tint: "text-info-700 bg-info-50" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-5 sm:p-6 lg:p-10">
      {/* Greeting + CTA */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-navy-400">Welcome back</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-navy-950">
            {loading ? <Skeleton className="h-8 w-48" /> : merchant?.business}
          </h1>
        </div>
        <a href="/invoices/new">
          <Button size="lg">{PlusIcon} New payment link</Button>
        </a>
      </header>

      {/* Pending approval callout */}
      {!loading && merchant?.status !== "ACTIVE" && (
        <div className="animate-fade-in-up overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM8.94 6.94a1.5 1.5 0 1 1 2.12 2.12L10 10.06V11a.75.75 0 0 1-1.5 0v-1.19c0-.398.158-.78.44-1.06l.94-.94a.5.5 0 1 0-.707-.708.75.75 0 0 1-1.06-1.06z" clipRule="evenodd" />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-amber-900">Your account is awaiting approval</p>
              <p className="mt-1 text-sm text-amber-800">
                Explore freely now. Once approved, your payment links go live. Set your
                receiving addresses in{" "}
                <a href="/settings/settlement" className="font-semibold underline underline-offset-2">Settlement</a>{" "}
                and complete{" "}
                <a href="/settings/verification" className="font-semibold underline underline-offset-2">Verification</a>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.key} className="p-5">
            <div className="flex items-center justify-between">
              <span className={`flex size-10 items-center justify-center rounded-xl ${stat.tint}`}>
                {stat.icon}
              </span>
            </div>
            <p className="mt-4 text-sm font-medium text-navy-500">{stat.label}</p>
            {loading ? (
              <Skeleton className="mt-1 h-9 w-16" />
            ) : (
              <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-navy-950">
                {stat.value}
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Invoices */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-navy-950">
            Recent invoices
          </h2>
          {total > invoices.length && (
            <a href="/invoices" className="text-sm font-medium text-primary hover:text-primary-700 hover:underline underline-offset-2">
              View all →
            </a>
          )}
        </div>

        <Card>
          {loading ? (
            <div className="space-y-3 p-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="ml-auto h-6 w-24 rounded-full" />
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <CardContent className="p-12 pt-12">
              <div className="text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-navy-50">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-7 text-navy-400" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                  </svg>
                </div>
                <p className="mt-4 font-semibold text-navy-900">No invoices yet</p>
                <p className="mt-1 text-sm text-navy-500">
                  Create your first payment link to start accepting crypto.
                </p>
                <a href="/invoices/new" className="mt-5 inline-block">
                  <Button>{PlusIcon} New payment link</Button>
                </a>
              </div>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-100 text-left">
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-navy-400">Invoice</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-navy-400">Amount</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-navy-400">Pay asset</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-navy-400">Created</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-navy-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => { window.location.href = `/invoices/${inv.id}`; }}
                      className="cursor-pointer transition-colors hover:bg-navy-50/60"
                    >
                      <td className="px-6 py-4 font-mono text-xs text-navy-600">
                        {inv.id.slice(0, 14)}…
                      </td>
                      <td className="px-6 py-4 font-semibold tabular-nums text-navy-950">
                        {inv.displayAmount}{" "}
                        <span className="font-normal text-navy-500">{inv.displayCurrency}</span>
                      </td>
                      <td className="px-6 py-4 text-navy-600">{inv.payAsset}</td>
                      <td className="px-6 py-4 text-navy-500">
                        {new Date(inv.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <InvoiceStateBadge state={inv.state} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
