import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const email = process.env.SEED_ADMIN_EMAIL ?? "admin@egofi.io";
const password = process.env.SEED_ADMIN_PASSWORD ?? "egofi-admin-dev";

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, role: "SUPER_ADMIN" },
    create: { email, passwordHash, role: "SUPER_ADMIN" },
  });
  console.log(`Seeded admin: ${email}  (password: ${password})`);

  await prisma.feePolicy.upsert({ where: { id: "global" }, update: {}, create: { id: "global" } });
  await prisma.recurringPolicy.upsert({ where: { id: "global" }, update: {}, create: { id: "global" } });
  console.log("Seeded global fee + recurring policies");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
