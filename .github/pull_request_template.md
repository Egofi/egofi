## What & why

<!-- One paragraph: what changes, and why. Link the issue/ADR if one exists. -->

## Payments-safety checklist

*Required for any change touching rails, invoices, webhooks, jobs, ledger, or checkout.*

- [ ] **Idempotent** — retried requests/jobs cannot double-charge or double-count (keyed on invoice + leg + tx hash)
- [ ] **Webhooks verified** — every inbound webhook path checks HMAC before processing
- [ ] **Base units only** — all monetary math is integer base units or `Decimal`; no JS floats anywhere
- [ ] **State machine respected** — transitions go through `applyTransition`, never direct state writes
- [ ] **Outbox used** — state change + emitted event written in one transaction
- [ ] **Tests added** — for the failure path, not just the happy path

## Checks

- [ ] `pnpm turbo run lint typecheck test build` passes locally
