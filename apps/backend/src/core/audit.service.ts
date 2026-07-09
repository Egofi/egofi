import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";

export interface AuditEntry {
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: Prisma.InputJsonValue | undefined;
  after?: Prisma.InputJsonValue | undefined;
  ip?: string | undefined;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        ...(entry.before !== undefined ? { before: entry.before } : {}),
        ...(entry.after !== undefined ? { after: entry.after } : {}),
        ip: entry.ip ?? null,
      },
    });
    this.logger.log(
      `admin action audited: ${entry.action} by ${entry.actorId} on ${entry.targetType}:${entry.targetId}`,
    );
  }

  async list(page = 1, limit = 50, filters?: { actorId?: string; targetType?: string }) {
    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    const where: Prisma.AuditLogWhereInput = {
      ...(filters?.actorId ? { actorId: filters.actorId } : {}),
      ...(filters?.targetType ? { targetType: filters.targetType } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, total };
  }
}
