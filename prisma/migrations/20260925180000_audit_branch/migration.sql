-- Branch concerned by an audit event, so a manager sees the events of their branches.
-- Additive: existing rows keep branchId = NULL (visible to the owner only).
--
-- Revert:
--   ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_branchId_fkey";
--   DROP INDEX "AuditLog_organizationId_branchId_createdAt_idx";
--   ALTER TABLE "AuditLog" DROP COLUMN "branchId";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "branchId" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_branchId_createdAt_idx" ON "AuditLog"("organizationId", "branchId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
