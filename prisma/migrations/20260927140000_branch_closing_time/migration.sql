-- Closing time of each branch (liquidity forecast: "enough until closing?"), in minutes after
-- midnight in Dakar. Existing branches get 21:00. Additive column with a default.
--
-- Revert:
--   ALTER TABLE "Branch" DROP COLUMN "closesAt";

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "closesAt" INTEGER NOT NULL DEFAULT 1260;

-- A time of day: from 00:00 to 23:59.
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_closesAt_check" CHECK ("closesAt" >= 0 AND "closesAt" < 1440);
