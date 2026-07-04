"use client";

import { createApiClient } from "@egofi/sdk";
import type { CheckoutSessionDto } from "@egofi/types";
import { InvoiceState } from "@egofi/types";
import { cn } from "@egofi/ui";
import Decimal from "decimal.js";
import { useCallback, useEffect, useState } from "react";
import { CoinIcon } from "./CoinIcon";
import { CopyButton } from "./CopyButton";
import { QRCodeCanvas } from "./QRCode";
import { checkoutUrl } from "./checkout-url";
import { PAY_CURRENCIES, networkOf } from "./crypto-assets";
import { buttonImageUrl, buttonSnippet, widgetSnippet } from "./embeds";

const api = createApiClient();

const POLL_MS = 5_000;
const TERMINAL: string[] = [
  InvoiceState.PaidConfirmed,
  InvoiceState.Refunded,
  InvoiceState.Failed,
  InvoiceState.Expired,
];

const STATUS_META: Record<string, { label: string; cls: string; spin?: boolean; done?: boolean }> =
  {
    [InvoiceState.AwaitingPayment]: { label: "Waiting", cls: "text-amber-600", spin: true },
    [InvoiceState.Received]: { label: "Payment received", cls: "text-info-600", spin: true },
    [InvoiceState.Converting]: { label: "Converting", cls: "text-info-600", spin: true },
    [InvoiceState.ComplianceHold]: { label: "On hold", cls: "text-amber-600", spin: true },
    [InvoiceState.PayoutSent]: { label: "Sending to you", cls: "text-info-600", spin: true },
    [InvoiceState.PaidConfirmed]: { label: "Confirmed", cls: "text-success-600", done: true },
    [InvoiceState.Expired]: { label: "Expired", cls: "text-navy-400" },
    [InvoiceState.Failed]: { label: "Failed", cls: "text-danger-600" },
    [InvoiceState.Refunded]: { label: "Refunded", cls: "text-danger-600" },
  };

function formatAmount(baseUnits: string): string {
  return new Decimal(baseUnits || "0").div(1e6).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function iconFor(asset: string, chain: string): string {
  return (
    PAY_CURRENCIES.find((c) => c.asset === asset && c.chain === chain)?.icon ?? asset.toLowerCase()
  );
}

export function OrderDetails({
  invoiceId,
  onCreateAnother,
}: {
  invoiceId: string;
  onCreateAnother: () => void;
}) {
  const [session, setSession] = useState<CheckoutSessionDto | null>(null);
  const [state, setState] = useState<string>(InvoiceState.AwaitingPayment);
  const [error, setError] = useState<string | null>(null);
  const [embed, setEmbed] = useState<"button" | "widget" | null>(null);

  const url = checkoutUrl(invoiceId);

  // Fetch the checkout session — this also lazily issues the invoice (allocates
  // the deposit address), so the QR + amount are live immediately.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const s = await api.checkout.getSession(invoiceId);
        if (active) {
          setSession(s);
          setState(s.invoice.state);
        }
      } catch {
        if (active) setError("Couldn't load payment details.");
      }
    })();
    return () => {
      active = false;
    };
  }, [invoiceId]);

  const poll = useCallback(async () => {
    const s = await api.checkout.getStatus(invoiceId);
    setState(s.state);
    return s.state;
  }, [invoiceId]);

  useEffect(() => {
    if (!session) return;
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      const latest = await poll().catch(() => null);
      if (latest && !TERMINAL.includes(latest)) timer = setTimeout(run, POLL_MS);
    };
    void run();
    return () => clearTimeout(timer);
  }, [session, poll]);

  const status = STATUS_META[state] ?? STATUS_META[InvoiceState.AwaitingPayment]!;

  return (
    <div className="animate-fade-in-up rounded-3xl border border-navy-100 bg-white p-6 shadow-lg sm:p-8">
      <div className="flex items-start justify-between">
        <h1 className="text-xl font-bold tracking-tight text-navy-950">Order details</h1>
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

      {error ? (
        <p className="mt-6 rounded-xl bg-danger-50 p-4 text-sm text-danger-700">{error}</p>
      ) : !session ? (
        <div className="mt-8 flex items-center justify-center gap-2 py-12 text-navy-400">
          <span className="size-5 animate-spin rounded-full border-2 border-navy-200 border-t-primary" />
          Preparing your payment link…
        </div>
      ) : (
        <>
          {/* Details + QR */}
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-3 text-sm">
              <div>
                <span className="text-navy-500">Price: </span>
                <span className="font-bold text-navy-950">
                  {session.invoice.displayAmount} {session.invoice.displayCurrency}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-navy-500">Amount:</span>
                <CoinIcon
                  icon={iconFor(session.instructions.asset, session.instructions.chain)}
                  symbol={session.instructions.asset}
                  size={18}
                />
                <span className="font-bold text-navy-950">
                  {formatAmount(session.instructions.exactAmount)} {session.instructions.asset}
                </span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                    networkOf(session.instructions.chain).badge,
                  )}
                >
                  {networkOf(session.instructions.chain).label}
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="shrink-0 text-navy-500">Address:</span>
                <span className="min-w-0 break-all font-mono text-xs text-navy-800">
                  {session.instructions.depositAddress}
                </span>
                <CopyButton
                  text={session.instructions.depositAddress}
                  label="address"
                  className="px-1.5 py-1"
                />
              </div>
            </div>

            <div className="mx-auto shrink-0 rounded-xl border border-navy-100 bg-white p-2 shadow-card sm:mx-0">
              {/* QR carries the bare wallet address — no URI prefix. */}
              <QRCodeCanvas value={session.instructions.depositAddress} size={148} />
            </div>
          </div>

          <hr className="my-6 border-navy-100" />

          {/* Status */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-navy-500">Status:</span>
            <span className={cn("inline-flex items-center gap-1.5 font-semibold", status.cls)}>
              {status.label}
              {status.spin && (
                <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              {status.done && (
                <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
          </div>

          {/* Share link */}
          <div className="mt-5">
            <p className="text-sm text-navy-600">Share a permanent link to a hosted page:</p>
            <div className="mt-2 flex items-center gap-2">
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

          {/* Or continue with */}
          <div className="mt-6">
            <p className="text-sm text-navy-600">Or continue with:</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <EmbedTab
                active={embed === "button"}
                onClick={() => setEmbed(embed === "button" ? null : "button")}
              >
                Button
              </EmbedTab>
              <EmbedTab
                active={embed === "widget"}
                onClick={() => setEmbed(embed === "widget" ? null : "widget")}
              >
                Widget
              </EmbedTab>
            </div>

            {embed === "button" && <ButtonEmbed invoiceId={invoiceId} url={url} />}
            {embed === "widget" && <WidgetEmbed invoiceId={invoiceId} url={url} />}
          </div>

          <button
            type="button"
            onClick={onCreateAnother}
            className="mt-6 block w-full text-center text-sm font-medium text-primary hover:underline"
          >
            + Create another payment link
          </button>
        </>
      )}
    </div>
  );
}

function EmbedTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-xl border py-3 text-sm font-semibold transition-colors",
        active
          ? "border-primary bg-primary-50 text-primary"
          : "border-navy-200 text-primary hover:bg-navy-50",
      )}
    >
      {children}
    </button>
  );
}

function EmbedPanel({
  hint,
  snippet,
  preview,
}: {
  hint: string;
  snippet: string;
  preview: React.ReactNode;
}) {
  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-navy-100 bg-navy-50/40 p-4 animate-fade-in">
      <p className="text-xs text-navy-500">{hint}</p>
      <div className="flex items-center justify-center rounded-xl border border-navy-100 bg-white p-4">
        {preview}
      </div>
      <div className="relative">
        <pre className="max-h-40 overflow-auto rounded-xl bg-navy-950 p-3 pr-16 text-[11px] leading-relaxed text-navy-100">
          <code className="whitespace-pre-wrap break-all">{snippet}</code>
        </pre>
        <div className="absolute right-2 top-2">
          <CopyButton
            text={snippet}
            label="embed code"
            className="bg-white/10 text-white hover:bg-white/20"
          />
        </div>
      </div>
    </div>
  );
}

function ButtonEmbed({ invoiceId, url }: { invoiceId: string; url: string }) {
  return (
    <EmbedPanel
      hint="Drop this button anywhere on your site. It opens the hosted checkout in a new tab."
      snippet={buttonSnippet(invoiceId, "white")}
      preview={
        <a href={`${url}?source=button`} target="_blank" rel="noreferrer noopener">
          {/* Live preview of the exact hosted image used in the snippet. */}
          <img src={buttonImageUrl("white")} alt="Pay in crypto with egofi" height={52} />
        </a>
      }
    />
  );
}

function WidgetEmbed({ invoiceId, url }: { invoiceId: string; url: string }) {
  return (
    <EmbedPanel
      hint="Embed the full checkout inline. It updates live as the customer pays."
      snippet={widgetSnippet(invoiceId)}
      preview={
        <iframe
          src={`${url}?source=widget`}
          title="egofi checkout preview"
          className="h-[420px] w-full max-w-[380px] rounded-xl border border-navy-100"
        />
      }
    />
  );
}
