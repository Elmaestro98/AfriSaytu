import { OperatorBadge } from "@/components/business/operator-badge"
import { formatFCFA } from "@/lib/money"
import type { OperatorScaleView } from "@/server/commissions/daily-summary"

import type { OperatorOption } from "./rule-form"

// Scales of the operators paid on the day's total (e.g. Wave), set by AfriSaytu for every
// organization: shown read only, tier by tier, like the operator's own table.
export function DailyScales({ operators, scales }: { operators: readonly OperatorOption[]; scales: readonly OperatorScaleView[] }) {
  if (scales.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Commission sur le volume du jour</h2>
        <p className="text-sm text-muted-foreground">
          Chaque jour et pour chaque point de vente, le total des dépôts et retraits donne un palier, et ce palier donne la commission du jour.
          Barème fixé par AfriSaytu, identique pour toutes les entreprises.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        {scales.map((scale) => {
          const operator = operators.find((candidate) => candidate.id === scale.operatorId)
          if (!operator) return null
          return (
            <section key={scale.operatorId} aria-labelledby={`scale-${scale.operatorId}`} className="flex flex-col rounded-2xl border bg-card shadow-xs">
              <header className="flex items-center gap-3 border-b p-4">
                <OperatorBadge name={operator.name} color={operator.color} logoSrc={operator.logoSrc} className="size-11" />
                <h3 id={`scale-${scale.operatorId}`} className="min-w-0 flex-1 truncate font-heading text-xl font-bold">{operator.name}</h3>
                <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">Volume du jour</span>
              </header>
              {scale.tiers.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Barème pas encore renseigné par AfriSaytu : la commission du jour vaut 0 en attendant.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Total du jour</th>
                      <th className="px-4 py-2 text-right font-semibold">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y tabular-nums">
                    {scale.tiers.map((tier) => (
                      <tr key={tier.minAmount}>
                        <td className="px-4 py-2">
                          {tier.maxAmount === null ? `${formatFCFA(tier.minAmount)} et plus` : `${formatFCFA(tier.minAmount)} à ${formatFCFA(tier.maxAmount)}`}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-primary">{formatFCFA(tier.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}
