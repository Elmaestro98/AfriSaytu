import { Target, TrendingUp } from "lucide-react"

import { OperatorBadge } from "@/components/business/operator-badge"
import { formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { DailyCommissionRow, DailyCommissions } from "@/server/commissions/daily-summary"

// Progress inside the tier reached, towards the next one (0 to 1).
function progress(row: DailyCommissionRow): number {
  if (!row.next) return row.tier ? 1 : 0
  const from = row.tier?.minAmount ?? 0
  const span = row.next.tier.minAmount - from
  return span > 0 ? Math.min(Math.max((row.volume - from) / span, 0), 1) : 0
}

function Goal({ row }: { row: DailyCommissionRow }) {
  if (!row.hasScale) return <p className="text-sm font-semibold text-brand-accent-strong">Barème pas encore renseigné par AfriSaytu.</p>
  if (row.volume === 0) return <p className="text-sm text-muted-foreground">Aucun dépôt ni retrait aujourd&apos;hui : le premier palier démarre dès la première opération.</p>
  if (!row.next) {
    return <p className="text-sm font-semibold text-primary">{row.tier ? "Palier le plus haut atteint." : "Au-delà du barème connu."}</p>
  }
  const gain = row.next.tier.commission - row.commission
  return (
    <p className="flex items-start gap-1.5 text-sm">
      <Target className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <span>
        Encore <span className="font-bold tabular-nums">{formatFCFA(row.next.missing)}</span> pour passer à{" "}
        <span className="font-bold tabular-nums">{formatFCFA(row.next.tier.commission)}</span>
        {gain > 0 && <span className="text-muted-foreground tabular-nums"> (+{formatFCFA(gain)})</span>}
      </span>
    </p>
  )
}

function OperatorDay({ row, showBranch }: { row: DailyCommissionRow; showBranch: boolean }) {
  const from = row.tier?.minAmount ?? 0
  const to = row.next?.tier.minAmount ?? row.tier?.maxAmount ?? null
  return (
    <li className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <OperatorBadge name={row.operatorName} color={row.color} logoSrc={row.logoSrc} className="size-10 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{row.operatorName}</p>
          {showBranch && <p className="truncate text-xs text-muted-foreground">{row.branchName}</p>}
        </div>
        {row.tierCount > 0 && (
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", row.tierNumber ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {row.tierNumber ? `Palier ${row.tierNumber} / ${row.tierCount}` : "Aucun palier"}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Commission du jour</p>
          <p className="font-heading text-2xl font-extrabold text-primary tabular-nums">+{formatFCFA(row.commission)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Volume du jour</p>
          <p className="font-heading font-bold tabular-nums">{formatFCFA(row.volume)}</p>
        </div>
      </div>

      {row.hasScale && row.volume > 0 && (
        <div className="flex flex-col gap-1" aria-hidden>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${progress(row) * 100}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
            <span>{formatFCFA(from)}</span>
            {to !== null && <span>{formatFCFA(to)}</span>}
          </div>
        </div>
      )}
      <Goal row={row} />
    </li>
  )
}

// Operators paid on the day's total (e.g. Wave): per branch, today's commission, the tier reached
// and what the next tier still needs. An agent sees their branch's, labelled as such.
export function DailyCommissionsPanel({ daily, showBranch, forAgent }: { daily: DailyCommissions; showBranch: boolean; forAgent: boolean }) {
  return (
    <section aria-labelledby="daily-commissions" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="daily-commissions" className="flex items-center gap-2 font-heading text-lg font-bold">
            <TrendingUp className="size-5 text-primary" aria-hidden />
            {forAgent ? "Commissions du jour du point de vente" : "Commissions du jour"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Selon le total des dépôts et retraits de la journée{forAgent ? ", tous agents confondus" : ""} et le barème de chaque opérateur.
          </p>
        </div>
        {daily.rows.length > 1 && (
          <p className="font-heading text-xl font-extrabold text-primary tabular-nums">Total +{formatFCFA(daily.total)}</p>
        )}
      </div>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {daily.rows.map((row) => <OperatorDay key={`${row.branchId}:${row.operatorId}`} row={row} showBranch={showBranch} />)}
      </ul>
    </section>
  )
}
