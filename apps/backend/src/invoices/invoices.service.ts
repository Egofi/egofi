import type { CreateInvoiceDto, InvoiceDto } from "@egofi/types";
import { InvoiceState, WebhookEvent } from "@egofi/types";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, InvoiceState as PrismaInvoiceState } from "@prisma/client";
import Decimal from "decimal.js";
import type { OutboxService } from "../core/outbox.service";
import type { PrismaService } from "../core/prisma.service";
import { applyTransition, isTerminalState } from "./invoice-state-machine";

// States whose entry notifies the merchant, delivered via the transactional
// outbox (§8) so a webhook is emitted iff the state actually changed.
const STATE_WEBHOOK_EVENTS: Partial<Record<InvoiceState, WebhookEvent>> = {
  [InvoiceState.PaidConfirmed]: WebhookEvent.InvoicePaid,
  [InvoiceState.Failed]: WebhookEvent.InvoiceFailed,
  [InvoiceState.Expired]: WebhookEvent.InvoiceExpired,
  [InvoiceState.Underpaid]: WebhookEvent.InvoiceUnderpaid,
  [InvoiceState.Refunded]: WebhookEvent.InvoiceRefunded,
  [InvoiceState.ComplianceHold]: WebhookEvent.InvoiceComplianceHold,
};

const DEFAULT_TTL_SECONDS = 30 * 60; // 30 minutes

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async create(dto: CreateInvoiceDto, quotedAmount: string, rate: string): Promise<InvoiceDto> {
    if (new Decimal(dto.displayAmount).lte(0)) {
      throw new BadRequestException("Invoice amount must be greater than zero");
    }

    const ttl = dto.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttl * 1_000);
    const rateLockedUntil = new Date(Date.now() + Math.min(ttl, 15 * 60) * 1_000);

    const invoice = await this.prisma.invoice.create({
      data: {
        merchantId: dto.merchantId,
        displayCurrency: dto.displayCurrency,
        displayAmount: new Decimal(dto.displayAmount).toFixed(),
        payAsset: dto.payAsset,
        payChain: dto.payChain,
        quotedAmount: new Decimal(quotedAmount).toFixed(),
        rate: new Decimal(rate).toFixed(),
        rateLockedUntil,
        rail: "PENDING",
        state: InvoiceState.Draft,
        refundAddress: dto.refundAddress ?? null,
        ...(dto.metadata ? { metadata: dto.metadata as Prisma.InputJsonValue } : {}),
        expiresAt,
      },
    });

    return this.toDto(invoice);
  }

  async transition(
    invoiceId: string,
    action: string,
    extras?: {
      rail?: string;
      railRef?: string;
      depositAddress?: string;
      expectedAmount?: string;
    },
  ): Promise<InvoiceDto> {
    const invoice = await this.findOrThrow(invoiceId);

    if (isTerminalState(invoice.state)) {
      throw new BadRequestException(
        `Invoice ${invoiceId} is already in terminal state ${invoice.state}`,
      );
    }

    const nextState = applyTransition(invoice.state, action as never);

    // State change + append-only event + outbox row in ONE transaction (§8, §12):
    // the PaymentEvent log is the audit trail; the outbox guarantees the
    // merchant webhook fires iff the transition committed.
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          state: nextState,
          ...(extras?.rail ? { rail: extras.rail } : {}),
          ...(extras?.railRef ? { railRef: extras.railRef } : {}),
          ...(extras?.depositAddress ? { depositAddress: extras.depositAddress } : {}),
          ...(extras?.expectedAmount
            ? { expectedAmount: new Decimal(extras.expectedAmount).toFixed() }
            : {}),
        },
      });

      await tx.paymentEvent.create({
        data: {
          invoiceId,
          rail: row.rail,
          type: `state.${action}`,
          rawPayload: { from: invoice.state, to: nextState, action },
        },
      });

      const webhookEvent = STATE_WEBHOOK_EVENTS[nextState];
      if (webhookEvent) {
        await this.outbox.emit(tx, {
          aggregate: "invoice",
          aggregateId: invoiceId,
          type: webhookEvent,
          payload: {
            invoiceId,
            merchantId: row.merchantId,
            state: nextState,
            previousState: invoice.state,
          },
        });
      }

      return row;
    });

    return this.toDto(updated);
  }

  async get(id: string): Promise<InvoiceDto> {
    return this.toDto(await this.findOrThrow(id));
  }

  async list(merchantId: string, page = 1, limit = 20, state?: string) {
    const where: Prisma.InvoiceWhereInput = {
      merchantId,
      ...(state ? { state: state as PrismaInvoiceState } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data: data.map((i) => this.toDto(i)), total };
  }

  async recordEvent(
    invoiceId: string,
    event: {
      rail: string;
      type: string;
      txHash?: string;
      leg?: string;
      amount?: string;
      asset?: string;
      chain?: string;
      rawPayload: object;
    },
  ) {
    await this.prisma.paymentEvent.create({
      data: {
        invoiceId,
        rail: event.rail,
        type: event.type,
        txHash: event.txHash ?? null,
        leg: event.leg ?? null,
        amount: event.amount ? new Decimal(event.amount).toFixed() : null,
        asset: event.asset ?? null,
        chain: event.chain ?? null,
        rawPayload: event.rawPayload,
      },
    });
  }

  private async findOrThrow(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  private toDto(invoice: {
    id: string;
    merchantId: string;
    displayCurrency: string;
    displayAmount: Decimal;
    payAsset: string;
    payChain: string;
    quotedAmount: Decimal;
    rate: Decimal;
    rateLockedUntil: Date;
    rail: string;
    railRef: string | null;
    state: string;
    refundAddress: string | null;
    expiresAt: Date;
    createdAt: Date;
  }): InvoiceDto {
    return {
      id: invoice.id,
      merchantId: invoice.merchantId,
      displayCurrency: invoice.displayCurrency,
      displayAmount: invoice.displayAmount.toString(),
      payAsset: invoice.payAsset,
      payChain: invoice.payChain,
      quotedAmount: invoice.quotedAmount.toString(),
      rate: invoice.rate.toString(),
      rateLockedUntil: invoice.rateLockedUntil.toISOString(),
      rail: invoice.rail as never,
      railRef: invoice.railRef,
      state: invoice.state as InvoiceState,
      refundAddress: invoice.refundAddress,
      expiresAt: invoice.expiresAt.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
    };
  }
}
