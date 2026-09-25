import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { isOrganizationProvisioned, listActiveOperators } from "@/server/onboarding/queries"

import { OnboardingWizard } from "./onboarding-wizard"

export default async function OnboardingPage() {
  const { userId, orgId } = await auth()
  if (!userId) redirect("/sign-in")

  // Already configured: nothing to do here.
  if (orgId && (await isOrganizationProvisioned(orgId))) redirect("/dashboard")

  const operators = await listActiveOperators()

  return <OnboardingWizard operators={operators} />
}
