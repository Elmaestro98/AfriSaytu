import { CircleCheck, Clock, TriangleAlert } from "lucide-react"

import { formatDayLabel, formatTime } from "@/lib/dates"
import { formatAmount, formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import { STALE_HOURS } from "@/server/dashboard/alerts"
import type { BranchRow } from "@/server/supervision/branches"

const TH = "px-4 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase"

function ClosingState({ row }: { row: BranchRow }) {
  if (row.hoursOpen > STALE_HOURS) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-accent/20 px-2.5 py-1 text-xs font-bold whitespace-nowrap text-brand-accent-strong">
        <Clock className="size-3.5" aria-hidden /> Ouverte depuis {Math.floor(row.hoursOpen)} h
      </span>
    )
  }
  if (!row.lastClosing) return <span className="text-xs text-muted-foreground">Jamais clôturée</span>
  const { at, difference } = row.lastClosing
  return (
    <span className="flex flex-col gap-1">
      <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
        difference === 0 ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive")}>
        {difference === 0 ? <CircleCheck className="size-3.5" aria-hidden /> : <TriangleAlert className="size-3.5" aria-hidden />}
        {difference === 0 ? "Sans écart" : `${difference > 0 ? "+" : ""}${formatFCFA(difference)}`}
      </span>
      <span className="text-xs text-muted-foreground">{formatDayLabel(at)} {formatTime(at)}</span>
    </span>
  )
}

// One line per branch (multi-branch view of mockup 01).
export function BranchesTable({ rows }: { rows: readonly BranchRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.volume, 0)
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-heading text-xl font-bold">Points de vente</h2>
        <p className="text-sm text-muted-foreground">Activité de la période, trésorerie actuelle et dernière clôture</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted">
            <tr>
              <th scope="col" className={TH}>Point de vente</th>
              <th scope="col" className={cn(TH, "text-right")}>Volume</th>
              <th scope="col" className={cn(TH, "text-right")}>Opérations</th>
              <th scope="col" className={cn(TH, "text-right")}>Commissions</th>
              <th scope="col" className={cn(TH, "text-right")}>UV</th>
              <th scope="col" className={cn(TH, "text-right")}>Espèces</th>
              <th scope="col" className={TH}>Dernière clôture</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <span className="block font-semibold">{row.name}</span>
                  {row.lowBalances > 0 && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-accent-strong">
                      <TriangleAlert className="size-3.5" aria-hidden /> {row.lowBalances} solde{row.lowBalances > 1 ? "s" : ""} bas
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="block font-heading font-bold whitespace-nowrap tabular-nums">{formatFCFA(row.volume)}</span>
                  <span className="mt-1 ml-auto block h-1 w-20 rounded-full bg-muted" aria-hidden>
                    <span className="block h-1 rounded-full bg-primary" style={{ width: `${total > 0 ? (row.volume / total) * 100 : 0}%` }} />
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatAmount(row.count)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap text-primary tabular-nums">+{formatFCFA(row.commission)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatFCFA(row.uv)}</td>
                <td className={cn("px-4 py-3 text-right whitespace-nowrap tabular-nums", row.cash < 0 && "text-destructive")}>{formatFCFA(row.cash)}</td>
                <td className="px-4 py-3"><ClosingState row={row} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
