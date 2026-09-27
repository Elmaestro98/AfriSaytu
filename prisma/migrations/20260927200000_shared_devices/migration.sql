-- Quick agent switch on a shared phone (step 1): the phones declared as shared by a branch's
-- owner or manager, and each member's hashed 4-digit code with its lock after wrong attempts.
-- Additive only: no existing row changes.
--
-- Revert:
--   DROP TABLE "SharedDevice";
--   ALTER TABLE "Member" DROP COLUMN "pinHash", DROP COLUMN "pinFailures", DROP COLUMN "pinLockedUntil";

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "pinFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "pinLockedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SharedDevice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "SharedDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedDevice_tokenHash_key" ON "SharedDevice"("tokenHash");

-- CreateIndex
CREATE INDEX "SharedDevice_organizationId_branchId_idx" ON "SharedDevice"("organizationId", "branchId");

-- AddForeignKey
ALTER TABLE "SharedDevice" ADD CONSTRAINT "SharedDevice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedDevice" ADD CONSTRAINT "SharedDevice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedDevice" ADD CONSTRAINT "SharedDevice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Same protection as every table: no access through the Supabase API, only the server.
ALTER TABLE "SharedDevice" ENABLE ROW LEVEL SECURITY;
