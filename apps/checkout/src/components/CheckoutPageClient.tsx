"use client";

import { createApiClient } from "@egofi/sdk";
import type { CheckoutSessionDto, InvoiceStatusDto } from "@egofi/types";
import { InvoiceState } from "@egofi/types";
import { Card, CardContent } from "@egofi/ui";
import Decimal from "decimal.js";
import { useCallback, useEffect, useState } from "react";
import { CopyButton } from "./CopyButton";
import { CountdownTimer } from "./CountdownTimer";
import { PaymentProgress } from "./PaymentProgress";
import { QRCodeCanvas } from "./QRCodeCanvas";

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

export function CheckoutPageClient({ session }: { session: CheckoutSessionDto }) {
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
  const { instructions } = session;
  const amount = formatAmount(instructions.exactAmount);

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-8 sm:py-12">
      {/* Brand header */}
      <header className="mb-6 flex w-full max-w-md items-center justify-between">
        <span className="text-lg font-bold tracking-tight text-navy-950">
          egofi<span className="text-primary">.</span>
        </span>
        {!TERMINAL_STATES.includes(currentState) && (
          <CountdownTimer expiresAt={instructions.expiresAt} />
        )}
      </header>

      <Card className="w-full max-w-md overflow-hidden rounded-3xl shadow-lg animate-fade-in-up">
        {/* Amount hero */}
        <div className="relative border-b border-navy-100 bg-gradient-to-br from-navy-50 to-white px-6 py-6 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          />
          <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">Total due</p>
          <p className="mt-1.5 text-display-sm font-bold tabular-nums text-navy-950">
            {session.invoice.displayAmount}{" "}
            <span className="text-xl font-semibold text-navy-400">
              {session.invoice.displayCurrency}
            </span>
          </p>
        </div>

        <CardContent className="space-y-6 p-6 pt-6">
          {currentState === InvoiceState.PaidConfirmed ? (
            <TerminalState
              tone="success"
              title="Payment confirmed"
              body="The merchant has received your payment. You can safely close this page."
            />
          ) : currentState === InvoiceState.Expired ? (
            <TerminalState
              tone="muted"
              title="This payment link expired"
              body="No funds were taken. Ask the merchant for a fresh payment link to try again."
            />
          ) : currentState === InvoiceState.Failed || currentState === InvoiceState.Refunded ? (
            <TerminalState
              tone="danger"
              title={currentState === InvoiceState.Refunded ? "Payment refunded" : "Payment failed"}
              body={
                currentState === InvoiceState.Refunded
                  ? "Your funds were returned to your refund address. Contact the merchant to try again."
                  : "Something went wrong processing this payment. Contact the merchant for assistance."
              }
            />
          ) : (
            <>
              {/* Progress */}
              <PaymentProgress state={currentState} />

              {currentState === InvoiceState.ComplianceHold ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
                  <p className="font-semibold">Identity verification required</p>
                  <p className="mt-1">
                    Our conversion partner has paused this payment for a routine compliance check.
                    Check your email for a verification link — once completed, the payment resumes
                    automatically. Your funds are safe either way: unverified payments are refunded.
                  </p>
                </div>
              ) : currentState === InvoiceState.AwaitingPayment ? (
                <>
                  {/* QR */}
                  <figure className="flex flex-col items-center gap-3">
                    <div className="rounded-2xl border border-navy-100 bg-white p-3 shadow-card">
                      <QRCodeCanvas value={instructions.qrData} size={192} />
                    </div>
                    <figcaption className="text-xs font-medium text-navy-400">
                      Scan with your wallet — amount is pre-filled
                    </figcaption>
                  </figure>

                  {/* Payment details */}
                  <div className="divide-y divide-navy-50 rounded-xl border border-navy-100">
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wider text-navy-400">
                          Send exactly
                        </p>
                        <p className="mt-0.5 font-mono text-base font-semibold tabular-nums text-navy-950">
                          {amount} <span className="text-navy-500">{instructions.asset}</span>
                        </p>
                      </div>
                      <CopyButton text={amount} label="amount" />
                    </div>
                    <div className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wider text-navy-400">
                          To this {instructions.chain} address
                        </p>
                        <p className="mt-0.5 break-all font-mono text-sm leading-relaxed text-navy-800">
                          {instructions.depositAddress}
                        </p>
                      </div>
                      <CopyButton text={instructions.depositAddress} label="address" />
                    </div>
                  </div>

                  <p className="flex items-start gap-2 text-xs leading-relaxed text-navy-500">
                    <svg
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="mt-0.5 size-3.5 shrink-0 text-amber-500"
                      aria-hidden
                    >
                      <path
                        fillRule="evenodd"
                        d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Send the exact amount shown — it's how we match your payment to this invoice.
                    Small differences can delay confirmation.
                  </p>
                </>
              ) : (
                /* Deposit seen — waiting on conversion / confirmations */
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <span className="relative flex size-12 items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-primary-100 animate-ping opacity-60" />
                    <span className="relative flex size-12 items-center justify-center rounded-full bg-primary-50">
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="size-6 animate-spin text-primary"
                        style={{ animationDuration: "1.6s" }}
                        aria-hidden
                      >
                        <path d="M10 2a8 8 0 1 0 8 8h-1.5A6.5 6.5 0 1 1 10 3.5V2z" />
                      </svg>
                    </span>
                  </span>
                  <div>
                    <p className="font-semibold text-navy-900">
                      {currentState === InvoiceState.Received && "Deposit detected"}
                      {currentState === InvoiceState.Converting && "Converting your payment"}
                      {currentState === InvoiceState.PayoutSent && "Sending to the merchant"}
                    </p>
                    <p className="mt-1 text-sm text-navy-500">
                      This usually takes a few minutes. Keep this page open — it updates
                      automatically.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Trust footer */}
      <footer className="mt-6 flex max-w-md flex-col items-center gap-1.5 text-center">
        <p className="flex items-center gap-1.5 text-xs text-navy-400">
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            className="size-3.5 text-success-500"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1zm2 6V4.5a2 2 0 1 0-4 0V7h4z"
              clipRule="evenodd"
            />
          </svg>
          Secured by egofi · Non-custodial — your funds go direct, never through us
        </p>
      </footer>
    </main>
  );
}

function TerminalState({
  tone,
  title,
  body,
}: {
  tone: "success" | "danger" | "muted";
  title: string;
  body: string;
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
    </div>
  );
}
