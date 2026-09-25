import { Percent, Smartphone, Store, Users } from "lucide-react"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { PAGE_NARROW } from "@/lib/layout"
import { cn } from "@/lib/utils"
import { SettingsLink } from "@/components/business/settings-link"
import { requireActor } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { SessionError } from "@/server/auth/session"

export default async function SettingsPage() {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }
  const can = (action: Parameters<typeof authorize>[1]) => authorize(ctx.actor, action).allowed
  const catalog = can("catalog:manage")
  const rules = can("commissionRule:manage")
  const team = can("member:manage")
  if (!catalog && !rules && !team) redirect("/dashboard")

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Réglages" subtitle="Votre entreprise" />
      <main className={cn(PAGE_NARROW, "gap-3", "lg:grid lg:grid-cols-2 lg:content-start")}>
        {catalog && <SettingsLink href="/settings/branches" icon={Store} title="Points de vente" description="Comptes, soldes et seuils d'alerte" />}
        {catalog && <SettingsLink href="/settings/operators" icon={Smartphone} title="Opérateurs" description="Wave, Orange Money, Mixx by Yas" />}
        {rules && <SettingsLink href="/settings/commissions" icon={Percent} title="Commissions" description="Vos barèmes par opérateur et par tranche" />}
        {team && <SettingsLink href="/settings/team" icon={Users} title="Équipe" description="Invitez vos agents et gérez leurs accès" />}
      </main>
    </div>
  )
}
