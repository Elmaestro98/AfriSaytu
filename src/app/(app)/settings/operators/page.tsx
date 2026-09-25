import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { PAGE } from "@/lib/layout"
import { formatAmount } from "@/lib/money"
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

  const used = operators.filter((operator) => operator.isActive).length

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Opérateurs" subtitle="Pour toute l'entreprise" backHref="/settings" />
      <main className={cn(PAGE, "gap-6")}>
        <section aria-label="Synthèse" className="flex flex-col gap-3 rounded-2xl border bg-card p-4 lg:flex-row lg:items-center lg:gap-10 lg:p-5">
          <div className="shrink-0">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Opérateurs utilisés</p>
            <p className="font-heading text-xl font-extrabold tabular-nums">
              {formatAmount(used)} <span className="text-base font-semibold text-muted-foreground">sur {formatAmount(operators.length)} disponibles</span>
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {canToggle
              ? "Choisissez les opérateurs que votre entreprise utilise. Un opérateur que vous n'utilisez plus disparaît de la saisie, mais son historique est conservé. Le catalogue est tenu à jour par AfriSaytu."
              : "Seul le propriétaire peut choisir les opérateurs, car ce réglage concerne tous les points de vente."}
          </p>
        </section>
        <OperatorList operators={operators} canToggle={canToggle} />
      </main>
    </div>
  )
}
