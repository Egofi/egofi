"use client";

import type { AdminInvoiceListItem } from "@egofi/types";
import { Badge, Spinner } from "@egofi/ui";
import { useEffect, useState } from "react";
import { api, requireAdmin } from "../../../lib/api";
import { invoiceState } from "../../../lib/states";

const STATES = [
  { value: "", label: "All" },
  { value: "AWAITING_PAYMENT", label: "Awaiting" },
  { value: "PAID_CONFIRMED", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "EXPIRED", label: "Expired" },
  { value: "DRAFT", label: "Draft" },
];

export default function PaymentsPage() {
  const [rows, setRows] = useState<AdminInvoiceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState("");

  useEffect(() => {
    if (!requireAdmin()) return;
    setLoading(true);
    api.admin
      .listInvoices({ ...(state ? { state } : {}), limit: 50 })
      .then((res) => {
        setRows(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [state]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Payments</h1>
          <p className="mt-1 text-sm text-navy-500">
            Every invoice across every merchant{loading ? "" : ` · ${total.toLocaleString()} total`}
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-navy-50 p-1">
          {STATES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setState(s.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                state === s.value
                  ? "bg-white text-navy-950 shadow-sm"
                  : "text-navy-500 hover:text-navy-800"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-navy-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-left text-xs font-medium uppercase tracking-wide text-navy-400">
                <th className="px-5 py-3.5">Invoice</th>
                <th className="px-5 py-3.5">Merchant</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Pay with</th>
                <th className="px-5 py-3.5">State</th>
                <th className="px-5 py-3.5">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16">
                    <div className="flex justify-center">
                      <Spinner size="lg" />
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-navy-400">
                    No invoices match this filter.
                  </td>
                </tr>
              ) : (
                rows.map((inv) => {
                  const meta = invoiceState(inv.state);
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => {
                        window.location.href = `/payments/${inv.id}`;
                      }}
                      className="cursor-pointer transition-colors hover:bg-navy-50/60"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-navy-600">
                          {inv.id.slice(0, 18)}…
                        </span>
                        {inv.subscriptionId && (
                          <span className="ml-2 rounded bg-info-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-info-700">
                            Recurring
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <a
                          href={`/merchants/${inv.merchantId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-navy-800 hover:text-primary"
                        >
                          {inv.merchantBusiness}
                        </a>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-navy-900">
                        {inv.displayAmount}{" "}
                        <span className="text-navy-400">{inv.displayCurrency}</span>
                      </td>
                      <td className="px-5 py-3.5 text-navy-600">
                        {inv.payAsset} <span className="text-navy-400">· {inv.payChain}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={meta.variant} dot>
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-navy-500">
                        {new Date(inv.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
