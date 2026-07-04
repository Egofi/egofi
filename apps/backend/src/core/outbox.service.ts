import { OutboxStatus } from "@egofi/types";
import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";

const MAX_ATTEMPTS = 10;
const BASE_BACKOFF_MS = 5_000;

export type OutboxEmit = {
  aggregate: string; // e.g. "invoice"
  aggregateId: string;
  type: string; // e.g. "invoice.paid_confirmed"
  payload: Prisma.InputJsonValue;
};

/**
 * Transactional outbox (§8): state change + outbox event are written in ONE
 * DB transaction, so a merchant webhook is sent iff the state actually
 * changed — no ghost notifications on rollback, no silent gaps on crash.
 * The outbox-dispatch job delivers pending rows with exponential backoff.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Call inside a prisma.$transaction with the tx client. */
  async emit(tx: Prisma.TransactionClient, event: OutboxEmit): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        aggregate: event.aggregate,
        aggregateId: event.aggregateId,
        type: event.type,
        payload: event.payload,
        status: OutboxStatus.Pending,
        nextAttempt: new Date(),
      },
    });
  }

  /** Fetch events due for delivery (called by the outbox-dispatch processor). */
  async fetchDue(limit = 50) {
    return this.prisma.outboxEvent.findMany({
      where: {
        status: OutboxStatus.Pending,
        nextAttempt: { lte: new Date() },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  async markDelivered(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: OutboxStatus.Delivered },
    });
  }

  /** Exponential backoff; dead-letters after MAX_ATTEMPTS. */
  async markFailed(id: string, attempts: number, error: string): Promise<void> {
    const nextAttempts = attempts + 1;
    if (nextAttempts >= MAX_ATTEMPTS) {
      this.logger.error(
        { outboxEventId: id, attempts: nextAttempts, error },
        "outbox event dead-lettered",
      );
      await this.prisma.outboxEvent.update({
        where: { id },
        data: { status: OutboxStatus.Dead, attempts: nextAttempts },
      });
      return;
    }
    const backoffMs = BASE_BACKOFF_MS * 2 ** nextAttempts;
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        attempts: nextAttempts,
        nextAttempt: new Date(Date.now() + backoffMs),
      },
    });
  }
}
