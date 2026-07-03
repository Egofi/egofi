# ADR 0004: ChangeNOW primary, SimpleSwap fallback (v1); RocketX + Rango (v2)

**Status:** Accepted (locked)

## Context

v1 needs a deposit-address instant-swap service: create exchange → customer
sends a plain transfer from any wallet or exchange → provider converts and
forwards to the merchant.

## Decision

- **v1:** ChangeNOW (primary) — true deposit-address model, USDT-TRC20
  destination across 110+ chains, fixed-rate flow, refund address, per-pair
  min-amount endpoint, 0.4% adjustable fee-share. SimpleSwap is the same model
  as fallback.
- **v2:** RocketX (primary) + Rango (fallback) for the wallet-connect router —
  RocketX is wallet-connect (user signs), so it does not fit the v1 flow.

## Consequences

- Both v1 providers sit behind the `SwapProvider` sub-interface; failover is
  automatic and health-scored (freeze rate, success rate, settle latency,
  quoted-vs-delivered drift).
- Providers are monitored counterparties, not static config. A ToS change is
  a business-continuity event; the multi-provider abstraction is the hedge.
