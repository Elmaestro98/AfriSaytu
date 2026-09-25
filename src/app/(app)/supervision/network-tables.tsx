import { ChevronRight, CircleCheck, Lock, TriangleAlert } from "lucide-react"
import Link from "next/link"

import { formatDayLabel, formatTime } from "@/lib/dates"
import { historyQueryString, DEFAULT_FILTERS, type Period } from "@/lib/history-filters"
import { formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { Network } from "@/server/supervision/network"

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase()
}

function DifferenceBadge({ value, label }: { value: number; label?: string }) {
  return value === 0 ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-bold whitespace-nowrap text-accent-foreground">
      <CircleCheck className="size-3.5" aria-hidden /> {label ?? "Conforme"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold whitespace-nowrap text-destructive">
      <TriangleAlert className="size-3.5" aria-hidden /> {value > 0 ? "+" : ""}{formatFCFA(value)}
    </span>
  )
}

const TH = "px-4 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase"

// Performance of each agent over the period (mockup 01).
export function AgentsTable({ network, historyPeriod }: { network: Network; historyPeriod: Period }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-heading text-xl font-bold">Performance des agents</h2>
        <p className="text-sm text-muted-foreground">Volume, commissions et écarts des clôtures qu&apos;ils ont validées</p>
      </div>
      {network.agents.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">Aucune opération sur la période.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted">
              <tr>
                <th scope="col" className={TH}>Agent</th>
                <th scope="col" className={TH}>Opérations</th>
                <th scope="col" className={cn(TH, "text-right")}>Volume</th>
                <th scope="col" className={cn(TH, "text-right")}>Commissions</th>
                <th scope="col" className={TH}>Écart clôture</th>
                <th scope="col" className={TH}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {network.agents.map((agent) => (
                <tr key={agent.memberId} className={cn(agent.closingDifference !== 0 && "bg-destructive/5")}>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-heading text-xs font-bold text-accent-foreground">
                        {initials(agent.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{agent.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{agent.branchNames.join(", ") || "—"}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="w-8 tabular-nums">{agent.count}</span>
                      <span className="h-2 w-20 rounded-full bg-muted" aria-hidden>
                        <span className="block h-2 rounded-full bg-primary" style={{ width: `${Math.round(agent.share * 100)}%` }} />
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-heading font-bold whitespace-nowrap tabular-nums">{formatFCFA(agent.volume)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-primary tabular-nums">+{formatFCFA(agent.commission)}</td>
                  <td className="px-4 py-3">
                    {agent.closingCount === 0 ? <span className="text-xs text-muted-foreground">Aucune clôture</span> : <DifferenceBadge value={agent.closingDifference} />}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/operations${historyQueryString({ ...DEFAULT_FILTERS, period: historyPeriod, agent: agent.memberId })}`}
                      className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold whitespace-nowrap text-primary">
                      Historique <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// Latest closings of the network (mockup 01). Reopening happens on the closing screen.
export function ClosingsTable({ network }: { network: Network }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-heading text-xl font-bold">Dernières clôtures</h2>
        <p className="text-sm text-muted-foreground">Espèces comptées et rapprochement des soldes électroniques</p>
      </div>
      {network.closings.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">Aucune clôture pour l&apos;instant.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted">
              <tr>
                <th scope="col" className={TH}>Date</th>
                <th scope="col" className={TH}>Point de vente</th>
                <th scope="col" className={TH}>Responsable</th>
                <th scope="col" className={cn(TH, "text-right")}>Espèces comptées</th>
                <th scope="col" className={TH}>Écart espèces</th>
                <th scope="col" className={TH}>Rapprochement UV</th>
                <th scope="col" className={TH}>Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {network.closings.map((closing) => (
                <tr key={closing.id} className={cn(closing.cashDifference + closing.uvDifference !== 0 && closing.status === "CLOSED" && "bg-destructive/5")}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {closing.closedAt ? (
                      <>
                        <span className="block font-semibold">{formatDayLabel(closing.closedAt)}</span>
                        <span className="block text-xs text-muted-foreground">{formatTime(closing.closedAt)}</span>
                      </>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold">{closing.branchName}</td>
                  <td className="px-4 py-3">{closing.closedByName ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-heading font-bold whitespace-nowrap tabular-nums">{formatFCFA(closing.cashCounted)}</td>
                  <td className="px-4 py-3"><DifferenceBadge value={closing.cashDifference} label="Aucun" /></td>
                  <td className="px-4 py-3"><DifferenceBadge value={closing.uvDifference} /></td>
                  <td className="px-4 py-3">
                    {closing.status === "REOPENED" ? (
                      <span className="rounded-full bg-brand-accent/20 px-2.5 py-1 text-xs font-bold text-brand-accent-strong">Rouverte</span>
                    ) : (
                      <Link href={`/closing?branch=${closing.branchId}`} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                        <Lock className="size-3.5" aria-hidden /> Verrouillée
                        {network.canReopen && <ChevronRight className="size-3.5" aria-hidden />}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
