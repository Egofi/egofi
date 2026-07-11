"use client";

import type { AdminOpsHealthDto, UnmatchedPaymentDto } from "@egofi/types";
import { Button, Spinner } from "@egofi/ui";
import { useEffect, useState } from "react";
import { StatTile } from "../../../components/charts";
import { api, requireAdmin } from "../../../lib/api";

export default function OperationsPage() {
  const [health, setHealth] = useState<AdminOpsHealthDto | null>(null);
  const [unmatched, setUnmatched] = useState<UnmatchedPaymentDto[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    if (!requireAdmin()) return;
    void api.admin.opsHealth().then(setHealth);
    void api.admin.listUnmatched("open").then(setUnmatched);
  };

  useEffect(load, []);

  const resolve = async (id: string, status: "resolved" | "returned") => {
    setBusy(id);
    try {
      await api.admin.resolveUnmatched(id, status);
      setUnmatched((prev) => prev.filter((u) => u.id !== id));
    } finally {
      setBusy(null);
    }
  };

  if (!health) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">Operations</h1>
        <p className="mt-1 text-sm text-navy-500">The queues and providers behind the gateway.</p>
      </header>

      {/* Health tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Outbox pending"
          value={health.outbox.pending.toLocaleString()}
          sub={
            health.outbox.oldestPendingAgeSec !== null
              ? `oldest ${health.outbox.oldestPendingAgeSec}s`
              : "clear"
          }
          tone={health.outbox.pending > 50 ? "warning" : "default"}
        />
        <StatTile
          label="Outbox dead"
          value={health.outbox.dead.toLocaleString()}
          sub="exhausted retries"
          tone={health.outbox.dead > 0 ? "danger" : "success"}
        />
        <StatTile
          label="Webhooks failing"
          value={health.webhooks.failing.toLocaleString()}
          sub={`${health.webhooks.delivered} delivered`}
          tone={health.webhooks.failing > 0 ? "danger" : "success"}
        />
        <StatTile
          label="Unmatched"
          value={health.unmatched.open.toLocaleString()}
          sub="open to review"
          tone={health.unmatched.open > 0 ? "warning" : "success"}
        />
      </div>

      {/* Providers */}
      <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-navy-100 sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-navy-950">Swap providers</h2>
        {health.providers.length === 0 ? (
          <p className="text-sm text-navy-400">No provider health snapshots yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {health.providers.map((p) => (
              <div key={p.provider} className="rounded-xl border border-navy-100 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold capitalize text-navy-900">{p.provider}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      p.successRate >= 0.9
                        ? "text-success-600"
                        : p.successRate >= 0.6
                          ? "text-amber-600"
                          : "text-danger-600"
                    }`}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {(p.successRate * 100).toFixed(0)}% success
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <dt className="text-navy-400">Freeze</dt>
                    <dd className="mt-0.5 font-semibold text-navy-800">
                      {(p.freezeRate * 100).toFixed(1)}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-navy-400">Median</dt>
                    <dd className="mt-0.5 font-semibold text-navy-800">
                      {(p.medianSettleMs / 1000).toFixed(1)}s
                    </dd>
                  </div>
                  <div>
                    <dt className="text-navy-400">Sample</dt>
                    <dd className="mt-0.5 font-semibold text-navy-800">{p.sampleSize}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Unmatched payments */}
      <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-navy-100 sm:p-6">
        <h2 className="text-base font-semibold text-navy-950">Unmatched payments</h2>
        <p className="mt-1 text-sm text-navy-500">
          Money that arrived on-chain but matched no invoice.
        </p>
        {unmatched.length === 0 ? (
          <p className="py-6 text-center text-sm text-navy-400">Nothing unmatched. 🎉</p>
        ) : (
          <div className="mt-4 space-y-3">
            {unmatched.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-100 p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold tabular-nums text-navy-900">
                    {u.amount} {u.asset} <span className="text-navy-400">on {u.chain}</span>
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs text-navy-400">
                    {u.address} · {u.txHash.slice(0, 20)}…
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={busy === u.id}
                    onClick={() => resolve(u.id, "returned")}
                  >
                    Returned
                  </Button>
                  <Button
                    size="sm"
                    loading={busy === u.id}
                    onClick={() => resolve(u.id, "resolved")}
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent webhook failures */}
      {health.webhooks.recentFailures.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-navy-100 sm:p-6">
          <h2 className="text-base font-semibold text-navy-950">Recent webhook failures</h2>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-navy-50">
              {health.webhooks.recentFailures.map((w) => (
                <tr key={w.id}>
                  <td className="py-2 text-navy-700">{w.event}</td>
                  <td className="py-2 font-mono text-xs text-navy-400">
                    {w.merchantId.slice(0, 16)}…
                  </td>
                  <td className="py-2 text-right text-navy-500">{w.attempts} attempts</td>
                  <td className="py-2 pl-4 text-right text-xs text-navy-400">
                    {new Date(w.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
