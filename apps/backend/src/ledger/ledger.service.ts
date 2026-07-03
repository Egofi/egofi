import { Injectable } from "@nestjs/common";
import Decimal from "decimal.js";
import { PrismaService } from "../core/prisma.service";
import { LedgerEntryKind } from "@egofi/types";

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async recordFee(invoiceId: string, amount: string, asset: string) {
    await this.record(invoiceId, LedgerEntryKind.Fee, amount, asset);
  }

  async recordPayout(invoiceId: string, amount: string, asset: string) {
    await this.record(invoiceId, LedgerEntryKind.Payout, amount, asset);
  }

  async recordRefund(invoiceId: string, amount: string, asset: string) {
    await this.record(invoiceId, LedgerEntryKind.Refund, amount, asset);
  }

  async getInvoiceEntries(invoiceId: string) {
    return this.prisma.ledgerEntry.findMany({
      where: { invoiceId },
      orderBy: { ts: "asc" },
    });
  }

  async reconcileSummary(from: Date, to: Date) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { ts: { gte: from, lte: to } },
    });

    return entries.reduce(
      (acc, entry) => {
        const kind = entry.kind as LedgerEntryKind;
        const key = `${kind}:${entry.asset}`;
        acc[key] = new Decimal(acc[key] ?? 0).add(entry.amount.toString()).toString();
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  private async record(invoiceId: string, kind: string, amount: string, asset: string) {
    await this.prisma.ledgerEntry.create({
      data: {
        invoiceId,
        kind,
        amount: new Decimal(amount).toFixed(),
        asset,
      },
    });
  }
}
