"use client";

import type {
  AdminBreakdownDto,
  AdminMetric,
  AdminOverviewDto,
  AdminTimeseriesDto,
} from "@egofi/types";
import { Spinner } from "@egofi/ui";
import { useEffect, useState } from "react";
import { AreaChart, BarList, StatTile } from "../../../components/charts";
import { api, requireAdmin } from "../../../lib/api";

const METRICS: { value: AdminMetric; label: string; kind: "money" | "count" }[] = [
  { value: "invoices_created", label: "Invoices created", kind: "count" },
  { value: "settled_volume", label: "Settled volume", kind: "money" },
  { value: "invoices_paid", label: "Invoices paid", kind: "count" },
  { value: "new_merchants", label: "New merchants", kind: "count" },
];

const usd = (v: string | number) =>
  `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const [overview, setOverview] = useState<AdminOverviewDto | null>(null);
  const [breakdown, setBreakdown] = useState<AdminBreakdownDto | null>(null);
  const [series, setSeries] = useState<AdminTimeseriesDto | null>(null);
  const [metric, setMetric] = useState<AdminMetric>("invoices_created");

  useEffect(() => {
    if (!requireAdmin()) return;
    void api.admin.overview().then(setOverview);
    void api.admin.breakdown().then(setBreakdown);
  }, []);

  useEffect(() => {
    if (!requireAdmin()) return;
    setSeries(null);
    void api.admin.timeseries({ metric, interval: "day" }).then(setSeries);
  }, [metric]);

  const metricMeta = METRICS.find((m) => m.value === metric)!;
  const fmt = (n: number) => (metricMeta.kind === "money" ? usd(n) : n.toLocaleString());

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">Overview</h1>
        <p className="mt-1 text-sm text-navy-500">
          Everything across every merchant, live.
          {overview && (
            <span className="text-navy-400">
              {" "}
              Updated {new Date(overview.generatedAt).toLocaleTimeString()}.
            </span>
          )}
        </p>
      </header>

      {!overview ? (
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label="Settled volume"
              value={usd(overview.volume.settledUsd)}
              sub="USD-denominated, confirmed"
            />
            <StatTile
              label="In-flight"
              value={usd(overview.volume.inflightUsd)}
              sub="awaiting / converting"
            />
            <StatTile
              label="Conversion"
              value={`${(overview.volume.conversionRate * 100).toFixed(1)}%`}
              sub="paid ÷ decided"
            />
            <StatTile
              label="MRR"
              value={usd(overview.subscriptions.mrrUsd)}
              sub={`${overview.subscriptions.activeSubscribers} active subscribers`}
            />
            <StatTile
              label="Merchants"
              value={overview.merchants.total.toLocaleString()}
              sub={`${overview.merchants.active} active · ${overview.merchants.pending} pending`}
            />
            <StatTile
              label="Invoices"
              value={overview.invoices.total.toLocaleString()}
              sub={`${overview.invoices.paid} paid · ${overview.invoices.awaiting} awaiting`}
            />
            <StatTile
              label="Unmatched"
              value={overview.operations.unmatchedOpen.toLocaleString()}
              sub="payments to review"
              tone={overview.operations.unmatchedOpen > 0 ? "warning" : "default"}
            />
            <StatTile
              label="Queue health"
              value={
                overview.operations.outboxDead === 0 && overview.operations.webhooksFailing === 0
                  ? "Healthy"
                  : "Attention"
              }
              sub={`${overview.operations.outboxDead} dead · ${overview.operations.webhooksFailing} webhooks failing`}
              tone={
                overview.operations.outboxDead > 0 || overview.operations.webhooksFailing > 0
                  ? "danger"
                  : "success"
              }
            />
            <a href="/compliance" className="contents">
              <StatTile
                label="KYB review"
                value={overview.operations.kybPending.toLocaleString()}
                sub="merchants awaiting review"
                tone={overview.operations.kybPending > 0 ? "warning" : "default"}
              />
            </a>
          </div>

          {/* Time series */}
          <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-navy-100 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-navy-950">{metricMeta.label}</h2>
              <div className="flex flex-wrap gap-1 rounded-lg bg-navy-50 p-1">
                {METRICS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMetric(m.value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      metric === m.value
                        ? "bg-white text-navy-950 shadow-sm"
                        : "text-navy-500 hover:text-navy-800"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            {series ? (
              <AreaChart points={series.points} formatValue={fmt} />
            ) : (
              <div className="flex h-[240px] items-center justify-center">
                <Spinner size="lg" />
              </div>
            )}
            <p className="mt-2 text-xs text-navy-400">Last 30 days, by day created.</p>
          </section>

          {/* Breakdowns */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-navy-100 sm:p-6">
              <h2 className="mb-4 text-base font-semibold text-navy-950">Invoices by state</h2>
              <BarList
                items={(breakdown?.byState ?? []).map((s) => ({ label: s.label, value: s.count }))}
              />
            </section>
            <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-navy-100 sm:p-6">
              <h2 className="mb-4 text-base font-semibold text-navy-950">
                Top merchants by volume
              </h2>
              <BarList
                items={(breakdown?.topMerchants ?? []).map((m) => ({
                  label: m.business,
                  value: Number(m.valueUsd) || m.count,
                  sub: Number(m.valueUsd) > 0 ? usd(m.valueUsd) : `${m.count} invoices`,
                  href: `/merchants/${m.merchantId}`,
                }))}
                formatValue={() => ""}
                empty="No settled volume yet"
              />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
