import { InvoiceState } from "@egofi/types";

type Step = { label: string; states: string[] };

// The customer-visible journey. COMPLIANCE_HOLD pauses at "Converting";
// terminal failure states are rendered by the page, not the stepper.
const STEPS: Step[] = [
  { label: "Awaiting payment", states: [InvoiceState.AwaitingPayment] },
  { label: "Deposit detected", states: [InvoiceState.Received] },
  {
    label: "Converting",
    states: [InvoiceState.Converting, InvoiceState.ComplianceHold, InvoiceState.PayoutSent],
  },
  { label: "Confirmed", states: [InvoiceState.PaidConfirmed] },
];

function stepIndexFor(state: string): number {
  const idx = STEPS.findIndex((s) => s.states.includes(state));
  return idx === -1 ? 0 : idx;
}

export function PaymentProgress({ state }: { state: string }) {
  const current = stepIndexFor(state);
  const done = state === InvoiceState.PaidConfirmed;

  return (
    <ol className="flex items-start" aria-label="Payment progress">
      {STEPS.map((step, i) => {
        const isComplete = done || i < current;
        const isCurrent = !done && i === current;
        return (
          <li
            key={step.label}
            className="flex flex-1 flex-col items-center gap-2"
            aria-current={isCurrent ? "step" : undefined}
          >
            <div className="flex w-full items-center">
              {/* leading connector */}
              <div
                className={`h-0.5 flex-1 rounded ${
                  i === 0 ? "opacity-0" : isComplete || isCurrent ? "bg-primary" : "bg-navy-100"
                }`}
              />
              {/* node */}
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isComplete
                    ? "border-primary bg-primary text-white"
                    : isCurrent
                      ? "border-primary bg-white text-primary"
                      : "border-navy-200 bg-white text-navy-300"
                }`}
              >
                {isComplete ? (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : isCurrent ? (
                  <span className="size-2 rounded-full bg-primary animate-pulse-soft" />
                ) : (
                  <span className="size-1.5 rounded-full bg-navy-200" />
                )}
              </div>
              {/* trailing connector */}
              <div
                className={`h-0.5 flex-1 rounded ${
                  i === STEPS.length - 1 ? "opacity-0" : isComplete ? "bg-primary" : "bg-navy-100"
                }`}
              />
            </div>
            <span
              className={`px-1 text-center text-[11px] font-medium leading-tight ${
                isCurrent ? "text-primary" : isComplete ? "text-navy-700" : "text-navy-400"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
