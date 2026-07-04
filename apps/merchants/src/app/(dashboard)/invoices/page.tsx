"use client";

import type { InvoiceDto } from "@egofi/types";
import { Button, cn } from "@egofi/ui";
import { useEffect, useMemo, useState } from "react";
import { PayWith } from "../../../lib/PayWith";
import { api } from "../../../lib/api";
import { loginRedirect } from "../../../lib/auth";
import { checkoutUrl } from "../../../lib/checkout-url";
import { InvoiceStateBadge } from "../../../lib/invoice-state";

const PAGE_SIZE = 20;

const FILTERS = [
  { value: undefined, label: "All" },
  { value: "AWAITING_PAYMENT", label: "Awaiting" },
  { value: "PAID_CONFIRMED", label: "Paid" },
  { value: "UNDERPAID", label: "Underpaid" },
  { value: "FAILED", label: "Failed" },
  { value: "EXPIRED", label: "Expired" },
] as const;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const PlusIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden>
    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5z" />
  </svg>
);

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("egofi_token");
    if (!token) {
      loginRedirect();
      return;
    }
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

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((i) =>
      `${i.id} ${i.payAsset} ${i.payChain} ${i.displayAmount} ${i.displayCurrency}`
        .toLowerCase()
        .includes(q),
    );
  }, [invoices, query]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-6 lg:p-10">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Payments</h1>
          <p className="mt-1 text-sm text-navy-500">
            {total} {total === 1 ? "payment" : "payments"} total
          </p>
        </div>
        <a href="/invoices/new">
          <Button size="lg">
            {PlusIcon}
            New payment link
          </Button>
        </a>
      </header>

      {/* Toolbar: filters + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 overflow-x-auto rounded-xl border border-navy-200 bg-white p-1 shadow-xs">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.label}
                type="button"
                onClick={() => {
                  setFilter(f.value);
                  setPage(1);
                }}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-navy-950 text-white shadow-sm" : "text-navy-500 hover:text-navy-800",
                )}
                aria-pressed={active}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 sm:w-64 sm:shrink-0 focus-within:border-primary-500">
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-navy-400" aria-hidden>
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 3.16 10.01l3.66 3.66a.75.75 0 1 0 1.06-1.06l-3.66-3.66A5.5 5.5 0 0 0 9 3.5zM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0z"
              clipRule="evenodd"
            />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this page…"
            className="w-full bg-transparent text-sm text-navy-900 placeholder:text-navy-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonList />
      ) : rows.length === 0 ? (
        <EmptyState filtered={Boolean(filter) || query.trim() !== ""} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-left text-xs font-medium uppercase tracking-wide text-navy-400">
                  <th className="px-6 py-3.5 font-medium">Payment</th>
                  <th className="px-6 py-3.5 font-medium">Amount</th>
                  <th className="px-6 py-3.5 font-medium">Pay with</th>
                  <th className="px-6 py-3.5 font-medium">Created</th>
                  <th className="px-6 py-3.5 font-medium">Status</th>
                  <th className="px-6 py-3.5 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {rows.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => {
                      window.location.href = `/invoices/${inv.id}`;
                    }}
                    className="group cursor-pointer transition-colors hover:bg-navy-50/50"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-navy-600">
                      {inv.id.slice(0, 16)}…
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold tabular-nums text-navy-950">
                        {inv.displayAmount}
                      </span>{" "}
                      <span className="text-navy-400">{inv.displayCurrency}</span>
                    </td>
                    <td className="px-6 py-4">
                      <PayWith asset={inv.payAsset} chain={inv.payChain} />
                    </td>
                    <td
                      className="px-6 py-4 text-navy-500"
                      title={new Date(inv.createdAt).toLocaleString()}
                    >
                      {timeAgo(inv.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <InvoiceStateBadge state={inv.state} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <RowAction
                          title="Copy payment link"
                          onClick={() => navigator.clipboard.writeText(checkoutUrl(inv.id))}
                        >
                          <svg
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            className="size-4"
                            aria-hidden
                          >
                            <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h4.5A1.5 1.5 0 0 1 13 3.5v7a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5v-7z" />
                            <path d="M3 5.75A1.75 1.75 0 0 1 4.75 4H5v6.5A2.5 2.5 0 0 0 7.5 13H11v.25A1.75 1.75 0 0 1 9.25 15h-4.5A1.75 1.75 0 0 1 3 13.25v-7.5z" />
                          </svg>
                        </RowAction>
                        <RowAction title="Open checkout" href={checkoutUrl(inv.id)}>
                          <svg
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            className="size-4"
                            aria-hidden
                          >
                            <path d="M6.5 3.5a.75.75 0 0 0 0 1.5h2.44L4.22 9.72a.75.75 0 1 0 1.06 1.06L10 6.06V8.5a.75.75 0 0 0 1.5 0v-4a.75.75 0 0 0-.75-.75h-4z" />
                            <path d="M3.5 5.5A1.5 1.5 0 0 1 5 4h1a.75.75 0 0 1 0 1.5H5v5.5h5.5V10a.75.75 0 0 1 1.5 0v1a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11v-5.5z" />
                          </svg>
                        </RowAction>
                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="size-4 text-navy-300"
                          aria-hidden
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((inv) => (
              <a
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="block rounded-2xl border border-navy-100 bg-white p-4 shadow-card transition-colors active:bg-navy-50/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-bold tabular-nums text-navy-950">
                    {inv.displayAmount}{" "}
                    <span className="text-sm font-normal text-navy-400">{inv.displayCurrency}</span>
                  </span>
                  <InvoiceStateBadge state={inv.state} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <PayWith asset={inv.payAsset} chain={inv.payChain} />
                  <span className="shrink-0 text-xs text-navy-400">{timeAgo(inv.createdAt)}</span>
                </div>
                <p className="mt-2 font-mono text-[11px] text-navy-400">{inv.id.slice(0, 22)}…</p>
              </a>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && !query.trim() && (
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

function RowAction({
  title,
  onClick,
  href,
  children,
}: {
  title: string;
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
}) {
  const cls =
    "flex size-8 items-center justify-center rounded-lg text-navy-400 transition-colors hover:bg-navy-100 hover:text-navy-700";
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        aria-label={title}
        onClick={stop}
        className={cls}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => {
        stop(e);
        onClick?.();
      }}
      className={cls}
    >
      {children}
    </button>
  );
}

function SkeletonList() {
  return (
    <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card">
      <div className="divide-y divide-navy-50">
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length skeleton placeholder
          <div key={i} className="flex items-center gap-4 px-6 py-4">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-4 w-20" />
            <div className="skeleton size-6 rounded-full" />
            <div className="skeleton h-4 w-16" />
            <div className="skeleton ml-auto h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-2xl border border-navy-100 bg-white px-6 py-16 text-center shadow-card">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-navy-50">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="size-7 text-navy-400"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
          />
        </svg>
      </div>
      <p className="mt-4 font-semibold text-navy-900">
        {filtered ? "No payments match" : "No payments yet"}
      </p>
      <p className="mt-1 text-sm text-navy-500">
        {filtered
          ? "Try a different filter or search term."
          : "Create your first payment link to start collecting crypto."}
      </p>
      {!filtered && (
        <a href="/invoices/new" className="mt-5 inline-block">
          <Button>
            {PlusIcon}
            New payment link
          </Button>
        </a>
      )}
    </div>
  );
}
