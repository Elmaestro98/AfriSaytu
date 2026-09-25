-- Commission reconciliation (F-55): a commission payout records the operator who paid and the
-- month it covers ("2026-09"). Additive columns.
--
-- Revert:
--   ALTER TABLE "InternalMovement" DROP CONSTRAINT "InternalMovement_operatorId_fkey";
--   DROP INDEX "InternalMovement_organizationId_payoutMonth_idx";
--   ALTER TABLE "InternalMovement" DROP COLUMN "operatorId", DROP COLUMN "payoutMonth";

-- AlterTable
ALTER TABLE "InternalMovement" ADD COLUMN     "operatorId" TEXT,
ADD COLUMN     "payoutMonth" TEXT;

-- CreateIndex
CREATE INDEX "InternalMovement_organizationId_payoutMonth_idx" ON "InternalMovement"("organizationId", "payoutMonth");

-- AddForeignKey
ALTER TABLE "InternalMovement" ADD CONSTRAINT "InternalMovement_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "OperatorCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Existing payouts (fills empty fields only): the operator of the UV account that received it,
-- and the month before its reception (operators pay once a month for the previous month).
UPDATE "InternalMovement" AS m
SET "operatorId" = a."operatorId"
FROM "Account" AS a
WHERE m."kind" = 'COMMISSION_PAYOUT' AND m."operatorId" IS NULL AND m."toAccountId" = a."id" AND a."operatorId" IS NOT NULL;

UPDATE "InternalMovement"
SET "payoutMonth" = to_char("createdAt" - INTERVAL '1 month', 'YYYY-MM')
WHERE "kind" = 'COMMISSION_PAYOUT' AND "payoutMonth" IS NULL;
