"use client";

import type { SubscriptionDto, SubscriptionPlanDto } from "@egofi/types";
import { SubscriptionPeriodUnit, SubscriptionStatus } from "@egofi/types";
import { Badge, Button, Card, CardContent, Input, Skeleton, cn } from "@egofi/ui";
import { useParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { CopyButton } from "../../../../lib/CopyButton";
import { api } from "../../../../lib/api";
import { loginRedirect } from "../../../../lib/auth";
import { subscribeUrl } from "../../../../lib/checkout-url";
import {
  PERIOD_UNIT_OPTIONS,
  SUBSCRIPTION_STATUS_META,
  formatBillingCycle,
  formatMoney,
} from "../../../../lib/subscription-meta";

const CURRENCIES = ["USD", "NGN", "EUR", "GBP", "GHS", "KES", "ZAR"];

export default function PlanDetailPage() {
  const params = useParams<{ planId: string }>();
  const planId = params.planId;

  const [plan, setPlan] = useState<SubscriptionPlanDto | null>(null);
  const [subscribers, setSubscribers] = useState<SubscriptionDto[]>([]);
  const [notFound, setNotFound] = useState(false);

  // Edit form
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [duration, setDuration] = useState(1);
  const [unit, setUnit] = useState<SubscriptionPeriodUnit>(SubscriptionPeriodUnit.Month);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const load = async () => {
    const token = localStorage.getItem("egofi_token");
    if (!token) {
      loginRedirect();
      return;
    }
    api.setAuthToken(token);
    try {
      const [p, subs] = await Promise.all([
        api.subscriptions.get(planId),
        api.subscriptions.listSubscribers(planId),
      ]);
      setPlan(p);
      setSubscribers(subs.data);
      setTitle(p.title);
      setAmount(p.costPerPeriod);
      setCurrency(p.currency);
      setDuration(p.periodDuration);
      setUnit(p.periodUnit);
    } catch {
      setNotFound(true);
    }
  };

  useEffect(() => {
    void load();
  }, [planId]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Give the plan a name");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.subscriptions.update(planId, {
        title: title.trim(),
        costPerPeriod: amount,
        currency,
        periodDuration: duration,
        periodUnit: unit,
      });
      setPlan(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the plan");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!plan) return;
    const updated = await api.subscriptions.update(planId, { active: !plan.active });
    setPlan(updated);
  };

  const cancelSubscriber = async (subscriptionId: string, email: string) => {
    if (
      !window.confirm(
        `Cancel ${email}'s subscription? They will not be billed again. This cannot be undone.`,
      )
    ) {
      return;
    }
    setCancelingId(subscriptionId);
    try {
      await api.subscriptions.cancelSubscriber(subscriptionId);
      await load();
    } finally {
      setCancelingId(null);
    }
  };

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl p-6 lg:p-10">
        <a href="/subscriptions" className="text-sm font-medium text-navy-400 hover:text-navy-700">
          ← Subscriptions
        </a>
        <Card className="mt-4">
          <CardContent className="p-12 text-center">
            <p className="font-medium text-navy-800">Plan not found</p>
            <p className="mt-1 text-sm text-navy-500">
              It may have been deleted, or the link is incorrect.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-10">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const url = subscribeUrl(plan.id);
  const activeCount = subscribers.filter((s) => s.status === SubscriptionStatus.Active).length;
  const dirty =
    title.trim() !== plan.title ||
    amount !== plan.costPerPeriod ||
    currency !== plan.currency ||
    duration !== plan.periodDuration ||
    unit !== plan.periodUnit;

  // Monthly-equivalent recurring revenue, a number merchants actually care about.
  const perPeriod = Number(plan.costPerPeriod) || 0;
  const recurringRevenue = perPeriod * activeCount;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-6 lg:p-10">
      <header className="space-y-3">
        <a href="/subscriptions" className="text-sm font-medium text-navy-400 hover:text-navy-700">
          ← Subscriptions
        </a>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-navy-950">{plan.title}</h1>
            <Badge variant={plan.active ? "success" : "default"} dot>
              {plan.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <Button variant="secondary" onClick={toggleActive}>
            {plan.active ? "Deactivate plan" : "Reactivate plan"}
          </Button>
        </div>
        <p className="text-sm text-navy-500">
          {formatMoney(plan.costPerPeriod, plan.currency)} ·{" "}
          {formatBillingCycle(plan.periodDuration, plan.periodUnit).toLowerCase()}
        </p>
      </header>

      {/* At-a-glance */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-medium text-navy-500">Active subscribers</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-navy-950">{activeCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-navy-500">Recurring revenue</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-navy-950">
            {formatMoney(String(recurringRevenue), plan.currency)}
          </p>
          <p className="mt-0.5 text-xs text-navy-400">
            per {plan.periodDuration === 1 ? "" : `${plan.periodDuration} `}
            {plan.periodUnit.toLowerCase()}
            {plan.periodDuration === 1 ? "" : "s"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-navy-500">Total subscribers</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-navy-950">{subscribers.length}</p>
        </Card>
      </div>

      {/* Shareable subscribe link */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-base font-semibold text-navy-950">Subscribe link</h2>
          <p className="mt-1 text-sm text-navy-500">
            Share this with customers. They pick a coin, enter their email, and pay the first period
            — we bill them automatically after that.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-navy-100 bg-navy-50/50 p-3">
            <span className="min-w-0 flex-1 truncate font-mono text-sm text-navy-800">{url}</span>
            <CopyButton text={url} label="subscribe link" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm">
                Open page ↗
              </Button>
            </a>
            {!plan.active && (
              <span className="self-center text-xs text-amber-700">
                This plan is inactive — the link will not accept new subscribers.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit plan */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-base font-semibold text-navy-950">Plan details</h2>
          <p className="mt-1 text-sm text-navy-500">
            Changes apply to the next billing cycle. Existing subscribers keep their current period.
          </p>
          <form onSubmit={save} className="mt-5 space-y-5">
            <Input label="Plan name" value={title} onChange={(e) => setTitle(e.target.value)} />

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Input
                label="Amount per period"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                {...(error ? { error } : {})}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="currency" className="text-sm font-medium text-navy-800">
                  Currency
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-[42px] rounded-lg border border-navy-200 bg-surface px-3 text-sm text-navy-900 outline-none transition-all hover:border-navy-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Bill every"
                type="number"
                min="1"
                max="3650"
                value={String(duration)}
                onChange={(e) => setDuration(Math.max(1, Number(e.target.value) || 1))}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="unit" className="text-sm font-medium text-navy-800">
                  Period
                </label>
                <select
                  id="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as SubscriptionPeriodUnit)}
                  className="h-[42px] rounded-lg border border-navy-200 bg-surface px-3 text-sm text-navy-900 outline-none transition-all hover:border-navy-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
                >
                  {PERIOD_UNIT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                      {duration === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" loading={saving} disabled={!dirty}>
                {saved ? "Saved ✓" : "Save changes"}
              </Button>
              {dirty && !saving && <span className="text-sm text-navy-400">Unsaved changes</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Subscribers */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-navy-100 px-6 py-4">
            <h2 className="text-base font-semibold text-navy-950">Subscribers</h2>
          </div>

          {subscribers.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-navy-50">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="size-6 text-navy-400"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                  />
                </svg>
              </div>
              <p className="mt-4 font-semibold text-navy-900">No subscribers yet</p>
              <p className="mt-1 text-sm text-navy-500">
                Share the subscribe link above to get your first one.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-100 text-left">
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Customer
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Pays with
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Next billing
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Invoices
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Status
                    </th>
                    <th className="px-6 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {subscribers.map((s) => {
                    const meta = SUBSCRIPTION_STATUS_META[s.status] ?? {
                      label: s.status,
                      variant: "default" as const,
                    };
                    const canceled = s.status === SubscriptionStatus.Canceled;
                    return (
                      <tr key={s.id} className="transition-colors hover:bg-navy-50/60">
                        <td className="px-6 py-4 font-medium text-navy-900">{s.customerEmail}</td>
                        <td className="px-6 py-4 text-navy-600">
                          {s.payAsset}
                          <span className="text-navy-400"> · {s.payChain}</span>
                        </td>
                        <td
                          className={cn("px-6 py-4", canceled ? "text-navy-300" : "text-navy-600")}
                        >
                          {canceled
                            ? "—"
                            : new Date(s.nextBillingAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                        </td>
                        <td className="px-6 py-4 tabular-nums text-navy-600">
                          {s.invoiceCount ?? 0}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={meta.variant} dot>
                            {meta.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {!canceled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={cancelingId === s.id}
                              onClick={() => cancelSubscriber(s.id, s.customerEmail)}
                              className="text-danger-600 hover:bg-danger-50"
                            >
                              Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
