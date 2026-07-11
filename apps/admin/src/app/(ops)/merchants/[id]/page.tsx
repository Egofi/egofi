"use client";

import type { AdminMerchantDetail } from "@egofi/types";
import { Badge, Button, Spinner } from "@egofi/ui";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatTile } from "../../../../components/charts";
import { api, requireAdmin } from "../../../../lib/api";
import { MERCHANT_STATUS, invoiceState } from "../../../../lib/states";

const usd = (v: string) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function MerchantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [m, setM] = useState<AdminMerchantDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!requireAdmin()) return;
    api.admin
      .merchantDetail(id)
      .then(setM)
      .catch(() => setNotFound(true));
  };
  useEffect(load, [id]);

  const act = async (action: "approve" | "suspend" | "reactivate") => {
    setBusy(true);
    try {
      if (action === "approve") await api.admin.approveMerchant(id);
      else if (action === "reactivate") await api.admin.reactivateMerchant(id);
      else {
        const reason = window.prompt("Reason for suspension?");
        if (!reason) return;
        await api.admin.suspendMerchant(id, reason);
      }
      load();
    } finally {
      setBusy(false);
    }
  };

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl p-6 lg:p-8">
        <a href="/merchants" className="text-sm font-medium text-navy-400 hover:text-navy-700">
          ← Merchants
        </a>
        <div className="mt-4 rounded-2xl bg-white p-12 text-center shadow-card ring-1 ring-navy-100">
          <p className="font-medium text-navy-800">Merchant not found</p>
        </div>
      </div>
    );
  }
  if (!m) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const status = MERCHANT_STATUS[m.status] ?? { variant: "default" as const, label: m.status };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-6 lg:p-8">
      <a href="/merchants" className="text-sm font-medium text-navy-400 hover:text-navy-700">
        ← Merchants
      </a>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-navy-950">{m.business}</h1>
            <Badge variant={status.variant} dot>
              {status.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-navy-500">
            {m.email} · KYB {m.kybStatus.toLowerCase()} (tier {m.kybTier}) · settles in{" "}
            {m.settlementAsset}
          </p>
        </div>
        <div className="flex gap-2">
          {m.status === "PENDING" && (
            <Button size="sm" loading={busy} onClick={() => act("approve")}>
              Approve
            </Button>
          )}
          {m.status === "SUSPENDED" ? (
            <Button size="sm" loading={busy} onClick={() => act("reactivate")}>
              Reactivate
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              loading={busy}
              onClick={() => act("suspend")}
              className="text-danger-600"
            >
              Suspend
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label="Invoices" value={m.stats.invoices.toLocaleString()} />
        <StatTile label="Paid" value={m.stats.paidInvoices.toLocaleString()} />
        <StatTile label="Settled" value={usd(m.stats.settledUsd)} />
        <StatTile label="Subscribers" value={m.stats.activeSubscribers.toLocaleString()} />
        <StatTile label="API keys" value={m.stats.apiKeys.toLocaleString()} />
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-navy-100">
        <div className="border-b border-navy-100 px-5 py-4">
          <h2 className="text-base font-semibold text-navy-950">Recent invoices</h2>
        </div>
        {m.recentInvoices.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-navy-400">No invoices yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-navy-50">
              {m.recentInvoices.map((inv) => {
                const meta = invoiceState(inv.state);
                return (
                  <tr
                    key={inv.id}
                    onClick={() => {
                      window.location.href = `/payments/${inv.id}`;
                    }}
                    className="cursor-pointer hover:bg-navy-50/60"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-navy-500">
                      {inv.id.slice(0, 18)}…
                    </td>
                    <td className="px-5 py-3 tabular-nums text-navy-900">
                      {inv.displayAmount} {inv.displayCurrency}
                    </td>
                    <td className="px-5 py-3 text-navy-600">
                      {inv.payAsset} · {inv.payChain}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={meta.variant} dot>
                        {meta.label}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-navy-400">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
