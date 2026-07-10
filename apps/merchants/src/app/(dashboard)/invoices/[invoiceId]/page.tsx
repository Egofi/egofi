"use client";

import type {
  CheckoutSessionDto,
  InvoiceDto,
  InvoiceEventDto,
  InvoiceStatusDto,
} from "@egofi/types";
import { CHAIN_CONFIGS, type Chain, InvoiceState } from "@egofi/types";
import { Spinner, cn } from "@egofi/ui";
import Decimal from "decimal.js";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CopyButton } from "../../../../lib/CopyButton";
import { PayWith } from "../../../../lib/PayWith";
import { api } from "../../../../lib/api";
import { loginRedirect } from "../../../../lib/auth";
import { checkoutUrl } from "../../../../lib/checkout-url";
import {
  type ButtonVariant,
  buttonImageUrl,
  buttonSnippet,
  widgetSnippet,
} from "../../../../lib/embeds";
import { describeEvent } from "../../../../lib/invoice-events";
import { INVOICE_STATE_CONFIG, InvoiceStateBadge } from "../../../../lib/invoice-state";

const POLL_INTERVAL_MS = 6_000;
const TERMINAL_STATES: string[] = [
  InvoiceState.PaidConfirmed,
  InvoiceState.Refunded,
  InvoiceState.Failed,
  InvoiceState.Expired,
];

const STATUS_TEXT_COLOR: Record<string, string> = {
  success: "text-success-600",
  danger: "text-danger-600",
  warning: "text-amber-600",
  info: "text-info-600",
  accent: "text-info-600",
  default: "text-navy-400",
};

type Tab = "history" | "timeline" | "link" | "widget" | "button";
const TABS: { id: Tab; label: string }[] = [
  { id: "history", label: "History" },
  { id: "timeline", label: "Timeline" },
  { id: "link", label: "Link" },
  { id: "widget", label: "Widget" },
  { id: "button", label: "Button" },
];

function explorerTxUrl(chain: string, hash: string): string | null {
  const cfg = CHAIN_CONFIGS[chain as Chain];
  if (!cfg) return null;
  const path = chain.toUpperCase() === "TRON" ? `/#/transaction/${hash}` : `/tx/${hash}`;
  return `${cfg.explorerBaseUrl}${path}`;
}

function trimCrypto(v: string): string {
  return new Decimal(v || "0").toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}
function fromBaseUnits(v: string): string {
  return trimCrypto(new Decimal(v || "0").div(1e6).toString());
}
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d
    .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
    .toLowerCase();
  return `${date}, ${time}`;
}

export default function InvoiceDetailPage() {
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = params.invoiceId;

  const [invoice, setInvoice] = useState<InvoiceDto | null>(null);
  const [session, setSession] = useState<CheckoutSessionDto | null>(null);
  const [status, setStatus] = useState<InvoiceStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("history");

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
    if (!token) {
      loginRedirect();
      return;
    }
    api.setAuthToken(token);
    // Session (address/exact amount) + status (updatedAt, tx hashes) power the
    // History row. Both are public checkout endpoints keyed by invoice id.
    void api.checkout
      .getSession(invoiceId)
      .then(setSession)
      .catch(() => {});
  }, [invoiceId]);

  useEffect(() => {
    const token = localStorage.getItem("egofi_token");
    if (!token) return;
    api.setAuthToken(token);
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      const inv = await fetchInvoice();
      await api.checkout
        .getStatus(invoiceId)
        .then(setStatus)
        .catch(() => {});
      if (inv && !TERMINAL_STATES.includes(inv.state)) timer = setTimeout(run, POLL_INTERVAL_MS);
    };
    void run();
    return () => clearTimeout(timer);
  }, [fetchInvoice, invoiceId]);

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
        <div className="mt-4 rounded-2xl border border-navy-100 bg-white p-12 text-center">
          <p className="font-medium text-navy-800">Invoice not found</p>
          <p className="mt-1 text-sm text-navy-500">
            It may have been removed, or the link is incorrect.
          </p>
        </div>
      </div>
    );
  }

  const isLive = !TERMINAL_STATES.includes(invoice.state);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-6 lg:p-10">
      {/* Header */}
      <header className="flex items-center gap-3">
        <a
          href="/invoices"
          aria-label="Back to payments"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-card transition-colors hover:bg-navy-50"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
            <path
              fillRule="evenodd"
              d="M12.79 5.23a.75.75 0 0 1 0 1.06L9.06 10l3.73 3.71a.75.75 0 1 1-1.06 1.06l-4.25-4.24a.75.75 0 0 1 0-1.06l4.25-4.24a.75.75 0 0 1 1.06 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="sr-only">Back to payments</span>
        </a>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-navy-400">Invoice</p>
            {invoice.subscriptionId && (
              <span className="rounded-full bg-info-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-info-700 ring-1 ring-inset ring-info-200">
                Recurring
              </span>
            )}
          </div>
          <h1 className="truncate font-mono text-lg font-bold text-navy-950 sm:text-xl">
            {invoice.id}
          </h1>
        </div>
      </header>

      {/* Summary band */}
      <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-navy-400">Price</p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-navy-950">
              {invoice.displayAmount}{" "}
              <span className="text-xl font-semibold text-navy-400">{invoice.displayCurrency}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isLive && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-400">
                <span className="size-1.5 rounded-full bg-success-500 animate-pulse" />
                Live
              </span>
            )}
            <InvoiceStateBadge state={invoice.state} />
          </div>
        </div>
        <dl className="grid gap-4 border-t border-navy-50 bg-navy-50/30 px-5 py-4 text-sm sm:grid-cols-3 sm:px-6">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-navy-400">Pay with</dt>
            <dd className="mt-1.5">
              <PayWith asset={invoice.payAsset} chain={invoice.payChain} size={22} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-navy-400">Created</dt>
            <dd className="mt-1.5 font-medium text-navy-700">
              {formatDateTime(invoice.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-navy-400">Expires</dt>
            <dd className="mt-1.5 font-medium text-navy-700">
              {formatDateTime(invoice.expiresAt)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Tabs */}
      <div className="border-b border-navy-100">
        <div className="flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "relative -mb-px border-b-2 pb-2.5 text-sm font-semibold transition-colors",
                tab === t.id
                  ? "border-primary text-navy-950"
                  : "border-transparent text-navy-400 hover:text-navy-700",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "history" && <HistoryTab invoice={invoice} session={session} status={status} />}
      {tab === "timeline" && <TimelineTab invoiceId={invoice.id} live={isLive} />}
      {tab === "link" && <LinkTab invoiceId={invoice.id} />}
      {tab === "widget" && <WidgetTab invoiceId={invoice.id} />}
      {tab === "button" && <ButtonTab invoiceId={invoice.id} />}
    </div>
  );
}

/** Stand-in for a crypto amount that does not exist yet, rather than a bare 0. */
function NotQuotedYet() {
  return (
    <span
      className="cursor-help font-normal text-navy-300"
      title="The rate is locked when the customer first opens the payment link, so there is no crypto amount yet."
    >
      —
    </span>
  );
}

// ── History ───────────────────────────────────────────────────────
function HistoryTab({
  invoice,
  session,
  status,
}: {
  invoice: InvoiceDto;
  session: CheckoutSessionDto | null;
  status: InvoiceStatusDto | null;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showFilter, setShowFilter] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // A merchant-created invoice carries no crypto quote until the customer first
  // opens the payment link — that is when the rate is fetched and locked. Until
  // then `quotedAmount` is 0, and printing "0 USDT" reads as "worth nothing".
  const quoted = Number.parseFloat(invoice.quotedAmount || "0") > 0;
  const amountSent = session
    ? `${fromBaseUnits(session.instructions.exactAmount)} ${invoice.payAsset}`
    : quoted
      ? `${trimCrypto(invoice.quotedAmount)} ${invoice.payAsset}`
      : null;
  // Expected settlement (nominal quote) — always slightly below what's sent.
  const amountReceived = quoted ? `${trimCrypto(invoice.quotedAmount)} ${invoice.payAsset}` : null;
  const statusUpdated = status?.updatedAt ?? invoice.createdAt;
  const cfg = INVOICE_STATE_CONFIG[invoice.state] ?? { variant: "default", label: invoice.state };
  const statusColor = STATUS_TEXT_COLOR[cfg.variant] ?? "text-navy-500";

  const matches =
    (query.trim() === "" || invoice.id.toLowerCase().includes(query.trim().toLowerCase())) &&
    (statusFilter === "ALL" || invoice.state === statusFilter);

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 sm:p-6">
      <p className="text-sm text-navy-500">
        This history includes transactions from all your payment tools.
      </p>

      {/* Search + filter */}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 focus-within:border-primary-500">
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
            placeholder="Search by ID"
            className="w-full bg-transparent text-sm text-navy-900 placeholder:text-navy-400 focus:outline-none"
          />
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFilter((v) => !v)}
            aria-label="Filter"
            aria-expanded={showFilter}
            className={cn(
              "flex size-[42px] items-center justify-center rounded-xl border transition-colors",
              statusFilter !== "ALL"
                ? "border-primary bg-primary-50 text-primary"
                : "border-navy-200 text-navy-500 hover:bg-navy-50",
            )}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
              <path d="M6 4a2 2 0 1 1 3.874.667H16.25a.75.75 0 0 1 0 1.5H9.874A2 2 0 0 1 6 5.833V4zm-2 .833H2.75a.75.75 0 0 1 0-1.5H4a.75.75 0 0 1 0 1.5zM14 10a2 2 0 1 1 3.874.667h-.624a.75.75 0 0 1 0 1.5h.624A2 2 0 0 1 14 11.833V10zm-2 .833H2.75a.75.75 0 0 1 0-1.5H12a.75.75 0 0 1 0 1.5zM8 16a2 2 0 1 1 3.874.667h4.376a.75.75 0 0 1 0 1.5h-4.376A2 2 0 0 1 8 17.833V16zm-4 .833H2.75a.75.75 0 0 1 0-1.5H4a.75.75 0 0 1 0 1.5z" />
            </svg>
          </button>
          {showFilter && (
            <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-navy-100 bg-white p-1 shadow-xl">
              {["ALL", ...Object.keys(INVOICE_STATE_CONFIG)].slice(0, 8).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatusFilter(s);
                    setShowFilter(false);
                  }}
                  className={cn(
                    "block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors hover:bg-navy-50",
                    statusFilter === s ? "font-semibold text-primary" : "text-navy-700",
                  )}
                >
                  {s === "ALL" ? "All statuses" : (INVOICE_STATE_CONFIG[s]?.label ?? s)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-navy-100 text-left text-xs font-medium uppercase tracking-wide text-navy-400">
              <th className="py-3 pr-4 font-medium">Payment ID</th>
              <th className="py-3 pr-4 font-medium">Amount sent</th>
              <th className="py-3 pr-4 font-medium">Amount received</th>
              <th className="py-3 pr-4 font-medium">Created at</th>
              <th className="py-3 pr-4 font-medium">Status updated</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 text-right font-medium">More info</th>
            </tr>
          </thead>
          <tbody>
            {!matches ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-navy-400">
                  No transactions match your search.
                </td>
              </tr>
            ) : (
              <>
                <tr className="border-b border-navy-50">
                  <td className="py-4 pr-4 font-mono text-xs text-navy-400">{invoice.id}</td>
                  <td className="py-4 pr-4 font-semibold text-navy-950">
                    {amountSent ?? <NotQuotedYet />}
                  </td>
                  <td className="py-4 pr-4 font-semibold text-navy-950">
                    {amountReceived ?? <NotQuotedYet />}
                  </td>
                  <td className="py-4 pr-4 text-navy-500">{formatDateTime(invoice.createdAt)}</td>
                  <td className="py-4 pr-4 text-navy-500">{formatDateTime(statusUpdated)}</td>
                  <td className={cn("py-4 pr-4 font-medium", statusColor)}>{cfg.label}</td>
                  <td className="py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setExpanded((v) => !v)}
                      aria-label="More info"
                      aria-expanded={expanded}
                      className="inline-flex size-7 items-center justify-center rounded-md bg-primary-50 text-primary transition-colors hover:bg-primary-100"
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden>
                        <path d="M4 2.5A1.5 1.5 0 0 1 5.5 1h3.379a1.5 1.5 0 0 1 1.06.44l2.122 2.12A1.5 1.5 0 0 1 12.5 4.62V13.5A1.5 1.5 0 0 1 11 15H5.5A1.5 1.5 0 0 1 4 13.5v-11zM6 7.25a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5H6zm0 3a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5H6z" />
                      </svg>
                    </button>
                  </td>
                </tr>
                {expanded && (
                  <tr>
                    <td colSpan={7} className="bg-navy-50/40 px-4 py-4">
                      <dl className="grid gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2">
                        <DetailItem label="Network">
                          {invoice.payAsset} · {invoice.payChain}
                        </DetailItem>
                        <DetailItem label="Rail">
                          {invoice.rail.replace(/_/g, " ").toLowerCase()}
                        </DetailItem>
                        {session && (
                          <DetailItem
                            label="Deposit address"
                            mono
                            copy={session.instructions.depositAddress}
                          >
                            <span className="break-all">{session.instructions.depositAddress}</span>
                          </DetailItem>
                        )}
                        <DetailItem label="Expires">{formatDateTime(invoice.expiresAt)}</DetailItem>
                        {status?.depositTxHash && (
                          <DetailItem label="Deposit tx" mono copy={status.depositTxHash}>
                            <span className="break-all">{status.depositTxHash}</span>
                          </DetailItem>
                        )}
                        {status?.payoutTxHash && (
                          <DetailItem label="Payout tx" mono copy={status.payoutTxHash}>
                            <span className="break-all">{status.payoutTxHash}</span>
                          </DetailItem>
                        )}
                      </dl>
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  children,
  mono,
  copy,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  copy?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-navy-500">{label}</dt>
      <dd className={cn("min-w-0 text-right text-navy-800", mono && "font-mono text-xs")}>
        <span className="inline-flex items-center gap-1">
          {children}
          {copy && <CopyButton text={copy} label={label} className="px-1 py-0.5" />}
        </span>
      </dd>
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────
function TimelineTab({ invoiceId, live }: { invoiceId: string; live: boolean }) {
  const [events, setEvents] = useState<InvoiceEventDto[] | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      try {
        setEvents(await api.invoices.events(invoiceId));
      } catch {
        setEvents([]);
      }
      if (live) timer = setTimeout(run, POLL_INTERVAL_MS);
    };
    void run();
    return () => clearTimeout(timer);
  }, [invoiceId, live]);

  if (events === null) {
    return (
      <div className="flex justify-center rounded-2xl border border-navy-100 bg-white py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-navy-100 bg-white p-12 text-center">
        <p className="font-medium text-navy-800">Nothing has happened yet</p>
        <p className="mt-1 text-sm text-navy-500">
          Events appear here as the deposit is detected, converted, and confirmed.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-navy-500">
          Every state change and on-chain leg, in the order it happened.
        </p>
        {live && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-400">
            <span className="size-1.5 rounded-full bg-success-500 animate-pulse" />
            Live
          </span>
        )}
      </div>

      <ol className="mt-6 space-y-0">
        {events.map((ev, i) => {
          const meta = describeEvent(ev.type);
          const isLast = i === events.length - 1;
          const explorer = ev.txHash && ev.chain ? explorerTxUrl(ev.chain, ev.txHash) : null;
          return (
            <li key={ev.id} className="relative flex gap-4 pb-6 last:pb-0">
              {!isLast && (
                <span className="absolute left-[5px] top-3 h-full w-px bg-navy-100" aria-hidden />
              )}
              <span className={cn("relative mt-1.5 size-2.5 shrink-0 rounded-full", meta.dot)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-semibold text-navy-950">{meta.label}</p>
                  <time className="shrink-0 text-xs text-navy-400">{formatDateTime(ev.ts)}</time>
                </div>
                {meta.detail && <p className="mt-0.5 text-sm text-navy-500">{meta.detail}</p>}

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy-400">
                  {ev.amount && ev.asset && (
                    <span className="font-medium tabular-nums text-navy-600">
                      {trimCrypto(ev.amount)} {ev.asset}
                    </span>
                  )}
                  {ev.leg && <span>leg: {ev.leg.toLowerCase()}</span>}
                  {ev.rail && <span>{ev.rail.replace(/_/g, " ").toLowerCase()}</span>}
                  {ev.txHash &&
                    (explorer ? (
                      <a
                        href={explorer}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-primary hover:underline"
                      >
                        {ev.txHash.slice(0, 10)}…{ev.txHash.slice(-6)} ↗
                      </a>
                    ) : (
                      <span className="font-mono">{ev.txHash.slice(0, 16)}…</span>
                    ))}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Link ──────────────────────────────────────────────────────────
function LinkTab({ invoiceId }: { invoiceId: string }) {
  const url = checkoutUrl(invoiceId);
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 sm:p-6">
      <p className="text-sm text-navy-500">Share it to customers to start collecting payments.</p>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-navy-50/70 px-4 py-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 break-all text-sm font-semibold text-primary hover:underline"
        >
          {url}
        </a>
        <CopyButton text={url} label="payment link" className="px-1.5 py-1" />
      </div>
    </div>
  );
}

// ── Widget ────────────────────────────────────────────────────────
function WidgetTab({ invoiceId }: { invoiceId: string }) {
  const url = `${checkoutUrl(invoiceId)}?source=widget`;
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div>
          <p className="text-sm text-navy-500">
            Place this source code on your web page and start collecting payments. It renders the
            live checkout inline — no page redirect.
          </p>
          <CodeBlock snippet={widgetSnippet(invoiceId)} className="mt-3" />
          <p className="mt-3 text-xs text-navy-400">
            Adjust <span className="font-mono">width</span> /{" "}
            <span className="font-mono">height</span> to fit your layout — the widget scrolls if
            space is tight.
          </p>
        </div>
        {/* Live preview in a browser-chrome frame */}
        <div className="flex justify-center">
          <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-navy-200 bg-navy-50 shadow-card">
            <div className="flex items-center gap-1.5 border-b border-navy-100 bg-white px-3 py-2">
              <span className="size-2.5 rounded-full bg-danger-300" />
              <span className="size-2.5 rounded-full bg-amber-300" />
              <span className="size-2.5 rounded-full bg-success-300" />
              <span className="ml-2 truncate text-[10px] text-navy-400">Live preview</span>
            </div>
            <iframe
              src={url}
              title="egofi checkout widget"
              className="block h-[560px] w-full bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────
function ButtonTab({ invoiceId }: { invoiceId: string }) {
  const [variant, setVariant] = useState<ButtonVariant>("white");
  const href = `${checkoutUrl(invoiceId)}?source=button`;

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 sm:p-6">
      <div>
        <p className="text-sm font-medium text-navy-600">1. Choose button option</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {(["black", "white"] as const).map((v) => (
            <label
              key={v}
              className={cn(
                "flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition-colors",
                variant === v ? "border-primary ring-2 ring-primary/20" : "border-navy-200",
              )}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="button-variant"
                  checked={variant === v}
                  onChange={() => setVariant(v)}
                  className="size-4 text-primary focus:ring-primary-500/40"
                />
                <span className="text-sm font-medium capitalize text-navy-800">{v}</span>
              </span>
              <a href={href} target="_blank" rel="noreferrer noopener" className="inline-flex">
                {/* Live preview of the exact hosted image used in the snippet. */}
                <img src={buttonImageUrl(v)} alt={`Pay in crypto with egofi (${v})`} height={52} />
              </a>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-navy-600">
          2. Place this source code to your web page and start collecting payments
        </p>
        <CodeBlock snippet={buttonSnippet(invoiceId, variant)} className="mt-3" />
      </div>
    </div>
  );
}

// ── Shared code block ─────────────────────────────────────────────
function CodeBlock({ snippet, className }: { snippet: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <pre className="max-h-56 overflow-auto rounded-xl bg-navy-50/80 p-4 pr-14 text-xs leading-relaxed text-navy-700">
        <code className="whitespace-pre-wrap break-all">{snippet}</code>
      </pre>
      <div className="absolute right-2 top-2">
        <CopyButton text={snippet} label="source code" />
      </div>
    </div>
  );
}
