import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { PrismaService } from "./prisma.service";

export interface AuditEntry {
	actorId: string;
	actorEmail: string;
	action: string;
	targetType: string;
	targetId: string;
	before?: Prisma.InputJsonValue;
	after?: Prisma.InputJsonValue;
	ip?: string;
}

/**
 * Admin audit log (§5 compliance trail). Every admin mutation — merchant
 * approval, suspension, fee policy changes, KYB decisions — is recorded
 * with before/after snapshots and the acting admin's identity. These
 * entries are append-only and never modified.
 */
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
				before: entry.before ?? undefined,
				after: entry.after ?? undefined,
				ip: entry.ip ?? null,
			},
		});
		this.logger.log(
			{
				action: entry.action,
				actorId: entry.actorId,
				targetType: entry.targetType,
				targetId: entry.targetId,
			},
			"admin action audited",
		);
	}

	/** List audit entries (for the admin audit-log viewer). */
	async list(page = 1, limit = 50, filters?: { actorId?: string; targetType?: string }) {
		const where: Prisma.AuditLogWhereInput = {
			...(filters?.actorId ? { actorId: filters.actorId } : {}),
			...(filters?.targetType ? { targetType: filters.targetType } : {}),
		};
		const [data, total] = await Promise.all([
			this.prisma.auditLog.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { createdAt: "desc" },
			}),
			this.prisma.auditLog.count({ where }),
		]);
		return { data, total };
	}
}
