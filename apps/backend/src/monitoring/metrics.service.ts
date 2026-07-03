import { Injectable, type OnModuleInit } from "@nestjs/common";
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  // ── HTTP ──────────────────────────────────────────────────────────────────

  readonly httpRequestsTotal = new Counter({
    name: "egofi_http_requests_total",
    help: "Total HTTP requests",
    labelNames: ["method", "route", "status_code"] as const,
    registers: [this.registry],
  });

  readonly httpRequestDurationMs = new Histogram({
    name: "egofi_http_request_duration_ms",
    help: "HTTP request duration in milliseconds",
    labelNames: ["method", "route", "status_code"] as const,
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
    registers: [this.registry],
  });

  // ── Invoices ──────────────────────────────────────────────────────────────

  readonly invoicesCreatedTotal = new Counter({
    name: "egofi_invoices_created_total",
    help: "Total invoices created",
    labelNames: ["rail"] as const,
    registers: [this.registry],
  });

  readonly invoiceStateTransitionsTotal = new Counter({
    name: "egofi_invoice_state_transitions_total",
    help: "Total invoice state transitions",
    labelNames: ["from_state", "to_state", "rail"] as const,
    registers: [this.registry],
  });

  readonly invoiceSettlementValueUsd = new Counter({
    name: "egofi_invoice_settlement_value_usd_total",
    help: "Total USD value settled (estimated)",
    labelNames: ["asset", "rail"] as const,
    registers: [this.registry],
  });

  // ── Swap provider ─────────────────────────────────────────────────────────

  readonly swapAttemptsTotal = new Counter({
    name: "egofi_swap_attempts_total",
    help: "Total swap exchange creation attempts per provider",
    labelNames: ["provider", "outcome"] as const,
    registers: [this.registry],
  });

  readonly swapDurationMs = new Histogram({
    name: "egofi_swap_duration_ms",
    help: "Time from swap creation to payout confirmation",
    labelNames: ["provider"] as const,
    buckets: [30_000, 60_000, 120_000, 300_000, 600_000, 1_200_000, 1_800_000],
    registers: [this.registry],
  });

  // ── BullMQ queues ─────────────────────────────────────────────────────────

  readonly queueJobsTotal = new Counter({
    name: "egofi_queue_jobs_total",
    help: "Total BullMQ jobs processed",
    labelNames: ["queue", "state"] as const,
    registers: [this.registry],
  });

  readonly queueWaiting = new Gauge({
    name: "egofi_queue_waiting_jobs",
    help: "Current number of waiting jobs per queue",
    labelNames: ["queue"] as const,
    registers: [this.registry],
  });

  readonly queueFailed = new Gauge({
    name: "egofi_queue_failed_jobs",
    help: "Current number of failed jobs per queue",
    labelNames: ["queue"] as const,
    registers: [this.registry],
  });

  // ── Webhook delivery ──────────────────────────────────────────────────────

  readonly webhookDeliveriesTotal = new Counter({
    name: "egofi_webhook_deliveries_total",
    help: "Total outbound merchant webhook delivery attempts",
    labelNames: ["event", "outcome"] as const,
    registers: [this.registry],
  });

  onModuleInit(): void {
    collectDefaultMetrics({
      register: this.registry,
      prefix: "egofi_node_",
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
