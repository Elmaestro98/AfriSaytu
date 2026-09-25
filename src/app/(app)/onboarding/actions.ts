"use server"

import { randomUUID } from "node:crypto"

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"

import { onboardingSchema } from "@/schemas/onboarding"
import { getBaseClient } from "@/server/db/client"
import { UnknownOperatorError, buildProvisioningRows } from "@/server/onboarding/build-rows"
import { provisionOrganization } from "@/server/onboarding/provision"
import { isOrganizationProvisioned, listActiveOperators } from "@/server/onboarding/queries"

export type OnboardingResult =
  | { ok: true; clerkOrgId: string }
  | { ok: false; error: string }

const CLERK_ADMIN_ROLE = "org:admin"

// Creates the organization, its first branch, its accounts and the opening balances.
// The user identity comes from the Clerk session, never from the form.
export async function completeOnboarding(raw: unknown): Promise<OnboardingResult> {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) {
    return { ok: false, error: "Session expirée. Reconnectez-vous." }
  }

  const parsed = onboardingSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" }
  }

  // An existing Clerk organization can only be configured by its admin.
  if (orgId && orgRole !== CLERK_ADMIN_ROLE) {
    return { ok: false, error: "Seul le propriétaire de l'entreprise peut la configurer." }
  }

  if (orgId && (await isOrganizationProvisioned(orgId))) {
    return { ok: false, error: "Votre entreprise est déjà configurée." }
  }

  const catalog = await listActiveOperators()

  const user = await currentUser()
  const memberName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Propriétaire"

  const clerk = await clerkClient()
  let clerkOrgId = orgId ?? null
  let createdClerkOrganization = false

  if (!clerkOrgId) {
    const organization = await clerk.organizations.createOrganization({
      name: parsed.data.organizationName,
      createdBy: userId,
    })
    clerkOrgId = organization.id
    createdClerkOrganization = true
  }

  try {
    const rows = buildProvisioningRows(parsed.data, {
      clerkOrgId,
      clerkUserId: userId,
      memberName,
      operators: catalog,
      now: new Date(),
      newId: randomUUID,
    })
    await provisionOrganization(getBaseClient(), rows)
    return { ok: true, clerkOrgId }
  } catch (error) {
    console.error("Onboarding failed", error)

    // Do not leave an empty organization behind in Clerk.
    if (createdClerkOrganization) {
      await clerk.organizations.deleteOrganization(clerkOrgId).catch(() => undefined)
    }

    if (error instanceof UnknownOperatorError) {
      return { ok: false, error: "Un des opérateurs choisis n'est plus disponible." }
    }
    return { ok: false, error: "La création a échoué. Réessayez dans un instant." }
  }
}
