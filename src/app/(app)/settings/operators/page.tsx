import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { PAGE_NARROW } from "@/lib/layout"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { SessionError } from "@/server/auth/session"
import { canToggleOperators, listOrgOperators } from "@/server/operators/manage"

import { OperatorList } from "./operator-list"

export default async function OperatorsPage() {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }
  if (!authorize(ctx.actor, "catalog:manage").allowed) redirect("/dashboard")

  const operators = await listOrgOperators(ctx)
  const canToggle = canToggleOperators(ctx)

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Opérateurs" subtitle="Pour toute l'entreprise" backHref="/settings" />
      <main className={cn(PAGE_NARROW, "gap-4")}>
        <p className="text-muted-foreground">
          {canToggle
            ? "Activez les opérateurs que vous utilisez. Un opérateur désactivé disparaît de la saisie mais son historique est conservé."
            : "Seul le propriétaire peut activer ou désactiver un opérateur, car ce réglage concerne tous les points de vente."}
        </p>
        <OperatorList operators={operators} canToggle={canToggle} />
      </main>
    </div>
  )
}
