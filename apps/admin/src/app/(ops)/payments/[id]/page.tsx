"use client";

import type { AdminInvoiceDetail } from "@egofi/types";
import { Badge, Spinner } from "@egofi/ui";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, requireAdmin } from "../../../../lib/api";
import { invoiceState } from "../../../../lib/states";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</dt>
      <dd className="mt-1 break-all text-sm text-navy-800">{children}</dd>
    </div>
  );
}

export default function AdminInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<AdminInvoiceDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!requireAdmin()) return;
    api.admin
      .getInvoice(id)
      .then(setInv)
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl p-6 lg:p-8">
        <a href="/payments" className="text-sm font-medium text-navy-400 hover:text-navy-700">
          ← Payments
        </a>
        <div className="mt-4 rounded-2xl bg-white p-12 text-center shadow-card ring-1 ring-navy-100">
          <p className="font-medium text-navy-800">Invoice not found</p>
        </div>
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const meta = invoiceState(inv.state);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-6 lg:p-8">
      <a href="/payments" className="text-sm font-medium text-navy-400 hover:text-navy-700">
        ← Payments
      </a>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-navy-400">Invoice</p>
          <h1 className="truncate font-mono text-lg font-bold text-navy-950">{inv.id}</h1>
          <a href={`/merchants/${inv.merchantId}`} className="text-sm text-primary hover:underline">
            {inv.merchantBusiness}
          </a>
        </div>
        <Badge variant={meta.variant} dot>
          {meta.label}
        </Badge>
      </header>

      {/* Summary */}
      <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-navy-100">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-navy-950">{inv.displayAmount}</span>
          <span className="text-lg font-semibold text-navy-400">{inv.displayCurrency}</span>
        </div>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Pay with">
            {inv.payAsset} · {inv.payChain}
          </Field>
          <Field label="Quoted">
            {Number(inv.quotedAmount) > 0
              ? `${inv.quotedAmount} ${inv.payAsset}`
              : "— not priced yet"}
          </Field>
          <Field label="Rate">{Number(inv.rate) > 0 ? inv.rate : "—"}</Field>
          <Field label="Rail">{inv.rail.replace(/_/g, " ").toLowerCase()}</Field>
          <Field label="Deposit address">{inv.depositAddress ?? "—"}</Field>
          <Field label="Notify email">{inv.notifyEmail ?? "—"}</Field>
          <Field label="Created">{new Date(inv.createdAt).toLocaleString()}</Field>
          <Field label="Expires">{new Date(inv.expiresAt).toLocaleString()}</Field>
          {inv.subscriptionId && <Field label="Subscription">{inv.subscriptionId}</Field>}
        </dl>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-navy-100">
        <h2 className="text-base font-semibold text-navy-950">Timeline</h2>
        {inv.events.length === 0 ? (
          <p className="mt-3 text-sm text-navy-400">No events recorded yet.</p>
        ) : (
          <ol className="mt-4 space-y-0">
            {inv.events.map((e, i) => (
              <li key={e.id} className="relative flex gap-4 pb-5 last:pb-0">
                {i < inv.events.length - 1 && (
                  <span className="absolute left-[5px] top-3 h-full w-px bg-navy-100" aria-hidden />
                )}
                <span className="relative mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <p className="font-medium text-navy-900">{e.type.replace(/^state\./, "")}</p>
                    <time className="text-xs text-navy-400">{new Date(e.ts).toLocaleString()}</time>
                  </div>
                  <p className="mt-0.5 text-xs text-navy-400">
                    {e.rail}
                    {e.amount && e.asset ? ` · ${e.amount} ${e.asset}` : ""}
                    {e.txHash ? ` · ${e.txHash.slice(0, 16)}…` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Ledger */}
      {inv.ledger.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-navy-100">
          <h2 className="text-base font-semibold text-navy-950">Ledger</h2>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-navy-50">
              {inv.ledger.map((l) => (
                <tr key={l.id}>
                  <td className="py-2 capitalize text-navy-700">{l.kind}</td>
                  <td className="py-2 text-right tabular-nums text-navy-900">
                    {l.amount} {l.asset}
                  </td>
                  <td className="py-2 pl-4 text-right text-xs text-navy-400">
                    {new Date(l.ts).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
