"use client";

import type { AuditLogEntry } from "@egofi/types";
import { Spinner } from "@egofi/ui";
import { useEffect, useState } from "react";
import { api, requireAdmin } from "../../../lib/api";

const ACTION_LABEL: Record<string, string> = {
  "merchant.approve": "Approved merchant",
  "merchant.suspend": "Suspended merchant",
  "merchant.reactivate": "Reactivated merchant",
  "fee-policy.update": "Updated fee policy",
  "unmatched.resolved": "Resolved unmatched payment",
  "unmatched.returned": "Returned unmatched payment",
  "outbox.retry": "Retried outbox event",
};

export default function AuditPage() {
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!requireAdmin()) return;
    api.admin
      .auditLog({ limit: 100 })
      .then((res) => {
        setRows(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">Audit log</h1>
        <p className="mt-1 text-sm text-navy-500">
          Every operator action, oldest to newest
          {loading ? "" : ` · ${total.toLocaleString()} entries`}.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center text-navy-400 shadow-card ring-1 ring-navy-100">
          No admin actions recorded yet.
        </div>
      ) : (
        <ol className="space-y-2">
          {rows.map((e) => {
            const open = expanded === e.id;
            return (
              <li key={e.id} className="rounded-xl bg-white shadow-card ring-1 ring-navy-100">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : e.id)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-navy-900">
                      {ACTION_LABEL[e.action] ?? e.action}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-navy-400">
                      {e.actorEmail} · {e.targetType} {e.targetId.slice(0, 16)}…
                      {e.ip ? ` · ${e.ip}` : ""}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-navy-400">
                    {new Date(e.createdAt).toLocaleString()}
                  </time>
                </button>
                {open && (e.before != null || e.after != null) && (
                  <div className="grid gap-3 border-t border-navy-50 px-4 py-3 text-xs sm:grid-cols-2">
                    <div>
                      <p className="mb-1 font-semibold uppercase tracking-wide text-navy-400">
                        Before
                      </p>
                      <pre className="overflow-x-auto rounded-lg bg-navy-50 p-2.5 text-navy-700">
                        {JSON.stringify(e.before ?? null, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 font-semibold uppercase tracking-wide text-navy-400">
                        After
                      </p>
                      <pre className="overflow-x-auto rounded-lg bg-navy-50 p-2.5 text-navy-700">
                        {JSON.stringify(e.after ?? null, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
