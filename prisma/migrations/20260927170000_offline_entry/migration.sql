-- Offline entry: an operation kept on the phone without network and sent later. Its createdAt is
-- the time the server received it (rule 7); clientCreatedAt keeps the phone's time. Existing
-- operations were all entered online. Additive column with a default.
--
-- Revert:
--   ALTER TABLE "Transaction" DROP COLUMN "enteredOffline";

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "enteredOffline" BOOLEAN NOT NULL DEFAULT false;
