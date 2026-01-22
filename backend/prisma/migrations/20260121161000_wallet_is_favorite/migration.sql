-- Add isFavorite flag for Wallet sorting/defaults
ALTER TABLE "Wallet" ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false;

