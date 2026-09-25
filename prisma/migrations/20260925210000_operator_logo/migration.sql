-- Logos of the catalogue operators, uploaded by the SaaS admin (F-10). Stored apart from
-- OperatorCatalog so list queries never load the image. Additive.
--
-- Revert:
--   DROP TABLE "OperatorLogo";

-- CreateTable
CREATE TABLE "OperatorLogo" (
    "operatorId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorLogo_pkey" PRIMARY KEY ("operatorId")
);

-- AddForeignKey
ALTER TABLE "OperatorLogo" ADD CONSTRAINT "OperatorLogo_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "OperatorCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Same protection as every other table (see 20260925002000_enable_rls).
ALTER TABLE "OperatorLogo" ENABLE ROW LEVEL SECURITY;
