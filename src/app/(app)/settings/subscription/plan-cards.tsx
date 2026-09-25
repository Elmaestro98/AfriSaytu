import { Check } from "lucide-react"

import type { SubscriptionPlan } from "@/generated/prisma/enums"
import { formatAmount, formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import { FREE_MONTHS_PER_YEAR, PLAN_FEATURES, PLAN_LABELS, PLAN_LIMITS, PLAN_MONTHLY_PRICE, yearlyPrice } from "@/server/plans/limits"

const PLANS: readonly SubscriptionPlan[] = ["BASIC", "PRO", "BUSINESS"]

function limitText(limit: number | null, one: string, many: string): string {
  if (limit === null) return `${many} illimités`
  return limit === 1 ? `1 ${one}` : `Jusqu'à ${formatAmount(limit)} ${many}`
}

// The three plans side by side (cahier 13), the current one highlighted. Paying is done with
// Wave, on the same screen (pay-with-wave.tsx).
export function PlanCards({ current }: { current: SubscriptionPlan }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-bold">Les formules</h2>
      <div className="grid gap-3 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan === current
          const limits = PLAN_LIMITS[plan]
          return (
            <article key={plan} className={cn("flex flex-col gap-4 rounded-2xl border bg-card p-4 lg:p-5", isCurrent && "border-2 border-primary")}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-heading text-xl font-extrabold">{PLAN_LABELS[plan]}</h3>
                {isCurrent && <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">Formule actuelle</span>}
              </div>
              <div>
                <p className="font-heading text-2xl font-extrabold tabular-nums">
                  {formatFCFA(PLAN_MONTHLY_PRICE[plan])}<span className="text-sm font-semibold text-muted-foreground"> / mois</span>
                </p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  ou {formatFCFA(yearlyPrice(plan))} / an ({FREE_MONTHS_PER_YEAR} mois offerts)
                </p>
              </div>
              <ul className="flex flex-1 flex-col gap-2 text-sm">
                {[limitText(limits.maxBranches, "point de vente", "points de vente"), limitText(limits.maxMembers, "utilisateur", "utilisateurs"), ...PLAN_FEATURES[plan]].map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>
    </section>
  )
}
