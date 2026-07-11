-- Per-merchant BIP44 receive index for xpub-derived deposit addresses.
ALTER TABLE "Merchant" ADD COLUMN "xpubIndex" INTEGER NOT NULL DEFAULT 0;
