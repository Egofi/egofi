# ADR 0002: One settlement abstraction, many rails

**Status:** Accepted

## Context

Payment mechanics differ wildly (plain transfer, deposit-address swap,
wallet-connect router, approve+pull recurring), but the invoice/checkout/
webhook/ledger core should be written once.

## Decision

All payment mechanics sit behind a single `SettlementRail` interface
(`createPayment`, `getStatus`, `handleWebhook`, `supports`). The `RailRouter`
is the only place that knows selection priority; rails stay dumb. v1 ships
`DirectTransferRail` (baseline) and `SwapProviderRail` (primary); v2 adds
`WalletConnectRail` and `RecurringRail` behind the same interface.

## Consequences

- Adding a rail = adding a module; zero edits to the core.
- The router carries the layered policy: direct route → minimum band →
  AML-attention band → swap (see §7 of the build spec).
