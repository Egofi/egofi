"use client";

import type { IntegrationSettingsDto } from "@egofi/types";
import { Button, Input, Skeleton, cn } from "@egofi/ui";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { CopyButton } from "../../../lib/CopyButton";
import { api } from "../../../lib/api";
import { loginRedirect } from "../../../lib/auth";

const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3000";
const CHECKOUT_BASE = process.env["NEXT_PUBLIC_CHECKOUT_URL"] ?? "http://localhost:3001";

type ApiKey = { id: string; name: string; createdAt: string };

/** Terminal-style code block with a chrome bar, language label, and copy. */
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="overflow-hidden border border-navy-800 bg-navy-950 shadow-card">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-1.5">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-danger-400/70" />
          <span className="size-2.5 rounded-full bg-amber-300/70" />
          <span className="size-2.5 rounded-full bg-success-400/70" />
          <span className="ml-2 font-mono text-[11px] text-navy-300">{lang}</span>
        </span>
        <CopyButton text={code} label="code" className="text-navy-200 hover:bg-white/10" />
      </div>
      <pre className="max-h-[26rem] overflow-auto p-4 text-xs leading-relaxed text-navy-100">
        <code className="whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center bg-primary-50 text-primary">
          {icon}
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-navy-950">{title}</h2>
          <p className="text-sm text-navy-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("border border-navy-100 bg-white shadow-card", className)}>{children}</div>
  );
}

const CREATE_PAYMENT_SNIPPET = `curl -X POST ${API_BASE}/invoices \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -H "Content-Type: application/json" \\
  -d '{
    "displayCurrency": "USD",
    "displayAmount": "49.99",
    "payAsset": "USDT",
    "payChain": "TRON",
    "refundAddress": "OPTIONAL_CUSTOMER_REFUND_ADDRESS",
    "metadata": { "orderId": "ORDER-1234" }
  }'

# Response → { "id": "inv_...", ... }
# Redirect your customer to the hosted checkout:
#   ${CHECKOUT_BASE}/pay/{id}`;

const WEBHOOK_PAYLOAD_SNIPPET = `POST  https://your-store.com/webhooks/egofi
Headers:
  Content-Type: application/json
  x-egofi-signature: sha256=<hmac-sha256 hex of the raw body>

Body:
{
  "id": "<delivery id>",
  "event": "invoice.paid",
  "invoiceId": "inv_...",
  "merchantId": "mch_...",
  "data": {
    "invoiceId": "inv_...",
    "merchantId": "mch_...",
    "state": "PAID_CONFIRMED",
    "previousState": "CONVERTING"
  },
  "timestamp": "2026-07-04T10:00:00.000Z"
}

# events: invoice.paid · invoice.failed · invoice.expired
#         invoice.underpaid · invoice.refunded · invoice.compliance_hold`;

const VERIFY_SNIPPET = `import crypto from "node:crypto";

// IMPORTANT: verify against the RAW request body, before JSON parsing.
app.post("/webhooks/egofi", express.raw({ type: "*/*" }), (req, res) => {
  const signature = req.headers["x-egofi-signature"];       // "sha256=..."
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", process.env.EGOFI_IPN_SECRET)
      .update(req.body)                                     // raw Buffer
      .digest("hex");

  const ok =
    signature &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!ok) return res.status(401).send("bad signature");

  const event = JSON.parse(req.body.toString());
  if (event.event === "invoice.paid") {
    // ✅ mark order \${event.data.invoiceId} as paid
  }
  res.sendStatus(200);
});`;

const FLOW_STEPS = ["Create a payment", "Redirect to checkout", "Verify the webhook"];

const ICON = {
  key: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
      <path
        fillRule="evenodd"
        d="M8 7a5 5 0 1 1 3.61 4.804l-1.903 1.903A1 1 0 0 1 9 14H8v1a1 1 0 0 1-1 1H6v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L8.196 8.39A5.002 5.002 0 0 1 8 7zm5-3a.75.75 0 0 0 0 1.5A1.5 1.5 0 0 1 14.5 7 .75.75 0 0 0 16 7a3 3 0 0 0-3-3z"
        clipRule="evenodd"
      />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.9 32.9 0 0 0 3.256.508 3.5 3.5 0 0 0 6.972 0 32.9 32.9 0 0 0 3.256-.508.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6zm2 12.5a2 2 0 1 1-4 0 41.03 41.03 0 0 0 4 0z"
        clipRule="evenodd"
      />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
      <path d="M10.75 16.82A7.46 7.46 0 0 1 15 15.5c.71 0 1.396.098 2.046.282A.75.75 0 0 0 18 15.06V4.66a.75.75 0 0 0-.546-.721A9 9 0 0 0 15 3.5a8.96 8.96 0 0 0-4.25 1.065V16.82zM9.25 4.565A8.96 8.96 0 0 0 5 3.5c-.85 0-1.673.118-2.454.339A.75.75 0 0 0 2 4.66v10.4a.75.75 0 0 0 .954.721A7.51 7.51 0 0 1 5 15.5c1.579 0 3.042.487 4.25 1.32V4.565z" />
    </svg>
  ),
};

export default function DevelopersPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [integration, setIntegration] = useState<IntegrationSettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<{ name: string; key: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [webhookError, setWebhookError] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [rotating, setRotating] = useState(false);

  const load = async () => {
    const token = localStorage.getItem("egofi_token");
    if (!token) {
      loginRedirect();
      return;
    }
    api.setAuthToken(token);
    setLoading(true);
    try {
      const [k, integ] = await Promise.all([
        api.merchant.listApiKeys(),
        api.merchant.getIntegration(),
      ]);
      setKeys(k);
      setIntegration(integ);
      setWebhookUrl(integ.webhookUrl ?? "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newName.trim()) {
      setError("Give the key a name so you can recognise it later");
      return;
    }
    setCreating(true);
    try {
      const result = await api.merchant.createApiKey(newName.trim());
      setRevealed({ name: result.name, key: result.key });
      setNewName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the key");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    if (
      !window.confirm(
        "Revoke this API key? Any integration using it will stop working immediately.",
      )
    )
      return;
    setDeletingId(id);
    try {
      await api.merchant.deleteApiKey(id);
      await load();
    } finally {
      setDeletingId(null);
    }
  };

  const saveWebhook = async (e: FormEvent) => {
    e.preventDefault();
    setWebhookError("");
    setWebhookSaved(false);
    setSavingWebhook(true);
    try {
      const res = await api.merchant.setWebhookUrl(webhookUrl.trim());
      setIntegration(res);
      setWebhookSaved(true);
      setTimeout(() => setWebhookSaved(false), 2500);
    } catch (err) {
      setWebhookError(err instanceof Error ? err.message : "Could not save the URL");
    } finally {
      setSavingWebhook(false);
    }
  };

  const rotateSecret = async () => {
    if (
      integration?.ipnSecret &&
      !window.confirm("Rotate the IPN secret? Your current secret will stop working immediately.")
    )
      return;
    setRotating(true);
    try {
      const { ipnSecret } = await api.merchant.rotateIpnSecret();
      setIntegration((prev) => ({ webhookUrl: prev?.webhookUrl ?? null, ipnSecret }));
      setShowSecret(true);
    } finally {
      setRotating(false);
    }
  };

  const secret = integration?.ipnSecret ?? null;
  const maskedSecret = secret ? `${secret.slice(0, 10)}${"•".repeat(24)}` : "";

  return (
    <div className="mx-auto max-w-4xl space-y-10 p-5 sm:p-6 lg:p-10">
      {/* Header + flow */}
      <header className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-navy-950">Developers</h1>
            <p className="mt-1 max-w-xl text-sm text-navy-500">
              Accept crypto anywhere. Create payments with your API key and get signed webhooks
              (IPN) on every payment event.
            </p>
          </div>
          <a href={`${API_BASE}/docs`} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm">
              API reference ↗
            </Button>
          </a>
        </div>

        {/* Integration flow strip */}
        <div className="flex flex-wrap items-center gap-2">
          {FLOW_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span className="flex items-center gap-2 border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-700 shadow-xs">
                <span className="flex size-4 items-center justify-center bg-primary text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                {step}
              </span>
              {i < FLOW_STEPS.length - 1 && (
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-4 text-navy-300"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>
      </header>

      {/* API credentials */}
      <Section
        icon={ICON.key}
        title="API credentials"
        description="Authenticate server-to-server requests. Treat keys like passwords — never ship them to the browser."
      >
        {/* Base URL */}
        <Panel className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">
              Base URL
            </p>
            <code className="font-mono text-sm text-navy-900">{API_BASE}</code>
          </div>
          <CopyButton text={API_BASE} label="base URL" />
        </Panel>

        {/* One-time reveal */}
        {revealed && (
          <div className="animate-fade-in-up border border-accent-300 bg-accent-50 p-4">
            <div className="flex items-start gap-3">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="mt-0.5 size-5 shrink-0 text-lime-700"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1zm3 8V5.5a3 3 0 1 0-6 0V9h6z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-lime-900">
                  Copy your new key now — it won't be shown again
                </p>
                <p className="mt-0.5 text-sm text-lime-800">
                  Key <strong>{revealed.name}</strong>. Store it in your server's secret manager.
                </p>
                <div className="mt-3 flex items-center gap-2 border border-lime-300 bg-white p-2.5">
                  <code className="min-w-0 flex-1 truncate font-mono text-sm text-navy-900">
                    {revealed.key}
                  </code>
                  <CopyButton text={revealed.key} label="API key" />
                </div>
                <button
                  type="button"
                  onClick={() => setRevealed(null)}
                  className="mt-3 text-sm font-medium text-lime-800 hover:underline"
                >
                  I've saved it — dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <Panel>
          {/* Create */}
          <form
            onSubmit={create}
            className="flex flex-col gap-3 border-b border-navy-50 p-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <Input
                label="Create an API key"
                placeholder="e.g. Production server"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                {...(error ? { error } : {})}
              />
            </div>
            <Button type="submit" loading={creating}>
              Create key
            </Button>
          </form>

          {/* Keys list */}
          {loading ? (
            <div className="space-y-3 p-4">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-navy-500">
              No API keys yet — create one above to start integrating.
            </p>
          ) : (
            <ul className="divide-y divide-navy-50">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center bg-navy-50 text-navy-400">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
                        <path
                          fillRule="evenodd"
                          d="M8 7a5 5 0 1 1 3.61 4.804l-1.903 1.903A1 1 0 0 1 9 14H8v1a1 1 0 0 1-1 1H6v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L8.196 8.39A5.002 5.002 0 0 1 8 7z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-navy-900">{k.name}</p>
                      <p className="text-xs text-navy-400">
                        Created {new Date(k.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={deletingId === k.id}
                    onClick={() => remove(k.id)}
                    className="text-danger-600 hover:bg-danger-50"
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </Section>

      {/* Webhooks & IPN */}
      <Section
        icon={ICON.bell}
        title="Webhooks (IPN)"
        description="We POST a signed notification to your callback on every payment event."
      >
        <Panel className="space-y-5 p-4 sm:p-5">
          {/* Callback URL */}
          <form onSubmit={saveWebhook} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Callback URL (your system)"
                placeholder="https://your-store.com/webhooks/egofi"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="font-mono"
                {...(webhookError ? { error: webhookError } : {})}
              />
            </div>
            <Button type="submit" loading={savingWebhook} variant="secondary">
              {webhookSaved ? "Saved ✓" : "Save URL"}
            </Button>
          </form>

          {/* IPN secret */}
          <div className="border-t border-navy-50 pt-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-navy-800">IPN secret</p>
              <span className="text-xs text-navy-400">Signs the x-egofi-signature header</span>
            </div>
            {loading ? (
              <Skeleton className="mt-2 h-11 w-full" />
            ) : secret ? (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-2 border border-navy-200 bg-navy-50/50 px-3 py-2.5">
                  <code className="min-w-0 flex-1 truncate font-mono text-sm text-navy-900">
                    {showSecret ? secret : maskedSecret}
                  </code>
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {showSecret ? "Hide" : "Reveal"}
                  </button>
                  <CopyButton text={secret} label="IPN secret" className="px-1.5 py-1" />
                </div>
                <Button variant="ghost" size="sm" loading={rotating} onClick={rotateSecret}>
                  Rotate
                </Button>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-navy-500">
                  No IPN secret yet. Generate one to start verifying webhooks.
                </p>
                <Button size="sm" loading={rotating} onClick={rotateSecret}>
                  Generate secret
                </Button>
              </div>
            )}
          </div>
        </Panel>
      </Section>

      {/* Quickstart */}
      <Section
        icon={ICON.book}
        title="Quickstart"
        description="Three steps to accept crypto on your site."
      >
        <div className="space-y-4">
          <QuickstartStep
            n={1}
            title="Create a payment (server-side, with your API key)"
            code={CREATE_PAYMENT_SNIPPET}
            lang="bash"
          />
          <QuickstartStep
            n={2}
            title="What we POST to your callback"
            code={WEBHOOK_PAYLOAD_SNIPPET}
            lang="http"
          />
          <QuickstartStep
            n={3}
            title="Verify the signature, then fulfil the order"
            code={VERIFY_SNIPPET}
            lang="node.js"
          />
        </div>
      </Section>
    </div>
  );
}

function QuickstartStep({
  n,
  title,
  code,
  lang,
}: {
  n: number;
  title: string;
  code: string;
  lang: string;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center bg-navy-950 text-xs font-bold text-white">
          {n}
        </span>
        <p className="text-sm font-semibold text-navy-800">{title}</p>
      </div>
      <div className="sm:pl-[2.125rem]">
        <CodeBlock code={code} lang={lang} />
      </div>
    </div>
  );
}
