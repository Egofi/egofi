"use client";

import { createApiClient } from "@egofi/sdk";
import type { CheckoutSessionDto, InvoiceStatusDto } from "@egofi/types";
import { CHAIN_CONFIGS, type Chain, InvoiceState } from "@egofi/types";
import Decimal from "decimal.js";
import { useCallback, useEffect, useState } from "react";
import { CollapsibleSection } from "./CollapsibleSection";
import { CookieConsent } from "./CookieConsent";
import { CopyButton } from "./CopyButton";
import { EmailNotify } from "./EmailNotify";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { PromoBanner } from "./PromoBanner";
import { QRCodeCanvas } from "./QRCodeCanvas";
import { RateProgress } from "./RateProgress";
import { VerticalStatusStepper } from "./VerticalStatusStepper";

const api = createApiClient();

const POLL_INTERVAL_MS = 5_000;
const TERMINAL_STATES: string[] = [
  InvoiceState.PaidConfirmed,
  InvoiceState.Refunded,
  InvoiceState.Failed,
  InvoiceState.Expired,
];

function formatAmount(baseUnits: string): string {
  return new Decimal(baseUnits).div(1e6).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function explorerTxUrl(chain: string, hash: string): string | null {
  const cfg = CHAIN_CONFIGS[chain as Chain];
  if (!cfg) return null;
  const path = chain.toUpperCase() === "TRON" ? `/#/transaction/${hash}` : `/tx/${hash}`;
  return `${cfg.explorerBaseUrl}${path}`;
}

const WalletConnectIcon = (
  <svg viewBox="0 0 40 40" className="size-5" aria-hidden>
    <path
      d="M11.6 15.4c4.6-4.5 12.2-4.5 16.8 0l.6.5c.2.3.2.7 0 .9l-1.9 1.9c-.1.1-.3.1-.5 0l-.8-.8c-3.2-3.1-8.4-3.1-11.6 0l-.9.8c-.1.1-.3.1-.4 0l-2-1.9c-.2-.2-.2-.6 0-.9l1.1-.5z"
      fill="#3b99fc"
    />
    <path
      d="M32.3 19.2l1.7 1.7c.2.2.2.6 0 .9l-7.7 7.5c-.2.2-.6.2-.9 0l-5.4-5.3c0-.1-.2-.1-.2 0l-5.4 5.3c-.3.2-.7.2-.9 0l-7.8-7.5c-.2-.3-.2-.7 0-.9l1.7-1.7c.3-.2.7-.2.9 0l5.5 5.3c0 .1.1.1.2 0l5.4-5.3c.2-.2.6-.2.9 0l5.4 5.3c.1.1.2.1.2 0l5.5-5.3c.3-.3.7-.3.9 0z"
      fill="#3b99fc"
    />
  </svg>
);

export function CheckoutPageClient({
  session,
  embedded = false,
}: {
  session: CheckoutSessionDto;
  embedded?: boolean;
}) {
  const [status, setStatus] = useState<InvoiceStatusDto | null>(null);

  const poll = useCallback(async () => {
    const latest = await api.checkout.getStatus(session.invoice.id);
    setStatus(latest);
    return latest;
  }, [session.invoice.id]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      const latest = await poll();
      if (!TERMINAL_STATES.includes(latest.state)) {
        timer = setTimeout(run, POLL_INTERVAL_MS);
      }
    };
    void run();
    return () => clearTimeout(timer);
  }, [poll]);

  const currentState = status?.state ?? session.invoice.state;
  const { invoice, instructions } = session;
  const amount = formatAmount(instructions.exactAmount);
  const minAmount = instructions.minAmount ? formatAmount(instructions.minAmount) : null;
  const assetBadge = instructions.asset.replace(/-.*/, "").slice(0, 4);
  const networkLabel =
    instructions.networkLabel ?? `Send ${instructions.asset} on the ${instructions.chain} network`;

  const isAwaiting = currentState === InvoiceState.AwaitingPayment;
  const isUnderpaid = currentState === InvoiceState.Underpaid;
  const isCompliance = currentState === InvoiceState.ComplianceHold;
  const isTerminal = TERMINAL_STATES.includes(currentState);
  const showSecondary = !isTerminal;
  const depositTx = status?.depositTxHash ?? null;
  const txUrl = depositTx ? explorerTxUrl(instructions.chain, depositTx) : null;

  // The QR always encodes the bare wallet address (no `ethereum:`/`tron:`/BIP-21
  // prefix), so exchange and wallet scanners that reject URI schemes still work.
  const qr = instructions.depositAddress;

  const payInstructions = (
    <div className="space-y-5">
      {/* Send exactly — the primary action */}
      <div className="rounded-2xl border border-navy-100 bg-gradient-to-br from-navy-50/70 to-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">Send exactly</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <p className="min-w-0 break-all font-mono text-2xl font-bold tabular-nums leading-tight text-navy-950">
            {amount}{" "}
            <span className="text-lg font-semibold text-navy-400">{instructions.asset}</span>
          </p>
          <CopyButton text={amount} label="amount" />
        </div>
        <p className="mt-1 text-xs text-navy-400">
          ≈ {invoice.displayAmount} {invoice.displayCurrency} · exact amount required to match
        </p>
      </div>

      {/* QR */}
      <figure className="flex flex-col items-center gap-3">
        <div className="relative rounded-2xl border border-navy-100 bg-white p-3 shadow-card">
          <QRCodeCanvas value={qr} size={188} />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-9 items-center justify-center rounded-full border-2 border-white bg-white shadow-md">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                {assetBadge}
              </span>
            </span>
          </span>
        </div>
        <figcaption className="flex items-center gap-1.5 text-xs font-medium text-navy-500">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success-400 opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-success-500" />
          </span>
          Waiting for payment — scan to reveal the address
        </figcaption>
      </figure>

      {/* Address + network */}
      <div className="divide-y divide-navy-50 rounded-2xl border border-navy-100">
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-navy-400">
              Deposit address
            </p>
            <p className="mt-0.5 break-all font-mono text-sm leading-relaxed text-navy-800">
              {instructions.depositAddress}
            </p>
          </div>
          <CopyButton text={instructions.depositAddress} label="address" />
        </div>
        <div className="flex items-center gap-2 p-4 text-sm text-navy-600">
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            className="size-4 shrink-0 text-primary"
            aria-hidden
          >
            <path d="M8 1 2 4v4c0 3.5 2.6 6.3 6 7 3.4-.7 6-3.5 6-7V4L8 1zm0 4.5A1.5 1.5 0 1 1 8 8.5 1.5 1.5 0 0 1 8 5.5z" />
          </svg>
          <span className="font-medium">{networkLabel}</span>
        </div>
      </div>

      {/* Open in wallet */}
      <a
        href={instructions.paymentUriWithAmount}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-navy-200 bg-white py-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-50"
      >
        {WalletConnectIcon}
        Open in a connected wallet
      </a>
    </div>
  );

  const action = (() => {
    if (currentState === InvoiceState.PaidConfirmed) {
      return (
        <TerminalState
          tone="success"
          title="Payment confirmed"
          body="The merchant has received your payment. You can safely close this page."
          {...(txUrl ? { link: { href: txUrl, label: "View transaction" } } : {})}
        />
      );
    }
    if (currentState === InvoiceState.Expired) {
      return (
        <TerminalState
          tone="muted"
          title="This payment link expired"
          body="No funds were taken. Ask the merchant for a fresh payment link to try again."
        />
      );
    }
    if (currentState === InvoiceState.Failed || currentState === InvoiceState.Refunded) {
      return (
        <TerminalState
          tone="danger"
          title={currentState === InvoiceState.Refunded ? "Payment refunded" : "Payment failed"}
          body={
            currentState === InvoiceState.Refunded
              ? "Your funds were returned to your refund address. Contact the merchant to try again."
              : "Something went wrong processing this payment. Contact the merchant for assistance."
          }
        />
      );
    }
    if (isCompliance) {
      return (
        <div className="space-y-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
            <p className="font-semibold">Identity verification required</p>
            <p className="mt-1">
              Our conversion partner paused this payment for a routine compliance check. Check your
              email for a verification link — once completed, it resumes automatically. Your funds
              are safe either way: unverified payments are refunded.
            </p>
          </div>
        </div>
      );
    }
    if (isAwaiting) {
      return payInstructions;
    }
    if (isUnderpaid) {
      return (
        <div className="space-y-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
            <p className="font-semibold">Partial payment received</p>
            <p className="mt-1">
              We received less than the exact amount. Send the remaining balance to the same address
              below, or contact the merchant for a refund.
            </p>
          </div>
          {payInstructions}
        </div>
      );
    }
    // Received / Converting / PayoutSent / Overpaid / other transient states.
    const title =
      currentState === InvoiceState.Received
        ? "Deposit detected"
        : currentState === InvoiceState.Converting
          ? "Converting your payment"
          : currentState === InvoiceState.PayoutSent
            ? "Sending to the merchant"
            : currentState === InvoiceState.Overpaid
              ? "Payment received"
              : "Processing your payment";
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center animate-fade-in">
        <span className="relative flex size-14 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-primary-100 animate-ping opacity-60" />
          <span className="relative flex size-14 items-center justify-center rounded-full bg-primary-50">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-7 animate-spin text-primary"
              style={{ animationDuration: "1.6s" }}
              aria-hidden
            >
              <path d="M10 2a8 8 0 1 0 8 8h-1.5A6.5 6.5 0 1 1 10 3.5V2z" />
            </svg>
          </span>
        </span>
        <div>
          <p className="font-semibold text-navy-900">{title}</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-navy-500">
            This usually takes a few minutes. Keep this page open — it updates automatically.
          </p>
        </div>
        {txUrl && (
          <a
            href={txUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View transaction
            <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden>
              <path d="M6.5 3.5a.75.75 0 0 0 0 1.5h2.44L4.22 9.72a.75.75 0 1 0 1.06 1.06L10 6.06V8.5a.75.75 0 0 0 1.5 0v-4a.75.75 0 0 0-.75-.75h-4z" />
              <path d="M3.5 5.5A1.5 1.5 0 0 1 5 4h1a.75.75 0 0 1 0 1.5H5v5.5h5.5V10a.75.75 0 0 1 1.5 0v1a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11v-5.5z" />
            </svg>
          </a>
        )}
      </div>
    );
  })();

  return (
    <>
      {!embedded && <PromoBanner />}

      <main
        className={
          embedded
            ? "flex flex-col items-center p-3 sm:p-4"
            : "flex min-h-screen flex-col items-center px-4 pb-24 pt-4 sm:pt-6"
        }
      >
        {/* Top bar */}
        {!embedded && (
          <div className="mb-5 flex w-full max-w-4xl items-center justify-between gap-4">
            <span className="text-lg font-bold tracking-tight text-navy-950">
              egofi<span className="text-primary">.</span>
            </span>
            <LanguageSwitcher />
          </div>
        )}

        {/* Two-pane checkout card */}
        <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-navy-100/70 animate-fade-in-up">
          <div className="h-1 bg-gradient-to-r from-primary via-info to-accent" />
          <div className="grid lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            {/* Summary + status */}
            <aside className="relative overflow-hidden bg-brand-gradient text-white">
              <div
                className="pointer-events-none absolute inset-0 bg-brand-mesh opacity-70"
                aria-hidden
              />
              <div className="relative flex h-full flex-col gap-6 p-6 sm:p-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                    Amount to pay
                  </p>
                  <p className="mt-1.5 text-display-sm font-bold tabular-nums text-white">
                    {invoice.displayAmount}{" "}
                    <span className="text-xl font-semibold text-white/60">
                      {invoice.displayCurrency}
                    </span>
                  </p>
                  <p className="mt-1 font-mono text-sm text-accent">
                    ≈ {amount} {instructions.asset}
                  </p>
                </div>

                <div className="h-px bg-white/10" />

                <VerticalStatusStepper state={currentState} theme="dark" />

                <div className="mt-auto space-y-3 pt-2">
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-inset ring-white/10">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                        Payment ID
                      </p>
                      <p className="truncate font-mono text-xs text-white/80">{invoice.id}</p>
                    </div>
                    <CopyButton
                      text={invoice.id}
                      label="payment ID"
                      className="text-white/70 hover:bg-white/10 active:bg-white/15"
                    />
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-white/50">
                    <svg
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="size-3.5 text-accent"
                      aria-hidden
                    >
                      <path
                        fillRule="evenodd"
                        d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1zm2 6V4.5a2 2 0 1 0-4 0V7h4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Non-custodial — funds go direct, never through us
                  </p>
                </div>
              </div>
            </aside>

            {/* Action */}
            <section className="p-6 sm:p-8" aria-live="polite">
              {!isTerminal && !isCompliance && (
                <div className="mb-5">
                  <RateProgress
                    rateLockedUntil={instructions.rateLockedUntil}
                    startedAt={invoice.createdAt}
                  />
                </div>
              )}
              {action}
            </section>
          </div>
        </div>

        {/* Secondary info */}
        {!embedded && showSecondary && (
          <>
            <div className="mt-6 grid w-full max-w-4xl gap-4 lg:grid-cols-2">
              <CollapsibleSection title="Good to know" defaultOpen>
                <ul className="space-y-3">
                  <NoteItem ok>Keep this page open until the payment completes</NoteItem>
                  <NoteItem ok>Send the exact amount before the rate timer expires</NoteItem>
                  <NoteItem>
                    Payments below the minimum
                    {minAmount ? ` (${minAmount} ${instructions.asset})` : ""} can't be processed
                  </NoteItem>
                  <NoteItem>Completed payments are non-refundable</NoteItem>
                </ul>
              </CollapsibleSection>

              <CollapsibleSection title="More details">
                <dl className="space-y-2.5 text-sm">
                  <DetailRow label="Payment ID" value={invoice.id} />
                  <DetailRow label="Network" value={instructions.chain} />
                  <DetailRow label="Asset" value={instructions.asset} />
                  <DetailRow label="Exact amount" value={`${amount} ${instructions.asset}`} />
                  <DetailRow
                    label="Fiat value"
                    value={`${invoice.displayAmount} ${invoice.displayCurrency}`}
                  />
                  {instructions.providerRef && (
                    <DetailRow label="Provider reference" value={instructions.providerRef} />
                  )}
                </dl>
              </CollapsibleSection>
            </div>

            <div className="mt-4 w-full max-w-4xl">
              <EmailNotify invoiceId={invoice.id} />
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-xs font-medium text-navy-400">
            Powered by <span className="font-bold text-navy-600">egofi</span> · Secured checkout
          </p>
        </footer>
      </main>

      {!embedded && <CookieConsent />}
    </>
  );
}

function NoteItem({ ok = false, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-relaxed text-navy-700">
      {ok ? (
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary-100">
          <svg viewBox="0 0 16 16" fill="currentColor" className="size-3 text-primary" aria-hidden>
            <path
              fillRule="evenodd"
              d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      ) : (
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-danger-100">
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            className="size-3 text-danger-500"
            aria-hidden
          >
            <path d="M4.28 3.22a.75.75 0 0 0-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06L8 9.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L9.06 8l3.72-3.72a.75.75 0 0 0-1.06-1.06L8 6.94 4.28 3.22z" />
          </svg>
        </span>
      )}
      <span>{children}</span>
    </li>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-navy-400">{label}</dt>
      <dd className="break-all text-right font-medium text-navy-800">{value}</dd>
    </div>
  );
}

function TerminalState({
  tone,
  title,
  body,
  link,
}: {
  tone: "success" | "danger" | "muted";
  title: string;
  body: string;
  link?: { href: string; label: string };
}) {
  const styles = {
    success: { circle: "bg-success-50", icon: "text-success-500" },
    danger: { circle: "bg-danger-50", icon: "text-danger-500" },
    muted: { circle: "bg-navy-50", icon: "text-navy-400" },
  }[tone];

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center animate-scale-in">
      <span className={`flex size-16 items-center justify-center rounded-full ${styles.circle}`}>
        {tone === "success" ? (
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`size-8 ${styles.icon}`}
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207z"
              clipRule="evenodd"
            />
          </svg>
        ) : tone === "danger" ? (
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`size-8 ${styles.icon}`}
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`size-8 ${styles.icon}`}
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm.75-13.5a.75.75 0 0 0-1.5 0v5c0 .27.144.518.378.65l3.5 2a.75.75 0 0 0 .744-1.3L12.75 12.05V7.5z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
      <div>
        <h2 className="text-lg font-bold tracking-tight text-navy-950">{title}</h2>
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-navy-500">{body}</p>
      </div>
      {link && (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {link.label}
          <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden>
            <path d="M6.5 3.5a.75.75 0 0 0 0 1.5h2.44L4.22 9.72a.75.75 0 1 0 1.06 1.06L10 6.06V8.5a.75.75 0 0 0 1.5 0v-4a.75.75 0 0 0-.75-.75h-4z" />
            <path d="M3.5 5.5A1.5 1.5 0 0 1 5 4h1a.75.75 0 0 1 0 1.5H5v5.5h5.5V10a.75.75 0 0 1 1.5 0v1a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11v-5.5z" />
          </svg>
        </a>
      )}
    </div>
  );
}
