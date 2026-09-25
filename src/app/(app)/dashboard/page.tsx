import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { isOrganizationProvisioned } from "@/server/onboarding/queries"

// Temporary landing page after sign-in. The real dashboard comes in a later sprint.
export default async function DashboardPage() {
  const { orgId } = await auth()

  // No organization yet, or not configured: the setup assistant comes first.
  if (!orgId || !(await isOrganizationProvisioned(orgId))) redirect("/onboarding")

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">AfriSaytu</h1>
        <div className="flex items-center gap-3">
          <OrganizationSwitcher hidePersonal />
          <UserButton />
        </div>
      </header>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Votre entreprise est prête</h2>
        <p className="mt-2 text-muted-foreground">
          Le tableau de bord arrive dans un prochain sprint.
        </p>
      </section>
    </main>
  )
}
