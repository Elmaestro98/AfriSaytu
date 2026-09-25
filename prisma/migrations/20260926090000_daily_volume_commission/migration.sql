-- Daily-volume commission (e.g. Wave): a commission mode per catalogue operator and the
-- operator's tiers, set by the SaaS admin. Additive: every operator keeps PER_TRANSACTION.
--
-- Revert:
--   DROP TABLE "OperatorCommissionTier";
--   ALTER TABLE "OperatorCatalog" DROP COLUMN "commissionMode";
--   DROP TYPE "CommissionMode";

-- CreateEnum
CREATE TYPE "CommissionMode" AS ENUM ('PER_TRANSACTION', 'DAILY_VOLUME');

-- AlterTable
ALTER TABLE "OperatorCatalog" ADD COLUMN     "commissionMode" "CommissionMode" NOT NULL DEFAULT 'PER_TRANSACTION';

-- CreateTable
CREATE TABLE "OperatorCommissionTier" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "minAmount" INTEGER NOT NULL,
    "maxAmount" INTEGER,
    "commission" INTEGER NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorCommissionTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperatorCommissionTier_operatorId_validFrom_idx" ON "OperatorCommissionTier"("operatorId", "validFrom");

-- AddForeignKey
ALTER TABLE "OperatorCommissionTier" ADD CONSTRAINT "OperatorCommissionTier_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "OperatorCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Same protection as every other table (see 20260925002000_enable_rls).
ALTER TABLE "OperatorCommissionTier" ENABLE ROW LEVEL SECURITY;
