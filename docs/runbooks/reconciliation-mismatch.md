# Runbook: Reconciliation mismatch

**Alert:** daily `reconciliation` job reports drift between ledger, on-chain
reality, and provider records.

## Classify the drift

1. **Ledger vs on-chain** — a `LedgerEntry` with no corresponding chain tx, or
   vice versa. Usually a crashed process between state write and ledger write
   (should be impossible post-outbox; treat as a bug).
2. **Ledger vs provider** — `ProviderTransaction.deliveredOut` differs from
   `quotedOut` beyond tolerance. Late deposit past the fixed-rate window
   settles at floating rate: route the shortfall through the `UNDERPAID`
   review path, never silently mark paid.
3. **Unmatched money** — funds on a merchant address matching no invoice:
   check `UnmatchedPayment` candidates before anything else.

## Resolve

- Quantify: total drift per asset, per provider, per day.
- For quote-race settlements: reconcile delivered vs quoted, record the delta
  as a ledger adjustment entry, notify the merchant if their payout differed.
- For genuine provider shortfalls: raise with the provider's partner support
  with `providerTxId` + both tx hashes.

## Escalate

Drift that repeats across days for one provider = counterparty problem →
demote the provider in the router and open a business-continuity review.
