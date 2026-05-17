-- Founders Pass: multi-step community funnel (manual verification flags for MVP)

CREATE TYPE "FoundersPassStatus" AS ENUM ('PENDING', 'ACTIVE');

CREATE TABLE "FoundersPass" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT,
    "walletVerified" BOOLEAN NOT NULL DEFAULT false,
    "xHandle" TEXT,
    "xFollowSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "xFollowVerified" BOOLEAN NOT NULL DEFAULT false,
    "engagementProofUrl" TEXT,
    "engagementVerified" BOOLEAN NOT NULL DEFAULT false,
    "telegramUsername" TEXT,
    "telegramVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "FoundersPassStatus" NOT NULL DEFAULT 'PENDING',
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoundersPass_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FoundersPass_userId_key" ON "FoundersPass"("userId");

CREATE INDEX "FoundersPass_userId_status_idx" ON "FoundersPass"("userId", "status");

ALTER TABLE "FoundersPass" ADD CONSTRAINT "FoundersPass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
