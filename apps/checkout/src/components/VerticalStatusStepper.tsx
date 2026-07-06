import { InvoiceState } from "@egofi/types";

type Phase = 0 | 1 | 2;

// Collapses the fine-grained invoice lifecycle into the three payer-facing
// phases from the hosted-checkout reference.
function phaseFor(state: string): Phase {
  switch (state) {
    case InvoiceState.PaidConfirmed:
      return 2;
    case InvoiceState.Received:
    case InvoiceState.Converting:
    case InvoiceState.ComplianceHold:
    case InvoiceState.PayoutSent:
      return 1;
    default:
      return 0;
  }
}

const FAILED_STATES: string[] = [InvoiceState.Failed, InvoiceState.Refunded, InvoiceState.Expired];

const STEPS = [
  { label: "Waiting for payment", sub: "Send the exact amount" },
  { label: "Processing payment", sub: "Confirming on-chain" },
  { label: "Completed", sub: "Merchant credited" },
] as const;

type Theme = "light" | "dark";

const TOKENS: Record<
  Theme,
  {
    complete: string;
    current: string;
    pending: string;
    error: string;
    connectorDone: string;
    connectorPending: string;
    currentDot: string;
    labelActive: string;
    labelPending: string;
    labelError: string;
    subActive: string;
    subPending: string;
  }
> = {
  light: {
    complete: "border-primary bg-primary text-white",
    current: "border-primary bg-white text-primary",
    pending: "border-navy-200 bg-white text-navy-300",
    error: "border-danger-500 bg-danger-50 text-danger-600",
    connectorDone: "bg-primary",
    connectorPending: "bg-navy-100",
    currentDot: "bg-primary",
    labelActive: "text-navy-900",
    labelPending: "text-navy-400",
    labelError: "text-danger-600",
    subActive: "text-navy-400",
    subPending: "text-navy-300",
  },
  dark: {
    complete: "border-accent bg-accent text-navy-950",
    current: "border-accent bg-white/5 text-accent",
    pending: "border-white/20 bg-white/5 text-white/40",
    error: "border-danger-400 bg-danger-400/15 text-danger-300",
    connectorDone: "bg-accent",
    connectorPending: "bg-white/15",
    currentDot: "bg-accent",
    labelActive: "text-white",
    labelPending: "text-white/40",
    labelError: "text-danger-300",
    subActive: "text-white/50",
    subPending: "text-white/30",
  },
};

export function VerticalStatusStepper({
  state,
  theme = "light",
}: {
  state: string;
  theme?: Theme;
}) {
  const phase = phaseFor(state);
  const failed = FAILED_STATES.includes(state);
  const t = TOKENS[theme];

  return (
    <ol className="flex flex-col" aria-label="Payment status">
      {STEPS.map((step, i) => {
        const isComplete = phase > i;
        const isCurrent = phase === i && !failed;
        const isError = failed && phase === i;
        const isLast = i === STEPS.length - 1;

        return (
          <li key={step.label} className="flex gap-3" aria-current={isCurrent ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isError ? t.error : isComplete ? t.complete : isCurrent ? t.current : t.pending
                }`}
              >
                {isError ? (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden>
                    <path d="M4.28 3.22a.75.75 0 0 0-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06L8 9.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L9.06 8l3.72-3.72a.75.75 0 0 0-1.06-1.06L8 6.94 4.28 3.22z" />
                  </svg>
                ) : isComplete ? (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : isCurrent ? (
                  <span className={`size-2.5 rounded-full ${t.currentDot} animate-pulse-soft`} />
                ) : (
                  <span className="text-xs font-semibold">{i + 1}</span>
                )}
              </span>
              {!isLast && (
                <span
                  className={`my-1 w-0.5 grow rounded ${phase > i ? t.connectorDone : t.connectorPending}`}
                />
              )}
            </div>
            <div className={`pb-6 pt-1 ${isLast ? "pb-0" : ""}`}>
              <p
                className={`text-sm font-semibold ${
                  isError ? t.labelError : isCurrent || isComplete ? t.labelActive : t.labelPending
                }`}
              >
                {step.label}
              </p>
              <p className={`text-xs ${isCurrent || isComplete ? t.subActive : t.subPending}`}>
                {step.sub}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
