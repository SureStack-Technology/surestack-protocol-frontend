-- Founding Member: free community credential fields (not a paid subscription tier)
ALTER TABLE "User" ADD COLUMN "foundingMember" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "foundingCohort" TEXT;
ALTER TABLE "User" ADD COLUMN "founderClaimedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "founderDiscountPercent" INTEGER;
ALTER TABLE "User" ADD COLUMN "founderCredentialStatus" TEXT;
