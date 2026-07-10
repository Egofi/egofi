import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { type Prisma, PrismaClient } from "@prisma/client";
import { currentMerchantId } from "./merchant-context";

const logger = new Logger("PrismaService");

/** The Postgres GUC the RLS policies read. Must match the migration. */
const TENANT_GUC = "app.current_merchant_id";

/**
 * Wraps every model query so that, inside an authenticated merchant request,
 * the tenant GUC is set on the same connection the query runs on. Prisma pools
 * connections and only guarantees affinity within a transaction, so the
 * `set_config` and the query have to be submitted as one batch.
 *
 * Outside a merchant request (public checkout, admin, workers) the GUC stays
 * unset and the policies are permissive — no transaction is opened, so those
 * paths pay nothing.
 */
function tenantGuard(base: PrismaClient) {
  return base.$extends({
    client: {
      /**
       * The only sanctioned way to run an interactive transaction. `base` is
       * the unextended client, so the query hook below does not fire for `tx`
       * and cannot open a second, competing transaction underneath this one.
       */
      tenantTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        return base.$transaction(async (tx) => {
          const merchantId = currentMerchantId();
          if (merchantId) {
            await tx.$executeRaw`SELECT set_config(${TENANT_GUC}, ${merchantId}, true)`;
          }
          return fn(tx);
        });
      },
    },
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const merchantId = currentMerchantId();
          if (!merchantId) return query(args);

          const [, result] = await base.$transaction([
            base.$executeRaw`SELECT set_config(${TENANT_GUC}, ${merchantId}, true)`,
            query(args) as Prisma.PrismaPromise<unknown>,
          ]);
          return result;
        },
      },
    },
  });
}

// Declaration merging: `tenantTransaction` exists at runtime via the client
// extension above. Declaring it on the class instead would collide with the
// extension, which refuses to shadow a method the base client already has.
export interface PrismaService {
  tenantTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

@Injectable()
// biome-ignore lint/suspicious/noUnsafeDeclarationMerging: the merged interface declares tenantTransaction, which the extension installs at runtime
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    // Returning the extended client from the constructor makes *every* injected
    // PrismaService the guarded one. If we exposed the extension as a separate
    // property instead, a service that reached for the raw client would silently
    // skip tenant scoping — a security hole that typechecks.
    // The rule assumes the value is discarded; `new` honours an object return.
    // biome-ignore lint/correctness/noConstructorReturn: returning the extended client is the point
    return tenantGuard(this) as unknown as PrismaService;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.assertRlsIsEffective();
    logger.log("Prisma connected");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * RLS fails open in two ways that are invisible at runtime: connecting as a
   * superuser (or a role with BYPASSRLS), and adding a tenant table without a
   * policy. Both would leave the app looking healthy while leaking across
   * tenants, so refuse to start instead.
   */
  private async assertRlsIsEffective(): Promise<void> {
    const [role] = await this.$queryRaw<{ name: string; privileged: boolean }[]>`
      SELECT rolname AS name, (rolsuper OR rolbypassrls) AS privileged
      FROM pg_roles WHERE rolname = current_user
    `;
    if (role?.privileged) {
      throw new Error(
        `Database role "${role.name}" is a superuser or has BYPASSRLS, so row-level security is silently inactive. Point DATABASE_URL at the unprivileged egofi_app role (see prisma/migrations/*_row_level_security).`,
      );
    }

    const unguarded = await this.$queryRaw<{ table: string }[]>`
      SELECT c.relname AS "table"
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'merchantId' AND a.attnum > 0
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
    `;
    if (unguarded.length > 0) {
      throw new Error(
        `These tables have a merchantId column but no row-level security: ${unguarded
          .map((r) => r.table)
          .join(", ")}. Add an RLS policy in a migration before deploying.`,
      );
    }
  }
}
