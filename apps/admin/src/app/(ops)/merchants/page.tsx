"use client";

import { useEffect, useState } from "react";
import { createApiClient } from "@egofi/sdk";
import type { MerchantProfile } from "@egofi/types";
import { Badge, Button, Card, Spinner, cn } from "@egofi/ui";
import type { BadgeVariant } from "@egofi/ui";

const api = createApiClient();

const FILTERS = [
  { value: undefined, label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
] as const;

const STATUS_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  ACTIVE: { variant: "success", label: "Active" },
  PENDING: { variant: "warning", label: "Pending review" },
  SUSPENDED: { variant: "danger", label: "Suspended" },
  REJECTED: { variant: "default", label: "Rejected" },
};

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<MerchantProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = async (status?: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("egofi_admin_token");
      if (!token) { window.location.href = "/login"; return; }
      api.setAuthToken(token);
      const res = await api.admin.listMerchants(status ? { status } : undefined);
      setMerchants(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(filter); }, [filter]);

  const approve = async (id: string) => {
    setActingOn(id);
    try {
      await api.admin.approveMerchant(id);
      await load(filter);
    } finally {
      setActingOn(null);
    }
  };

  const suspend = async (id: string) => {
    const reason = window.prompt("Suspension reason (recorded in the audit log):");
    if (!reason) return;
    setActingOn(id);
    try {
      await api.admin.suspendMerchant(id, reason);
      await load(filter);
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Merchants</h1>
          <p className="mt-1 text-sm text-navy-500">
            {total} {total === 1 ? "merchant" : "merchants"} on the platform —
            review, approve, and suspend accounts.
          </p>
        </div>

        {/* Segmented status filter */}
        <div className="inline-flex rounded-lg border border-navy-200 bg-white p-0.5 shadow-sm">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.label}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-navy-950 text-white shadow-sm"
                    : "text-navy-500 hover:text-navy-800",
                )}
                aria-pressed={active}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </header>

      <Card>
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : merchants.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-medium text-navy-800">Nothing here</p>
            <p className="mt-1 text-sm text-navy-500">
              No merchants match this filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-left">
                  <th className="px-6 py-3.5 font-medium text-navy-500">Business</th>
                  <th className="px-6 py-3.5 font-medium text-navy-500">Email</th>
                  <th className="px-6 py-3.5 font-medium text-navy-500">Settlement</th>
                  <th className="px-6 py-3.5 font-medium text-navy-500">Status</th>
                  <th className="px-6 py-3.5 text-right font-medium text-navy-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {merchants.map((m) => {
                  const badge = STATUS_BADGE[m.status] ?? {
                    variant: "default" as const,
                    label: m.status,
                  };
                  return (
                    <tr key={m.id} className="transition-colors hover:bg-navy-50/50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-navy-950">{m.business}</p>
                        <p className="font-mono text-xs text-navy-400">{m.id.slice(0, 12)}…</p>
                      </td>
                      <td className="px-6 py-4 text-navy-600">{m.email}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-md bg-navy-50 px-2 py-1 font-mono text-xs text-navy-700">
                          {m.settlementAsset}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={badge.variant} dot>{badge.label}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {m.status === "PENDING" && (
                            <Button
                              size="sm"
                              loading={actingOn === m.id}
                              onClick={() => approve(m.id)}
                            >
                              Approve
                            </Button>
                          )}
                          {m.status === "ACTIVE" && (
                            <Button
                              size="sm"
                              variant="danger"
                              loading={actingOn === m.id}
                              onClick={() => suspend(m.id)}
                            >
                              Suspend
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
