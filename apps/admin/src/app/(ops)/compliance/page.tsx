"use client";

import type { KybReviewItem } from "@egofi/types";
import { Badge, Button, Spinner } from "@egofi/ui";
import { useEffect, useState } from "react";
import { DocumentList } from "../../../components/DocumentList";
import { api, requireAdmin } from "../../../lib/api";
import { KYB_TIERS } from "../../../lib/states";

export default function CompliancePage() {
  const [items, setItems] = useState<KybReviewItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tierByMerchant, setTierByMerchant] = useState<Record<string, number>>({});

  const load = () => {
    if (!requireAdmin()) return;
    api.admin
      .listPendingKyb()
      .then(setItems)
      .catch(() => setItems([]));
  };
  useEffect(load, []);

  const approve = async (merchantId: string) => {
    const tier = tierByMerchant[merchantId] ?? 1;
    const note =
      window.prompt("Optional note for the approval (visible in the audit log):") ?? undefined;
    setBusy(merchantId);
    try {
      await api.admin.approveKyb(merchantId, tier, note || undefined);
      setItems((prev) => (prev ?? []).filter((i) => i.merchantId !== merchantId));
    } finally {
      setBusy(null);
    }
  };

  const reject = async (merchantId: string) => {
    const note = window.prompt("Reason for rejection (shown to the merchant):");
    if (!note || note.trim().length < 3) return;
    setBusy(merchantId);
    try {
      await api.admin.rejectKyb(merchantId, note.trim());
      setItems((prev) => (prev ?? []).filter((i) => i.merchantId !== merchantId));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">Compliance</h1>
        <p className="mt-1 text-sm text-navy-500">
          Merchants awaiting KYB review. Open each document, then approve at a tier or reject with a
          reason.
        </p>
      </header>

      {items === null ? (
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-card ring-1 ring-navy-100">
          <p className="font-medium text-navy-800">Nothing in the review queue</p>
          <p className="mt-1 text-sm text-navy-500">No merchants have submitted KYB for review.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((m) => (
            <section
              key={m.merchantId}
              className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-navy-100 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/merchants/${m.merchantId}`}
                      className="text-lg font-semibold text-navy-950 hover:text-primary"
                    >
                      {m.business}
                    </a>
                    <Badge variant="warning" dot>
                      Under review
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-navy-500">
                    {m.email} · currently tier {m.currentTier}
                    {m.submittedAt
                      ? ` · submitted ${new Date(m.submittedAt).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Documents ({m.documents.length})
                </p>
                <DocumentList documents={m.documents} />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-navy-50 pt-4">
                <label className="mr-auto flex items-center gap-2 text-sm text-navy-600">
                  Approve at
                  <select
                    value={tierByMerchant[m.merchantId] ?? 1}
                    onChange={(e) =>
                      setTierByMerchant((p) => ({ ...p, [m.merchantId]: Number(e.target.value) }))
                    }
                    className="rounded-lg border border-navy-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-primary-500"
                  >
                    {KYB_TIERS.map((t) => (
                      <option key={t.tier} value={t.tier}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={busy === m.merchantId}
                  onClick={() => reject(m.merchantId)}
                  className="text-danger-600"
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  loading={busy === m.merchantId}
                  onClick={() => approve(m.merchantId)}
                >
                  Approve
                </Button>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
