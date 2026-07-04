"use client";

import { createApiClient } from "@egofi/sdk";
import type { InvoiceDto, MerchantProfile } from "@egofi/types";
import { KybStatus } from "@egofi/types";
import { Badge, Button, Card, CardContent, Skeleton } from "@egofi/ui";
import { useEffect, useState } from "react";
import { InvoiceStateBadge } from "../../../lib/invoice-state";
import { KYB_STATUS_META } from "../../../lib/kyb-meta";

const api = createApiClient();

const PlusIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden>
    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5z" />
  </svg>
);

const ChevronIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-navy-300" aria-hidden>
    <path
      fillRule="evenodd"
      d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02z"
      clipRule="evenodd"
    />
  </svg>
);

const STAT_ICONS = {
  total: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
      <path
        fillRule="evenodd"
        d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.6a1.5 1.5 0 0 0-.44-1.06l-3.6-3.6A1.5 1.5 0 0 0 11.4 2H4.5zm2.25 6a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
  paid: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
  flight: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm.75-13a.75.75 0 0 0-1.5 0v5c0 .27.144.518.378.65l3.5 2a.75.75 0 0 0 .744-1.3L10.75 9.566V5z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

export default function DashboardPage() {
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [total, setTotal] = useState(0);
  const [apiKeyCount, setApiKeyCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("egofi_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    api.setAuthToken(token);
    void (async () => {
      try {
        const [profile, inv, keys] = await Promise.all([
          api.merchant.getProfile(),
          api.invoices.list({ limit: 8 }),
          api.merchant.listApiKeys().catch(() => []),
        ]);
        setMerchant(profile);
        setInvoices(inv.data);
        setTotal(inv.total);
        setApiKeyCount(keys.length);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const confirmed = invoices.filter((i) => i.state === "PAID_CONFIRMED").length;
  const inflight = invoices.filter((i) =>
    ["AWAITING_PAYMENT", "RECEIVED", "CONVERTING", "PAYOUT_SENT"].includes(i.state),
  ).length;

  const stats = [
    {
      key: "total",
      label: "Total invoices",
      value: total,
      icon: STAT_ICONS.total,
      tint: "text-primary bg-primary-50",
    },
    {
      key: "paid",
      label: "Paid & confirmed",
      value: confirmed,
      icon: STAT_ICONS.paid,
      tint: "text-success-700 bg-success-50",
    },
    {
      key: "flight",
      label: "In flight",
      value: inflight,
      icon: STAT_ICONS.flight,
      tint: "text-info-700 bg-info-50",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-5 sm:p-6 lg:p-10">
      {/* Greeting + CTA */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-navy-400">Welcome back</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-navy-950">
            {loading ? <Skeleton className="h-8 w-48" /> : merchant?.business}
          </h1>
        </div>
        <a href="/invoices/new">
          <Button size="lg">{PlusIcon} New payment link</Button>
        </a>
      </header>

      {/* Setup + recommendations */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SetupChecklist merchant={merchant} apiKeyCount={apiKeyCount} loading={loading} />
        </div>
        <div className="space-y-6">
          <VerificationCard merchant={merchant} loading={loading} />
          <RecommendedSteps merchant={merchant} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.key} className="p-5">
            <div className="flex items-center justify-between">
              <span className={`flex size-10 items-center justify-center rounded-xl ${stat.tint}`}>
                {stat.icon}
              </span>
            </div>
            <p className="mt-4 text-sm font-medium text-navy-500">{stat.label}</p>
            {loading ? (
              <Skeleton className="mt-1 h-9 w-16" />
            ) : (
              <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-navy-950">
                {stat.value}
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Products */}
      <ProductsSection />

      {/* Invoices */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-navy-950">Recent invoices</h2>
          {total > invoices.length && (
            <a
              href="/invoices"
              className="text-sm font-medium text-primary underline-offset-2 hover:text-primary-700 hover:underline"
            >
              View all →
            </a>
          )}
        </div>

        <Card>
          {loading ? (
            <div className="space-y-3 p-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="ml-auto h-6 w-24 rounded-full" />
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <CardContent className="p-12 pt-12">
              <div className="text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-navy-50">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="size-7 text-navy-400"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
                    />
                  </svg>
                </div>
                <p className="mt-4 font-semibold text-navy-900">No invoices yet</p>
                <p className="mt-1 text-sm text-navy-500">
                  Create your first payment link to start accepting crypto.
                </p>
                <a href="/invoices/new" className="mt-5 inline-block">
                  <Button>{PlusIcon} New payment link</Button>
                </a>
              </div>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-100 text-left">
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Invoice
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Amount
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Pay asset
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Created
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => {
                        window.location.href = `/invoices/${inv.id}`;
                      }}
                      className="cursor-pointer transition-colors hover:bg-navy-50/60"
                    >
                      <td className="px-6 py-4 font-mono text-xs text-navy-600">
                        {inv.id.slice(0, 14)}…
                      </td>
                      <td className="px-6 py-4 font-semibold tabular-nums text-navy-950">
                        {inv.displayAmount}{" "}
                        <span className="font-normal text-navy-500">{inv.displayCurrency}</span>
                      </td>
                      <td className="px-6 py-4 text-navy-600">{inv.payAsset}</td>
                      <td className="px-6 py-4 text-navy-500">
                        {new Date(inv.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <InvoiceStateBadge state={inv.state} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

type SetupStep = { label: string; description: string; href: string; done: boolean };

function SetupChecklist({
  merchant,
  apiKeyCount,
  loading,
}: {
  merchant: MerchantProfile | null;
  apiKeyCount: number;
  loading: boolean;
}) {
  const hasAddress = merchant
    ? Object.values(merchant.settlementAddresses ?? {}).some(Boolean)
    : false;
  const verified = merchant?.kybStatus === KybStatus.Verified;

  const steps: SetupStep[] = [
    {
      label: "Add a settlement address",
      description: "Where your crypto settles — your own wallet, never ours.",
      href: "/settings/settlement",
      done: hasAddress,
    },
    {
      label: "Verify your business",
      description: "Unlock higher limits and take your payment links live.",
      href: "/settings/verification",
      done: verified,
    },
    {
      label: "Create an API key",
      description: "Integrate egofi into your own checkout or backend.",
      href: "/developers",
      done: apiKeyCount > 0,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  return (
    <Card className="h-full overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-navy-100 p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold tracking-tight text-navy-950">
              {allDone ? "You're all set" : "Finish setting up egofi"}
            </h2>
            {loading ? (
              <Skeleton className="h-5 w-16 rounded-full" />
            ) : allDone ? (
              <Badge variant="success" dot>
                Complete
              </Badge>
            ) : (
              <Badge variant="warning" dot>
                {doneCount} of {steps.length} done
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-navy-500">
            {allDone
              ? "Your account is ready to accept live payments."
              : "Complete these steps to start accepting live payments."}
          </p>
        </div>
      </div>

      {!allDone && (
        <div className="flex items-start gap-2.5 border-b border-navy-50 bg-info-50/60 px-5 py-3 sm:px-6">
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            className="mt-0.5 size-4 shrink-0 text-info-600"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-info-800">
            Once complete, your payment links go live and settle straight to your wallet.
          </p>
        </div>
      )}

      <ol className="divide-y divide-navy-50">
        {steps.map((step, i) => (
          <li key={step.label}>
            <a
              href={step.href}
              className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-navy-50/60 sm:px-6"
            >
              <span
                className={
                  step.done
                    ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-success-500 text-white"
                    : "flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-navy-200 text-sm font-semibold text-navy-400"
                }
              >
                {step.done ? (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={
                    step.done
                      ? "text-sm font-semibold text-navy-500 line-through"
                      : "text-sm font-semibold text-navy-900"
                  }
                >
                  {step.label}
                </p>
                <p className="mt-0.5 text-sm text-navy-500">{step.description}</p>
              </div>
              {!step.done && (
                <span className="hidden shrink-0 text-sm font-medium text-primary group-hover:underline sm:block">
                  {i === 0 ? "Set up" : i === 1 ? "Verify" : "Manage"}
                </span>
              )}
              <span className="shrink-0 transition-transform group-hover:translate-x-0.5">
                {ChevronIcon}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function VerificationCard({
  merchant,
  loading,
}: {
  merchant: MerchantProfile | null;
  loading: boolean;
}) {
  const meta = merchant ? KYB_STATUS_META[merchant.kybStatus] : undefined;
  const verified = merchant?.kybStatus === KybStatus.Verified;
  const underReview = merchant?.kybStatus === KybStatus.UnderReview;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-navy-950">Business verification</h3>
        {loading ? (
          <Skeleton className="h-5 w-20 rounded-full" />
        ) : (
          <Badge variant={meta?.variant ?? "default"} dot>
            {meta?.label ?? "—"}
          </Badge>
        )}
      </div>
      <p className="mt-2 text-sm text-navy-500">
        {verified
          ? "Your business is verified. You're on the highest limits available for your tier."
          : underReview
            ? "We're reviewing your documents. This usually takes a business day."
            : "Verify your business to raise settlement limits and take payments live."}
      </p>
      {!verified && (
        <a href="/settings/verification" className="mt-4 inline-block">
          <Button variant="secondary" size="sm">
            {underReview ? "View status" : "Complete verification"}
          </Button>
        </a>
      )}
    </Card>
  );
}

function RecommendedSteps({ merchant }: { merchant: MerchantProfile | null }) {
  const hasWebhook = Boolean(merchant?.webhookUrl);
  const items = [
    {
      label: "Create your first payment link",
      href: "/invoices/new",
      tint: "bg-primary-50 text-primary",
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
          <path d="M8.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
        </svg>
      ),
    },
    {
      label: hasWebhook ? "Webhook notifications set up" : "Set up webhook notifications",
      href: "/settings/settlement",
      done: hasWebhook,
      tint: "bg-info-50 text-info-700",
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
          <path
            fillRule="evenodd"
            d="M10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.9 32.9 0 0 0 3.256.508 3.5 3.5 0 0 0 6.972 0 32.9 32.9 0 0 0 3.256-.508.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6zm2 12.5a2 2 0 1 1-4 0 41.03 41.03 0 0 0 4 0z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      label: "Explore the API & SDK docs",
      href: "/developers",
      tint: "bg-accent-100 text-lime-800",
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
          <path
            fillRule="evenodd"
            d="M6.28 5.22a.75.75 0 0 1 0 1.06L2.56 10l3.72 3.72a.75.75 0 0 1-1.06 1.06L.97 10.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0zm7.44 0a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 0 1 0-1.06z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ];

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-navy-950">Recommended steps</h3>
      <ul className="mt-3 space-y-1">
        {items.map((item) => (
          <li key={item.label}>
            <a
              href={item.href}
              className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-navy-50"
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${item.tint}`}
              >
                {item.icon}
              </span>
              <span className="flex-1 text-sm font-medium text-navy-700">{item.label}</span>
              {"done" in item && item.done ? (
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="size-4 text-success-500"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <span className="transition-transform group-hover:translate-x-0.5">
                  {ChevronIcon}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ProductsSection() {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-navy-950">Products</h2>
        <p className="mt-1 text-sm text-navy-500">
          Ways to get paid with egofi. Start from the dashboard or integrate directly with the API.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Crypto payments */}
        <Card className="relative flex flex-col overflow-hidden p-5 sm:p-6">
          <a
            href="/developers"
            className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary-100"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden>
              <path
                fillRule="evenodd"
                d="M6.28 4.22a.75.75 0 0 1 0 1.06L3.56 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L1.97 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0zm3.44 0a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 1 1-1.06-1.06L12.44 8 9.72 5.28a.75.75 0 0 1 0-1.06z"
                clipRule="evenodd"
              />
            </svg>
            Integrate with API
          </a>
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary-50 text-primary">
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-6" aria-hidden>
              <path d="M10 1a1 1 0 0 1 1 1v.5h1.5a2.5 2.5 0 0 1 0 5H11v3h1a2 2 0 0 1 0 4h-1v.5a1 1 0 1 1-2 0V17.5H7.5a2 2 0 0 1 0-4H9v-3H7.5a2.5 2.5 0 0 1 0-5H9V2a1 1 0 0 1 1-1z" />
            </svg>
          </span>
          <h3 className="mt-4 text-base font-semibold text-navy-950">Crypto payments</h3>
          <p className="mt-1.5 flex-1 text-sm text-navy-500">
            Accept 300+ cryptocurrencies from a hosted checkout or a shareable link. Funds convert
            and settle directly to your wallet — never held by egofi.
          </p>
          <a href="/invoices/new" className="mt-4 inline-block">
            <Button size="sm">Start accepting payments →</Button>
          </a>
        </Card>

        {/* Developer tools */}
        <Card className="flex flex-col p-5 sm:p-6">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent-100 text-lime-800">
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-6" aria-hidden>
              <path
                fillRule="evenodd"
                d="M4.72 3.22a.75.75 0 0 1 1.06 1.06L2.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25zm6.56 0a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L14.94 8l-3.72-3.72a.75.75 0 0 1 0-1.06zM9.7 2.02a.75.75 0 0 1 .59.88l-2 10a.75.75 0 0 1-1.47-.3l2-10a.75.75 0 0 1 .88-.58z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <h3 className="mt-4 text-base font-semibold text-navy-950">Developer tools</h3>
          <p className="mt-1.5 flex-1 text-sm text-navy-500">
            Create API keys, wire up webhooks for real-time payment notifications, and drop in our
            SDK to build a fully custom checkout.
          </p>
          <a href="/developers" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">
              Open developer settings →
            </Button>
          </a>
        </Card>
      </div>

      <a
        href="/developers"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        API integration guide
        <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden>
          <path
            fillRule="evenodd"
            d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </a>
    </section>
  );
}
