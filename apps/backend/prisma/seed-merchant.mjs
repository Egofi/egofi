import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Credentials default to the requested dev account; override via env.
const email = process.env.SEED_MERCHANT_EMAIL ?? "ebukaemmanuel71@gmail.com";
const password = process.env.SEED_MERCHANT_PASSWORD ?? "P@sword.123";
const business = process.env.SEED_MERCHANT_BUSINESS ?? "Ebuka Test Store";

// Dev settlement wallets so the dashboard "Add a settlement address" step shows
// as done. Replace with your own addresses in Settings → Settlement.
const settlementAddresses = {
  evm: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  tron: "TJYeasTPa6gpR4vF4ycuPCRbXfRBXgqVXK",
  solana: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  bitcoin: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
};

async function main() {
  // 12 rounds — matches AuthService so login works against this hash.
  const passwordHash = await bcrypt.hash(password, 12);

  const merchant = await prisma.merchant.upsert({
    where: { email },
    update: { passwordHash, status: "ACTIVE" },
    create: {
      business,
      email,
      passwordHash,
      status: "ACTIVE", // dev convenience — skip the pending-approval gate
      settlementAsset: "USDT-TRC20",
      settlementAddresses,
    },
  });

  console.log(`Seeded merchant: ${email}  (password: ${password})`);
  console.log(`  id=${merchant.id}  business="${merchant.business}"  status=${merchant.status}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
