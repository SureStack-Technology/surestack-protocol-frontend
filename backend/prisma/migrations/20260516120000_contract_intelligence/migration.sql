-- Contract Intelligence Engine — cached reports + analysis history

CREATE TABLE "ContractIntelligenceReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "trustScore" INTEGER NOT NULL,
    "trustBand" TEXT NOT NULL,
    "report" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractIntelligenceReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractIntelligenceHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "trustScore" INTEGER NOT NULL,
    "trustBand" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'API_ANALYZE',
    "reportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractIntelligenceHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContractIntelligenceReport_userId_contractAddress_chainId_key" ON "ContractIntelligenceReport"("userId", "contractAddress", "chainId");

CREATE INDEX "ContractIntelligenceReport_userId_updatedAt_idx" ON "ContractIntelligenceReport"("userId", "updatedAt");

CREATE INDEX "ContractIntelligenceHistory_userId_contractAddress_chainId_createdAt_idx" ON "ContractIntelligenceHistory"("userId", "contractAddress", "chainId", "createdAt");

ALTER TABLE "ContractIntelligenceReport" ADD CONSTRAINT "ContractIntelligenceReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContractIntelligenceHistory" ADD CONSTRAINT "ContractIntelligenceHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContractIntelligenceHistory" ADD CONSTRAINT "ContractIntelligenceHistory_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ContractIntelligenceReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
