import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { SummaryStat } from "@/components/business/summary-stat"
import { formatLongDate } from "@/lib/dates"
import { formatAmount, formatFCFA } from "@/lib/money"
import { PAGE } from "@/lib/layout"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { configuredWaveLink } from "@/server/billing/wave"
import { statusLabel } from "@/server/plans/banner"
import { PLAN_LABELS } from "@/server/plans/limits"
import { SubscriptionAccessError, loadSubscriptionOverview } from "@/server/plans/overview"

import { PayWithWave } from "./pay-with-wave"
import { PlanCards } from "./plan-cards"

const PLANS = ["BASIC", "PRO", "BUSINESS"] as const

const DEADLINE_LABEL: Partial<Record<string, string>> = { TRIAL: "Fin de l'essai", ACTIVE: "Prochaine échéance", PAST_DUE: "Lecture seule le" }

const PAYMENT_STATUS = { PENDING: "En attente de confirmation", PAID: "Confirmé", FAILED: "Refusé" } as const

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
export default async function SubscriptionPage({ searchParams }: PageProps<"/settings/subscription">) {
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
  const { plan, state, limits, usage, payments } = overview
  const pending = payments.find((payment) => payment.status === "PENDING")
  // The plan chosen on a card comes through the address (?plan=PRO); anything else: the current one.
  const requested = (await searchParams).plan
  const selected = PLANS.find((value) => value === requested) ?? plan
  const waveLink = configuredWaveLink()
  const canPay = !pending && waveLink !== null

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Mon abonnement" subtitle={`Formule ${PLAN_LABELS[plan]}`} backHref="/settings" />
      <main className={cn(PAGE, "gap-6")}>
        <section aria-label="Synthèse" className="flex flex-col rounded-2xl border bg-card">
          <div className="grid gap-4 p-4 sm:grid-cols-3 lg:p-5">
            <SummaryStat label="Statut" value={statusLabel(state)}
              tone={state.access !== "FULL" ? "danger" : state.status === "PAST_DUE" ? "warning" : undefined} />
            <SummaryStat label="Formule" value={state.status === "TRIAL" ? `${PLAN_LABELS[plan]} (essai)` : PLAN_LABELS[plan]} />
            <SummaryStat label={DEADLINE_LABEL[state.status] ?? "Échéance"} value={state.deadline ? formatLongDate(state.deadline) : "—"} />
          </div>
          <div className="grid gap-4 border-t p-4 sm:grid-cols-2 lg:p-5">
            <UsageBar label="Points de vente" used={usage.branches} limit={limits.maxBranches} />
            <UsageBar label="Utilisateurs actifs" used={usage.members} limit={limits.maxMembers} />
          </div>
        </section>

        {pending ? (
          <p role="status" className="rounded-2xl border-2 border-brand-accent bg-card p-4">
            <span className="block font-semibold">Paiement de {formatFCFA(pending.amount)} en attente de confirmation</span>
            <span className="text-sm text-muted-foreground">
              Référence Wave {pending.providerRef}. Votre abonnement sera activé dès que nous aurons vérifié la réception.
            </span>
          </p>
        ) : waveLink ? (
          <PayWithWave key={selected} defaultPlan={selected} waveLink={waveLink} />
        ) : (
          <p className="rounded-2xl border bg-card p-4 text-sm">
            Le paiement en ligne n&apos;est pas encore disponible. Contactez le support AfriSaytu pour régler votre abonnement.
          </p>
        )}

        <PlanCards current={plan} selected={selected} canChoose={canPay} />

        {payments.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="font-heading text-lg font-bold">Mes paiements</h2>
            <ul className="divide-y rounded-2xl border bg-card">
              {payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <span>
                    <span className="block font-semibold">{formatLongDate(payment.createdAt)}</span>
                    <span className="text-muted-foreground">{payment.providerRef ? `Réf. ${payment.providerRef}` : "Enregistré par le support"}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-bold tabular-nums">{formatFCFA(payment.amount)}</span>
                    <span className={cn("text-xs font-semibold", payment.status === "FAILED" ? "text-destructive" : "text-muted-foreground")}>
                      {PAYMENT_STATUS[payment.status]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-sm text-muted-foreground">Tarifs indicatifs. Un souci de paiement ? Contactez le support AfriSaytu.</p>
      </main>
    </div>
  )
}
