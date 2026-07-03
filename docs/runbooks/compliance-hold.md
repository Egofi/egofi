# Runbook: Compliance hold (provider AML/KYC freeze)

**Alert:** invoice entered `COMPLIANCE_HOLD` (provider status `verifying`).

## Immediately (automated, verify it happened)

1. Customer notified with the provider's verification/case link.
2. Merchant notified that settlement is delayed and why.
3. Checkout countdown paused.
4. Ops ticket opened with invoice id + `providerTxId`.

## Operator actions

1. Confirm the hold is real: hit the provider status API — status `verifying`
   plus a verification URL.
2. **ChangeNOW specifics:** the verification link is valid **3 days**;
   unresolved cases go to manual review. Track the deadline on the ticket.
3. Do **not** advise the customer to split future payments below thresholds —
   that is structuring. If they abandon, the flow ends in `REFUNDED` once the
   provider returns funds.

## Outcomes

- **Customer completes KYC, hold released** → provider resumes; state moves
  `COMPLIANCE_HOLD → CONVERTING` automatically. Verify payout completes.
- **Customer declines / deadline passes** → provider refunds to the refund
  address; verify `REFUNDED` state and the refund tx hash. Warn: refunds to
  exchange-hosted addresses can be lost — this is why refund addresses are
  collected up front.

## Afterwards

Every hold increments the provider's freeze-rate metric. A freeze-rate spike
demotes the provider automatically; review the AML-attention band ($1,500
default) against observed hold data quarterly.
