import { Store } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { PAGE } from "@/lib/layout"
import { formatAmount, formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { SessionError } from "@/server/auth/session"
import { countActiveBranches, listManagedBranches } from "@/server/branches/queries"
import { listActiveOrgOperators } from "@/server/operators/manage"
import { getCurrentPlan } from "@/server/plans/current"
import { PLAN_LABELS, PLAN_LIMITS, canAddBranch } from "@/server/plans/limits"

import { BranchCard, branchTotals } from "./branch-card"
import { NewBranchSheet } from "./new-branch-sheet"

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className={cn("truncate font-heading text-xl font-extrabold tabular-nums", tone === "warning" && "text-brand-accent-strong")}>{value}</p>
    </div>
  )
}

// Branches of the organization (F-12): each one with its operator accounts and its cash drawer,
// their theoretical balances and alert thresholds. Creating one is kept to the owner, within the plan.
export default async function BranchesPage() {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }
  if (!authorize(ctx.actor, "catalog:manage").allowed) redirect("/dashboard")

  const [branches, operators, plan, branchCount] = await Promise.all([
    listManagedBranches(ctx),
    listActiveOrgOperators(ctx),
    getCurrentPlan(ctx),
    countActiveBranches(ctx),
  ])
  const canCreate = authorize(ctx.actor, "branch:create").allowed
  const withinPlan = canAddBranch(plan, branchCount)
  const maxBranches = PLAN_LIMITS[plan].maxBranches
  const totals = branches.map(branchTotals)
  const treasury = totals.reduce((sum, row) => sum + row.total, 0)
  const lowBalances = totals.reduce((sum, row) => sum + row.low, 0)

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Points de vente" subtitle="Comptes, soldes et seuils d'alerte" backHref="/settings" />
      <main className={cn(PAGE, "gap-6")}>
        <section aria-label="Synthèse" className="flex flex-col gap-4 rounded-2xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
          <div className="grid grid-cols-3 gap-4 lg:gap-10">
            {/* The owner sees the plan usage; a manager, the branches they manage. */}
            <Stat label="Points de vente"
              value={canCreate ? `${formatAmount(branchCount)}${maxBranches !== null ? ` / ${formatAmount(maxBranches)}` : ""}` : formatAmount(branches.length)} />
            <Stat label="Trésorerie" value={formatFCFA(treasury)} />
            <Stat label="Soldes bas" value={formatAmount(lowBalances)} tone={lowBalances > 0 ? "warning" : undefined} />
          </div>
          {canCreate &&
            (withinPlan ? (
              <NewBranchSheet operators={operators} />
            ) : (
              <p className="text-sm text-muted-foreground lg:max-w-xs lg:text-right">
                La formule {PLAN_LABELS[plan]} comprend {maxBranches} point de vente{maxBranches !== null && maxBranches > 1 ? "s" : ""}.{" "}
                {ctx.actor.role === "OWNER" && (
                  <Link href="/settings/subscription" className="font-semibold text-primary underline-offset-4 hover:underline">
                    Voir les formules
                  </Link>
                )}
              </p>
            ))}
        </section>

        {branches.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
            <Store className="size-8 text-muted-foreground" aria-hidden />
            <p className="font-semibold">Aucun point de vente à gérer.</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {canCreate ? "Créez votre premier point de vente pour y ouvrir les comptes des opérateurs et la caisse." : "Demandez au propriétaire de vous rattacher à un point de vente."}
            </p>
          </div>
        ) : (
          <div className={cn("grid gap-6", branches.length > 1 ? "xl:grid-cols-2 xl:items-start" : "max-w-3xl")}>
            {branches.map((branch) => <BranchCard key={branch.id} branch={branch} />)}
          </div>
        )}
      </main>
    </div>
  )
}
