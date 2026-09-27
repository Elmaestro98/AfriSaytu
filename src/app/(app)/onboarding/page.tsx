import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { carriesDeviceCookie } from "@/server/devices/current"
import { isOrganizationProvisioned, listActiveOperators } from "@/server/onboarding/queries"

import { OnboardingWizard } from "./onboarding-wizard"

export default async function OnboardingPage() {
  const { userId, orgId } = await auth()
  if (!userId) redirect("/sign-in")
  if (await carriesDeviceCookie()) redirect("/switch") // a shared phone never runs the setup

  // Already configured: nothing to do here.
  if (orgId && (await isOrganizationProvisioned(orgId))) redirect("/dashboard")

  const operators = await listActiveOperators()

  return <OnboardingWizard operators={operators} />
}
