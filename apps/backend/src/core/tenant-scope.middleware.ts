import { Prisma } from "@prisma/client";
import { currentMerchantId } from "./merchant-context";

/**
 * Tenant-scoped models: every query on these models is automatically
 * filtered by merchantId when a merchant context is active. Admin/worker
 * contexts (merchantId = null) bypass this filter.
 */
const TENANT_SCOPED_MODELS = new Set([
	"Invoice",
	"ApiKey",
	"KybDocument",
	"WebhookDelivery",
	"TatumSubscription",
]);

/**
 * Prisma middleware (§7 defense-in-depth): automatically injects
 * `merchantId` filters into read queries on tenant-scoped models.
 * This is the application-level complement to database-level RLS —
 * a missed filter in service code is caught here before it reaches
 * the DB, and RLS catches anything this misses.
 *
 * Admin/worker requests (where currentMerchantId() returns null)
 * bypass this filter entirely.
 */
export function tenantScopeMiddleware(): Prisma.Middleware {
	return async (params, next) => {
		const merchantId = currentMerchantId();

		// No merchant context = admin/worker/public — no tenant scoping
		if (!merchantId) {
			return next(params);
		}

		// Only scope read operations on tenant-scoped models
		if (!params.model || !TENANT_SCOPED_MODELS.has(params.model)) {
			return next(params);
		}

		const scopedActions = new Set([
			"findFirst",
			"findMany",
			"findUnique",
			"findFirstOrThrow",
			"findUniqueOrThrow",
			"count",
			"aggregate",
			"groupBy",
		]);

		if (!scopedActions.has(params.action)) {
			return next(params);
		}

		// Inject merchantId into the where clause
		const args = params.args ?? {};
		if (params.action === "groupBy") {
			args.where = { ...args.where, merchantId };
		} else {
			args.where = { ...args.where, merchantId };
		}
		params.args = args;

		return next(params);
	};
}
