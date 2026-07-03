# ADR 0005: COMPLIANCE_HOLD is a first-class invoice state

**Status:** Accepted

## Context

Instant-swap providers run automated risk scoring and can freeze a swap
mid-flow pending KYC (reported triggers: ~€2,000+ tickets, risk-scored source
wallets, pattern flags). For egofi that is a customer's payment stuck in a
third party's compliance queue — a *when*, not an *if*.

## Decision

`COMPLIANCE_HOLD` is a first-class invoice state, not a flavor of FAILED:

- Entered from `RECEIVED` or `CONVERTING` when the provider reports
  `verifying`.
- Exits to `CONVERTING` (hold released) or `REFUNDED` (customer completes or
  declines KYC).
- On hold: notify customer *and* merchant immediately with the provider's
  verification link, pause the countdown, open an ops ticket.

The rail router additionally steers tickets above the AML-attention band
(~$1,500, tuned from observed freeze data) away from SwapProviderRail.
Payment-splitting to duck thresholds is never counseled or automated — that
is structuring.

## Consequences

- Checkout and merchant apps must render the hold state with the provider's
  case link (runbook: `docs/runbooks/compliance-hold.md`).
- Freeze rate feeds provider health scoring and automatic demotion.
