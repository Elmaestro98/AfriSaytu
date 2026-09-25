import { MapPin } from "lucide-react"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { requireActor } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { SessionError } from "@/server/auth/session"
import { countActiveBranches, listManagedBranches } from "@/server/branches/queries"
import { listActiveOrgOperators } from "@/server/operators/manage"
import { getCurrentPlan } from "@/server/plans/current"
import { PLAN_LABELS, PLAN_LIMITS, canAddBranch } from "@/server/plans/limits"

import { AccountRow } from "./account-row"
import { AddOperatorForm } from "./add-operator-form"
import { NewBranchForm } from "./new-branch-form"

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

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title="Points de vente"
        subtitle={`${branches.length} point${branches.length > 1 ? "s" : ""} de vente`}
        backHref="/dashboard"
      />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
        {branches.map((branch) => (
          <section key={branch.id} className="flex flex-col rounded-2xl border bg-card p-4">
            <h2 className="font-heading text-2xl font-bold">{branch.name}</h2>
            {branch.address && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4" aria-hidden />
                {branch.address}
              </p>
            )}
            <p className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Soldes théoriques
            </p>
            <ul className="divide-y">
              {branch.accounts.map((account) => (
                <AccountRow key={account.id} account={account} />
              ))}
            </ul>
            <AddOperatorForm branchId={branch.id} operators={branch.addableOperators} />
          </section>
        ))}

        {canCreate &&
          (withinPlan ? (
            <NewBranchForm operators={operators} />
          ) : (
            <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
              Votre formule {PLAN_LABELS[plan]} comprend {maxBranches} point de vente
              {maxBranches !== null && maxBranches > 1 ? "s" : ""}. Passez à la formule Business pour en gérer
              jusqu&apos;à 5.
            </p>
          ))}
      </main>
    </div>
  )
}
