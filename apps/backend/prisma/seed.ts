import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_ADMIN_EMAIL = process.env["SEED_ADMIN_EMAIL"] ?? "admin@egofi.io";
const DEFAULT_ADMIN_PASSWORD = process.env["SEED_ADMIN_PASSWORD"] ?? "egofi-admin-dev";

async function main(): Promise<void> {
  // Default operator account — override credentials via SEED_ADMIN_EMAIL /
  // SEED_ADMIN_PASSWORD; always change the password before production.
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
  await prisma.adminUser.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: {},
    create: {
      email: DEFAULT_ADMIN_EMAIL,
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });
  console.log(`Seeded admin user: ${DEFAULT_ADMIN_EMAIL}`);

  // Global fee policy singleton so the admin fee-policy screen has data.
  await prisma.feePolicy.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global" },
  });
  await prisma.recurringPolicy.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global" },
  });
  console.log("Seeded global fee + recurring policies");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
