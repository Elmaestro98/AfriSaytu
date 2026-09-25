import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { formatLongDate } from "@/lib/dates"
import { formatAmount } from "@/lib/money"
import { PAGE } from "@/lib/layout"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { deadlineLine, statusLabel } from "@/server/plans/banner"
import { PLAN_LABELS } from "@/server/plans/limits"
import { SubscriptionAccessError, loadSubscriptionOverview } from "@/server/plans/overview"

import { PlanCards } from "./plan-cards"

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const percent = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100))
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between gap-2 text-sm">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums">{formatAmount(used)} / {limit === null ? "illimité" : formatAmount(limit)}</span>
      </div>
      {limit !== null && (
        <div className="h-2 rounded-full bg-muted" aria-hidden>
          <div className={cn("h-2 rounded-full", used >= limit ? "bg-brand-accent" : "bg-primary")} style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  )
}

// "Mon abonnement" (F-60 to F-62): status, deadline, usage against the plan, the plans. Owner only.
export default async function SubscriptionPage() {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }

  let overview
  try {
    overview = await loadSubscriptionOverview(ctx)
  } catch (error) {
    if (error instanceof SubscriptionAccessError) redirect("/dashboard")
    throw error
  }
  const { plan, state, limits, usage } = overview
  const deadline = deadlineLine(state, formatLongDate)

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Mon abonnement" subtitle={`Formule ${PLAN_LABELS[plan]}`} backHref="/settings" />
      <main className={cn(PAGE, "gap-6")}>
        <section className="grid gap-4 rounded-2xl border bg-card p-4 lg:grid-cols-2 lg:p-5">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Statut</p>
            <p className={cn("font-heading text-2xl font-extrabold",
              state.access === "READ_ONLY" && "text-destructive", state.status === "PAST_DUE" && "text-brand-accent-strong")}>
              {statusLabel(state)}
            </p>
            {deadline && <p className="text-sm">{deadline}</p>}
            {state.status === "TRIAL" && <p className="text-sm text-muted-foreground">L&apos;essai donne accès à la formule {PLAN_LABELS[plan]}.</p>}
          </div>
          <div className="flex flex-col gap-4">
            <UsageBar label="Points de vente" used={usage.branches} limit={limits.maxBranches} />
            <UsageBar label="Utilisateurs actifs" used={usage.members} limit={limits.maxMembers} />
          </div>
        </section>

        <PlanCards current={plan} />

        <p className="text-sm text-muted-foreground">
          Tarifs indicatifs. Le paiement par Wave et Orange Money arrive prochainement ; en attendant, contactez le support AfriSaytu pour
          régler votre abonnement.
        </p>
      </main>
    </div>
  )
}
