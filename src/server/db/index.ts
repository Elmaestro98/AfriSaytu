import { SessionError, requireSession } from "@/server/auth/session"
import { getBaseClient } from "@/server/db/client"
import { withTenant, type TenantClient } from "@/server/db/tenant"

export type TenantContext = {
  db: TenantClient
  organizationId: string // internal id, resolved from the session
  clerkOrgId: string
  userId: string
}

// The only entry point to the database for the rest of the application.
// The organization comes from the Clerk session, never from the client.
export async function getTenantDb(): Promise<TenantContext> {
  const session = await requireSession()

  const organization = await getBaseClient().organization.findUnique({
    where: { clerkOrgId: session.clerkOrgId },
    select: { id: true },
  })
  if (!organization) {
    throw new SessionError("ORGANIZATION_NOT_PROVISIONED")
  }

  return {
    db: withTenant(getBaseClient(), organization.id),
    organizationId: organization.id,
    clerkOrgId: session.clerkOrgId,
    userId: session.userId,
  }
}
