import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { PAGE_NARROW } from "@/lib/layout"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { SessionError } from "@/server/auth/session"
import { loadDevicesView } from "@/server/devices/queries"

import { AgentCodes } from "./agent-codes"
import { DeviceList } from "./device-list"
import { ThisPhoneCard } from "./this-phone-card"

// Réglages -> Téléphones partagés (owner, managers of the branch).
export default async function DevicesPage() {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }
  if (ctx.actor.role === "AGENT" || !authorize(ctx.actor, "member:manage").allowed) redirect("/settings")
  const view = await loadDevicesView(ctx)

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Téléphones partagés" subtitle="Changement rapide d'agent" backHref="/settings" />
      <main className={cn(PAGE_NARROW, "gap-5")}>
        <p className="text-sm text-muted-foreground">
          Sur un téléphone partagé, chaque agent touche son nom et tape son code à 4 chiffres : ses opérations sont enregistrées à son
          nom, sans se reconnecter. Chaque agent crée son code depuis son propre compte (Réglages → Mon code).
        </p>
        <ThisPhoneCard thisPhone={view.thisPhone} branches={view.branches} />
        <DeviceList devices={view.devices} />
        <AgentCodes agents={view.agents} />
      </main>
    </div>
  )
}
