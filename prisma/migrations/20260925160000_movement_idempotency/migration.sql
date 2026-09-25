-- Idempotency key on internal movements, like on operations: a network retry of the same
-- movement is recorded once. Nullable: existing rows keep NULL, and PostgreSQL allows several
-- NULLs in a unique index. No data is changed.
--
-- To revert:
--   DROP INDEX "InternalMovement_organizationId_idempotencyKey_key";
--   ALTER TABLE "InternalMovement" DROP COLUMN "idempotencyKey";

-- AlterTable
ALTER TABLE "InternalMovement" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InternalMovement_organizationId_idempotencyKey_key" ON "InternalMovement"("organizationId", "idempotencyKey");
