-- Prime MVP: deterministic signals on snapshot, risk score history, in-app alerts, Explorer complimentary analyst quota

ALTER TABLE "User" ADD COLUMN "explorerComplimentaryPrimeAnalystConsumed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "WalletRiskSnapshot" ADD COLUMN "signalsSnapshot" JSONB;

CREATE TABLE "WalletRiskHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "band" TEXT NOT NULL,
    "previousScore" INTEGER,
    "snapshotId" TEXT,
    "findingsCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "trigger" TEXT NOT NULL DEFAULT 'API_REFRESH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletRiskHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WalletRiskHistory_userId_walletAddress_chainId_createdAt_idx"
  ON "WalletRiskHistory"("userId", "walletAddress", "chainId", "createdAt");

ALTER TABLE "WalletRiskHistory"
  ADD CONSTRAINT "WalletRiskHistory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletRiskHistory"
  ADD CONSTRAINT "WalletRiskHistory_snapshotId_fkey"
  FOREIGN KEY ("snapshotId") REFERENCES "WalletRiskSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PrimeAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT,
    "chainId" INTEGER,
    "severity" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrimeAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrimeAlert_userId_read_createdAt_idx" ON "PrimeAlert"("userId", "read", "createdAt");

ALTER TABLE "PrimeAlert"
  ADD CONSTRAINT "PrimeAlert_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
