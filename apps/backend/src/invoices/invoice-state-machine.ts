import { InvoiceState } from "@egofi/types";
import { BadRequestException } from "@nestjs/common";

type Transition = {
  from: InvoiceState[];
  to: InvoiceState;
};

const TRANSITIONS: Record<string, Transition> = {
  issue: {
    from: [InvoiceState.Draft],
    to: InvoiceState.AwaitingPayment,
  },
  depositDetected: {
    from: [InvoiceState.AwaitingPayment],
    to: InvoiceState.Received,
  },
  startConversion: {
    from: [InvoiceState.Received, InvoiceState.ComplianceHold],
    to: InvoiceState.Converting,
  },
  // Provider AML/KYC freeze (§10.3) — first-class state, not a flavor of FAILED
  complianceHold: {
    from: [InvoiceState.Received, InvoiceState.Converting],
    to: InvoiceState.ComplianceHold,
  },
  // Reorg rule (§12): a matched deposit reorged out before confirmation reverts
  // to AWAITING_PAYMENT. Merchant webhooks fire only on PAID_CONFIRMED, so a
  // reorg never un-notifies a merchant.
  depositReorged: {
    from: [InvoiceState.Received],
    to: InvoiceState.AwaitingPayment,
  },
  payoutSent: {
    from: [InvoiceState.Converting, InvoiceState.Received],
    to: InvoiceState.PayoutSent,
  },
  confirm: {
    from: [InvoiceState.PayoutSent, InvoiceState.Received],
    to: InvoiceState.PaidConfirmed,
  },
  underpaid: {
    from: [InvoiceState.AwaitingPayment, InvoiceState.Received],
    to: InvoiceState.Underpaid,
  },
  overpaid: {
    from: [InvoiceState.Received],
    to: InvoiceState.Overpaid,
  },
  fail: {
    from: [
      InvoiceState.AwaitingPayment,
      InvoiceState.Received,
      InvoiceState.Converting,
      InvoiceState.PayoutSent,
    ],
    to: InvoiceState.Failed,
  },
  refund: {
    from: [InvoiceState.Failed, InvoiceState.Underpaid, InvoiceState.ComplianceHold],
    to: InvoiceState.Refunded,
  },
  expire: {
    from: [InvoiceState.AwaitingPayment],
    to: InvoiceState.Expired,
  },
  cooldown: {
    from: [InvoiceState.Expired],
    to: InvoiceState.Cooldown,
  },
};

export function applyTransition(current: string, action: keyof typeof TRANSITIONS): InvoiceState {
  const transition = TRANSITIONS[action];
  if (!transition) {
    throw new BadRequestException(`Unknown invoice action: ${action}`);
  }

  const currentState = current as InvoiceState;
  if (!transition.from.includes(currentState)) {
    throw new BadRequestException(
      `Cannot apply "${action}" to invoice in state "${current}". ` +
        `Expected one of: ${transition.from.join(", ")}`,
    );
  }

  return transition.to;
}

export function canTransition(current: string, action: keyof typeof TRANSITIONS): boolean {
  const transition = TRANSITIONS[action];
  if (!transition) return false;
  return transition.from.includes(current as InvoiceState);
}

export function isTerminalState(state: string): boolean {
  return [
    InvoiceState.PaidConfirmed,
    InvoiceState.Refunded,
    InvoiceState.Expired,
    InvoiceState.Cooldown,
  ].includes(state as InvoiceState);
}
