import { formatAmount, formatFCFA } from "@/lib/money"
import type { AgentStat, OperatorStat } from "@/server/stats/load"
import type { TypeShare } from "@/server/stats/compute"

type BreakdownRow = { id: string; name: string; color: string | null; volume: number; commission: number; count?: number; percent: number }

// One line per item: name, share of the volume as a bar, volume and commission.
function BreakdownList({ title, rows }: { title: string; rows: readonly BreakdownRow[] }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 lg:p-5">
      <h2 className="font-heading text-lg font-bold">{title}</h2>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Aucune opération sur la période.</p>}
      <ul className="flex flex-col gap-4">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-semibold">
                {row.name}
                {row.count !== undefined && <span className="font-normal text-muted-foreground"> · {formatAmount(row.count)} op.</span>}
              </span>
              <span className="font-bold tabular-nums">{row.percent} %</span>
            </div>
            <div className="h-2 rounded-full bg-muted" aria-hidden>
              <div className="h-2 rounded-full" style={{ width: `${row.percent}%`, backgroundColor: row.color ?? "var(--primary)" }} />
            </div>
            <div className="flex justify-between gap-2 text-sm tabular-nums">
              <span className="text-muted-foreground">{formatFCFA(row.volume)}</span>
              <span className="font-semibold text-primary">+{formatFCFA(row.commission)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function OperatorBreakdown({ operators }: { operators: readonly OperatorStat[] }) {
  return <BreakdownList title="Par opérateur" rows={operators} />
}

export function TypeBreakdown({ types }: { types: readonly TypeShare[] }) {
  return <BreakdownList title="Par type d'opération" rows={types.map((row) => ({ ...row, id: row.type, name: row.label, color: null }))} />
}

// Ranking of the members by commission earned over the period (owner and managers only).
export function AgentRanking({ agents }: { agents: readonly AgentStat[] }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 lg:p-5">
      <h2 className="font-heading text-lg font-bold">Par agent</h2>
      {agents.length === 0 && <p className="text-sm text-muted-foreground">Aucune opération sur la période.</p>}
      <ol className="flex flex-col divide-y">
        {agents.map((agent, index) => (
          <li key={agent.memberId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{agent.name}</span>
              <span className="block text-sm text-muted-foreground tabular-nums">
                {formatAmount(agent.count)} op. · {formatFCFA(agent.volume)}
              </span>
            </span>
            <span className="shrink-0 font-bold text-primary tabular-nums">+{formatFCFA(agent.commission)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
