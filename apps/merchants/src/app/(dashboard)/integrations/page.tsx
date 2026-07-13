import { cn } from "@egofi/ui";

const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3000";

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-500">
      <span className="text-navy-400">{icon}</span>
      {children}
    </div>
  );
}

function ComingSoon() {
  return (
    <span className="rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-500">
      Coming soon
    </span>
  );
}

/** Large / medium integration card with an illustration tile. */
function IntegrationCard({
  href,
  icon,
  title,
  description,
  soon,
}: {
  href?: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  soon?: boolean;
}) {
  const inner = (
    <>
      <span className="flex size-16 shrink-0 items-center justify-center border border-navy-100 bg-navy-50 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-navy-950">{title}</h3>
          {soon && <ComingSoon />}
        </div>
        <p className="mt-1 text-sm text-navy-500">{description}</p>
      </div>
    </>
  );

  const base =
    "flex items-center gap-5 border border-navy-100 bg-surface p-5 shadow-card transition-all sm:p-6";
  if (soon || !href) {
    return <div className={cn(base, "cursor-default opacity-80")}>{inner}</div>;
  }
  return (
    <a href={href} className={cn(base, "hover:border-primary/40 hover:shadow-card-hover")}>
      {inner}
    </a>
  );
}

/** Compact advanced-integration row with a trailing chevron. */
function RowCard({
  href,
  title,
  description,
  soon,
}: {
  href?: string;
  title: string;
  description: string;
  soon?: boolean;
}) {
  const inner = (
    <>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-navy-950">{title}</h3>
          {soon && <ComingSoon />}
        </div>
        <p className="mt-1 text-sm text-navy-500">{description}</p>
      </div>
      {!soon && (
        <span className="flex size-8 shrink-0 items-center justify-center border border-navy-100 bg-surface text-primary">
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </>
  );
  const base =
    "flex items-center justify-between gap-4 border border-navy-100 bg-surface p-5 shadow-card transition-all sm:p-6";
  if (soon || !href) {
    return <div className={cn(base, "cursor-default opacity-80")}>{inner}</div>;
  }
  return (
    <a href={href} className={cn(base, "hover:border-primary/40 hover:shadow-card-hover")}>
      {inner}
    </a>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-5 sm:p-6 lg:p-10">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Integrations</h1>
          <span
            title="Ways to connect egofi and start accepting crypto — from no-code links to a full API."
            className="flex size-5 cursor-help items-center justify-center rounded-full border border-navy-200 text-[11px] font-semibold text-navy-400"
          >
            i
          </span>
        </div>
        <p className="mt-1 text-sm text-navy-500">Select and configure your first integration</p>
      </header>

      {/* No-code */}
      <section>
        <SectionLabel
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
              <path d="M7 4a1 1 0 0 1 .8.4l1.2 1.6L10.2 4.4A1 1 0 0 1 11 4h4a1 1 0 0 1 0 2h-3.5l-1.7 2.3a1 1 0 0 1-1.6 0L6.5 6H3a1 1 0 0 1 0-2h4zm4 8a1 1 0 0 1 .8.4l1.2 1.6 1.2-1.6A1 1 0 0 1 16 12h1a1 1 0 1 1 0 2h-.5l-1.7 2.3a1 1 0 0 1-1.6 0L11.5 14H3a1 1 0 1 1 0-2h8z" />
            </svg>
          }
        >
          No-code · Instant
        </SectionLabel>
        <IntegrationCard
          href="/invoices/new"
          title="Invoice"
          description="Create and send payment links to your customers in minutes."
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="size-8"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 5h6M4 9h6M4 13h4m6-9 6 8-6 8"
              />
            </svg>
          }
        />
      </section>

      {/* Low-code */}
      <section>
        <SectionLabel
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
              <path
                fillRule="evenodd"
                d="M4.72 5.22a.75.75 0 0 1 1.06 1.06L4.06 8l1.72 1.72a.75.75 0 1 1-1.06 1.06l-2.25-2.25a.75.75 0 0 1 0-1.06l2.25-2.25zM8 13.5a.75.75 0 0 0 0 1.5h8a.75.75 0 0 0 0-1.5H8z"
                clipRule="evenodd"
              />
            </svg>
          }
        >
          Low-code · Plug &amp; play
        </SectionLabel>
        <div className="grid gap-4 md:grid-cols-2">
          <IntegrationCard
            soon
            title="Plugin"
            description="Accept payments through ready-to-use plugins for WooCommerce, Shopify and more."
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="size-8"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 3v3a2 2 0 1 0 4 0V3h4v4h-3a2 2 0 1 0 0 4h3v6H10v-3a2 2 0 1 0-4 0v3H2V3h8z"
                />
              </svg>
            }
          />
          <IntegrationCard
            href="/invoices/new"
            title="Button & widget"
            description="Embed a payment button or widget on your site to start accepting payments instantly."
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="size-8"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 6h18v12H3zM3 9h18M8 13l-2 2 2 2m8-4 2 2-2 2"
                />
              </svg>
            }
          />
        </div>
      </section>

      {/* Advanced */}
      <section>
        <SectionLabel
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
              <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h4A1.5 1.5 0 0 1 10 5.5v4A1.5 1.5 0 0 1 8.5 11h-4A1.5 1.5 0 0 1 3 9.5v-4zM11 5.5A1.5 1.5 0 0 1 12.5 4h3A1.5 1.5 0 0 1 17 5.5v3A1.5 1.5 0 0 1 15.5 10h-3A1.5 1.5 0 0 1 11 8.5v-3zM3 12.5A1.5 1.5 0 0 1 4.5 11h3A1.5 1.5 0 0 1 9 12.5v3A1.5 1.5 0 0 1 7.5 17h-3A1.5 1.5 0 0 1 3 15.5v-3zM11 12.5A1.5 1.5 0 0 1 12.5 11h3A1.5 1.5 0 0 1 17 12.5v3A1.5 1.5 0 0 1 15.5 17h-3A1.5 1.5 0 0 1 11 15.5v-3z" />
            </svg>
          }
        >
          Advanced integrations · Customizable
        </SectionLabel>
        <div className="space-y-4">
          <RowCard
            href="/developers"
            title="Payments API"
            description="Integrate and customize the payment flow into your product using our REST API."
          />
          <RowCard
            href={`${API_BASE}/docs`}
            title="API reference"
            description="Explore every endpoint in the interactive OpenAPI docs."
          />
          <RowCard
            soon
            title="AI"
            description="Let your AI agents create payments and check statuses via our MCP server."
          />
        </div>
      </section>
    </div>
  );
}
