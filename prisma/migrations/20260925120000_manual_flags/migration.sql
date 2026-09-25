-- Trace the values corrected by hand on an operation. Existing rows get false.
-- To revert: ALTER TABLE "Transaction" DROP COLUMN "commissionManual", DROP COLUMN "feeManual";

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "commissionManual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "feeManual" BOOLEAN NOT NULL DEFAULT false;
