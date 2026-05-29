-- Wallet Risk Index MVP — snapshots + findings (no PII beyond wallet address)

CREATE TABLE "WalletRiskSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "band" TEXT NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletRiskSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletRiskFinding" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,

    CONSTRAINT "WalletRiskFinding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletRiskSnapshot_userId_walletAddress_chainId_key" ON "WalletRiskSnapshot"("userId", "walletAddress", "chainId");

CREATE INDEX "WalletRiskSnapshot_userId_updatedAt_idx" ON "WalletRiskSnapshot"("userId", "updatedAt");

CREATE INDEX "WalletRiskFinding_snapshotId_idx" ON "WalletRiskFinding"("snapshotId");

ALTER TABLE "WalletRiskSnapshot" ADD CONSTRAINT "WalletRiskSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletRiskFinding" ADD CONSTRAINT "WalletRiskFinding_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "WalletRiskSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
