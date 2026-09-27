import { Bell, CreditCard, KeyRound, Percent, ScrollText, Smartphone, Store, TabletSmartphone, Users } from "lucide-react"
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
  const audit = can("audit:view")
  const subscription = can("subscription:manage")

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Réglages" subtitle="Votre entreprise" />
      <main className={cn(PAGE_NARROW, "gap-3", "lg:grid lg:grid-cols-2 lg:content-start")}>
        {catalog && <SettingsLink href="/settings/branches" icon={Store} title="Points de vente" description="Comptes, soldes et seuils d'alerte" />}
        {catalog && <SettingsLink href="/settings/operators" icon={Smartphone} title="Opérateurs" description="Wave, Orange Money, Mixx by Yas" />}
        {rules && <SettingsLink href="/settings/commissions" icon={Percent} title="Commissions" description="Vos barèmes par opérateur et par tranche" />}
        {team && <SettingsLink href="/settings/team" icon={Users} title="Équipe" description="Invitez vos agents et gérez leurs accès" />}
        {subscription && <SettingsLink href="/settings/subscription" icon={CreditCard} title="Mon abonnement" description="Formule, échéance et utilisation" />}
        {audit && <SettingsLink href="/settings/audit" icon={ScrollText} title="Journal d'audit" description="Annulations, clôtures, règles, exports" />}
        {team && ctx.actor.role !== "AGENT" && <SettingsLink href="/settings/devices" icon={TabletSmartphone} title="Téléphones partagés" description="Changement rapide d'agent avec un code" />}
        {ctx.actor.role === "AGENT" && <SettingsLink href="/settings/pin" icon={KeyRound} title="Mon code" description="Pour le téléphone partagé du point de vente" />}
        {/* Everyone, agents included: each member chooses their own notifications. */}
        <SettingsLink href="/settings/notifications" icon={Bell} title="Notifications" description="Soldes bas, paliers, rappel de clôture" />
      </main>
    </div>
  )
}
