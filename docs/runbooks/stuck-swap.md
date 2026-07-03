# Runbook: Stuck swap

**Alert:** invoice in `CONVERTING` or `PAYOUT_SENT` for > 30 minutes.

## Diagnose

1. Open Bull Board (`/admin/queues`) → `swap-status-poll` — is the poll job
   for this invoice running and succeeding?
2. Query the provider mirror:
   `SELECT * FROM "ProviderTransaction" WHERE "invoiceId" = '<id>';`
   Compare `status` with the invoice state.
3. Hit the provider's status API directly with `providerTxId` (ChangeNOW:
   `GET /v2/exchange/by-id?id=...`).

## Resolve

- **Provider says `verifying`** → this is a compliance hold, follow
  `compliance-hold.md`.
- **Provider says `finished` but invoice isn't confirmed** → the webhook was
  missed and the sweeper hasn't caught up. Manually apply the `confirm`
  transition via the admin API; verify the payout tx on the destination chain
  first.
- **Provider says `failed`/`refunded`** → apply `fail` then `refund`; confirm
  the refund tx hash lands at the customer's refund address.
- **Provider unresponsive** → check `ProviderHealthSnapshot` for a freeze-rate
  spike; if degraded, confirm the router has demoted it and escalate to the
  provider's partner support channel.

## Postmortem

Every stuck swap gets a row in the incident log with: provider, duration,
root cause (missed webhook / provider delay / AML hold), and whether the
sweeper caught it. Freeze-rate trends feed the router's AML band tuning.
