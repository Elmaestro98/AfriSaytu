import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { PAGE } from "@/lib/layout"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { SessionError } from "@/server/auth/session"
import { loadScalesInForce } from "@/server/commissions/daily-summary"
import { listRulesInForce } from "@/server/commissions/manage"
import { listActiveOrgOperators } from "@/server/operators/manage"

import { DailyScales } from "./daily-scales"
import { RulesManager } from "./rules-manager"

export default async function CommissionsPage() {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }
  if (!authorize(ctx.actor, "commissionRule:manage").allowed) redirect("/dashboard")

  const [rules, operators, organization] = await Promise.all([
    listRulesInForce(ctx),
    listActiveOrgOperators(ctx),
    ctx.db.organization.findFirst({ select: { roundingMode: true } }),
  ])
  const dailyOperators = operators.filter((operator) => operator.commissionMode === "DAILY_VOLUME").map((operator) => operator.id)
  const scales = await loadScalesInForce(ctx, dailyOperators)

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Commissions" subtitle="Règles en vigueur" backHref="/settings" />
      <main className={cn(PAGE, "gap-4")}>
        <p className="text-sm text-muted-foreground">
          Vos commissions et les frais clients, par opérateur, type d&apos;opération et tranche de montant. Modifier une règle ne
          change jamais les opérations déjà saisies.
        </p>
        <RulesManager rules={rules} operators={operators} roundingMode={organization?.roundingMode ?? "NEAREST"} />
        <DailyScales operators={operators} scales={scales} />
      </main>
    </div>
  )
}
