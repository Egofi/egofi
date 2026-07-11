"use client";

import type { FeePolicy } from "@egofi/types";
import { FeeMechanismStatus } from "@egofi/types";
import { Badge, Card, CardContent, CardHeader, CardTitle, Spinner } from "@egofi/ui";
import type { BadgeVariant } from "@egofi/ui";
import { useEffect, useState } from "react";
import { api, requireAdmin } from "../../../lib/api";

const STATUS_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  [FeeMechanismStatus.Active]: { variant: "success", label: "Active" },
  [FeeMechanismStatus.Deprecating]: { variant: "warning", label: "Deprecating" },
  [FeeMechanismStatus.Disabled]: { variant: "default", label: "Disabled" },
};

export default function FeePolicyPage() {
  const [policy, setPolicy] = useState<FeePolicy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requireAdmin()) return;
    void api.admin.getFeePolicy().then((p) => {
      setPolicy(p);
      setLoading(false);
    });
  }, []);

  if (loading || !policy) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const mechanisms = [
    {
      name: "Provider fee-share",
      description: "Revenue share paid by ChangeNOW / RocketX on every conversion.",
      detail: `${policy.providerFeeShare.adjustablePercent}% of swap volume`,
      status: policy.providerFeeShare.status,
      note: policy.providerFeeShare.deprecationNote,
    },
    {
      name: "Quote markup",
      description: "Transparent percentage added to the customer's quoted amount.",
      detail: `${policy.quoteMarkup.percent}% on quotes`,
      status: policy.quoteMarkup.status,
      note: policy.quoteMarkup.deprecationNote,
    },
    {
      name: "Merchant SaaS fee",
      description: "Flat recurring platform charge billed to the merchant.",
      detail: `$${policy.merchantSaasFee.amountUsd} every ${policy.merchantSaasFee.intervalDays} days`,
      status: policy.merchantSaasFee.status,
      note: policy.merchantSaasFee.deprecationNote,
    },
  ];

  const deprecating = mechanisms.filter((m) => m.status === FeeMechanismStatus.Deprecating);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">Fee policy</h1>
        <p className="mt-1 text-sm text-navy-500">
          Three independent revenue mechanisms — run one, two, or all three. Changes apply to new
          invoices immediately.
        </p>
      </header>

      {/* Deprecation-notice surface (§15): the operator always sees WHY a fee
          option is going away and what to do, before it silently breaks. */}
      {deprecating.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mt-0.5 size-5 shrink-0 text-amber-500"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold text-amber-900">Deprecation notices</p>
              <ul className="mt-2 space-y-1.5 text-sm text-amber-800">
                {deprecating.map((m) => (
                  <li key={m.name}>
                    <strong className="font-semibold">{m.name}:</strong>{" "}
                    {m.note ??
                      "This mechanism is being deprecated. It keeps working until you disable it."}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {mechanisms.map((mech) => {
          const badge = STATUS_BADGE[mech.status] ?? {
            variant: "default" as const,
            label: mech.status,
          };
          const isActive = mech.status === FeeMechanismStatus.Active;
          return (
            <Card
              key={mech.name}
              className={isActive ? "border-t-4 border-t-primary" : "border-t-4 border-t-navy-100"}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{mech.name}</CardTitle>
                  <Badge variant={badge.variant} dot>
                    {badge.label}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-navy-500">{mech.description}</p>
              </CardHeader>
              <CardContent>
                <p className="rounded-lg bg-navy-50 px-3 py-2 font-mono text-sm font-semibold tabular-nums text-navy-800">
                  {mech.detail}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-navy-400">
        Mechanism toggles and per-merchant overrides are driven by the FeePolicy record — see §15 of
        the build spec for the deprecation lifecycle.
      </p>
    </div>
  );
}
