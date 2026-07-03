# ADR 0003: BullMQ + persisted state machine, not Temporal

**Status:** Accepted (locked)

## Context

The settlement workload needs delayed jobs, retries with backoff, repeatable
polling, and durable multi-step flows. Temporal offers durable sagas but costs
a cluster and an operational skillset.

## Decision

BullMQ (Redis) plus the persisted invoice state machine is the settlement
engine. Durability comes from: idempotency keys on every job (invoice + leg +
tx hash), retries with exponential backoff, dead-letter queues, the
`detection-sweeper` polling safety net, the transactional outbox for every
event egofi emits, and daily reconciliation.

## Consequences

- No new infrastructure beyond Redis, which we already run.
- Correctness is a design discipline (idempotent transitions, dedupe on
  `(txHash, leg)`), not a framework guarantee — enforced in review via the
  payments-safety checklist.
