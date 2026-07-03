export const QUEUES = {
  DEPOSIT_WATCH: "deposit-watch",
  DETECTION_SWEEPER: "detection-sweeper",
  SWAP_STATUS_POLL: "swap-status-poll",
  CONFIRMATION_WATCH: "confirmation-watch",
  OUTBOX_DISPATCH: "outbox-dispatch",
  MERCHANT_WEBHOOK: "merchant-webhook",
  RATE_LOCK_EXPIRY: "rate-lock-expiry",
  COOLDOWN_RELEASE: "cooldown-release",
  PROVIDER_HEALTH: "provider-health",
  RECONCILIATION: "reconciliation",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
