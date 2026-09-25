import Link from "next/link"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { AlertsPanel } from "@/components/business/dashboard/alerts-panel"
import { VolumeBars } from "@/components/business/dashboard/volume-bars"
import type { Period } from "@/lib/history-filters"
import { PAGE } from "@/lib/layout"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { SUPERVISION_PERIODS, SUPERVISION_PERIOD_LABELS, type SupervisionPeriod } from "@/server/supervision/compute"
import { loadBranches } from "@/server/supervision/branches"
import { loadNetwork } from "@/server/supervision/network"
import { branchScope, loadOverview } from "@/server/supervision/overview"

import { BranchSelect } from "./branch-select"
import { AgentsTable, ClosingsTable } from "./network-tables"
import { BranchesTable } from "./branches-table"
import { KpiCards, OperatorSplit } from "./overview-panels"
import { RefreshButton } from "./refresh-button"

const COMPARED_TO: Record<SupervisionPeriod, string> = { today: "vs hier", "7d": "vs 7 jours avant", month: "vs mois précédent" }
const HISTORY_PERIOD: Record<SupervisionPeriod, Period> = { today: "today", "7d": "7d", month: "30d" }

// Supervision of the network (mockup 01): owner and managers only.
export default async function SupervisionPage({ searchParams }: PageProps<"/supervision">) {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }
  if (ctx.actor.role === "AGENT") redirect("/dashboard")

  const params = await searchParams
  const period = SUPERVISION_PERIODS.find((item) => item === params.period) ?? "today"
  const branches = await ctx.db.branch.findMany({
    where: { isActive: true, ...(ctx.actor.role === "OWNER" ? {} : { id: { in: [...ctx.actor.branchIds] } }) },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
  const requested = typeof params.branch === "string" && branches.some((branch) => branch.id === params.branch) ? params.branch : null
  const scope = branchScope(ctx, requested)
  const now = new Date()

  const [overview, network, branchView] = await Promise.all([
    loadOverview(ctx, scope, period, now),
    loadNetwork(ctx, scope, period, now),
    loadBranches(ctx, scope, period, now),
  ])
  const periodHref = (value: SupervisionPeriod) => {
    const query = new URLSearchParams({ ...(value !== "today" ? { period: value } : {}), ...(requested ? { branch: requested } : {}) }).toString()
    return query ? `/supervision?${query}` : "/supervision"
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Supervision" subtitle={requested ? branches.find((branch) => branch.id === requested)?.name : "Tous les points de vente"} />
      <main className={cn(PAGE, "gap-6")}>
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {branches.length > 1 && <BranchSelect branches={branches} value={requested} />}
            <RefreshButton loadedAt={now} />
          </div>
          <nav aria-label="Période" className="flex gap-1 rounded-xl border bg-card p-1">
            {SUPERVISION_PERIODS.map((value) => (
              <Link key={value} href={periodHref(value)} aria-current={value === period ? "page" : undefined} scroll={false}
                className={cn("flex h-9 flex-1 items-center justify-center rounded-lg px-3 text-sm font-semibold whitespace-nowrap",
                  value === period ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
                {SUPERVISION_PERIOD_LABELS[value]}
              </Link>
            ))}
          </nav>
        </div>

        <KpiCards overview={overview} network={network} comparedTo={COMPARED_TO[period]} />

        <div className="grid gap-4 xl:grid-cols-3 xl:items-start">
          <div className="xl:col-span-2">
            <VolumeBars title="Évolution du volume" subtitle="7 derniers jours, opérations validées" days={overview.daily} />
          </div>
          <AlertsPanel alerts={branchView.alerts} />
        </div>

        <div className="grid gap-4 xl:grid-cols-3 xl:items-start">
          <div className="xl:col-span-2">
            <BranchesTable rows={branchView.rows} />
          </div>
          <OperatorSplit overview={overview} />
        </div>

        <AgentsTable network={network} historyPeriod={HISTORY_PERIOD[period]} />
        <ClosingsTable network={network} />
      </main>
    </div>
  )
}
