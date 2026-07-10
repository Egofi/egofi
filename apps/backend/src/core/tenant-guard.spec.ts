import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith(".ts") && !full.endsWith(".spec.ts") ? [full] : [];
  });
}

describe("tenant guard", () => {
  /**
   * PrismaService is returned from its constructor as an extended client whose
   * query hook wraps each operation in its own transaction. Calling
   * `$transaction(async tx => ...)` on that client makes the hook fire again for
   * every `tx.model.*` call, so those writes land in a *different* transaction
   * than the one the caller opened — atomicity is lost silently. Only
   * `tenantTransaction` (which uses the unextended client) is safe.
   */
  it("no service opens an interactive transaction on the extended client", () => {
    const offenders = sourceFiles(SRC)
      .filter((f) => !f.endsWith(`core${sep}prisma.service.ts`))
      .filter((f) => /\.\$transaction\s*\(/.test(readFileSync(f, "utf8")))
      .map((f) => relative(SRC, f));

    expect(offenders, "use prisma.tenantTransaction() instead of prisma.$transaction()").toEqual(
      [],
    );
  });

  it("the RLS session variable name matches the migration", () => {
    const service = readFileSync(join(SRC, "core", "prisma.service.ts"), "utf8");
    const migrations = join(SRC, "..", "prisma", "migrations");
    const rls = readdirSync(migrations).find((d) => d.endsWith("_row_level_security"));
    expect(rls, "row_level_security migration is missing").toBeDefined();

    const sql = readFileSync(join(migrations, rls as string, "migration.sql"), "utf8");
    expect(service).toContain('"app.current_merchant_id"');
    expect(sql).toContain("current_setting('app.current_merchant_id', true)");
  });
});
