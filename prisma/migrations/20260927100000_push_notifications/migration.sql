-- Push notifications: the devices that receive them (one member each), the notifications already
-- sent (one event, one notification) and, per member, the kinds turned off. Additive only.
--
-- Revert:
--   DROP TABLE "NotificationLog";
--   DROP TABLE "PushSubscription";
--   ALTER TABLE "Member" DROP COLUMN "mutedNotifications";

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "mutedNotifications" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_organizationId_memberId_idx" ON "PushSubscription"("organizationId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_organizationId_key_key" ON "NotificationLog"("organizationId", "key");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Same protection as every table: no access through the Supabase API, only the server.
ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationLog" ENABLE ROW LEVEL SECURITY;
