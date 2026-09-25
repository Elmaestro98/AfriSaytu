-- What a payment is for (plan and number of months), set when the owner declares a Wave payment.
-- Additive: existing payments keep NULL.
--
-- Revert:
--   ALTER TABLE "Payment" DROP COLUMN "months", DROP COLUMN "plan";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "months" INTEGER,
ADD COLUMN     "plan" "SubscriptionPlan";
