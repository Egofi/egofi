// Payment events are append-only rows the backend writes on every state
// transition (`state.<action>`) and every rail leg. This turns the raw type
// string into something a merchant can read.

export interface EventMeta {
  label: string;
  detail: string;
  /** Tailwind classes for the timeline dot. */
  dot: string;
}

const STATE_EVENTS: Record<string, EventMeta> = {
  issue: {
    label: "Invoice issued",
    detail: "A deposit address was assigned and the rate was locked.",
    dot: "bg-navy-300",
  },
  depositDetected: {
    label: "Deposit detected",
    detail: "We saw the customer's transaction in the mempool or a recent block.",
    dot: "bg-info-500",
  },
  startConversion: {
    label: "Conversion started",
    detail: "Funds were routed to the swap provider.",
    dot: "bg-info-500",
  },
  complianceHold: {
    label: "Compliance hold",
    detail: "The provider froze this payment pending an AML/KYC review.",
    dot: "bg-amber-500",
  },
  depositReorged: {
    label: "Deposit reorged out",
    detail: "The block containing the deposit was orphaned. Awaiting payment again.",
    dot: "bg-amber-500",
  },
  payoutSent: {
    label: "Payout sent",
    detail: "The settlement transaction was broadcast to your wallet.",
    dot: "bg-primary-500",
  },
  confirm: {
    label: "Payment confirmed",
    detail: "Enough confirmations. Funds are final and in your wallet.",
    dot: "bg-success-500",
  },
  underpaid: {
    label: "Underpaid",
    detail: "The customer sent less than the invoiced amount.",
    dot: "bg-amber-500",
  },
  overpaid: {
    label: "Overpaid",
    detail: "The customer sent more than the invoiced amount.",
    dot: "bg-amber-500",
  },
  fail: { label: "Failed", detail: "The payment could not be completed.", dot: "bg-danger-500" },
  refund: { label: "Refunded", detail: "Funds were returned to the customer.", dot: "bg-navy-400" },
  expire: {
    label: "Expired",
    detail: "The rate lock elapsed before a deposit arrived.",
    dot: "bg-navy-300",
  },
  cooldown: {
    label: "Cooldown",
    detail: "Watching the address a while longer in case a late deposit lands.",
    dot: "bg-navy-300",
  },
};

/** Turn "swap.completed" or "state.depositDetected" into a readable label. */
export function describeEvent(type: string): EventMeta {
  const meta = type.startsWith("state.") ? STATE_EVENTS[type.slice(6)] : undefined;
  if (meta) return meta;

  const words = type
    .replace(/[._]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return {
    label: words.charAt(0).toUpperCase() + words.slice(1),
    detail: "",
    dot: "bg-navy-300",
  };
}
