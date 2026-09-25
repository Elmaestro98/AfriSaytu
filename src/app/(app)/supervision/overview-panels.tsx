import { Activity, Coins, Scale, TrendingUp } from "lucide-react"

import { KpiCard } from "@/components/business/dashboard/kpi-card"
import { formatAmount, formatFCFA } from "@/lib/money"
import type { Network } from "@/server/supervision/network"
import type { Overview } from "@/server/supervision/overview"

// The four indicators of mockup 01.
export function KpiCards({ overview, network, comparedTo }: { overview: Overview; network: Network; comparedTo: string }) {
  const average = overview.count > 0 ? Math.round(overview.commission / overview.count) : 0
  return (
    <section aria-label="Indicateurs" className="grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-4">
      <KpiCard label="Volume total" value={formatFCFA(overview.volume)} icon={TrendingUp} tone="primary"
        change={{ value: overview.volumeChange, label: comparedTo }} />
      <KpiCard label="Commissions" value={`+${formatFCFA(overview.commission)}`} icon={Coins}
        change={{ value: overview.commissionChange, label: comparedTo }} />
      <KpiCard label="Opérations" value={formatAmount(overview.count)} icon={Activity}>
        <span className="text-xs text-muted-foreground">
          {overview.deposits} dépôt{overview.deposits > 1 ? "s" : ""} · {overview.withdrawals} retrait{overview.withdrawals > 1 ? "s" : ""} · moy. {formatFCFA(average)}
        </span>
      </KpiCard>
      <KpiCard label="Écart cumulé caisse" value={`${network.closingDifference > 0 ? "+" : ""}${formatFCFA(network.closingDifference)}`}
        icon={Scale} tone={network.anomalies > 0 ? "danger" : "default"}>
        <span className="text-xs text-muted-foreground">
          {network.anomalies > 0 ? `${network.anomalies} clôture${network.anomalies > 1 ? "s" : ""} avec écart` : "Aucune clôture avec écart"}
        </span>
      </KpiCard>
    </section>
  )
}

// Share of each operator in the volume: a ring (CSS conic gradient) and one bar per operator.
export function OperatorSplit({ overview }: { overview: Overview }) {
  // Each operator takes the arc from where the previous one ended.
  const stops = overview.operators.reduce<{ end: number; parts: string[] }>(
    (acc, operator) => ({
      end: acc.end + operator.percent,
      parts: [...acc.parts, `${operator.color ?? "var(--primary)"} ${acc.end}% ${acc.end + operator.percent}%`],
    }),
    { end: 0, parts: [] },
  ).parts
  const ring = stops.length > 0 && overview.volume > 0 ? `conic-gradient(${stops.join(", ")})` : "conic-gradient(var(--muted) 0 100%)"

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 lg:p-5">
      <h2 className="font-heading text-lg font-bold">Répartition par opérateur</h2>
      <div className="flex items-center gap-5">
        <div className="relative size-28 shrink-0 rounded-full" style={{ background: ring }} role="img"
          aria-label={overview.operators.map((operator) => `${operator.name} ${operator.percent} %`).join(", ") || "Aucune opération"}>
          <div className="absolute inset-3.5 flex flex-col items-center justify-center rounded-full bg-card text-center">
            <span className="text-[10px] text-muted-foreground uppercase">Total</span>
            <span className="font-heading text-sm font-bold tabular-nums">{formatAmount(overview.volume)}</span>
          </div>
        </div>
        <ul className="flex min-w-0 flex-1 flex-col gap-3">
          {overview.operators.length === 0 && <li className="text-sm text-muted-foreground">Aucune opération sur la période.</li>}
          {overview.operators.map((operator) => (
            <li key={operator.id} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-semibold">{operator.name}</span>
                <span className="font-bold tabular-nums">{operator.percent} %</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted" aria-hidden>
                <div className="h-1.5 rounded-full" style={{ width: `${operator.percent}%`, backgroundColor: operator.color ?? "var(--primary)" }} />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{formatFCFA(operator.volume)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
