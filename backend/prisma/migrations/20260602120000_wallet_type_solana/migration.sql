-- Solana + EVM wallet type metadata (backward compatible defaults for existing rows)

CREATE TYPE "WalletType" AS ENUM ('EVM', 'SOLANA');

ALTER TABLE "Wallet"
  ADD COLUMN "walletType" "WalletType" NOT NULL DEFAULT 'EVM',
  ADD COLUMN "walletChain" TEXT NOT NULL DEFAULT '11155111';

ALTER TABLE "WalletChallenge"
  ADD COLUMN "walletType" "WalletType" NOT NULL DEFAULT 'EVM',
  ADD COLUMN "walletChain" TEXT NOT NULL DEFAULT '11155111';

UPDATE "Wallet" SET "walletChain" = CAST("chainId" AS TEXT) WHERE "walletType" = 'EVM';

CREATE INDEX "Wallet_walletType_walletChain_idx" ON "Wallet"("walletType", "walletChain");
