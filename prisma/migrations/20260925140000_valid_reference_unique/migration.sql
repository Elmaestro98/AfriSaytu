-- The operator reference is unique among VALID operations only. A cancelled operation no longer
-- blocks its reference, so the corrected operation can be entered again with it (cahier 5:
-- correction = cancellation with reason, then a new entry). No data is changed, only the index.
--
-- To revert:
--   DROP INDEX "Transaction_valid_reference_key";
--   CREATE UNIQUE INDEX "Transaction_organizationId_operatorId_reference_key"
--     ON "Transaction"("organizationId", "operatorId", "reference");

-- DropIndex
DROP INDEX "Transaction_organizationId_operatorId_reference_key";

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_valid_reference_key" ON "Transaction"("organizationId", "operatorId", "reference") WHERE (status = 'VALID' AND reference IS NOT NULL);
