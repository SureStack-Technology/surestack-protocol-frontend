-- Persist wallet sign-in challenges (replaces in-memory nonce for multi-instance / restart safety)

CREATE TABLE "WalletChallenge" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletChallenge_nonce_key" ON "WalletChallenge"("nonce");
CREATE INDEX "WalletChallenge_clerkId_expiresAt_idx" ON "WalletChallenge"("clerkId", "expiresAt");
