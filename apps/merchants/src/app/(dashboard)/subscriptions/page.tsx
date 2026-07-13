"use client";

import type { SubscriptionPlanDto } from "@egofi/types";
import { SubscriptionPeriodUnit } from "@egofi/types";
import { Badge, Button, Spinner, cn } from "@egofi/ui";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { CopyButton } from "../../../lib/CopyButton";
import { api } from "../../../lib/api";
import { loginRedirect } from "../../../lib/auth";
import { subscribeUrl } from "../../../lib/checkout-url";

const PERIOD_UNITS: { value: SubscriptionPeriodUnit; label: string; singular: string }[] = [
  { value: SubscriptionPeriodUnit.Day, label: "Day(s)", singular: "Day" },
  { value: SubscriptionPeriodUnit.Week, label: "Week(s)", singular: "Week" },
  { value: SubscriptionPeriodUnit.Month, label: "Month(s)", singular: "Month" },
  { value: SubscriptionPeriodUnit.Year, label: "Year(s)", singular: "Year" },
];

const CURRENCIES = [
  { code: "USD", flag: "🇺🇸" },
  { code: "EUR", flag: "🇪🇺" },
  { code: "GBP", flag: "🇬🇧" },
  { code: "NGN", flag: "🇳🇬" },
  { code: "GHS", flag: "🇬🇭" },
  { code: "KES", flag: "🇰🇪" },
  { code: "ZAR", flag: "🇿🇦" },
];

function periodLabel(duration: number, unit: string): string {
  const meta = PERIOD_UNITS.find((u) => u.value === unit);
  const s = meta?.singular ?? unit;
  return `${duration} ${s}${duration > 1 ? "s" : ""}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const fieldCls =
  "w-full border border-navy-200 bg-surface px-4 py-3 text-sm text-navy-900 placeholder:text-navy-400 transition-colors hover:border-navy-300 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10";

export default function SubscriptionsPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    const token = localStorage.getItem("egofi_token");
    if (!token) {
      loginRedirect();
      return;
    }
    api.setAuthToken(token);
    setLoading(true);
    try {
      const res = await api.subscriptions.list();
      setPlans(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter((p) => p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [plans, query]);

  const remove = async (id: string) => {
    if (!confirm("Delete this subscription plan? This can't be undone.")) return;
    try {
      await api.subscriptions.delete(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      // The API refuses to delete a plan that still has active subscribers.
      alert(err instanceof Error ? err.message : "Could not delete the plan");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-6 lg:p-10">
      {/* Header */}
      <header className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">Subscriptions</h1>
        <span
          title="Reusable recurring-billing plans. Share a plan with customers to charge them every period."
          className="flex size-5 cursor-help items-center justify-center rounded-full border border-navy-200 text-[11px] font-semibold text-navy-400"
        >
          i
        </span>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button size="lg" onClick={() => setModalOpen(true)}>
          Create subscription plan
        </Button>
        <div className="flex items-center gap-2 border border-navy-200 bg-surface px-3.5 py-2.5 sm:w-80 focus-within:border-primary-500">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Subscription ID, Name"
            className="w-full bg-transparent text-sm text-navy-900 placeholder:text-navy-400 focus:outline-none"
          />
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-navy-400" aria-hidden>
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 3.16 10.01l3.66 3.66a.75.75 0 1 0 1.06-1.06l-3.66-3.66A5.5 5.5 0 0 0 9 3.5zM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden border border-navy-100 bg-surface shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-left text-xs font-medium uppercase tracking-wide text-navy-400">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Cost per period</th>
                <th className="px-6 py-4 font-medium">Period</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Created at</th>
                <th className="px-6 py-4" />
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
                  <td colSpan={6} className="px-6 py-16 text-center text-navy-400">
                    {query.trim()
                      ? "No plans match your search."
                      : "No subscription plans yet. It takes a couple of clicks to create one!"}
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/subscriptions/${p.id}`)}
                    className="group cursor-pointer transition-colors hover:bg-navy-50/50"
                  >
                    <td className="px-6 py-4">
                      <a
                        href={`/subscriptions/${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-navy-900 hover:text-primary"
                      >
                        {p.title}
                      </a>
                      <p className="mt-0.5 font-mono text-[11px] text-navy-400">{p.id}</p>
                    </td>
                    <td className="px-6 py-4 tabular-nums text-navy-800">
                      {p.costPerPeriod} <span className="text-navy-400">{p.currency}</span>
                    </td>
                    <td className="px-6 py-4 text-navy-700">
                      {periodLabel(p.periodDuration, p.periodUnit)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={p.active ? "success" : "default"} dot>
                        {p.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-navy-500">{formatDate(p.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <CopyButton
                          text={subscribeUrl(p.id)}
                          label="subscribe link"
                          className="px-1.5 py-1"
                        />
                        <button
                          type="button"
                          onClick={() => remove(p.id)}
                          aria-label="Delete plan"
                          title="Delete plan"
                          className="flex size-8 items-center justify-center rounded-lg text-navy-400 opacity-0 transition-all hover:bg-danger-50 hover:text-danger-600 focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            className="size-4"
                            aria-hidden
                          >
                            <path
                              fillRule="evenodd"
                              d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75zM11 3V1.75A1.75 1.75 0 0 0 9.25 0h-2.5A1.75 1.75 0 0 0 5 1.75V3H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.75 1.75 0 0 0 5.6 14.25h4.8a1.75 1.75 0 0 0 1.735-1.6L12.95 4.5h.3a.75.75 0 0 0 0-1.5H11z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <CreatePlanModal
          onClose={() => setModalOpen(false)}
          onCreated={(plan) => {
            setPlans((prev) => [plan, ...prev]);
            setModalOpen(false);
            // Land on the detail page — that's where the shareable link lives.
            router.push(`/subscriptions/${plan.id}`);
          }}
        />
      )}
    </div>
  );
}

function CreatePlanModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (plan: SubscriptionPlanDto) => void;
}) {
  const [title, setTitle] = useState("");
  const [periodDuration, setPeriodDuration] = useState("1");
  const [periodUnit, setPeriodUnit] = useState<SubscriptionPeriodUnit>(
    SubscriptionPeriodUnit.Month,
  );
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ipn, setIpn] = useState("");
  const [success, setSuccess] = useState("");
  const [failed, setFailed] = useState("");
  const [partial, setPartial] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const duration = Number.parseInt(periodDuration, 10);
    if (!title.trim()) return setError("Enter a title");
    if (!Number.isFinite(duration) || duration < 1)
      return setError("Period duration must be at least 1");
    if (!cost || Number(cost) <= 0) return setError("Enter a cost greater than zero");

    setSaving(true);
    try {
      const plan = await api.subscriptions.create({
        title: title.trim(),
        periodDuration: duration,
        periodUnit,
        costPerPeriod: cost,
        currency,
        ...(ipn.trim() ? { ipnCallbackUrl: ipn.trim() } : {}),
        ...(success.trim() ? { successUrl: success.trim() } : {}),
        ...(failed.trim() ? { failedUrl: failed.trim() } : {}),
        ...(partial.trim() ? { partialUrl: partial.trim() } : {}),
      });
      onCreated(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <form
        onSubmit={submit}
        className="relative z-10 my-8 w-full max-w-lg border border-navy-100 bg-surface p-6 shadow-xl animate-scale-in sm:p-8"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold tracking-tight text-navy-950">
            Create subscription plan
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-navy-400 transition-colors hover:bg-navy-100 hover:text-navy-700"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className={fieldCls}
            required
          />

          {/* Period duration + unit */}
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <label className="relative block">
              <span className="pointer-events-none absolute left-4 top-1.5 text-[10px] font-medium uppercase tracking-wider text-navy-400">
                Period duration
              </span>
              <input
                type="number"
                min="1"
                step="1"
                value={periodDuration}
                onChange={(e) => setPeriodDuration(e.target.value)}
                className={cn(fieldCls, "pt-5")}
              />
            </label>
            <select
              value={periodUnit}
              onChange={(e) => setPeriodUnit(e.target.value as SubscriptionPeriodUnit)}
              aria-label="Period unit"
              className={cn(fieldCls, "w-36")}
            >
              {PERIOD_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cost + currency */}
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="Cost per period"
              className={fieldCls}
              required
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              aria-label="Currency"
              className={cn(fieldCls, "w-36")}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced settings */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-700"
            >
              <span className="flex size-5 items-center justify-center border border-primary/40 text-primary">
                {showAdvanced ? (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden>
                    <path d="M3.75 7.25a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden>
                    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5z" />
                  </svg>
                )}
              </span>
              Advanced settings
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 border-l-2 border-primary/30 pl-4 animate-fade-in">
                <input
                  value={ipn}
                  onChange={(e) => setIpn(e.target.value)}
                  placeholder="Payment notifications link"
                  className={fieldCls}
                />
                <input
                  value={success}
                  onChange={(e) => setSuccess(e.target.value)}
                  placeholder="Successful payment page"
                  className={fieldCls}
                />
                <input
                  value={failed}
                  onChange={(e) => setFailed(e.target.value)}
                  placeholder="Payment failed page"
                  className={fieldCls}
                />
                <input
                  value={partial}
                  onChange={(e) => setPartial(e.target.value)}
                  placeholder="Partial payment page"
                  className={fieldCls}
                />
              </div>
            )}
          </div>

          {error && <p className="text-sm text-danger-600">{error}</p>}
        </div>

        <Button type="submit" size="lg" loading={saving} className="mt-6 w-full">
          Create
        </Button>
      </form>
    </div>
  );
}
