"use client";

import { useEffect, useState } from "react";
import { createApiClient } from "@egofi/sdk";
import type { InvoiceDto } from "@egofi/types";
import { Button, Card, Spinner, cn } from "@egofi/ui";
import { InvoiceStateBadge } from "../../../lib/invoice-state";

const api = createApiClient();

const PAGE_SIZE = 20;

const FILTERS = [
  { value: undefined, label: "All" },
  { value: "AWAITING_PAYMENT", label: "Awaiting" },
  { value: "PAID_CONFIRMED", label: "Paid" },
  { value: "UNDERPAID", label: "Underpaid" },
  { value: "FAILED", label: "Failed" },
  { value: "EXPIRED", label: "Expired" },
] as const;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("egofi_token");
    if (!token) { window.location.href = "/login"; return; }
    api.setAuthToken(token);
    setLoading(true);
    void (async () => {
      try {
        const res = await api.invoices.list({
          page,
          limit: PAGE_SIZE,
          ...(filter ? { state: filter } : {}),
        });
        setInvoices(res.data);
        setTotal(res.total);
      } finally {
        setLoading(false);
      }
    })();
  }, [page, filter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Invoices</h1>
          <p className="mt-1 text-sm text-navy-500">
            {total} {total === 1 ? "invoice" : "invoices"} total.
          </p>
        </div>
        <a href="/invoices/new">
          <Button size="lg">
            <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden>
              <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5z" />
            </svg>
            New payment link
          </Button>
        </a>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-1 overflow-x-auto rounded-lg border border-navy-200 bg-white p-0.5 shadow-sm">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.label}
              type="button"
              onClick={() => { setFilter(f.value); setPage(1); }}
              className={cn(
                "whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-navy-950 text-white shadow-sm"
                  : "text-navy-500 hover:text-navy-800",
              )}
              aria-pressed={active}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-medium text-navy-800">No invoices here</p>
            <p className="mt-1 text-sm text-navy-500">
              {filter ? "No invoices match this filter." : "Create your first payment link to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-left">
                  <th className="px-6 py-3.5 font-medium text-navy-500">Invoice</th>
                  <th className="px-6 py-3.5 font-medium text-navy-500">Amount</th>
                  <th className="px-6 py-3.5 font-medium text-navy-500">Pay with</th>
                  <th className="px-6 py-3.5 font-medium text-navy-500">Created</th>
                  <th className="px-6 py-3.5 text-right font-medium text-navy-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => { window.location.href = `/invoices/${inv.id}`; }}
                    className="cursor-pointer transition-colors hover:bg-navy-50/50"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-navy-700">
                      {inv.id.slice(0, 16)}…
                    </td>
                    <td className="px-6 py-4 font-semibold text-navy-950">
                      {inv.displayAmount}{" "}
                      <span className="font-normal text-navy-500">{inv.displayCurrency}</span>
                    </td>
                    <td className="px-6 py-4 text-navy-600">
                      {inv.payAsset}
                      <span className="text-navy-400"> · {inv.payChain}</span>
                    </td>
                    <td className="px-6 py-4 text-navy-500">
                      {new Date(inv.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-navy-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
