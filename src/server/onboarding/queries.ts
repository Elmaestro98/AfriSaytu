import { getBaseClient } from "@/server/db/client"

export type ActiveOperator = { id: string; name: string; color: string | null }

// The organization row is created by the onboarding. Until then, a signed-in user must be sent
// to /onboarding. Looked up by the Clerk organization id taken from the session.
export async function isOrganizationProvisioned(clerkOrgId: string): Promise<boolean> {
  const organization = await getBaseClient().organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  })
  return organization !== null
}

// Global operator catalogue (no tenant): operators an organization can activate.
export async function listActiveOperators(): Promise<ActiveOperator[]> {
  return getBaseClient().operatorCatalog.findMany({
    where: { isActive: true },
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
  })
}
