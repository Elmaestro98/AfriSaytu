import { OperatorBadge } from "@/components/business/operator-badge"
import { formatFCFA } from "@/lib/money"
import type { DailyCommissionRow, DailyCommissions } from "@/server/commissions/daily-summary"

// Progress inside the tier reached, towards the next one (0 to 1).
function progress(row: DailyCommissionRow): number {
  if (!row.next) return 1
  const from = row.tier?.minAmount ?? 0
  const span = row.next.tier.minAmount - from
  return span > 0 ? Math.min(Math.max((row.volume - from) / span, 0), 1) : 0
}

function hint(row: DailyCommissionRow): string {
  if (!row.hasScale) return "Barème pas encore renseigné par AfriSaytu."
  if (!row.next) return row.tier ? "Palier le plus haut atteint." : "Au-delà du barème connu."
  return `Encore ${formatFCFA(row.next.missing)} pour gagner ${formatFCFA(row.next.tier.commission)}.`
}

// Operators paid on the day's total (e.g. Wave): per branch, today's volume of deposits and
// withdrawals, the commission of the tier reached, and what the next tier still needs.
export function DailyCommissionsPanel({ daily, showBranch, forAgent }: { daily: DailyCommissions; showBranch: boolean; forAgent: boolean }) {
  return (
    <section aria-labelledby="daily-commissions" className="flex flex-col gap-3 rounded-2xl border bg-card p-4 lg:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 id="daily-commissions" className="font-heading text-lg font-bold">{forAgent ? "Commissions du jour du point de vente" : "Commissions du jour"}</h2>
          <p className="text-sm text-muted-foreground">
            Sur le total des dépôts et retraits de la journée{forAgent ? ", tous agents confondus" : ""}, selon le barème de l&apos;opérateur.
          </p>
        </div>
        <p className="shrink-0 font-heading text-xl font-extrabold text-primary tabular-nums">+{formatFCFA(daily.total)}</p>
      </div>
      <ul className="divide-y">
        {daily.rows.map((row) => (
          <li key={`${row.branchId}:${row.operatorId}`} className="flex flex-col gap-2 py-3">
            <div className="flex items-center gap-3">
              <OperatorBadge name={row.operatorName} color={row.color} logoSrc={row.logoSrc} className="size-10 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{row.operatorName}{showBranch && <span className="font-normal text-muted-foreground"> · {row.branchName}</span>}</p>
                <p className="text-xs text-muted-foreground tabular-nums">Volume du jour {formatFCFA(row.volume)}</p>
              </div>
              <p className="shrink-0 font-heading text-lg font-extrabold tabular-nums">{formatFCFA(row.commission)}</p>
            </div>
            <div className="ml-13 flex flex-col gap-1">
              <div className="h-1.5 rounded-full bg-muted" aria-hidden>
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${progress(row) * 100}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{hint(row)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
