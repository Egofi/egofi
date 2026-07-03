# Runbook: Missed webhook

**Alert:** detection-sweeper advanced a state (log line "sweeper caught missed
event"), or a merchant reports a payment the dashboard doesn't show.

## Context

Inbound webhooks (Tatum, providers) are at-least-once **at best** and can be
silently missed. The system is designed so a lost webhook delays a payment by
~1 minute (sweeper interval), never loses it.

## Diagnose

1. `SELECT * FROM "PaymentEvent" WHERE "invoiceId" = '<id>' ORDER BY ts;` —
   is there a gap between chain reality and recorded events?
2. Check Tatum's executed-webhooks log (dashboard → Notifications) and diff
   against our `PaymentEvent` rows for the subscription.
3. Check the `webhook` role's ingress logs for 4xx/5xx around the miss window
   (HMAC failures show as 401s).

## Resolve

- Single miss, sweeper caught it → no action; count it in the weekly miss-rate
  metric.
- Systematic misses (HMAC secret rotated, endpoint down) → fix the secret /
  scale the webhook role; then run a manual sweep for the affected window.
- Deposit that matched nothing → it's in `UnmatchedPayment` with candidate
  invoices; resolve from the admin review queue.

## Prevention

The webhook role deploys independently of the API precisely so dashboard
traffic can't starve payment detection. If miss rate trends up, scale it out.
