"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createApiClient } from "@egofi/sdk";
import type { InvoiceDto } from "@egofi/types";
import { InvoiceState } from "@egofi/types";
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from "@egofi/ui";
import { InvoiceStateBadge } from "../../../../lib/invoice-state";
import { checkoutUrl } from "../../../../lib/checkout-url";
import { CopyButton } from "../../../../lib/CopyButton";

const api = createApiClient();

const POLL_INTERVAL_MS = 6_000;
const TERMINAL_STATES: string[] = [
  InvoiceState.PaidConfirmed,
  InvoiceState.Refunded,
  InvoiceState.Failed,
  InvoiceState.Expired,
];

export default function InvoiceDetailPage() {
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = params.invoiceId;
  const [invoice, setInvoice] = useState<InvoiceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchInvoice = useCallback(async () => {
    try {
      const inv = await api.invoices.get(invoiceId);
      setInvoice(inv);
      return inv;
    } catch {
      setNotFound(true);
      return null;
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    const token = localStorage.getItem("egofi_token");
    if (!token) { window.location.href = "/login"; return; }
    api.setAuthToken(token);

    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      const inv = await fetchInvoice();
      if (inv && !TERMINAL_STATES.includes(inv.state)) {
        timer = setTimeout(run, POLL_INTERVAL_MS);
      }
    };
    void run();
    return () => clearTimeout(timer);
  }, [fetchInvoice]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div className="mx-auto max-w-2xl p-6 lg:p-10">
        <a href="/invoices" className="text-sm font-medium text-navy-400 hover:text-navy-700">
          ← Invoices
        </a>
        <Card className="mt-4">
          <CardContent className="p-12 text-center">
            <p className="font-medium text-navy-800">Invoice not found</p>
            <p className="mt-1 text-sm text-navy-500">
              It may have been removed, or the link is incorrect.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const url = checkoutUrl(invoice.id);
  const isLive = !TERMINAL_STATES.includes(invoice.state);
  const isPayable = invoice.state === InvoiceState.AwaitingPayment;

  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Invoice ID", value: <span className="font-mono text-xs">{invoice.id}</span> },
    {
      label: "Amount",
      value: (
        <span className="font-semibold">
          {invoice.displayAmount} {invoice.displayCurrency}
        </span>
      ),
    },
    { label: "Customer pays", value: `${invoice.payAsset} · ${invoice.payChain}` },
    { label: "Rail", value: invoice.rail.replace(/_/g, " ").toLowerCase() },
    {
      label: "Created",
      value: new Date(invoice.createdAt).toLocaleString(),
    },
    {
      label: "Expires",
      value: new Date(invoice.expiresAt).toLocaleString(),
    },
    ...(invoice.refundAddress
      ? [{ label: "Refund address", value: <span className="font-mono text-xs break-all">{invoice.refundAddress}</span> }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-10">
      <header className="space-y-3">
        <a href="/invoices" className="text-sm font-medium text-navy-400 hover:text-navy-700">
          ← Invoices
        </a>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-navy-950">
              {invoice.displayAmount} {invoice.displayCurrency}
            </h1>
            <InvoiceStateBadge state={invoice.state} />
          </div>
          {isLive && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-400">
              <span className="size-1.5 rounded-full bg-success-500 animate-pulse" />
              Live — updates automatically
            </span>
          )}
        </div>
      </header>

      {/* Shareable checkout link (only while payable) */}
      {isPayable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment link</CardTitle>
            <p className="text-sm text-navy-500">Share this with your customer.</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 rounded-xl border border-navy-100 bg-navy-50/50 p-3">
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-navy-800">
                {url}
              </span>
              <CopyButton text={url} label="payment link" />
            </div>
            <div className="mt-3">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm">Open checkout →</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-navy-50">
            {rows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 py-3">
                <dt className="text-sm text-navy-500">{row.label}</dt>
                <dd className="max-w-[60%] text-right text-sm text-navy-900">{row.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
