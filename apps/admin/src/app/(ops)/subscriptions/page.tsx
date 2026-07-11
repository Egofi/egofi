"use client";

import type { AdminSubscriptionRow } from "@egofi/types";
import { Badge, Spinner } from "@egofi/ui";
import type { BadgeVariant } from "@egofi/ui";
import { useEffect, useState } from "react";
import { api, requireAdmin } from "../../../lib/api";

const SUB_STATUS: Record<string, { variant: BadgeVariant; label: string }> = {
  ACTIVE: { variant: "success", label: "Active" },
  PAST_DUE: { variant: "warning", label: "Past due" },
  CANCELED: { variant: "default", label: "Canceled" },
};

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<AdminSubscriptionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requireAdmin()) return;
    api.admin
      .listSubscriptions({ limit: 50 })
      .then((res) => {
        setRows(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">Subscriptions</h1>
        <p className="mt-1 text-sm text-navy-500">
          Recurring customers across every merchant
          {loading ? "" : ` · ${total.toLocaleString()} total`}.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-navy-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-left text-xs font-medium uppercase tracking-wide text-navy-400">
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Merchant</th>
                <th className="px-5 py-3.5">Plan</th>
                <th className="px-5 py-3.5">Price</th>
                <th className="px-5 py-3.5">Next billing</th>
                <th className="px-5 py-3.5">Invoices</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16">
                    <div className="flex justify-center">
                      <Spinner size="lg" />
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-navy-400">
                    No subscriptions yet.
                  </td>
                </tr>
              ) : (
                rows.map((s) => {
                  const meta = SUB_STATUS[s.status] ?? {
                    variant: "default" as BadgeVariant,
                    label: s.status,
                  };
                  const canceled = s.status === "CANCELED";
                  return (
                    <tr key={s.id} className="hover:bg-navy-50/60">
                      <td className="px-5 py-3.5 font-medium text-navy-900">{s.customerEmail}</td>
                      <td className="px-5 py-3.5">
                        <a
                          href={`/merchants/${s.merchantId}`}
                          className="text-navy-700 hover:text-primary"
                        >
                          {s.merchantBusiness}
                        </a>
                      </td>
                      <td className="px-5 py-3.5 text-navy-600">{s.planTitle}</td>
                      <td className="px-5 py-3.5 tabular-nums text-navy-800">
                        {s.costPerPeriod} <span className="text-navy-400">{s.currency}</span>
                      </td>
                      <td className="px-5 py-3.5 text-navy-500">
                        {canceled ? "—" : new Date(s.nextBillingAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-navy-600">{s.invoiceCount}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={meta.variant} dot>
                          {meta.label}
                        </Badge>
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
