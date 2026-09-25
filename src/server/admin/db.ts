import type { PrismaClient } from "@/generated/prisma/client"
import { getBaseClient } from "@/server/db/client"
import { requireSaasAdmin } from "@/server/admin/identity"

// The ONLY cross-organization access of the application, for the SaaS admin console. It is
// obtained through the admin check, never without it. Guarded by admin/boundary.test.ts.
export async function getAdminDb(): Promise<{ db: PrismaClient; adminUserId: string }> {
  const { userId } = await requireSaasAdmin()
  return { db: getBaseClient(), adminUserId: userId }
}
