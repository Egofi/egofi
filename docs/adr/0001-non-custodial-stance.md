# ADR 0001: The gateway never custodies funds

**Status:** Accepted

## Context

Egofi is a crypto-in / crypto-out payment gateway for African merchants. Custody
is a licensed activity in every jurisdiction we care about (Nigeria treats it as
its own DAC category), it concentrates security risk in our keys, and it is the
single biggest driver of regulatory scope.

## Decision

Egofi never holds customer funds. When conversion transiently needs custody, it
lives with an external swap provider (ChangeNOW / SimpleSwap) — never in an
egofi key or wallet. DirectTransferRail routes straight to the merchant's own
address; SwapProviderRail outsources the transient custody leg.

## Consequences

- No hot wallets, no key ceremony, dramatically smaller attack surface.
- Provider counterparty risk becomes a first-class engineering concern
  (health scoring, failover, COMPLIANCE_HOLD state — see ADR 0005).
- We still orchestrate conversion, which may trip VASP classification —
  legal mapping with Nigerian counsel is required before live volume.
